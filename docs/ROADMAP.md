# Roadmap

Status: **geplant** → **gebaut** → **getestet** → **deployt**

| Meilenstein | Inhalt | Status |
|---|---|---|
| M1 Telefonieren ohne KI | Profil/Einstellungen, CSV-Import mit Spalten-Zuordnung und Dublettenprüfung, Freigabe-Tabelle (r/x/Shift+A), Anrufliste mit Reihenfolge (fällige WV → Score → Prio, heute nicht erreicht ans Ende), Rundown-Karte, Ergebnis 1–4, Wiedervorlage mit Datum, Rückgängig, Notiz, „mit GF gesprochen“, Tageszähler, Wiedervorlagen-Ansicht, Alle Leads (Suche/Filter), Backup JSON + Wiederherstellen, CSV-Export, Löschen, Backup-Erinnerung, Montagvormittag-Hinweis, Hell/Dunkel, Kürzel-Hilfe | gebaut, getestet, deployt (17.11.2026) |
| FullEnrich (CSV-Weg) | Ansicht „Anreichern“: GF-Namen in Personen zerlegen (Titel, „&“, mehrere GF), Export-CSV mit Lead-Cockpit-ID, Rück-Import der Ergebnis-CSV mit Spalten-Erkennung, Zuordnung (ID → Domain → Firmenname), Dublettenschutz, Bestätigung vor Übernahme; Nummern/E-Mails auf der Rundown-Karte mit Quelle; im Backup enthalten | gebaut, getestet, deployt (17.11.2026) |
| M2 KI-Tagesliste | API-Key (nur lokal), Modellwahl, Gründlichkeit, Kostenlimit; Recherche-Pipeline (Kandidaten per Websuche → Dubletten/Ausschluss → Verifizieren mit Websuche/Abruf → Prüfung → Speichern), Quellenprüfung gegen tatsächliche Suchergebnisse, Fakt/Hypothese/offen je Aussage, Score aus gewichteten Teilscores, Break-even-Szenarien aus Profil-Annahmen, Kosten pro Lauf, Lauf-Protokoll, Testmodus mit DEMO-Daten, Startpaket, Hinweis werktags ab 6 Uhr, Ausschlussliste (CRM-CSV), Recherche-Regeln in den Einstellungen, Lead bearbeiten | gebaut, getestet (Testmodus), deployt; echter API-Lauf von David zu prüfen. 25.11.: ohne Key keine DEMO-Leads mehr, Pflicht GF + Telefon + Anlass, DEMO-Leads löschbar |
| M3 Gespräch erfassen | Diktat (Web Speech API, de-AT) → strukturierte Notiz, Termin-Übergabe (3 Zeilen), „Rundown vertiefen“ | geplant |
| M4 CRM & Statistik | „Für CRM kopieren“, CSV für Project Manager, Statistik nach Gewerk/Gebiet/Woche | geplant |
| später | Sprachbefehle, Obsidian-Markdown-Export, Lernen aus Ergebnissen, Project-Manager-Direktanbindung, Deutschland | geplant |

## Bekannte Grenzen M1

- Daten nur in diesem Browser-Profil (Backup nötig).
- Termin-Übergabe ist noch nicht automatisch (kommt in M3); Termin wird als Status und Anruf mit Notiz gespeichert.
- ~~Kein Bearbeiten der Lead-Felder~~ – mit M2 erledigt (Taste `b` auf der Rundown-Karte).

## Bekannte Grenzen M2

- Der echte Recherche-Lauf mit der Anthropic-API konnte in der Entwicklungsumgebung nicht ausgeführt werden (kein API-Key). Getestet sind Testmodus, Prüflogik und Ablauf; der erste echte Lauf zeigt Qualität und tatsächliche Kosten.
- „Rundown vertiefen“ (Prüfpunkte offene Stellen, SEO, GEO, Rechner, Karriereseite) folgt mit M3.
- Ein Lauf bricht ab, wenn die Seite neu geladen oder geschlossen wird; bereits übernommene Leads bleiben erhalten.
