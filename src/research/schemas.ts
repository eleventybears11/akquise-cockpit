/** JSON-Schemas für die strukturierten Antworten (output_config.format). */

const feld = {
  type: "object",
  additionalProperties: false,
  required: ["wert", "status", "quelleUrl"],
  properties: {
    wert: { type: "string" },
    status: { type: "string", enum: ["fakt", "hypothese", "offen"] },
    quelleUrl: { type: "string" },
  },
} as const;

const teil = {
  type: "object",
  additionalProperties: false,
  required: ["punkte", "begruendung"],
  properties: { punkte: { type: "integer" }, begruendung: { type: "string" } },
} as const;

export const GEWERKE = ["haustechnik", "pv", "elektro", "klima", "gebaeudetechnik", "dach", "erdbau", "sonstiges"] as const;

export const KANDIDATEN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["kandidaten"],
  properties: {
    kandidaten: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["firma", "ort", "bundesland", "website", "gewerk", "anlass", "anlassDatum", "anlassQuelleUrl"],
        properties: {
          firma: { type: "string" },
          ort: { type: "string" },
          bundesland: { type: "string" },
          website: { type: "string" },
          gewerk: { type: "string", enum: GEWERKE },
          anlass: { type: "string" },
          anlassDatum: { type: "string" },
          anlassQuelleUrl: { type: "string" },
        },
      },
    },
  },
} as const;

export const LEAD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "passt",
    "ausschlussgrund",
    "firma",
    "ort",
    "bundesland",
    "gewerk",
    "leadTyp",
    "anlass",
    "anlassDatum",
    "anlassQuelleUrl",
    "website",
    "gf",
    "telefon",
    "mitarbeiter",
    "scores",
    "einstiegssatz",
    "warnhinweise",
    "zweitprodukt",
    "offenePunkte",
  ],
  properties: {
    passt: { type: "boolean" },
    ausschlussgrund: { type: "string" },
    firma: { type: "string" },
    ort: { type: "string" },
    bundesland: { type: "string" },
    gewerk: { type: "string", enum: GEWERKE },
    leadTyp: { type: "string", enum: ["A", "B"] },
    anlass: { type: "string" },
    anlassDatum: { type: "string" },
    anlassQuelleUrl: { type: "string" },
    website: feld,
    gf: feld,
    telefon: feld,
    mitarbeiter: feld,
    scores: {
      type: "object",
      additionalProperties: false,
      required: ["wachstum", "produktFit", "leistungsfaehigkeit", "erreichbarkeit", "bedarf"],
      properties: { wachstum: teil, produktFit: teil, leistungsfaehigkeit: teil, erreichbarkeit: teil, bedarf: teil },
    },
    einstiegssatz: { type: "string" },
    warnhinweise: { type: "string" },
    zweitprodukt: { type: "string" },
    offenePunkte: { type: "string" },
  },
} as const;

export interface KandidatRaw {
  firma: string;
  ort: string;
  bundesland: string;
  website: string;
  gewerk: (typeof GEWERKE)[number];
  anlass: string;
  anlassDatum: string;
  anlassQuelleUrl: string;
}

interface FeldRaw {
  wert: string;
  status: "fakt" | "hypothese" | "offen";
  quelleUrl: string;
}

export interface LeadRaw {
  passt: boolean;
  ausschlussgrund: string;
  firma: string;
  ort: string;
  bundesland: string;
  gewerk: (typeof GEWERKE)[number];
  leadTyp: "A" | "B";
  anlass: string;
  anlassDatum: string;
  anlassQuelleUrl: string;
  website: FeldRaw;
  gf: FeldRaw;
  telefon: FeldRaw;
  mitarbeiter: FeldRaw;
  scores: Record<"wachstum" | "produktFit" | "leistungsfaehigkeit" | "erreichbarkeit" | "bedarf", { punkte: number; begruendung: string }>;
  einstiegssatz: string;
  warnhinweise: string;
  zweitprodukt: string;
  offenePunkte: string;
}
