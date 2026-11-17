import type { Profile, Settings } from "./types";

/** Erstes Profil. Weitere Auftraggeber/Produkte kommen als weitere Profile dazu. */
export const DEFAULT_PROFILE: Profile = {
  id: "webformance-auftragsplus",
  name: "Webformance – AuftragsPlus",
  produkt: "AuftragsPlus",
  mindestinvestition: 10970,
  erstfrage: "Inwieweit hat das bisher so geklappt, wie Sie sich das vorgestellt haben?",
  terminEmpfaenger: ["Jan Grimm", "Leon Haider"],
  leadOwner: "David Parikyan",
  produktBeschreibung:
    "AuftragsPlus von Webformance: Sichtbarkeit (Google, lokales SEO, KI-Assistenten), Website mit bis zu 6 Leistungsseiten und 10 Ortsseiten, Anfrage-Funnel mit Rechner, monatliches Reporting. 8.900 € netto Setup plus 690 € netto/Monat, Mindestlaufzeit 3 Monate (mindestens 10.970 € netto). Go-Live nach etwa 6 Wochen. Optional Google Ads 490 €/Monat plus Werbebudget. Gebietsschutz je Gewerk und Einzugsgebiet.",
  referenz:
    "Jänichen GmbH, Berlin (Heizung, Wärmepumpen, PV): 390 Rechner-Anfragen in 24 Monaten und 75 Bewerbungen. Referenzbeispiel, keine Garantie, keine ROI-Behauptung.",
  gespraechsargument: "Potenzialanalyse vor Ort",
  zweitprodukte: "andere Webformance-Leistungen (z. B. Recruiting-Kampagnen, Google Ads)",
  branchen: ["Wärmepumpen", "Heizung/Sanitär", "Photovoltaik", "Elektrotechnik", "Klima/Lüftung", "Gebäudetechnik", "Dach/Fassade", "Kran/Erdbau"],
  gebiete: ["Oberösterreich", "Niederösterreich", "Wien"],
  minMitarbeiter: 8,
  wachstumssignale:
    "Neubau, Hallen- oder Standorterweiterung, neue Geschäftsfelder, Übernahme der Geschäftsführung, viele oder lange offene Stellen, Investitionen – belegt in den letzten 2–3 Jahren. Firmen, die nur Bestandskunden abwickeln, fliegen raus. Eine schlechte Website allein macht noch keinen Lead.",
  dbAnnahmen: { haustechnik: [2000, 4000], pv: [1500, 3000], elektro: [1000, 2500], sonstiges: [1500, 3000] },
  gewichte: { wachstum: 3, produktFit: 2, leistungsfaehigkeit: 2, erreichbarkeit: 1, bedarf: 2 },
};

export const DEFAULT_SETTINGS: Settings = {
  aktivesProfil: DEFAULT_PROFILE.id,
  tageszielVersuche: 60,
  tageszielNeueLeads: 18,
  startpaket: 60,
  theme: "system",
  modell: "claude-opus-5-5",
  aufwand: "medium",
  testmodus: false,
  maxKostenProLauf: 15,
};
