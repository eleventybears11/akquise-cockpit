# Lead-Cockpit – Projektanweisungen

Browser-App für telefonische B2B-Kaltakquise (David Parikyan, Vermittler für Webformance).
Quelle der Anforderungen: `docs/prompts/` (P1 ChatGPT, P2 Claude) und `docs/PLAN.md`. Abgleich und Entscheidungen: `docs/prompts/00-ABGLEICH.md`, `docs/DECISIONS.md`.

## Harte Regeln (nie brechen)

1. **Nichts erfinden.** Keine Namen, Nummern, Investitionen, Mitarbeiterzahlen, Margen oder Daten raten. Fehlendes bleibt „offen“. Jede Aussage ist **Fakt**, **Hypothese** oder **offen** und hat eine Quelle.
2. **Lead-Nachweis.** Jeder Lead trägt `leadOwner` („David Parikyan“). Er wird nach Provision pro Lead bezahlt; der Vermerk darf nie verloren gehen (Import, Export, Backup, CRM-Übergabe).
3. **Keine echten Lead-Daten im Repo.** Das Repo ist öffentlich. Tests und Beispiele nur mit erfundenen, als „DEMO“ gekennzeichneten Daten.
4. **API-Key** (ab M2) nur lokal im Browser, nie im Repo, in Logs, Exporten oder Backups.
5. **KI überschreibt keine Stammdaten** ohne Bestätigung. KI-Texte getrennt von Stammdaten speichern.
6. **Sensible Hintergründe** (Insolvenz, Todesfall o. Ä.) als roten Warnhinweis zeigen; der Einstiegssatz spricht sie nie an.
7. **Keine Fremd-Skripte, kein Tracking.** CSP in `vite.config.ts` nicht aufweichen.
8. Nie „fertig“ melden ohne `npm run check` und `npm run e2e` grün.

## Fachliche Regeln Lead-Recherche (Profil „Webformance – AuftragsPlus“, in den Einstellungen bearbeitbar)

- **Produkt AuftragsPlus:** Sichtbarkeit (Google, lokales SEO, KI-Assistenten), Website mit bis zu 6 Leistungs- und 10 Ortsseiten, Anfrage-Funnel mit Rechner, monatliches Reporting. 8.900 € netto Setup + 690 €/Monat, mind. 3 Monate → **mind. 10.970 € netto**. Go-Live ca. 6 Wochen. Optional Google Ads 490 €/Monat + Budget. Gebietsschutz je Gewerk und Einzugsgebiet.
- **Referenz:** Jänichen GmbH, Berlin – 390 Rechner-Anfragen in 24 Monaten, 75 Bewerbungen. Referenzbeispiel, **keine Garantie, keine ROI-Behauptung**.
- **Festes Gesprächsargument:** Potenzialanalyse vor Ort. Zweitprodukt-Potenzial vermerken, wenn erkennbar.
- **ICP:** Wärmepumpen, Heizung/Sanitär, PV, Elektrotechnik, Klima/Lüftung; danach Gebäudetechnik, Dach/Fassade, Kran/Erdbau. **≥ 8 MA** (ideal 10–80), inhabergeführt, eigene Monteure, keine Filialisten/Konzerne. Gebiete OÖ, NÖ, Wien gemischt nach Score; später Nord-/Westdeutschland nur mit öffentlicher GF-Nummer.
- **Wichtigster Filter:** belegte Dynamik/Wachstum in den letzten 2–3 Jahren (Neubau, Erweiterung, neue Geschäftsfelder, GF-Übernahme, viele/lange offene Stellen, Investitionen). Nur Bestandskunden-Abwicklung → raus. Schlechte Website allein ist kein Lead.
- **Lead-Typ A** = Wachstum mit belegtem Ereignis, **B** = möglicher Engpass Neukundengewinnung. Muss plausibel ~11.000 € netto investieren können.
- **Pflicht pro Lead:** datierter Anlass mit Quellen-URL; Einstiegssatz (Anlass + offene Frage, kein Smalltalk, kein Pitch); GF aus offizieller Quelle (Firmenbuch/evi, Impressum, WKO) mit Quellenangabe; Telefon, Website, MA (mit Quelle oder „offen“); Score 0–10 (Wachstumssignal, Produkt-Fit, Leistungsfähigkeit, GF-Erreichbarkeit, kurzfristiger Bedarf); Break-even = 10.970 € ÷ angenommener zusätzlicher Deckungsbeitrag pro Auftrag, aufgerundet, drei Szenarien, Annahmen gekennzeichnet, Umsatz/Rohertrag/DB/Gewinn auseinanderhalten.
- **DB-Annahmen (Standard):** Haustechnik 2.000–4.000 €, PV 1.500–3.000 €, Elektro 1.000–2.500 € pro Auftrag.
- **Dubletten:** Firmen, die schon in der App sind (jeder Status), nie erneut vorschlagen. Ausschlussliste aus CRM-CSV.
- Termine für **Jan Grimm** oder **Leon Haider**, Übergabe mit Vermerk „Lead von David Parikyan“.

## Technik

- Vite + React 19 + TypeScript (strict) + Tailwind v4, Daten in IndexedDB (Dexie). Statisch auf GitHub Pages.
- UI greift nur über `src/data/repo.ts` auf Daten zu (späterer CRM-Adapter). Schema-Änderungen als neue `db.version(n)` mit Migration.
- Design-Tokens in `src/index.css` (hell/dunkel). Sprache der Oberfläche: Deutsch (Österreich).
- Recherche-Prompts (ab M2) in `src/prompts/*.md`.

## Befehle

- `npm run dev` – Entwicklung
- `npm run check` – Lint, Typen, Unit-Tests, Build
- `npm run e2e` – Playwright-Tests (baut und startet `vite preview`)

## Dokumentation pflegen

Nach jedem Meilenstein `docs/ROADMAP.md` (geplant / gebaut / getestet / deployt) und `docs/DECISIONS.md` aktualisieren.
