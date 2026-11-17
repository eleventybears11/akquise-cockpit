/**
 * Datenschicht. Die UI greift nur über diese Funktionen auf Daten zu,
 * damit später ein CRM-Adapter (Project Manager) andocken kann.
 */
import { db } from "./db";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "./defaults";
import type { Backup, Call, CallResult, Company, Freigabe, Profile, Settings } from "./types";
import type { CompanyDraft } from "../lib/csv";

const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

export async function ensureDefaults(): Promise<void> {
  await db.transaction("rw", db.profiles, db.meta, async () => {
    if (!(await db.profiles.get(DEFAULT_PROFILE.id))) await db.profiles.put(DEFAULT_PROFILE);
    if (!(await db.meta.get("settings"))) await db.meta.put({ key: "settings", value: DEFAULT_SETTINGS });
  });
}

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.meta.get("settings"))?.value };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings();
  await db.meta.put({ key: "settings", value: { ...current, ...patch } });
}

export async function saveProfile(profile: Profile): Promise<void> {
  await db.profiles.put(profile);
}

export async function existingNormNames(): Promise<Set<string>> {
  const keys = await db.companies.orderBy("normName").keys();
  return new Set(keys as string[]);
}

export async function importDrafts(drafts: CompanyDraft[]): Promise<number> {
  const ts = now();
  const rows: Company[] = drafts.map((d) => ({ ...d, id: uid(), createdAt: ts, updatedAt: ts }));
  await db.companies.bulkAdd(rows);
  return rows.length;
}

export async function setFreigabe(ids: string[], freigabe: Freigabe): Promise<void> {
  await db.transaction("rw", db.companies, async () => {
    for (const id of ids) {
      const c = await db.companies.get(id);
      if (!c) continue;
      const status = freigabe === "rein" ? "anrufliste" : freigabe === "raus" ? "raus" : "neu";
      await db.companies.update(id, { freigabe, status, updatedAt: now() });
    }
  });
}

export async function updateCompany(id: string, patch: Partial<Company>): Promise<void> {
  await db.companies.update(id, { ...patch, updatedAt: now() });
}

/** Löscht einen Lead samt Anrufen (DSGVO: Löschung auf Wunsch). */
export async function deleteCompany(id: string): Promise<void> {
  await db.transaction("rw", db.companies, db.calls, async () => {
    await db.calls.where("companyId").equals(id).delete();
    await db.companies.delete(id);
  });
}

export interface LogCallInput {
  companyId: string;
  ergebnis: CallResult;
  gfGesprochen: boolean;
  notiz: string;
  wiedervorlage?: string;
}

/** Erfasst einen Anruf und setzt den Lead-Status entsprechend. */
export async function logCall(input: LogCallInput): Promise<Call> {
  return db.transaction("rw", db.companies, db.calls, async () => {
    const c = await db.companies.get(input.companyId);
    if (!c) throw new Error("Lead nicht gefunden");
    const ts = now();
    const call: Call = {
      id: uid(),
      companyId: c.id,
      ts,
      ergebnis: input.ergebnis,
      gfGesprochen: input.gfGesprochen,
      notiz: input.notiz.trim(),
      wiedervorlage: input.ergebnis === "wiedervorlage" ? input.wiedervorlage : undefined,
      vorher: {
        status: c.status,
        wiedervorlage: c.wiedervorlage,
        letzterVersuch: c.letzterVersuch,
        letzterKontakt: c.letzterKontakt,
      },
    };
    const label: Record<CallResult, string> = {
      nicht_erreicht: "nicht erreicht",
      absage: "Absage",
      wiedervorlage: "Wiedervorlage",
      termin: "Termin",
    };
    const datum = new Date(ts).toLocaleDateString("de-AT");
    const kontakt = `${datum}: ${label[input.ergebnis]}${call.notiz ? ` – ${call.notiz}` : ""}`;
    const patch: Partial<Company> = { updatedAt: ts };
    switch (input.ergebnis) {
      case "nicht_erreicht":
        patch.letzterVersuch = ts;
        // fällige Wiedervorlage bleibt fällig, sonst bleibt der Lead in der Anrufliste
        break;
      case "absage":
        patch.status = "absage";
        patch.wiedervorlage = undefined;
        patch.letzterKontakt = kontakt;
        break;
      case "wiedervorlage":
        if (!input.wiedervorlage) throw new Error("Wiedervorlage braucht ein Datum");
        patch.status = "wiedervorlage";
        patch.wiedervorlage = input.wiedervorlage;
        patch.letzterKontakt = kontakt;
        break;
      case "termin":
        patch.status = "termin";
        patch.wiedervorlage = undefined;
        patch.letzterKontakt = kontakt;
        break;
    }
    await db.calls.add(call);
    await db.companies.update(c.id, patch);
    return call;
  });
}

/** Macht einen erfassten Anruf rückgängig und stellt den vorherigen Zustand her. */
export async function undoCall(callId: string): Promise<void> {
  await db.transaction("rw", db.companies, db.calls, async () => {
    const call = await db.calls.get(callId);
    if (!call) return;
    await db.companies.update(call.companyId, { ...call.vorher, updatedAt: now() });
    await db.calls.delete(callId);
  });
}

export async function exportBackup(): Promise<Backup> {
  const [companies, calls, profiles, settings] = await Promise.all([
    db.companies.toArray(),
    db.calls.toArray(),
    db.profiles.toArray(),
    getSettings(),
  ]);
  return { app: "lead-cockpit", version: 1, exportedAt: now(), companies, calls, profiles, settings };
}

export function isBackup(value: unknown): value is Backup {
  const v = value as Partial<Backup> | null;
  return (
    !!v &&
    v.app === "lead-cockpit" &&
    v.version === 1 &&
    Array.isArray(v.companies) &&
    Array.isArray(v.calls) &&
    Array.isArray(v.profiles) &&
    typeof v.settings === "object"
  );
}

/** Ersetzt alle Daten durch das Backup. */
export async function restoreBackup(backup: Backup): Promise<void> {
  await db.transaction("rw", db.companies, db.calls, db.profiles, db.meta, async () => {
    await Promise.all([db.companies.clear(), db.calls.clear(), db.profiles.clear()]);
    await db.companies.bulkAdd(backup.companies);
    await db.calls.bulkAdd(backup.calls);
    await db.profiles.bulkAdd(backup.profiles);
    await db.meta.put({ key: "settings", value: { ...DEFAULT_SETTINGS, ...backup.settings } });
  });
  await ensureDefaults();
}

export async function deleteAll(): Promise<void> {
  await db.transaction("rw", db.companies, db.calls, async () => {
    await Promise.all([db.companies.clear(), db.calls.clear()]);
  });
}
