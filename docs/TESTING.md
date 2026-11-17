# Tests

- **Unit (Vitest):** `npm test` – CSV-Import (Spalten-Erkennung, Status-Ableitung, Dubletten, Semikolon-CSV, Export/Re-Import), Reihenfolge der Anrufliste, Tageszähler, Telefon-/URL-/Namens-Normalisierung, Datumslogik.
- **E2E (Playwright):** `npm run e2e` – baut die App, startet `vite preview` und spielt den Tagesablauf durch: Import → Freigabe per Tastatur → Dubletten beim Re-Import → Anrufen mit 1/3/4, Notiz, Rückgängig → Neu laden (Daten bleiben) → Wiedervorlagen/Leads-Filter → Backup herunterladen, alles löschen, Backup einspielen → CSV-Export.
- **Testdaten:** nur `e2e/fixtures/demo-leads.csv` (erfundene DEMO-Firmen). Echte Leads nie ins Repo.
- **CI:** `.github/workflows/ci.yml` führt Lint, Typen, Unit, Build und E2E bei jedem PR aus.
- **Vor „fertig“:** `npm run check && npm run e2e` muss grün sein.
- **Manuell geprüft (M1):** Screenshots Laptop hell/dunkel und Handy (390 px) mit echten Leads, kein seitlicher Überlauf, keine Konsolenfehler, CSP im Build aktiv.
