/**
 * Testmodus: liefert erfundene DEMO-Leads ohne API-Aufruf und ohne Kosten.
 * Enthält bewusst Fälle, die verworfen werden müssen (zu klein, unbelegte Quelle, passt nicht).
 */
import type { Provider } from "./pipeline";
import type { KandidatRaw, LeadRaw } from "./schemas";
import { NULL_USAGE, normalizeUrl } from "./logic";

const ORTE: [string, string][] = [
  ["Wels", "Oberösterreich"],
  ["Tulln", "Niederösterreich"],
  ["Wien 21", "Wien"],
  ["Steyr", "Oberösterreich"],
  ["Amstetten", "Niederösterreich"],
  ["Wien 10", "Wien"],
  ["Ried im Innkreis", "Oberösterreich"],
  ["Mödling", "Niederösterreich"],
];
const GEWERKE: KandidatRaw["gewerk"][] = ["haustechnik", "pv", "elektro", "klima"];
const ANLAESSE = ["neue Halle eröffnet", "Firmensitz erweitert", "zweite Generation übernimmt", "acht offene Stellen ausgeschrieben", "neuen Standort bezogen"];

let zaehler = 0;
const warte = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("Abgebrochen."));
    });
  });

export function demoProvider(verzoegerungMs = 150): Provider {
  return {
    async kandidaten(prompt, _system, signal) {
      await warte(verzoegerungMs, signal);
      const anzahl = Number(prompt.match(/bis zu (\d+)/)?.[1] ?? 10);
      const kandidaten: KandidatRaw[] = [];
      const urls = new Set<string>();
      for (let i = 0; i < anzahl; i++) {
        zaehler++;
        const [ort, bl] = ORTE[zaehler % ORTE.length]!;
        const url = `https://example.com/demo/news/${zaehler}`;
        // jeder 7. Kandidat hat eine Quelle, die nicht in den Suchergebnissen vorkommt
        if (zaehler % 7 !== 0) urls.add(normalizeUrl(url));
        kandidaten.push({
          firma: `DEMO Testbetrieb ${zaehler} GmbH`,
          ort,
          bundesland: bl,
          website: `https://demo${zaehler}.example.com`,
          gewerk: GEWERKE[zaehler % GEWERKE.length]!,
          anlass: `${ANLAESSE[zaehler % ANLAESSE.length]} (Demo)`,
          anlassDatum: "03/2026",
          anlassQuelleUrl: url,
        });
      }
      return { data: { kandidaten }, urls, usage: NULL_USAGE };
    },
    async verifizieren(prompt, _system, signal) {
      await warte(verzoegerungMs, signal);
      const firma = prompt.match(/Firma: (.+)/)?.[1]?.trim() ?? "DEMO";
      const n = Number(firma.match(/(\d+)/)?.[1] ?? 1);
      const site = `https://demo${n}.example.com`;
      const impressum = `${site}/impressum`;
      const urls = new Set([normalizeUrl(impressum), normalizeUrl(`https://example.com/demo/news/${n}`)]);
      const zuKlein = n % 5 === 0;
      const passt = n % 9 !== 0;
      const data: LeadRaw = {
        passt,
        ausschlussgrund: passt ? "" : "Filialist (Demo)",
        firma,
        ort: prompt.match(/Ort: (.+?) \(/)?.[1] ?? "",
        bundesland: prompt.match(/Ort: .+? \((.+?)\)/)?.[1] ?? "",
        gewerk: GEWERKE[n % GEWERKE.length]!,
        leadTyp: n % 3 === 0 ? "B" : "A",
        anlass: prompt.match(/Anlass laut Vorrecherche: (.+?) \(/)?.[1] ?? "",
        anlassDatum: "03/2026",
        anlassQuelleUrl: `https://example.com/demo/news/${n}`,
        website: { wert: site, status: "fakt", quelleUrl: impressum },
        gf: { wert: `Demo Geschäftsführer ${n}`, status: "fakt", quelleUrl: impressum },
        telefon: { wert: `07242 0000${String(n).padStart(2, "0")}`, status: "fakt", quelleUrl: impressum },
        mitarbeiter: n % 4 === 0 ? { wert: "", status: "offen", quelleUrl: "" } : { wert: zuKlein ? "5" : String(10 + (n % 40)), status: "fakt", quelleUrl: impressum },
        scores: {
          wachstum: { punkte: 6 + (n % 4), begruendung: "Demo: belegtes Ereignis" },
          produktFit: { punkte: 7, begruendung: "Demo: Zielbranche" },
          leistungsfaehigkeit: { punkte: 6, begruendung: "Demo: mittlere Größe" },
          erreichbarkeit: { punkte: 5 + (n % 3), begruendung: "Demo: Nummer im Impressum" },
          bedarf: { punkte: 5 + (n % 5), begruendung: "Demo: Wachstum braucht Aufträge" },
        },
        einstiegssatz: `„Sie haben zuletzt ${prompt.match(/Anlass laut Vorrecherche: (.+?) \(/)?.[1]?.replace(" (Demo)", "") ?? "investiert"}. Inwieweit hat das bisher so geklappt, wie Sie sich das vorgestellt haben?“`,
        warnhinweise: n % 11 === 0 ? "Demo: Vorgängerfirma insolvent" : "",
        zweitprodukt: n % 2 === 0 ? "Recruiting-Kampagne (Demo)" : "",
        offenePunkte: n % 4 === 0 ? "Mitarbeiterzahl offen" : "",
      };
      return { data, urls, usage: NULL_USAGE };
    },
  };
}
