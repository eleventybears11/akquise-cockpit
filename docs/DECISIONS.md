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
