import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "../data/defaults";
import { breakEven, gesamtScore, kostenUsd, normalizeUrl, pruefeFeld } from "./logic";
import { bewerte, kandidatenPrompt, runPipeline, systemPrompt } from "./pipeline";
import { demoProvider } from "./demo";
import type { KandidatRaw, LeadRaw } from "./schemas";

const seen = (...u: string[]) => new Set(u.map(normalizeUrl));

describe("Quellenprüfung", () => {
  it("Fakt nur mit gesehener Quelle, Namen/Nummern sonst verworfen", () => {
    const s = seen("https://www.demo.example/impressum");
    expect(pruefeFeld("telefon", { wert: "0732 1", status: "fakt", quelleUrl: "https://demo.example/impressum/" }, s, "demo.example")).toMatchObject({ status: "fakt", wert: "0732 1" });
    expect(pruefeFeld("telefon", { wert: "0732 1", status: "fakt", quelleUrl: "https://erfunden.example" }, s, "")).toMatchObject({ status: "offen", wert: "offen" });
    expect(pruefeFeld("website", { wert: "demo.example", status: "fakt", quelleUrl: "https://erfunden.example" }, s, "")).toMatchObject({ status: "hypothese" });
  });

  it("GF nur aus offizieller Quelle oder eigener Website als Fakt", () => {
    const s = seen("https://www.wko.at/ooe/news/demo", "https://news.example/artikel", "https://demo.example/impressum");
    expect(pruefeFeld("gf", { wert: "A B", status: "fakt", quelleUrl: "https://www.wko.at/ooe/news/demo" }, s, "")).toMatchObject({ status: "fakt" });
    expect(pruefeFeld("gf", { wert: "A B", status: "fakt", quelleUrl: "https://demo.example/impressum" }, s, "https://www.demo.example")).toMatchObject({ status: "fakt" });
    expect(pruefeFeld("gf", { wert: "A B", status: "fakt", quelleUrl: "https://news.example/artikel" }, s, "")).toMatchObject({ status: "hypothese" });
  });
});

describe("Score, Break-even, Kosten", () => {
  it("gewichteter Score", () => {
    const t = [
      { kriterium: "wachstum" as const, punkte: 10, begruendung: "" },
      { kriterium: "produktFit" as const, punkte: 5, begruendung: "" },
      { kriterium: "leistungsfaehigkeit" as const, punkte: 5, begruendung: "" },
      { kriterium: "erreichbarkeit" as const, punkte: 0, begruendung: "" },
      { kriterium: "bedarf" as const, punkte: 15, begruendung: "" },
    ];
    // (10*3 + 5*2 + 5*2 + 0*1 + 10*2) / 10 = 7
    expect(gesamtScore(t, DEFAULT_PROFILE.gewichte)).toBe(7);
  });

  it("Break-even aus Profil-Annahmen, aufgerundet", () => {
    const be = breakEven("pv", DEFAULT_PROFILE);
    expect(be.szenarien.map((s) => s.auftraege)).toEqual([8, 5, 4]); // 10970/1500, /2250, /3000
    expect(be.text).toBe("~4–8");
    expect(breakEven("klima", DEFAULT_PROFILE).text).toBe("~3–6");
  });

  it("Kosten", () => {
    const u = { inputTokens: 1_000_000, outputTokens: 100_000, cacheReadTokens: 0, cacheWriteTokens: 0, suchen: 50, abrufe: 3 };
    expect(kostenUsd(u, "claude-opus-5-5")).toBeCloseTo(4 + 2 + 0.5);
  });
});

describe("Prompts", () => {
  it("enthalten Profilregeln und Ausschlussliste", () => {
    const now = new Date(2026, 10, 17);
    expect(systemPrompt(DEFAULT_PROFILE, now)).toContain("17.11.2026");
    const p = kandidatenPrompt(DEFAULT_PROFILE, 12, ["demo alpen"], now);
    expect(p).toContain("bis zu 12");
    expect(p).toContain("Oberösterreich, Niederösterreich, Wien");
    expect(p).toContain("seit 2023");
    expect(p).toContain("demo alpen");
    expect(p).not.toContain("{{");
  });
});

describe("Bewertung eines Kandidaten", () => {
  const k: KandidatRaw = { firma: "DEMO X GmbH", ort: "Wels", bundesland: "Oberösterreich", website: "", gewerk: "pv", anlass: "Halle", anlassDatum: "2026", anlassQuelleUrl: "https://n.example/1" };
  const raw: LeadRaw = {
    passt: true,
    ausschlussgrund: "",
    firma: "DEMO X GmbH",
    ort: "Wels",
    bundesland: "Oberösterreich",
    gewerk: "pv",
    leadTyp: "A",
    anlass: "Neue Halle",
    anlassDatum: "03/2026",
    anlassQuelleUrl: "https://n.example/1",
    website: { wert: "https://x.example", status: "fakt", quelleUrl: "https://x.example/impressum" },
    gf: { wert: "Max Demo", status: "fakt", quelleUrl: "https://x.example/impressum" },
    telefon: { wert: "07242 1", status: "fakt", quelleUrl: "https://x.example/impressum" },
    mitarbeiter: { wert: "ca. 30", status: "fakt", quelleUrl: "https://x.example/impressum" },
    scores: { wachstum: { punkte: 8, begruendung: "" }, produktFit: { punkte: 8, begruendung: "" }, leistungsfaehigkeit: { punkte: 8, begruendung: "" }, erreichbarkeit: { punkte: 8, begruendung: "" }, bedarf: { punkte: 8, begruendung: "" } },
    einstiegssatz: "„Sie haben gebaut. Wie läuft es?“",
    warnhinweise: "",
    zweitprodukt: "",
    offenePunkte: "",
  };
  const urls = seen("https://n.example/1", "https://x.example/impressum");
  const now = new Date(2026, 10, 17);

  it("übernimmt einen belegten Lead mit Lead-Inhaber", () => {
    const v = bewerte(raw, k, urls, DEFAULT_PROFILE, new Set(), "run", 22, now);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.lead).toMatchObject({ name: "DEMO X GmbH", ort: "Wels (OÖ)", score: 8, breakEven: "~4–8", leadOwner: "David Parikyan", gf: "Max Demo", freigabe: "offen", status: "neu", nr: 22 });
  });

  it("verwirft unbelegten Anlass, zu kleine Firmen und Dubletten", () => {
    expect(bewerte(raw, k, seen("https://x.example/impressum"), DEFAULT_PROFILE, new Set(), "r", 1, now)).toMatchObject({ ok: false });
    expect(bewerte({ ...raw, mitarbeiter: { ...raw.mitarbeiter, wert: "5" } }, k, urls, DEFAULT_PROFILE, new Set(), "r", 1, now)).toMatchObject({ ok: false, grund: expect.stringContaining("5 Mitarbeiter") });
    expect(bewerte(raw, k, urls, DEFAULT_PROFILE, new Set(["demo x"]), "r", 1, now)).toMatchObject({ ok: false, grund: expect.stringContaining("Dublette") });
    expect(bewerte({ ...raw, passt: false, ausschlussgrund: "Konzern" }, k, urls, DEFAULT_PROFILE, new Set(), "r", 1, now)).toMatchObject({ ok: false, grund: "Konzern" });
  });

  it("verwirft Leads ohne belegte Telefonnummer oder Geschäftsführung", () => {
    // erfundene Nummer (Quelle nie gesehen) → offen → nicht anrufbar
    expect(bewerte({ ...raw, telefon: { wert: "0699 999", status: "fakt", quelleUrl: "https://nirgends.example" } }, k, urls, DEFAULT_PROFILE, new Set(), "r", 1, now)).toMatchObject({ ok: false, grund: "keine belegte Telefonnummer" });
    // GF nur aus einem Zeitungsartikel → Hypothese → nicht übernommen
    const presse = seen("https://n.example/1", "https://x.example/impressum", "https://zeitung.example/artikel");
    expect(bewerte({ ...raw, gf: { wert: "Max Demo", status: "fakt", quelleUrl: "https://zeitung.example/artikel" } }, k, presse, DEFAULT_PROFILE, new Set(), "r", 1, now)).toMatchObject({ ok: false, grund: expect.stringContaining("Geschäftsführung") });
    expect(bewerte({ ...raw, gf: { wert: "", status: "offen", quelleUrl: "" } }, k, urls, DEFAULT_PROFILE, new Set(), "r", 1, now)).toMatchObject({ ok: false });
  });
});

describe("Pipeline im Testmodus", () => {
  it("liefert das Ziel, verwirft Ungeeignete und schlägt keine Dubletten vor", async () => {
    const leads: string[] = [];
    const logs: string[] = [];
    const res = await runPipeline(
      {
        provider: demoProvider(0),
        profile: DEFAULT_PROFILE,
        settings: DEFAULT_SETTINGS,
        ziel: 10,
        bekannteNamen: new Set(),
        naechsteNr: 1,
        signal: new AbortController().signal,
        kosten: () => 0,
        onLog: (t) => logs.push(t),
        onUsage: () => {},
        onLead: async (l) => {
          leads.push(l.normName);
        },
        onProgress: () => {},
      },
      "run",
    );
    expect(res.angenommen).toBe(10);
    expect(new Set(leads).size).toBe(10);
    expect(res.verworfen).toBeGreaterThan(0);
    expect(logs.some((l) => l.includes("verworfen"))).toBe(true);
  });
});
