/** Freigabe in der Freigabe-Tabelle. */
export type Freigabe = "offen" | "rein" | "raus";

/**
 * Pipeline-Status eines Leads.
 * - neu:           noch nicht freigegeben
 * - anrufliste:    freigegeben, wird angerufen
 * - wiedervorlage: wartet bis `wiedervorlage`-Datum, danach wieder in der Anrufliste
 * - termin:        Termin vereinbart (abgeschlossen)
 * - absage:        Absage (abgeschlossen)
 * - raus:          bei der Freigabe aussortiert
 */
export type LeadStatus = "neu" | "anrufliste" | "wiedervorlage" | "termin" | "absage" | "raus";

export type CallResult = "nicht_erreicht" | "absage" | "wiedervorlage" | "termin";

export type BelegStatus = "fakt" | "hypothese" | "offen";

/** Einzelne Aussage zu einem Lead mit Status und Quelle (aus der KI-Recherche). */
export interface Beleg {
  feld: "anlass" | "gf" | "telefon" | "mitarbeiter" | "website";
  wert: string;
  status: BelegStatus;
  quelle: string;
  /** Hinweis aus der Prüfung, z. B. „Quelle nicht in den Suchergebnissen“ */
  pruefung?: string;
}

export interface Teilscore {
  kriterium: ScoreKriterium;
  punkte: number;
  begruendung: string;
}

export type ScoreKriterium = "wachstum" | "produktFit" | "leistungsfaehigkeit" | "erreichbarkeit" | "bedarf";

export interface BreakEvenSzenario {
  szenario: "konservativ" | "realistisch" | "optimistisch";
  dbProAuftrag: number;
  auftraege: number;
}

export interface Company {
  id: string;
  nr?: number;
  name: string;
  /** normalisierter Name für die Dublettenprüfung */
  normName: string;
  freigabe: Freigabe;
  status: LeadStatus;
  score?: number;
  ort: string;
  anlass: string;
  einstiegssatz: string;
  gf: string;
  telefon: string;
  website: string;
  ma: string;
  breakEven: string;
  hinweis: string;
  quelle: string;
  crmPrioritaet: string;
  leadTyp: string;
  imCrm: boolean;
  /** Wiedervorlage-Datum als YYYY-MM-DD */
  wiedervorlage?: string;
  letzterKontakt: string;
  /** Status-Text aus dem Import (z. B. „Neu (Paket 1, 16.11.2026)“) */
  herkunft: string;
  leadOwner: string;
  /** Zeitpunkt des letzten „nicht erreicht“ (ISO), für die Reihenfolge in der Anrufliste */
  letzterVersuch?: string;
  /* --- ab M2 (KI-Recherche), alle optional --- */
  gewerk?: Gewerk;
  zweitprodukt?: string;
  teilscores?: Teilscore[];
  breakEvenSzenarien?: BreakEvenSzenario[];
  belege?: Beleg[];
  /** Recherche-Lauf, aus dem der Lead stammt */
  runId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Call {
  id: string;
  companyId: string;
  /** ISO-Zeitpunkt */
  ts: string;
  ergebnis: CallResult;
  gfGesprochen: boolean;
  notiz: string;
  wiedervorlage?: string;
  /** Zustand des Leads vor diesem Anruf, für „Rückgängig“ */
  vorher: Pick<Company, "status" | "wiedervorlage" | "letzterVersuch" | "letzterKontakt">;
}

export type Gewerk = "haustechnik" | "pv" | "elektro" | "klima" | "gebaeudetechnik" | "dach" | "erdbau" | "sonstiges";

export interface Profile {
  id: string;
  name: string;
  produkt: string;
  mindestinvestition: number;
  erstfrage: string;
  terminEmpfaenger: string[];
  leadOwner: string;
  /* --- ab M2: Regeln für die KI-Recherche --- */
  produktBeschreibung: string;
  referenz: string;
  gespraechsargument: string;
  zweitprodukte: string;
  branchen: string[];
  gebiete: string[];
  minMitarbeiter: number;
  wachstumssignale: string;
  /** Deckungsbeitrag pro zusätzlichem Auftrag in €, [von, bis] */
  dbAnnahmen: Record<"haustechnik" | "pv" | "elektro" | "sonstiges", [number, number]>;
  gewichte: Record<ScoreKriterium, number>;
}

export interface Settings {
  aktivesProfil: string;
  tageszielVersuche: number;
  tageszielNeueLeads: number;
  startpaket: number;
  lastBackupAt?: string;
  theme: "system" | "hell" | "dunkel";
  /* --- ab M2 --- */
  modell: ModellId;
  aufwand: "low" | "medium" | "high";
  testmodus: boolean;
  /** Abbruch eines Laufs, wenn die geschätzten Kosten diesen Betrag (USD) übersteigen */
  maxKostenProLauf: number;
}

export type ModellId = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5";

export interface RunLogEntry {
  ts: string;
  text: string;
  art?: "info" | "ok" | "warn" | "fehler";
}

export interface ResearchRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  status: "laeuft" | "fertig" | "abgebrochen" | "fehler";
  ziel: number;
  modell: ModellId | "test";
  leadIds: string[];
  verworfen: number;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; suchen: number; abrufe: number };
  kostenUsd: number;
  log: RunLogEntry[];
  fehler?: string;
}

export interface Exclusion {
  normName: string;
  name: string;
  quelle: string;
}

/** Kontaktdaten aus einer externen Quelle (z. B. FullEnrich), getrennt von den Stammdaten. */
export interface Enrichment {
  id: string;
  companyId: string;
  /** Person, zu der die Angabe gehört */
  person: string;
  typ: "telefon" | "email";
  wert: string;
  quelle: string;
  importedAt: string;
}

export interface Backup {
  app: "lead-cockpit";
  version: 1;
  exportedAt: string;
  companies: Company[];
  calls: Call[];
  /** ab App-Version mit FullEnrich; fehlt in älteren Backups */
  enrichments?: Enrichment[];
  runs?: ResearchRun[];
  exclusions?: Exclusion[];
  profiles: Profile[];
  settings: Settings;
}
