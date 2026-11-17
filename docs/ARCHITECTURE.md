# Architektur

Statische Single-Page-App, läuft komplett in Chrome. Kein Server.

```
src/
  main.tsx, App.tsx        Einstieg, Navigation (Hash-Routen), globale Kürzel, Tageszähler, Hinweise
  index.css                Design-Tokens hell/dunkel (Tailwind v4 @theme)
  data/
    types.ts               Datentypen (Company, Call, Profile, Settings, Backup)
    defaults.ts            Standardprofil „Webformance – AuftragsPlus“, Standardeinstellungen
    db.ts                  Dexie/IndexedDB-Schema (Versionen = Migrationen)
    repo.ts                einzige Datenschnittstelle der UI (später: CRM-Adapter)
  lib/
    csv.ts                 Import (Spalten-Erkennung, Status-Ableitung, Dubletten), Export
    callList.ts            Reihenfolge Anrufliste, Tageszähler
    fullenrich.ts          GF-Namen zerlegen, Export-CSV, Rück-Import (Zuordnung, Dubletten)
    normalize.ts, dates.ts Hilfsfunktionen (Namen, Telefon, URLs, Warnhinweise, Datum)
    hooks.ts, toast.ts     Routing, Einstellungen, Tastaturkürzel, Meldungen
  research/
    claude.ts              Anthropic Messages API aus dem Browser: Websuche/Abruf, JSON-Schema, pause_turn, URL-Sammlung, Usage
    pipeline.ts            Ablauf der Tagesliste, Bewertung eines Kandidaten
    logic.ts               Quellenprüfung, Score, Break-even, Kosten (ohne KI)
    schemas.ts             JSON-Schemas der KI-Antworten
    demo.ts                Testmodus mit DEMO-Daten
    store.ts               laufender Lauf als App-Zustand, Speichern der Leads und des Protokolls
    key.ts                 API-Key im localStorage
  prompts/                 system.md, kandidaten.md, verifizieren.md (anpassbar, Platzhalter {{…}})
  features/                Freigabe (+ ResearchPanel), Anrufen (Rundown, LeadDetails), Wiedervorlagen, Leads, Import, Anreichern, Einstellungen, Backup
  components/ui.tsx        Basis-Komponenten
e2e/                       Playwright-Tests + DEMO-Fixture
```

## Datenmodell (IndexedDB `lead-cockpit`, Version 3)

- `companies`: Lead mit Stammdaten, `freigabe` (offen/rein/raus), `status` (neu/anrufliste/wiedervorlage/termin/absage/raus), `wiedervorlage`, `letzterVersuch`, `leadOwner`.
- `calls`: Anruf mit Ergebnis, „mit GF gesprochen“, Notiz und Vorher-Zustand (für Rückgängig).
- `enrichments` (ab Version 2): Telefon/E-Mail aus externer Quelle (FullEnrich) mit Person, Quelle und Importdatum – getrennt von den Stammdaten.
- `runs` (ab Version 3): Recherche-Läufe mit Ziel, Modell, Lead-IDs, Tokens, Suchen, Kosten, Protokoll.
- `exclusions` (ab Version 3): Ausschlussliste aus dem CRM (normalisierter Firmenname).
- KI-Leads tragen zusätzlich `gewerk`, `teilscores`, `breakEvenSzenarien`, `belege` (Fakt/Hypothese/offen + Quelle), `zweitprodukt`, `runId`.
- `profiles`: Auftraggeber/Produkt-Profil inkl. Recherche-Regeln (Branchen, Gebiete, Mindest-MA, Wachstumssignale, DB-Annahmen, Score-Gewichte). `meta`: Einstellungen (Modell, Gründlichkeit, Kostenlimit, Testmodus).

## KI-Recherche (M2)

1. **Kandidaten** (Websuche, max. 15 Suchen): Firmen mit datiertem Anlass, bekannte Firmen und Ausschlussliste im Prompt.
2. **Lokal:** Dubletten raus; Anlass-URL muss in den Suchergebnissen vorkommen.
3. **Verifizieren** je Kandidat (Websuche + Abruf, je 2 parallel): GF, Telefon, MA, Website, Lead-Typ, Teilscores, Einstiegssatz, Warnhinweise, Zweitprodukt.
4. **Prüfen (App, ohne KI):** jede Quelle gegen die tatsächlich gesehenen URLs; Mindest-MA; „passt“; Score gewichtet; Break-even aus DB-Annahmen.
5. Stopp bei Ziel, Kostenlimit oder Abbruch. Leads landen sofort in der Freigabe.

## Externe Dienste

- **FullEnrich:** nur per CSV (Export → Upload in FullEnrich → Rück-Import). Die API erlaubt keine Browser-Aufrufe (keine CORS-Header).

## Sicherheit

- Content-Security-Policy im Build (`vite.config.ts`): nur eigene Dateien, Verbindungen nur zu `api.anthropic.com` (ab M2).
- `noindex`, keine Fremd-Skripte, kein Tracking. Backups enthalten keinen API-Key.
