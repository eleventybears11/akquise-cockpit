/**
 * Laufender Recherche-Lauf als App-weiter Zustand: läuft weiter, wenn man die Ansicht wechselt.
 */
import { useSyncExternalStore } from "react";
import { db } from "../data/db";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "../data/defaults";
import type { ResearchRun, RunLogEntry } from "../data/types";
import { demoProvider } from "./demo";
import { kostenUsd, type Usage } from "./logic";
import { leererLauf, runPipeline, type Provider } from "./pipeline";
import { KANDIDATEN_SCHEMA, LEAD_SCHEMA } from "./schemas";
import { getApiKey } from "./key";

export interface ResearchState {
  laeuft: boolean;
  run?: ResearchRun;
  fortschritt: { kandidaten: number; geprueft: number; angenommen: number };
}

let state: ResearchState = { laeuft: false, fortschritt: { kandidaten: 0, geprueft: 0, angenommen: 0 } };
let controller: AbortController | undefined;
const listeners = new Set<() => void>();
const set = (patch: Partial<ResearchState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useResearch(): ResearchState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
  );
}

export function abbrechen(): void {
  controller?.abort();
}

/** Für Tests: Verzögerung im Testmodus */
export const testOptionen = { verzoegerungMs: 150 };

export async function starteLauf(ziel: number): Promise<void> {
  if (state.laeuft) return;
  const settings = { ...DEFAULT_SETTINGS, ...(await db.meta.get("settings"))?.value };
  const profile = { ...DEFAULT_PROFILE, ...(await db.profiles.get(settings.aktivesProfil)) };
  const apiKey = getApiKey();
  // Ohne Key keine Recherche – DEMO-Daten nur bei ausdrücklich eingeschaltetem Testmodus
  if (!settings.testmodus && !apiKey) return;
  const test = settings.testmodus;
  const modell = test ? "test" : settings.modell;

  controller = new AbortController();
  const run = leererLauf(crypto.randomUUID(), ziel, modell);
  await db.runs.add(run);
  set({ laeuft: true, run, fortschritt: { kandidaten: 0, geprueft: 0, angenommen: 0 } });

  const log = (text: string, art: RunLogEntry["art"] = "info") => {
    const entry = { ts: new Date().toISOString(), text, art };
    const r = { ...state.run!, log: [...state.run!.log, entry] };
    set({ run: r });
  };
  const persist = () => db.runs.put(state.run!);

  // Das Anthropic-SDK erst laden, wenn wirklich recherchiert wird (schnellerer App-Start)
  const { callClaude, fehlerText } = await import("./claude");
  const provider: Provider = test
    ? demoProvider(testOptionen.verzoegerungMs)
    : {
        kandidaten: (prompt, system, signal) =>
          callClaude({ apiKey: apiKey!, modell: settings.modell, aufwand: settings.aufwand, system, prompt, schema: KANDIDATEN_SCHEMA, maxSuchen: 15, maxAbrufe: 5, signal }),
        verifizieren: (prompt, system, signal) =>
          callClaude({ apiKey: apiKey!, modell: settings.modell, aufwand: settings.aufwand, system, prompt, schema: LEAD_SCHEMA, maxSuchen: 6, maxAbrufe: 5, signal }),
      };

  if (test) log("Testmodus: erfundene DEMO-Daten, keine Kosten.", "warn");

  const companies = await db.companies.toArray();
  const exclusions = await db.exclusions.toArray();
  const bekannteNamen = new Set([...companies.map((c) => c.normName), ...exclusions.map((e) => e.normName)]);
  const naechsteNr = companies.reduce((m, c) => Math.max(m, c.nr ?? 0), 0) + 1;
  const kosten = (u: Usage) => (test ? 0 : kostenUsd(u, settings.modell));

  try {
    const res = await runPipeline(
      {
        provider,
        profile,
        settings,
        ziel,
        bekannteNamen,
        naechsteNr,
        signal: controller.signal,
        kosten,
        onLog: log,
        onUsage: (u) => set({ run: { ...state.run!, usage: u, kostenUsd: kosten(u) } }),
        onLead: async (lead) => {
          const ts = new Date().toISOString();
          const id = crypto.randomUUID();
          await db.companies.add({ ...lead, id, createdAt: ts, updatedAt: ts });
          set({ run: { ...state.run!, leadIds: [...state.run!.leadIds, id] } });
          void persist();
        },
        onProgress: (p) => set({ fortschritt: p }),
      },
      run.id,
    );
    const aborted = controller.signal.aborted;
    log(
      `${aborted ? "Abgebrochen" : "Fertig"}: ${res.angenommen} von ${ziel} Leads, ${res.verworfen} verworfen${test ? "" : `, ca. ${state.run!.kostenUsd.toFixed(2)} $`}.`,
      aborted ? "warn" : "ok",
    );
    set({ run: { ...state.run!, status: aborted ? "abgebrochen" : "fertig", verworfen: res.verworfen, finishedAt: new Date().toISOString() } });
  } catch (err) {
    const text = fehlerText(err);
    log(`Fehler: ${text}`, "fehler");
    set({ run: { ...state.run!, status: controller.signal.aborted ? "abgebrochen" : "fehler", fehler: text, finishedAt: new Date().toISOString() } });
  } finally {
    await persist();
    set({ laeuft: false });
  }
}
