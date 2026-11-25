# Entscheidungen

| Datum | Entscheidung | Begründung |
|---|---|---|
| 17.11.2026 | Rein im Browser (statische SPA, IndexedDB, GitHub Pages) statt Server/Datenbank | Entscheidung David: kostenlos, nichts zu installieren. Nachteil Datenverlust → Backup-Erinnerung + Export. |
| 17.11.2026 | Repo bleibt öffentlich (GitHub Pages gratis) | Entscheidung David. Folge: keine echten Lead-Daten im Repo, Tests nur mit DEMO-Daten. |
| 17.11.2026 | M1 = Telefonieren ohne KI, KI-Recherche erst M2 | Sofort nutzbar mit bestehender Lead-Tabelle, ohne API-Kosten; Datenbasis für KI-Leads steht. Abweichung von P2-Reihenfolge. |
| 17.11.2026 | Opportunities/Pipeline bleiben im Project Manager CRM | Doppelte Pflege vermeiden (Widerspruch P1 vs. P2). App hält Leads, Anrufe, Wiedervorlagen. |
| 17.11.2026 | Webformance als Profil, nicht im Code | P1: nicht auf einen Auftraggeber festlegen. |
| 17.11.2026 | M1 speichert GF/Quelle als Felder am Lead statt eigener Kontakt-/Beleg-Tabellen | Entspricht der bestehenden Lead-Tabelle. Eigene `contacts`/`evidence`-Tabellen (Fakt/Hypothese/offen je Aussage) kommen mit der KI-Recherche in M2 per Schema-Migration. |
| 17.11.2026 | Import: „Im CRM“ = freigegeben; Wiedervorlage-Datum → Status Wiedervorlage; „Absage“ im letzten Kontakt → abgeschlossen | Passt zu Davids bestehender Tabelle. |
| 17.11.2026 | Montagvormittag: nur Hinweis, Anrufliste bleibt nutzbar | Standard, da keine Antwort; leicht änderbar. |
| 17.11.2026 | `.npmrc` mit `legacy-peer-deps` | npm-Fehler („edgesOut“) bei optionalen Peer-Abhängigkeiten von vitest. |
| 17.11.2026 | FullEnrich per CSV statt API | API getestet: keine CORS-Freigabe (OPTIONS → 404, kein `Access-Control-Allow-Origin`), Aufruf aus dem Browser unmöglich. Entscheidung David: CSV-Weg, kein Proxy-Server. |
| 17.11.2026 | Angereicherte Daten in eigener Tabelle `enrichments` (DB-Version 2) mit Quelle, nie in die Stammdaten geschrieben | Regel „nichts überschreiben“, Herkunft nachvollziehbar (DSGVO, Hinweis „öffentliche GF-Nummer“ für DE). |
| 17.11.2026 | KI-Recherche direkt aus dem Browser (Anthropic-SDK mit `dangerouslyAllowBrowser`), Key nur im localStorage | Vorgabe P2, kein Server. Key nie in Backup/Export; CSP erlaubt nur `api.anthropic.com`. |
| 17.11.2026 | Standardmodell Claude Opus 5.5, wählbar Sonnet 5.5 / Haiku 5.5; serverseitiger Fallback bei Ablehnung (Opus/Sonnet) | Prüfqualität („nichts erfinden“) wichtiger als Kosten; Wahl liegt bei David. |
| 17.11.2026 | KI liefert nur Rohdaten; Quellenprüfung, Filter, Score (gewichtet) und Break-even rechnet die App deterministisch | Erfundene URLs/Zahlen werden erkannt; Margen nie von der KI. |
| 17.11.2026 | Belege (Fakt/Hypothese/offen + Quelle) als Feld `belege` am Lead statt eigener Tabelle | Einfacher, reicht für Anzeige und Prüfung; Tabelle bei Bedarf später per Migration. |
| 17.11.2026 | Namen/Nummern/MA ohne Quelle aus den Suchergebnissen → „offen“; GF ohne offizielle Quelle/Impressum → „Hypothese“ | Harte Regel 1 aus CLAUDE.md. |
| 17.11.2026 | Anthropic-SDK wird erst bei Bedarf nachgeladen | App-Start ~40 % kleiner. |
| 25.11.2026 | Kein automatischer Testmodus mehr ohne API-Key; DEMO-Daten nur bei ausdrücklich eingeschaltetem Testmodus | David bekam ungewollt DEMO-Leads. Ohne Key zeigt die App „API-Key eintragen“. |
| 25.11.2026 | Ein Lead wird nur übernommen mit belegtem Anlass, GF aus Firmenbuch/WKO/Impressum (Fakt) und belegter Telefonnummer | Davids Vorgabe: richtige Person aus dem richtigen Grund anrufen. Weniger, aber anrufbare Leads. |
| 25.11.2026 | Knopf „Alle DEMO-Leads löschen“ (Alle Leads, Einstellungen) | Testdaten wieder entfernen, echte Leads bleiben. |
| 25.11.2026 | Typ-B-Leads mit schwächerem Anlass (Jubiläum, Ehrung, Generationswechsel) erlaubt, in der manuellen Recherche klar als Typ B markiert | Davids Entscheidung für mehr Masse. |
