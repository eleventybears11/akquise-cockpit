# Roadmap

Status: **geplant** → **gebaut** → **getestet** → **deployt**

| Meilenstein | Inhalt | Status |
|---|---|---|
| M1 Telefonieren ohne KI | Profil/Einstellungen, CSV-Import mit Spalten-Zuordnung und Dublettenprüfung, Freigabe-Tabelle (r/x/Shift+A), Anrufliste mit Reihenfolge (fällige WV → Score → Prio, heute nicht erreicht ans Ende), Rundown-Karte, Ergebnis 1–4, Wiedervorlage mit Datum, Rückgängig, Notiz, „mit GF gesprochen“, Tageszähler, Wiedervorlagen-Ansicht, Alle Leads (Suche/Filter), Backup JSON + Wiederherstellen, CSV-Export, Löschen, Backup-Erinnerung, Montagvormittag-Hinweis, Hell/Dunkel, Kürzel-Hilfe | gebaut, getestet, deployt (17.11.2026) |
| FullEnrich (CSV-Weg) | Ansicht „Anreichern“: GF-Namen in Personen zerlegen (Titel, „&“, mehrere GF), Export-CSV mit Lead-Cockpit-ID, Rück-Import der Ergebnis-CSV mit Spalten-Erkennung, Zuordnung (ID → Domain → Firmenname), Dublettenschutz, Bestätigung vor Übernahme; Nummern/E-Mails auf der Rundown-Karte mit Quelle; im Backup enthalten | gebaut, getestet |
| M2 KI-Tagesliste | API-Key, Modellwahl, Recherche-Pipeline, Quellenprüfung, Kostenanzeige, Testmodus, Ausschlussliste, Break-even-Szenarien | geplant |
| M3 Gespräch erfassen | Diktat (Web Speech API, de-AT) → strukturierte Notiz, Termin-Übergabe (3 Zeilen), „Rundown vertiefen“ | geplant |
| M4 CRM & Statistik | „Für CRM kopieren“, CSV für Project Manager, Statistik nach Gewerk/Gebiet/Woche | geplant |
| später | Sprachbefehle, Obsidian-Markdown-Export, Lernen aus Ergebnissen, Project-Manager-Direktanbindung, Deutschland | geplant |

## Bekannte Grenzen M1

- Daten nur in diesem Browser-Profil (Backup nötig).
- Termin-Übergabe ist noch nicht automatisch (kommt in M3); Termin wird als Status und Anruf mit Notiz gespeichert.
- Kein Bearbeiten der Lead-Felder in der Oberfläche (Korrektur derzeit über CSV-Export → bearbeiten → Lead löschen + neu importieren). Kommt mit M2.
