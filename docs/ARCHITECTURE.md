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
  features/                Freigabe, Anrufen (Rundown), Wiedervorlagen, Leads, Import, Anreichern, Einstellungen, Backup
  components/ui.tsx        Basis-Komponenten
e2e/                       Playwright-Tests + DEMO-Fixture
```

## Datenmodell (IndexedDB `lead-cockpit`, Version 2)

- `companies`: Lead mit Stammdaten, `freigabe` (offen/rein/raus), `status` (neu/anrufliste/wiedervorlage/termin/absage/raus), `wiedervorlage`, `letzterVersuch`, `leadOwner`.
- `calls`: Anruf mit Ergebnis, „mit GF gesprochen“, Notiz und Vorher-Zustand (für Rückgängig).
- `enrichments` (ab Version 2): Telefon/E-Mail aus externer Quelle (FullEnrich) mit Person, Quelle und Importdatum – getrennt von den Stammdaten.
- `profiles`: Auftraggeber/Produkt-Profil. `meta`: Einstellungen.

## Externe Dienste

- **FullEnrich:** nur per CSV (Export → Upload in FullEnrich → Rück-Import). Die API erlaubt keine Browser-Aufrufe (keine CORS-Header).

## Sicherheit

- Content-Security-Policy im Build (`vite.config.ts`): nur eigene Dateien, Verbindungen nur zu `api.anthropic.com` (ab M2).
- `noindex`, keine Fremd-Skripte, kein Tracking. Backups enthalten keinen API-Key.
