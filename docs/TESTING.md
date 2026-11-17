# Tests

- **Unit (Vitest):** `npm test` – CSV-Import (Spalten-Erkennung, Status-Ableitung, Dubletten, Semikolon-CSV, Export/Re-Import), Reihenfolge der Anrufliste, Tageszähler, Telefon-/URL-/Namens-Normalisierung, Datumslogik.
- **Unit FullEnrich:** GF-Feld-Zerlegung (Titel, Notizen in Klammern, „&“ mit gemeinsamem Nachnamen, mehrere GF), Domain, Export-Spalten, Zuordnung und Dublettenschutz beim Rück-Import.
- **E2E (Playwright):** `npm run e2e` – baut die App, startet `vite preview` und spielt den Tagesablauf durch: Import → Freigabe per Tastatur → Dubletten beim Re-Import → Anrufen mit 1/3/4, Notiz, Rückgängig → Neu laden (Daten bleiben) → Wiedervorlagen/Leads-Filter → Backup herunterladen, alles löschen, Backup einspielen → CSV-Export. Zusätzlich `e2e/anreichern.spec.ts`: FullEnrich-Export, simuliertes Ergebnis importieren, erneuter Import ohne Dubletten, Nummer/E-Mail auf der Rundown-Karte, Backup enthält die Angaben.
- **Unit Recherche:** Quellenprüfung (Fakt nur mit gesehener Quelle, erfundene Nummern → offen, GF nur offiziell), gewichteter Score, Break-even, Kosten, Prompts ohne offene Platzhalter, Bewertung (Dublette, zu klein, unbelegter Anlass, passt nicht), kompletter Ablauf im Testmodus.
- **E2E `e2e/recherche.spec.ts`:** Ausschlussliste importieren → Tagesliste im Testmodus (18 Leads, Ausschluss greift, Protokoll mit Verworfenen) → Rundown mit Belegen, Break-even, Score-Begründung → Lead bearbeiten → Backup enthält Läufe/Ausschlussliste, aber nie den API-Key.
- **Nicht automatisiert:** echter API-Lauf (braucht Davids Key und kostet Geld).
- **Testdaten:** nur `e2e/fixtures/demo-leads.csv` (erfundene DEMO-Firmen). Echte Leads nie ins Repo.
- **CI:** `.github/workflows/ci.yml` führt Lint, Typen, Unit, Build und E2E bei jedem PR aus.
- **Vor „fertig“:** `npm run check && npm run e2e` muss grün sein.
- **Manuell geprüft (M1):** Screenshots Laptop hell/dunkel und Handy (390 px) mit echten Leads, kein seitlicher Überlauf, keine Konsolenfehler, CSP im Build aktiv.
