# Lead-Cockpit

Browser-App für die telefonische B2B-Kaltakquise: Leads freigeben, telefonieren, Ergebnisse und Wiedervorlagen erfassen. Läuft komplett in Chrome, Daten bleiben im Browser.

## Kurzanleitung

1. App öffnen (GitHub-Pages-URL, siehe unten).
2. **Import** → Lead-Tabelle als CSV wählen → „Leads importieren“. Oder **Freigabe → Tagesliste erzeugen**: die KI recherchiert neue Leads (API-Key unter Einstellungen, ohne Key läuft ein Testmodus mit DEMO-Daten).
3. **Freigabe**: `r` rein, `x` raus, `Shift+A` alle rein.
4. **Anrufen**: `t` wählt die Nummer, nach dem Gespräch `1` nicht erreicht, `2` Absage, `3` Wiedervorlage, `4` Termin. `u` macht den letzten Anruf rückgängig.
5. **Anreichern**: CSV für FullEnrich herunterladen → in FullEnrich hochladen → Ergebnis-CSV hier importieren und bestätigen. Gefundene Handynummern erscheinen auf der Rundown-Karte mit Quelle „FullEnrich“.
6. **Einstellungen → Backup herunterladen** mindestens einmal pro Woche (die App erinnert daran).
7. `?` zeigt alle Tastaturkürzel.

## Entwicklung

```bash
npm ci
```

```bash
npm run dev
```

```bash
npm run check && npm run e2e
```

Projektregeln: [CLAUDE.md](CLAUDE.md) · Plan: [docs/PLAN.md](docs/PLAN.md) · Roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

## Deployment

Bei jedem Push auf `main` baut `.github/workflows/deploy.yml` die App und veröffentlicht sie auf GitHub Pages:
`https://eleventybears11.github.io/akquise-cockpit/`
Einmalig nötig: GitHub → Settings → Pages → Source: **GitHub Actions**.
