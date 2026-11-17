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

export interface Profile {
  id: string;
  name: string;
  produkt: string;
  mindestinvestition: number;
  erstfrage: string;
  terminEmpfaenger: string[];
  leadOwner: string;
}

export interface Settings {
  aktivesProfil: string;
  tageszielVersuche: number;
  tageszielNeueLeads: number;
  startpaket: number;
  lastBackupAt?: string;
  theme: "system" | "hell" | "dunkel";
}

export interface Backup {
  app: "lead-cockpit";
  version: 1;
  exportedAt: string;
  companies: Company[];
  calls: Call[];
  profiles: Profile[];
  settings: Settings;
}
