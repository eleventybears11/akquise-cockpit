import type { Profile } from "../data/types";
import { formatDate, isoDate } from "./dates";

/** CSV-Spalten, die der Import der App erkennt (gleiche Reihenfolge wie Davids Lead-Tabelle). */
export const IMPORT_SPALTEN = [
  "Nr",
  "Firma",
  "Freigabe",
  "Score",
  "Ort (Land)",
  "Anlass + Datum",
  "Einstiegssatz",
  "GF",
  "Telefon",
  "Website",
  "MA",
  "Break-even (Aufträge)",
  "Offene Punkte / Hinweis",
  "Quelle",
  "Status",
  "CRM-Priorität",
  "Lead-Typ",
  "Wiedervorlage",
  "Letzter Kontakt / Ergebnis",
  "Lead-Inhaber",
];

/**
 * Recherche-Auftrag zum Einfügen in Claude (claude.ai oder Claude Code), wenn kein API-Key hinterlegt ist.
 * Enthält die Regeln aus dem Profil, die schon bekannten Firmen und das exakte CSV-Format für den Import.
 */
export function claudeAuftrag(profile: Profile, anzahl: number, bekannteFirmen: string[], naechsteNr: number, now = new Date()): string {
  const [hv, hb] = profile.dbAnnahmen.haustechnik;
  const [pv, pb] = profile.dbAnnahmen.pv;
  const [ev, eb] = profile.dbAnnahmen.elektro;
  const heute = formatDate(isoDate(now));
  return `Recherchiere ${anzahl} neue B2B-Leads für die telefonische Kaltakquise von ${profile.leadOwner} (${profile.produkt}). Nutze die Websuche und öffne die Quellen.

PRODUKT
${profile.produktBeschreibung}
Referenz (keine Garantie): ${profile.referenz}

ZIELGRUPPE
- Branchen (Priorität): ${profile.branchen.join(", ")}
- Gebiete: ${profile.gebiete.join(", ")}
- Mindestens ${profile.minMitarbeiter} Mitarbeiter, ideal 10–80, inhabergeführt, eigene Monteure, keine Filialisten oder Konzerne
- Wichtigster Filter: ${profile.wachstumssignale}

PFLICHT FÜR JEDEN LEAD (sonst weglassen)
1. Richtiger Grund: konkreter, datierter Anlass mit Quellen-URL (z. B. Neubau, Erweiterung, Übernahme, neue GF, viele offene Stellen).
   Typ A = Wachstum mit belegtem Ereignis. Typ B = schwächerer Anlass (Jubiläum, Ehrung, Generationswechsel) – als „Typ B“ kennzeichnen.
2. Richtige Person: Geschäftsführung aus Firmenbuch (evi.gv.at), Impressum oder WKO Firmen A–Z, mit Angabe der Quelle in Klammern.
3. Richtige Nummer: Telefonnummer aus Impressum, Kontaktseite oder firmen.wko.at.
Erfinde nichts. Fehlende Angaben (Website, MA) als „offen“ eintragen. Sensible Hintergründe (Insolvenz, Todesfall) mit „⚠“ in „Offene Punkte / Hinweis“.

EINSTIEGSSATZ
Ein Satz, den ${profile.leadOwner} direkt sagen kann: nennt den Anlass und stellt eine offene Frage. Kein Smalltalk, kein Pitch.
Beispiel: „Sie haben 2025 in Wels angebaut. ${profile.erstfrage}“

BREAK-EVEN
${profile.mindestinvestition.toLocaleString("de-AT")} € ÷ angenommener Deckungsbeitrag pro Auftrag, aufgerundet, als „~min–max“.
Annahmen: Haustechnik ${hv}–${hb} €, PV ${pv}–${pb} €, Elektro ${ev}–${eb} €.

SCORE 0–10
Stärke/Aktualität des Wachstumssignals, Produkt-Fit, wirtschaftliche Leistungsfähigkeit, Erreichbarkeit der GF, kurzfristiger Bedarf.

NICHT VORSCHLAGEN (schon bekannt)
${bekannteFirmen.length ? bekannteFirmen.join("; ") : "(keine)"}

AUSGABE
Gib das Ergebnis als CSV-Datei (UTF-8, Komma, alle Felder in Anführungszeichen) mit genau dieser Kopfzeile aus:
${IMPORT_SPALTEN.map((s) => `"${s}"`).join(",")}
- Nr fortlaufend ab ${naechsteNr}
- Freigabe: Offen
- Status: Neu (Claude-Recherche, ${heute})
- Lead-Typ: Typ A oder Typ B
- CRM-Priorität, Wiedervorlage, Letzter Kontakt: leer
- Lead-Inhaber: ${profile.leadOwner}
Liefere lieber weniger, dafür anrufbare Leads.`;
}
