/**
 * FullEnrich per CSV: Export der Geschäftsführer zum Hochladen in FullEnrich
 * und Rück-Import der Ergebnis-CSV. Die API ist aus dem Browser nicht nutzbar (keine CORS-Freigabe).
 */
import Papa from "papaparse";
import type { Company, Enrichment } from "../data/types";
import { isOpen, normalizeName, parsePhones, toUrl } from "./normalize";

export const ID_COLUMN = "Lead-Cockpit ID";

const TITLES = /^(ing|di|dipl|dipl-ing|dr|mag|prof|kr|bmst|bsc|msc|mba|ba|ma|dkfm|ök[-.]?rat|ökr|komm[-.]?rat|ing\(fh\)|di\(fh\))\.?$/i;

export interface Person {
  firstName: string;
  lastName: string;
}

function cleanTokens(s: string): string[] {
  return s
    .replace(/\(.*?\)/g, " ")
    .replace(/,\s*(BSc|MSc|MBA|BA|MA|PhD)\b/gi, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !TITLES.test(t.replace(/,$/, "")) && !/^(DI|Ing|Dr|Mag)\.?\(FH\)$/i.test(t));
}

/**
 * Zerlegt das GF-Feld in Personen.
 * „Roman Muster (Firmenbuch)“ → Roman / Muster
 * „Werner & Hanna Beispiel“ → Werner Beispiel, Hanna Beispiel
 * „Ing. A Muster; B Probe (Impressum)“ → zwei Personen
 */
export function parseGf(gf: string): Person[] {
  if (isOpen(gf)) return [];
  const withoutNotes = gf.replace(/\(.*?\)/g, " ");
  const parts = withoutNotes.split(/\s*[;,]\s*|\s+und\s+(?=\S+\s+\S+)|\s*\/\s*/).filter((p) => p.trim());
  const people: Person[] = [];
  for (const part of parts) {
    const amp = part.split(/\s*&\s*/);
    if (amp.length === 2) {
      const left = cleanTokens(amp[0]!);
      const right = cleanTokens(amp[1]!);
      // „Werner & Hanna Beispiel“: gemeinsamer Nachname
      if (left.length === 1 && right.length >= 2) {
        const last = right[right.length - 1]!;
        people.push({ firstName: left[0]!, lastName: last });
        people.push({ firstName: right.slice(0, -1).join(" "), lastName: last });
        continue;
      }
      for (const side of [left, right]) if (side.length >= 2) people.push({ firstName: side.slice(0, -1).join(" "), lastName: side[side.length - 1]! });
      continue;
    }
    const tokens = cleanTokens(part);
    if (tokens.length >= 2) people.push({ firstName: tokens.slice(0, -1).join(" "), lastName: tokens[tokens.length - 1]! });
  }
  return people;
}

/** „https://www.rora.at/kontakt“ → „rora.at“ */
export function toDomain(website: string): string {
  const url = toUrl(website);
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export interface ExportRow {
  companyId: string;
  firstName: string;
  lastName: string;
  companyName: string;
  domain: string;
}

export function buildExportRows(companies: Company[]): ExportRow[] {
  return companies.flatMap((c) =>
    parseGf(c.gf).map((p) => ({ companyId: c.id, firstName: p.firstName, lastName: p.lastName, companyName: c.name, domain: toDomain(c.website) })),
  );
}

export function exportCsv(rows: ExportRow[]): string {
  return Papa.unparse(
    rows.map((r) => ({
      "First Name": r.firstName,
      "Last Name": r.lastName,
      "Company Name": r.companyName,
      "Company Domain": r.domain,
      [ID_COLUMN]: r.companyId,
    })),
    { quotes: true },
  );
}

/** Spaltenart in der FullEnrich-Ergebnis-CSV */
export type ColumnKind = "id" | "first" | "last" | "company" | "domain" | "phone" | "email" | "";

export function guessColumnKinds(headers: string[]): Record<string, ColumnKind> {
  const kinds: Record<string, ColumnKind> = {};
  for (const h of headers) {
    const l = h.toLowerCase();
    let k: ColumnKind = "";
    if (h === ID_COLUMN) k = "id";
    else if (/status|type|region|confidence|rate|match|valid|source|date|count/.test(l)) k = "";
    else if (/phone|mobile|telefon|handy/.test(l)) k = "phone";
    else if (/e-?mail/.test(l)) k = "email";
    else if (/^first[ _]?name$|^vorname$/.test(l)) k = "first";
    else if (/^last[ _]?name$|^nachname$/.test(l)) k = "last";
    else if (/^company[ _]?name$|^firma$|^company$/.test(l)) k = "company";
    else if (/domain|website/.test(l)) k = "domain";
    kinds[h] = k;
  }
  return kinds;
}

export interface Finding {
  companyId: string;
  companyName: string;
  person: string;
  typ: "telefon" | "email";
  wert: string;
}

export interface EnrichPlan {
  neu: Finding[];
  bekannt: number;
  nichtZugeordnet: string[];
  zeilen: number;
}

const digits = (s: string) => s.replace(/\D/g, "").replace(/^(00)?43/, "0").replace(/^0+/, "");

function looksLikeEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Ordnet die Ergebnis-Zeilen Leads zu (über die Lead-Cockpit-ID, sonst Domain, sonst Firmenname)
 * und sammelt neue Telefonnummern/E-Mails. Bereits bekannte Werte werden übersprungen.
 */
export function planEnrichment(
  rows: Record<string, string>[],
  kinds: Record<string, ColumnKind>,
  companies: Company[],
  existing: Enrichment[],
): EnrichPlan {
  const col = (k: ColumnKind) => Object.keys(kinds).filter((h) => kinds[h] === k);
  const byId = new Map(companies.map((c) => [c.id, c]));
  const byDomain = new Map(companies.filter((c) => toDomain(c.website)).map((c) => [toDomain(c.website), c]));
  const byName = new Map(companies.map((c) => [c.normName, c]));
  const known = new Set<string>();
  for (const c of companies) for (const p of parsePhones(c.telefon)) known.add(`${c.id}|t|${digits(p.tel)}`);
  for (const e of existing) known.add(`${e.companyId}|${e.typ === "telefon" ? "t" : "e"}|${e.typ === "telefon" ? digits(e.wert) : e.wert.toLowerCase()}`);

  const plan: EnrichPlan = { neu: [], bekannt: 0, nichtZugeordnet: [], zeilen: rows.length };
  for (const row of rows) {
    const get = (k: ColumnKind) => col(k).map((h) => (row[h] ?? "").trim()).find(Boolean) ?? "";
    const company =
      byId.get(get("id")) ?? byDomain.get(toDomain(get("domain"))) ?? byName.get(normalizeName(get("company")));
    const person = `${get("first")} ${get("last")}`.trim();
    const values: { typ: Finding["typ"]; wert: string }[] = [];
    for (const h of col("phone")) for (const v of (row[h] ?? "").split(/\s*[;|]\s*/)) if (digits(v).length >= 6) values.push({ typ: "telefon", wert: v.trim() });
    for (const h of col("email")) for (const v of (row[h] ?? "").split(/\s*[;|,]\s*/)) if (looksLikeEmail(v.trim())) values.push({ typ: "email", wert: v.trim() });
    if (values.length === 0) continue;
    if (!company) {
      plan.nichtZugeordnet.push([person, get("company") || get("domain")].filter(Boolean).join(", ") || "unbekannte Zeile");
      continue;
    }
    for (const v of values) {
      const key = `${company.id}|${v.typ === "telefon" ? "t" : "e"}|${v.typ === "telefon" ? digits(v.wert) : v.wert.toLowerCase()}`;
      if (known.has(key)) {
        plan.bekannt++;
        continue;
      }
      known.add(key);
      plan.neu.push({ companyId: company.id, companyName: company.name, person, typ: v.typ, wert: v.wert });
    }
  }
  return plan;
}
