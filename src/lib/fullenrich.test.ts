import { describe, expect, it } from "vitest";
import { buildExportRows, exportCsv, guessColumnKinds, parseGf, planEnrichment, toDomain, ID_COLUMN } from "./fullenrich";
import { parseCsv } from "./csv";
import type { Company, Enrichment } from "../data/types";

const company = (p: Partial<Company>): Company =>
  ({
    id: "x",
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
    leadOwner: "David Parikyan",
    createdAt: "",
    updatedAt: "",
    ...p,
  }) as Company;

describe("GF-Feld zerlegen", () => {
  it.each([
    ["Roman Demo (Firmenbuch)", [["Roman", "Demo"]]],
    ["Thomas Muster (Firmenbuch, seit 15.08.2025)", [["Thomas", "Muster"]]],
    ["DI Lukas Probe (nur kompany, prüfen)", [["Lukas", "Probe"]]],
    ["Werner & Hanna Beispiel (Firmenbuch)", [["Werner", "Beispiel"], ["Hanna", "Beispiel"]]],
    ["Ing. Michael Demo, Karl-Heinz Test (Firmenbuch, Zuordnung wahrscheinlich)", [["Michael", "Demo"], ["Karl-Heinz", "Test"]]],
    ["Johannes Muster (Wasser & Wärme, Firmenbuch); Johann Probe-Demo (Elektro, Impressum)", [["Johannes", "Muster"], ["Johann", "Probe-Demo"]]],
    ["Ing. Savaş Beispiel (Impressum; Vertretung ungeprüft)", [["Savaş", "Beispiel"]]],
    ["offen", []],
    ["Muster", []],
  ])("%s", (gf, expected) => {
    expect(parseGf(gf).map((p) => [p.firstName, p.lastName])).toEqual(expected);
  });
});

describe("FullEnrich Export/Import", () => {
  const leads = [
    company({ id: "a", name: "DEMO Alpen GmbH", normName: "demo alpen", gf: "Anna Demo (Firmenbuch)", website: "https://www.alpen-demo.example/kontakt", telefon: "07242 000001" }),
    company({ id: "b", name: "DEMO Donau KG", normName: "demo donau", gf: "Bernd & Clara Muster", website: "donau-demo.example" }),
    company({ id: "c", name: "DEMO Ohne GF", normName: "demo ohne gf", gf: "offen" }),
  ];

  it("exportiert eine Zeile pro Person mit Domain und ID", () => {
    expect(toDomain("https://www.alpen-demo.example/kontakt")).toBe("alpen-demo.example");
    const rows = buildExportRows(leads);
    expect(rows.map((r) => `${r.firstName} ${r.lastName} @ ${r.domain}`)).toEqual([
      "Anna Demo @ alpen-demo.example",
      "Bernd Muster @ donau-demo.example",
      "Clara Muster @ donau-demo.example",
    ]);
    expect(exportCsv(rows).split(/\r?\n/)[0]).toBe(`"First Name","Last Name","Company Name","Company Domain","${ID_COLUMN}"`);
  });

  it("ordnet Ergebnisse zu und überspringt Bekanntes", () => {
    const csv = `First Name,Last Name,Company Name,Company Domain,${ID_COLUMN},Mobile Phone,Phone Status,Work Email,Work Email Status
Anna,Demo,DEMO Alpen GmbH,alpen-demo.example,a,+43 664 0000001,ACTIVE,anna@alpen-demo.example,DELIVERABLE
Anna,Demo,DEMO Alpen GmbH,alpen-demo.example,a,+43 7242 000001,ACTIVE,,
Bernd,Muster,DEMO Donau KG,donau-demo.example,,+43 676 0000002,ACTIVE,,
Clara,Muster,DEMO Donau KG,donau-demo.example,b,,,clara@donau-demo.example,DELIVERABLE
Fremd,Person,Andere GmbH,andere.example,,+43 699 0000009,ACTIVE,,`;
    const p = parseCsv(csv);
    const kinds = guessColumnKinds(p.headers);
    expect(kinds).toMatchObject({ "Mobile Phone": "phone", "Phone Status": "", "Work Email": "email", "Work Email Status": "", [ID_COLUMN]: "id", "Company Domain": "domain" });
    const existing: Enrichment[] = [{ id: "e", companyId: "b", person: "Clara Muster", typ: "email", wert: "Clara@donau-demo.example", quelle: "FullEnrich", importedAt: "" }];
    const plan = planEnrichment(p.rows, kinds, leads, existing);
    expect(plan.neu.map((f) => `${f.companyId}:${f.typ}:${f.wert}`)).toEqual([
      "a:telefon:+43 664 0000001",
      "a:email:anna@alpen-demo.example",
      "b:telefon:+43 676 0000002",
    ]);
    // Festnetz der Firma und Claras E-Mail sind schon bekannt
    expect(plan.bekannt).toBe(2);
    expect(plan.nichtZugeordnet).toEqual(["Fremd Person, Andere GmbH"]);
  });
});
