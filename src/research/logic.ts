/**
 * Prüf- und Rechenlogik der KI-Recherche – bewusst ohne KI:
 * Quellen werden gegen die tatsächlichen Such-/Abrufergebnisse geprüft,
 * Score und Break-even rechnet die App selbst aus den Profil-Annahmen.
 */
import type { Beleg, BelegStatus, BreakEvenSzenario, Gewerk, Profile, ScoreKriterium, Teilscore } from "../data/types";
import { normalizeName } from "../lib/normalize";
import { toDomain } from "../lib/fullenrich";

export const KRITERIEN: { key: ScoreKriterium; label: string }[] = [
  { key: "wachstum", label: "Wachstumssignal" },
  { key: "produktFit", label: "Produkt-Fit" },
  { key: "leistungsfaehigkeit", label: "Wirtschaftl. Leistungsfähigkeit" },
  { key: "erreichbarkeit", label: "Erreichbarkeit GF" },
  { key: "bedarf", label: "Kurzfristiger Bedarf" },
];

/** URL-Vergleich ohne Protokoll, www, Anker, Query und Schrägstrich am Ende. */
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[#?].*$/, "")
    .replace(/\/+$/, "");
}

/** Wurde die Quelle in diesem Lauf wirklich gefunden/abgerufen? */
export function isSeen(url: string, seen: Set<string>): boolean {
  if (!url) return false;
  return seen.has(normalizeUrl(url));
}

/** Hosts, die für die Geschäftsführung als offizielle Quelle gelten (plus die eigene Website/Impressum). */
const OFFICIAL_GF_HOSTS = ["firmenbuch", "evi.gv.at", "justiz.gv.at", "wko.at", "firmen.wko.at", "handelsregister.de", "unternehmensregister.de"];

function host(url: string): string {
  try {
    return new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export interface RawFeld {
  wert: string;
  status: BelegStatus;
  quelleUrl: string;
}

/**
 * Prüft eine Aussage. Regeln:
 * - „Fakt“ nur, wenn die Quelle in den Ergebnissen dieses Laufs vorkommt.
 * - Namen und Nummern (gf, telefon, mitarbeiter) ohne geprüfte Quelle → „offen“, Wert wird verworfen.
 * - GF nur aus offizieller Quelle oder eigener Website als Fakt, sonst „Hypothese“.
 */
export function pruefeFeld(feld: Beleg["feld"], raw: RawFeld, seen: Set<string>, website: string): Beleg {
  const wert = (raw.wert ?? "").trim();
  const leer = !wert || /^offen$/i.test(wert);
  if (leer || raw.status === "offen") return { feld, wert: "offen", status: "offen", quelle: "" };
  const gesehen = isSeen(raw.quelleUrl, seen);
  const strikt = feld === "gf" || feld === "telefon" || feld === "mitarbeiter";
  if (!gesehen) {
    if (strikt) return { feld, wert: "offen", status: "offen", quelle: "", pruefung: "Quelle nicht in den Suchergebnissen – verworfen" };
    return { feld, wert, status: "hypothese", quelle: raw.quelleUrl, pruefung: "Quelle nicht in den Suchergebnissen" };
  }
  if (feld === "gf" && raw.status === "fakt") {
    const h = host(raw.quelleUrl);
    const eigeneSeite = !!website && h.endsWith(toDomain(website));
    if (!eigeneSeite && !OFFICIAL_GF_HOSTS.some((o) => h.includes(o))) {
      return { feld, wert, status: "hypothese", quelle: raw.quelleUrl, pruefung: "keine offizielle Quelle (Firmenbuch, WKO, Impressum)" };
    }
  }
  return { feld, wert, status: raw.status === "fakt" ? "fakt" : "hypothese", quelle: raw.quelleUrl };
}

export function clampPunkte(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

/** Gewichteter Score 0–10 aus den Teilscores (Gewichte aus dem Profil). */
export function gesamtScore(teil: Teilscore[], gewichte: Profile["gewichte"]): number {
  let sum = 0;
  let w = 0;
  for (const t of teil) {
    const g = gewichte[t.kriterium] ?? 0;
    sum += clampPunkte(t.punkte) * g;
    w += g;
  }
  return w === 0 ? 0 : Math.round(sum / w);
}

export function dbSchluessel(g: Gewerk | undefined): keyof Profile["dbAnnahmen"] {
  if (g === "pv") return "pv";
  if (g === "elektro") return "elektro";
  if (g === "haustechnik" || g === "klima" || g === "gebaeudetechnik") return "haustechnik";
  return "sonstiges";
}

/** Break-even = Mindestinvestition ÷ zusätzlicher Deckungsbeitrag pro Auftrag, aufgerundet. */
export function breakEven(gewerk: Gewerk | undefined, profile: Profile): { szenarien: BreakEvenSzenario[]; text: string } {
  const [von, bis] = profile.dbAnnahmen[dbSchluessel(gewerk)];
  const mitte = Math.round((von + bis) / 2);
  const calc = (db: number) => Math.ceil(profile.mindestinvestition / Math.max(1, db));
  const szenarien: BreakEvenSzenario[] = [
    { szenario: "konservativ", dbProAuftrag: von, auftraege: calc(von) },
    { szenario: "realistisch", dbProAuftrag: mitte, auftraege: calc(mitte) },
    { szenario: "optimistisch", dbProAuftrag: bis, auftraege: calc(bis) },
  ];
  return { szenarien, text: `~${szenarien[2]!.auftraege}–${szenarien[0]!.auftraege}` };
}

/** Mitarbeiterzahl aus einem Text („ca. 50“, „21–50“) – untere Grenze, sonst undefined. */
export function minMa(text: string): number | undefined {
  const m = text.match(/\d+/);
  return m ? Number(m[0]) : undefined;
}

export function istDublette(name: string, bekannt: Set<string>): boolean {
  const n = normalizeName(name);
  return !n || bekannt.has(n);
}

const KOSTEN: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};
/** USD pro Websuche (10 $ pro 1.000 Suchen) */
const SUCHE_USD = 0.01;

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  suchen: number;
  abrufe: number;
}

export const NULL_USAGE: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, suchen: 0, abrufe: 0 };

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    suchen: a.suchen + b.suchen,
    abrufe: a.abrufe + b.abrufe,
  };
}

/** Geschätzte Kosten in USD (Listenpreise; Cache-Lesen 10 %, Cache-Schreiben 125 %). */
export function kostenUsd(u: Usage, modell: string): number {
  const p = KOSTEN[modell];
  if (!p) return 0;
  const tokens =
    (u.inputTokens * p.input + u.cacheReadTokens * p.input * 0.1 + u.cacheWriteTokens * p.input * 1.25 + u.outputTokens * p.output) / 1_000_000;
  return tokens + u.suchen * SUCHE_USD;
}

/** Einfache Platzhalter-Ersetzung für die Prompt-Dateien: {{name}} */
export function render(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}
