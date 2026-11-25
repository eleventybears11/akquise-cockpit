/**
 * Tagesliste erzeugen: Kandidaten suchen → Dubletten/Ausschluss → verifizieren → prüfen → speichern.
 * Die KI liefert Rohdaten; Quellenprüfung, Filter, Score und Break-even macht die App selbst (logic.ts).
 */
import type { Company, Profile, ResearchRun, Settings, Teilscore } from "../data/types";
import { normalizeName } from "../lib/normalize";
import { isoDate, formatDate } from "../lib/dates";
import systemTpl from "../prompts/system.md?raw";
import kandidatenTpl from "../prompts/kandidaten.md?raw";
import verifizierenTpl from "../prompts/verifizieren.md?raw";
import type { KandidatRaw, LeadRaw } from "./schemas";
import { breakEven, gesamtScore, isSeen, KRITERIEN, minMa, pruefeFeld, render, type Usage } from "./logic";

export interface Provider {
  kandidaten(prompt: string, system: string, signal: AbortSignal): Promise<{ data: { kandidaten: KandidatRaw[] }; urls: Set<string>; usage: Usage }>;
  verifizieren(prompt: string, system: string, signal: AbortSignal): Promise<{ data: LeadRaw; urls: Set<string>; usage: Usage }>;
}

export interface PipelineDeps {
  provider: Provider;
  profile: Profile;
  settings: Settings;
  ziel: number;
  bekannteNamen: Set<string>;
  naechsteNr: number;
  signal: AbortSignal;
  /** Kosten in USD für eine Usage (modellabhängig) */
  kosten: (u: Usage) => number;
  onLog: (text: string, art?: "info" | "ok" | "warn" | "fehler") => void;
  onUsage: (u: Usage) => void;
  onLead: (c: Omit<Company, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onProgress: (p: { kandidaten: number; geprueft: number; angenommen: number }) => void;
  now?: Date;
}

const BL_KURZ: Record<string, string> = {
  oberösterreich: "OÖ",
  niederösterreich: "NÖ",
  steiermark: "Stmk",
  salzburg: "Sbg",
  tirol: "T",
  kärnten: "Ktn",
  burgenland: "Bgld",
  vorarlberg: "Vbg",
};

export function ortMitLand(ort: string, bundesland: string): string {
  const k = BL_KURZ[bundesland.trim().toLowerCase()];
  if (!k || ort.includes("(")) return ort;
  return `${ort} (${k})`;
}

export function systemPrompt(profile: Profile, now: Date): string {
  return render(systemTpl, {
    leadOwner: profile.leadOwner,
    produkt: profile.produkt,
    heute: formatDate(isoDate(now)),
    produktBeschreibung: profile.produktBeschreibung,
    referenz: profile.referenz,
    gespraechsargument: profile.gespraechsargument,
  });
}

export function kandidatenPrompt(profile: Profile, anzahl: number, ausschluss: string[], now: Date): string {
  return render(kandidatenTpl, {
    anzahl,
    branchen: profile.branchen.join(", "),
    gebiete: profile.gebiete.join(", "),
    minMitarbeiter: profile.minMitarbeiter,
    mindestinvestition: profile.mindestinvestition.toLocaleString("de-AT"),
    seit: String(now.getFullYear() - 3),
    wachstumssignale: profile.wachstumssignale,
    ausschluss: ausschluss.length ? ausschluss.slice(0, 500).join("; ") : "(keine)",
  });
}

export function verifizierenPrompt(profile: Profile, k: KandidatRaw): string {
  return render(verifizierenTpl, {
    firma: k.firma,
    ort: k.ort,
    bundesland: k.bundesland,
    website: k.website || "unbekannt",
    anlass: k.anlass,
    anlassDatum: k.anlassDatum,
    anlassQuelle: k.anlassQuelleUrl,
    minMitarbeiter: profile.minMitarbeiter,
    gebiete: profile.gebiete.join(", "),
    branchen: profile.branchen.join(", "),
    produkt: profile.produkt,
    mindestinvestition: profile.mindestinvestition.toLocaleString("de-AT"),
    leadOwner: profile.leadOwner,
    zweitprodukte: profile.zweitprodukte,
  });
}

export type Bewertung = { ok: true; lead: Omit<Company, "id" | "createdAt" | "updatedAt"> } | { ok: false; grund: string };

/** Prüft eine verifizierte KI-Antwort und baut daraus den Lead – oder verwirft ihn mit Grund. */
export function bewerte(raw: LeadRaw, k: KandidatRaw, urls: Set<string>, profile: Profile, bekannt: Set<string>, runId: string, nr: number, now: Date): Bewertung {
  if (!raw.passt) return { ok: false, grund: raw.ausschlussgrund || "passt nicht zum Profil" };
  const firma = raw.firma?.trim() || k.firma;
  if (bekannt.has(normalizeName(firma))) return { ok: false, grund: "Dublette (schon in der App oder Ausschlussliste)" };

  const anlassUrl = raw.anlassQuelleUrl || k.anlassQuelleUrl;
  if (!isSeen(anlassUrl, urls)) return { ok: false, grund: "Anlass-Quelle nicht in den Suchergebnissen – nicht belegt" };
  if (!raw.anlass?.trim()) return { ok: false, grund: "kein konkreter Anlass" };

  const websiteBeleg = pruefeFeld("website", raw.website, urls, "");
  const website = websiteBeleg.status === "offen" ? (k.website ?? "") : websiteBeleg.wert;
  const gf = pruefeFeld("gf", raw.gf, urls, website);
  const telefon = pruefeFeld("telefon", raw.telefon, urls, website);
  const ma = pruefeFeld("mitarbeiter", raw.mitarbeiter, urls, website);

  // Anrufbar heißt: richtige Person, richtige Nummer, richtiger Grund
  if (gf.status !== "fakt") return { ok: false, grund: "Geschäftsführung nicht aus Firmenbuch, WKO oder Impressum belegt" };
  if (telefon.status !== "fakt") return { ok: false, grund: "keine belegte Telefonnummer" };

  const maZahl = ma.status === "fakt" ? minMa(ma.wert) : undefined;
  if (maZahl !== undefined && maZahl < profile.minMitarbeiter) return { ok: false, grund: `nur ${maZahl} Mitarbeiter (Minimum ${profile.minMitarbeiter})` };

  const teilscores: Teilscore[] = KRITERIEN.map(({ key }) => ({
    kriterium: key,
    punkte: raw.scores?.[key]?.punkte ?? 0,
    begruendung: raw.scores?.[key]?.begruendung ?? "",
  }));
  const be = breakEven(raw.gewerk, profile);
  const warn = raw.warnhinweise?.trim();
  const offen = raw.offenePunkte?.trim();
  const hinweis = [warn ? `⚠ ${warn}` : "", offen ?? ""].filter(Boolean).join(" · ");
  const anlass = raw.anlassDatum?.trim() ? `${raw.anlass.trim()} (${raw.anlassDatum.trim()})` : raw.anlass.trim();

  return {
    ok: true,
    lead: {
      nr,
      name: firma,
      normName: normalizeName(firma),
      freigabe: "offen",
      status: "neu",
      score: gesamtScore(teilscores, profile.gewichte),
      ort: ortMitLand(raw.ort || k.ort, raw.bundesland || k.bundesland),
      anlass,
      einstiegssatz: raw.einstiegssatz?.trim() ?? "",
      gf: gf.wert,
      telefon: telefon.wert,
      website: website || "offen",
      ma: ma.wert,
      breakEven: be.text,
      hinweis,
      quelle: anlassUrl,
      crmPrioritaet: "",
      leadTyp: `Typ ${raw.leadTyp}`,
      imCrm: false,
      letzterKontakt: "",
      herkunft: `KI-Recherche ${formatDate(isoDate(now))}`,
      leadOwner: profile.leadOwner,
      gewerk: raw.gewerk,
      zweitprodukt: raw.zweitprodukt?.trim() || undefined,
      teilscores,
      breakEvenSzenarien: be.szenarien,
      belege: [{ feld: "anlass", wert: anlass, status: "fakt", quelle: anlassUrl }, gf, telefon, ma, websiteBeleg],
      runId,
    },
  };
}

/** Führt die Recherche aus. Liefert die Anzahl angenommener Leads. */
export async function runPipeline(d: PipelineDeps, runId: string): Promise<{ angenommen: number; verworfen: number }> {
  const now = d.now ?? new Date();
  const system = systemPrompt(d.profile, now);
  const bekannt = new Set(d.bekannteNamen);
  const ausschluss = [...bekannt];
  let usage: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, suchen: 0, abrufe: 0 };
  let angenommen = 0;
  let verworfen = 0;
  let geprueft = 0;
  let kandidatenGesamt = 0;
  let nr = d.naechsteNr;
  // Für die Dublettenprüfung nach der Verifizierung: Bekannte plus in diesem Lauf übernommene Firmen
  const vergeben = new Set(d.bekannteNamen);
  const maxRunden = Math.ceil(d.ziel / 10) + 2;
  const add = (u: Usage) => {
    usage = {
      inputTokens: usage.inputTokens + u.inputTokens,
      outputTokens: usage.outputTokens + u.outputTokens,
      cacheReadTokens: usage.cacheReadTokens + u.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens + u.cacheWriteTokens,
      suchen: usage.suchen + u.suchen,
      abrufe: usage.abrufe + u.abrufe,
    };
    d.onUsage(usage);
  };
  const budgetErreicht = () => d.kosten(usage) >= d.settings.maxKostenProLauf;

  for (let runde = 1; runde <= maxRunden && angenommen < d.ziel; runde++) {
    if (d.signal.aborted) break;
    if (budgetErreicht()) {
      d.onLog(`Kostenlimit von ${d.settings.maxKostenProLauf} $ erreicht – Lauf beendet.`, "warn");
      break;
    }
    const anzahl = Math.min(Math.max(8, Math.ceil((d.ziel - angenommen) * 1.6)), 25);
    d.onLog(`Runde ${runde}: suche bis zu ${anzahl} Kandidaten …`);
    const k = await d.provider.kandidaten(kandidatenPrompt(d.profile, anzahl, ausschluss, now), system, d.signal);
    add(k.usage);
    const neu: KandidatRaw[] = [];
    for (const c of k.data.kandidaten ?? []) {
      const n = normalizeName(c.firma);
      if (!n || bekannt.has(n)) continue;
      if (!isSeen(c.anlassQuelleUrl, k.urls)) {
        verworfen++;
        d.onLog(`${c.firma}: Anlass-Quelle nicht in den Suchergebnissen – verworfen`, "warn");
        continue;
      }
      bekannt.add(n);
      ausschluss.push(c.firma);
      neu.push(c);
    }
    kandidatenGesamt += neu.length;
    d.onProgress({ kandidaten: kandidatenGesamt, geprueft, angenommen });
    d.onLog(`${neu.length} neue Kandidaten mit belegtem Anlass.`, neu.length ? "info" : "warn");
    if (neu.length === 0) break;

    // Verifizieren, je zwei gleichzeitig
    for (let i = 0; i < neu.length && angenommen < d.ziel; i += 2) {
      if (d.signal.aborted || budgetErreicht()) break;
      const batch = neu.slice(i, i + 2);
      const results = await Promise.allSettled(
        batch.map((c) => d.provider.verifizieren(verifizierenPrompt(d.profile, c), system, d.signal)),
      );
      for (let j = 0; j < batch.length; j++) {
        const c = batch[j]!;
        const r = results[j]!;
        geprueft++;
        if (r.status === "rejected") {
          verworfen++;
          if (d.signal.aborted) break;
          d.onLog(`${c.firma}: Prüfung fehlgeschlagen (${r.reason instanceof Error ? r.reason.message : String(r.reason)})`, "fehler");
          continue;
        }
        add(r.value.usage);
        if (angenommen >= d.ziel) continue;
        const urls = new Set([...k.urls, ...r.value.urls]);
        const verdict = bewerte(r.value.data, c, urls, d.profile, vergeben, runId, nr, now);
        if (!verdict.ok) {
          verworfen++;
          d.onLog(`${c.firma}: verworfen – ${verdict.grund}`, "warn");
          continue;
        }
        await d.onLead(verdict.lead);
        vergeben.add(verdict.lead.normName);
        nr++;
        angenommen++;
        d.onLog(`${verdict.lead.name}: übernommen (Score ${verdict.lead.score})`, "ok");
      }
      d.onProgress({ kandidaten: kandidatenGesamt, geprueft, angenommen });
    }
  }
  return { angenommen, verworfen };
}

export function leererLauf(id: string, ziel: number, modell: ResearchRun["modell"]): ResearchRun {
  return {
    id,
    startedAt: new Date().toISOString(),
    status: "laeuft",
    ziel,
    modell,
    leadIds: [],
    verworfen: 0,
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, suchen: 0, abrufe: 0 },
    kostenUsd: 0,
    log: [],
  };
}
