import Papa from "papaparse";
import type { Company, Freigabe, LeadStatus } from "../data/types";
import { normalizeName, isOpen } from "./normalize";
import { parseLooseDate } from "./dates";

/** Felder, die aus einer CSV übernommen werden können, mit erkannten Spaltennamen. */
export const CSV_FIELDS = [
  { key: "nr", label: "Nr", aliases: ["nr", "nummer", "#"] },
  { key: "name", label: "Firma", aliases: ["firma", "firmenname", "unternehmen", "company"] },
  { key: "freigabe", label: "Freigabe", aliases: ["freigabe"] },
  { key: "score", label: "Score", aliases: ["score", "punkte"] },
  { key: "ort", label: "Ort (Land)", aliases: ["ort (land)", "ort", "standort"] },
  { key: "anlass", label: "Anlass + Datum", aliases: ["anlass + datum", "anlass", "anlass und datum"] },
  { key: "einstiegssatz", label: "Einstiegssatz", aliases: ["einstiegssatz", "einstieg"] },
  { key: "gf", label: "GF", aliases: ["gf", "geschäftsführung", "geschaeftsfuehrung", "geschäftsführer"] },
  { key: "telefon", label: "Telefon", aliases: ["telefon", "tel", "telefonnummer"] },
  { key: "website", label: "Website", aliases: ["website", "webseite", "url"] },
  { key: "ma", label: "MA", aliases: ["ma", "mitarbeiter", "mitarbeiterzahl"] },
  { key: "breakEven", label: "Break-even (Aufträge)", aliases: ["break-even (aufträge)", "break-even", "breakeven"] },
  { key: "hinweis", label: "Offene Punkte / Hinweis", aliases: ["offene punkte / hinweis", "offene punkte", "hinweis"] },
  { key: "quelle", label: "Quelle", aliases: ["quelle", "quellen"] },
  { key: "herkunft", label: "Status", aliases: ["status"] },
  { key: "crmPrioritaet", label: "CRM-Priorität", aliases: ["crm-priorität", "crm-prioritaet", "priorität"] },
  { key: "leadTyp", label: "Lead-Typ", aliases: ["lead-typ", "leadtyp", "typ"] },
  { key: "wiedervorlage", label: "Wiedervorlage", aliases: ["wiedervorlage", "wv"] },
  { key: "letzterKontakt", label: "Letzter Kontakt / Ergebnis", aliases: ["letzter kontakt / ergebnis", "letzter kontakt", "ergebnis"] },
  { key: "leadOwner", label: "Lead-Inhaber", aliases: ["lead-inhaber", "inhaber", "lead owner"] },
] as const;

export type CsvFieldKey = (typeof CSV_FIELDS)[number]["key"];
/** Zuordnung: CSV-Spaltenname → Feld (oder „ignorieren“) */
export type ColumnMapping = Record<string, CsvFieldKey | "">;

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t"],
    transformHeader: (h) => h.trim(),
  });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

/** Ordnet bekannte Spaltennamen automatisch zu. */
export function guessMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();
  for (const header of headers) {
    const h = header.trim().toLowerCase();
    const field = CSV_FIELDS.find((f) => !used.has(f.key) && (f.aliases as readonly string[]).includes(h));
    mapping[header] = field?.key ?? "";
    if (field) used.add(field.key);
  }
  return mapping;
}

export type CompanyDraft = Omit<Company, "id" | "createdAt" | "updatedAt">;

function pickStatus(freigabe: Freigabe, wiedervorlage: string | undefined, letzterKontakt: string): LeadStatus {
  if (freigabe === "offen") return "neu";
  if (freigabe === "raus") return "raus";
  const k = letzterKontakt.toLowerCase();
  if (k.includes("termin") && !/kein(en)? termin/.test(k)) return "termin";
  if (wiedervorlage) return "wiedervorlage";
  if (k.includes("absage")) return "absage";
  return "anrufliste";
}

function pickFreigabe(raw: string, imCrm: boolean): Freigabe {
  const v = raw.trim().toLowerCase();
  if (imCrm || ["rein", "ja", "x", "freigegeben"].includes(v)) return "rein";
  if (["raus", "nein", "abgelehnt"].includes(v)) return "raus";
  return "offen";
}

/** Wandelt CSV-Zeilen in Lead-Entwürfe um. Leere Firmennamen werden übersprungen. */
export function rowsToDrafts(rows: Record<string, string>[], mapping: ColumnMapping, defaultOwner: string): CompanyDraft[] {
  const drafts: CompanyDraft[] = [];
  for (const row of rows) {
    const get = (key: CsvFieldKey): string => {
      const header = Object.keys(mapping).find((h) => mapping[h] === key);
      return header ? (row[header] ?? "").trim() : "";
    };
    const name = get("name");
    if (!name) continue;
    const freigabeRaw = get("freigabe");
    const herkunft = get("herkunft");
    const imCrm = /im crm/i.test(freigabeRaw) || /im crm/i.test(herkunft);
    const freigabe = pickFreigabe(freigabeRaw, imCrm);
    const wiedervorlage = parseLooseDate(get("wiedervorlage"));
    const letzterKontakt = get("letzterKontakt");
    const scoreNum = Number.parseFloat(get("score").replace(",", "."));
    const nrNum = Number.parseInt(get("nr"), 10);
    drafts.push({
      nr: Number.isFinite(nrNum) ? nrNum : undefined,
      name,
      normName: normalizeName(name),
      freigabe,
      status: pickStatus(freigabe, wiedervorlage, letzterKontakt),
      score: Number.isFinite(scoreNum) ? scoreNum : undefined,
      ort: get("ort"),
      anlass: get("anlass"),
      einstiegssatz: get("einstiegssatz"),
      gf: get("gf"),
      telefon: get("telefon"),
      website: get("website"),
      ma: get("ma"),
      breakEven: get("breakEven"),
      hinweis: get("hinweis"),
      quelle: get("quelle"),
      crmPrioritaet: get("crmPrioritaet"),
      leadTyp: get("leadTyp"),
      imCrm,
      wiedervorlage,
      letzterKontakt: isOpen(letzterKontakt) ? "" : letzterKontakt,
      herkunft,
      leadOwner: get("leadOwner") || defaultOwner,
    });
  }
  return drafts;
}

export interface ImportPlan {
  neu: CompanyDraft[];
  dubletten: { draft: CompanyDraft; grund: string }[];
}

/** Trennt neue Leads von Dubletten (bereits in der App oder doppelt in der Datei). */
export function planImport(drafts: CompanyDraft[], existingNormNames: Set<string>): ImportPlan {
  const seen = new Set(existingNormNames);
  const plan: ImportPlan = { neu: [], dubletten: [] };
  for (const draft of drafts) {
    if (existingNormNames.has(draft.normName)) {
      plan.dubletten.push({ draft, grund: "schon in der App" });
    } else if (seen.has(draft.normName)) {
      plan.dubletten.push({ draft, grund: "doppelt in der Datei" });
    } else {
      seen.add(draft.normName);
      plan.neu.push(draft);
    }
  }
  return plan;
}

const STATUS_TEXT: Record<LeadStatus, string> = {
  neu: "Neu",
  anrufliste: "Anrufliste",
  wiedervorlage: "Wiedervorlage",
  termin: "Termin",
  absage: "Absage",
  raus: "Raus",
};

/** CSV-Export mit denselben Spalten wie der Import (plus Pipeline-Status). */
export function companiesToCsv(companies: Company[]): string {
  const freigabeText: Record<Freigabe, string> = { offen: "Offen", rein: "Rein", raus: "Raus" };
  const data = companies.map((c) => ({
    Nr: c.nr ?? "",
    Firma: c.name,
    Freigabe: c.imCrm ? "Im CRM" : freigabeText[c.freigabe],
    Score: c.score ?? "",
    "Ort (Land)": c.ort,
    "Anlass + Datum": c.anlass,
    Einstiegssatz: c.einstiegssatz,
    GF: c.gf,
    Telefon: c.telefon,
    Website: c.website,
    MA: c.ma,
    "Break-even (Aufträge)": c.breakEven,
    "Offene Punkte / Hinweis": c.hinweis,
    Quelle: c.quelle,
    Status: c.herkunft,
    "CRM-Priorität": c.crmPrioritaet,
    "Lead-Typ": c.leadTyp,
    Wiedervorlage: c.wiedervorlage ?? "",
    "Letzter Kontakt / Ergebnis": c.letzterKontakt,
    "Lead-Inhaber": c.leadOwner,
    "Pipeline-Status": STATUS_TEXT[c.status],
  }));
  return Papa.unparse(data, { quotes: true });
}
