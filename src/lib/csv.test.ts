import { describe, expect, it } from "vitest";
import { companiesToCsv, guessMapping, parseCsv, planImport, rowsToDrafts } from "./csv";
import type { Company } from "../data/types";

// Demo-Daten (erfunden), gleiche Spalten wie die echte Lead-Tabelle
const CSV = `"Nr","Firma","Freigabe","Score","Ort (Land)","Anlass + Datum","Einstiegssatz","GF","Telefon","Website","MA","Break-even (Aufträge)","Offene Punkte / Hinweis","Quelle","Status","CRM-Priorität","Lead-Typ","Wiedervorlage","Letzter Kontakt / Ergebnis","Lead-Inhaber"
"1","Demo Haustechnik GmbH","Offen","9","Linz (OÖ)","Neubau Halle (03/2026)","„Sie haben gebaut. Wie läuft es?“","Max Demo (Firmenbuch)","0732 123456","https://demo-haustechnik.example","40","~3–6","","https://example.com/news","Neu (Paket 1, 16.11.2026)","","","","","David Parikyan"
"2","Beispiel Elektro","Im CRM","","Wien 10","Kein datiertes Ereignis","","offen","+43 1 555 55","beispiel.example","offen","~3–6","","beispiel.example","Im CRM (angelegt 10.11.2026)","A","Typ A","2027-03-22","10.11.2026: kein Budget, Interesse ab Frühjahr 2027","David Parikyan"
"3","Muster PV GmbH","Im CRM","","Graz","x","","Eva Muster","0316 1","","","","","","Im CRM","C","Typ B","","11.11.2026: faktisch Absage über Zentrale",""
"4","Probe Klima GmbH","Im CRM","","Wels","x","","","07242 1","","","","","","Im CRM","B","Typ B","","noch nicht angerufen","David Parikyan"
"5","Demo Haustechnik Ges.m.b.H.","Offen","5","Linz","x","","","","","","","","","","","","","",""`;

describe("CSV-Import", () => {
  const parsed = parseCsv(CSV);
  const mapping = guessMapping(parsed.headers);

  it("erkennt alle Spalten der Lead-Tabelle automatisch", () => {
    expect(parsed.rows).toHaveLength(5);
    expect(Object.values(mapping).filter((v) => v === "")).toHaveLength(0);
    expect(mapping["Anlass + Datum"]).toBe("anlass");
    expect(mapping["Status"]).toBe("herkunft");
  });

  it("setzt Freigabe, Status, Wiedervorlage und Lead-Inhaber richtig", () => {
    const drafts = rowsToDrafts(parsed.rows, mapping, "David Parikyan");
    const [neu, wv, absage, anruf] = drafts;
    expect(neu).toMatchObject({ freigabe: "offen", status: "neu", score: 9, nr: 1, imCrm: false });
    expect(wv).toMatchObject({ freigabe: "rein", status: "wiedervorlage", wiedervorlage: "2027-03-22", imCrm: true, score: undefined });
    expect(absage).toMatchObject({ status: "absage", leadOwner: "David Parikyan" });
    expect(anruf).toMatchObject({ status: "anrufliste", letzterKontakt: "noch nicht angerufen" });
  });

  it("erkennt Dubletten trotz anderer Rechtsform-Schreibweise", () => {
    const drafts = rowsToDrafts(parsed.rows, mapping, "David Parikyan");
    const plan = planImport(drafts, new Set(["probe klima"]));
    expect(plan.neu.map((d) => d.name)).toEqual(["Demo Haustechnik GmbH", "Beispiel Elektro", "Muster PV GmbH"]);
    expect(plan.dubletten.map((d) => d.grund)).toEqual(["schon in der App", "doppelt in der Datei"]);
  });

  it("liest Semikolon-CSV (Excel AT)", () => {
    const p = parseCsv("Firma;Telefon\nA GmbH;01 2345\nB OG;02 3456");
    expect(p.rows).toHaveLength(2);
    expect(guessMapping(p.headers)).toEqual({ Firma: "name", Telefon: "telefon" });
  });

  it("Export und Re-Import ergeben dieselben Daten", () => {
    const drafts = rowsToDrafts(parsed.rows, mapping, "David Parikyan");
    const companies = drafts.map((d, i) => ({ ...d, id: String(i), createdAt: "", updatedAt: "" })) as Company[];
    const again = parseCsv(companiesToCsv(companies));
    const redrafts = rowsToDrafts(again.rows, guessMapping(again.headers), "David Parikyan");
    expect(redrafts.map(({ name, status, wiedervorlage, freigabe }) => ({ name, status, wiedervorlage, freigabe }))).toEqual(
      drafts.map(({ name, status, wiedervorlage, freigabe }) => ({ name, status, wiedervorlage, freigabe })),
    );
  });
});
