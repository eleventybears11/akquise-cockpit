import { describe, expect, it } from "vitest";
import { buildCallList, dayStats } from "./callList";
import { hasWarning, normalizeName, parsePhones, toUrl } from "./normalize";
import { addMonths, parseLooseDate } from "./dates";
import type { Call, Company } from "../data/types";

const base: Company = {
  id: "",
  name: "",
  normName: "",
  freigabe: "rein",
  status: "anrufliste",
  ort: "",
  anlass: "",
  einstiegssatz: "",
  gf: "",
  telefon: "",
  website: "",
  ma: "",
  breakEven: "",
  hinweis: "",
  quelle: "",
  crmPrioritaet: "",
  leadTyp: "",
  imCrm: false,
  letzterKontakt: "",
  herkunft: "",
  leadOwner: "",
  createdAt: "",
  updatedAt: "",
};
const lead = (p: Partial<Company>): Company => ({ ...base, ...p });

describe("Anrufliste", () => {
  const today = "2026-11-17";
  const list = [
    lead({ id: "score5", score: 5 }),
    lead({ id: "score9", score: 9 }),
    lead({ id: "prioA", crmPrioritaet: "A" }),
    lead({ id: "wvFaellig", status: "wiedervorlage", wiedervorlage: "2026-11-10" }),
    lead({ id: "wvSpaeter", status: "wiedervorlage", wiedervorlage: "2026-12-01" }),
    lead({ id: "nichtFrei", freigabe: "offen", status: "neu" }),
    lead({ id: "termin", status: "termin" }),
    lead({ id: "heuteVersucht", score: 10, letzterVersuch: new Date(2026, 10, 17, 14).toISOString() }),
    lead({ id: "wvHeuteVersucht", status: "wiedervorlage", wiedervorlage: "2026-11-01", letzterVersuch: new Date(2026, 10, 17, 15).toISOString() }),
  ];

  it("sortiert: fällige Wiedervorlagen, dann Score, dann Prio, heute versuchte zuletzt", () => {
    expect(buildCallList(list, today).map((c) => c.id)).toEqual(["wvFaellig", "score9", "score5", "prioA", "heuteVersucht", "wvHeuteVersucht"]);
  });

  it("zählt den Tag richtig", () => {
    const mk = (ergebnis: Call["ergebnis"], gf = false, ts = new Date(2026, 10, 17, 15).toISOString()): Call => ({
      id: Math.random().toString(),
      companyId: "x",
      ts,
      ergebnis,
      gfGesprochen: gf,
      notiz: "",
      vorher: { status: "anrufliste", letzterKontakt: "" },
    });
    const calls = [mk("nicht_erreicht"), mk("absage", true), mk("termin", true), mk("wiedervorlage"), mk("termin", true, new Date(2026, 10, 16, 15).toISOString())];
    expect(dayStats(calls, today)).toEqual({ versuche: 4, erreicht: 3, gfGespraeche: 2, termine: 1 });
  });
});

describe("Hilfsfunktionen", () => {
  it("normalisiert Firmennamen", () => {
    expect(normalizeName("Muster Gesellschaft m.b.H. (Demo-Installateur)")).toBe("muster");
    expect(normalizeName("DemoBau GmbH & Co KG")).toBe("demobau");
    expect(normalizeName("Müller Haustechnik")).toBe("mueller haustechnik");
  });

  it("zerlegt Telefonfelder", () => {
    expect(parsePhones("offen")).toEqual([]);
    expect(parsePhones("07242 00001 (Wasser) / 07242 00002 (Elektro)").map((p) => p.tel)).toEqual(["+43724200001", "+43724200002"]);
    expect(parsePhones("+43 1 000 11 22")[0]?.tel).toBe("+4310001122");
  });

  it("macht Links klickbar", () => {
    expect(toUrl("demo-elektro.example")).toBe("https://demo-elektro.example");
    expect(toUrl("example.at, 02.06.2026")).toBe("https://example.at");
    expect(toUrl("offen")).toBeUndefined();
  });

  it("erkennt sensible Hinweise", () => {
    expect(hasWarning("⚠ Demo: Vorgängerfirma insolvent")).toBe(true);
    expect(hasWarning("MA fehlt")).toBe(false);
  });

  it("rechnet Datumsangaben", () => {
    expect(parseLooseDate("22.3.2027")).toBe("2027-03-22");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
});
