# Abgleich der beiden Prompts

> **Entscheidungen (17.11.2026):** Architektur = **rein im Browser** (P2). Repo wird **privat** gestellt, bevor die Prompts committet werden.
> Offener Folgepunkt: GitHub Pages aus einem privaten Repo braucht GitHub Pro (~4 $/Monat). Gratis-Alternative: Cloudflare Pages oder Netlify (statisches Hosting aus privatem Repo, kostenloser Account).

- **P1** = `01-chatgpt-master-prompt.md` (ChatGPT, „Sales Intelligence OS“)
- **P2** = `02-claude-lead-cockpit-v2.md` (Claude, „Lead-Cockpit v2“)

Kurz gesagt: P2 ist konkret (Regeln für die Webformance-Akquise, Tagesablauf, Bildschirme). P1 ist breit angelegt (Architektur, Erweiterbarkeit, Qualitätsstandards). Inhaltlich ergänzen sie sich größtenteils. **Echte Widersprüche gibt es bei Architektur, Vorgehen und CRM-Umfang.**

## A. Echte Widersprüche (Entscheidung nötig)

| # | Thema | P1 (ChatGPT) | P2 (Claude) | Vorschlag |
|---|---|---|---|---|
| 1 | **Architektur / Hosting** | Next.js + Supabase/PostgreSQL, KI-Aufrufe serverseitig, Login | Statische SPA (Vite) auf GitHub Pages, kein Server | Siehe B1. Das ist die Kernentscheidung, alles Weitere hängt daran. |
| 2 | **API-Key** | „API keys must never be exposed in frontend code“ | Anthropic-API direkt aus dem Browser, Key lokal im Browser gespeichert | P2 ist bei einem rein persönlichen Tool vertretbar (Key steht nicht im Code, nur im eigenen Browser). P1s Regel ist aber nur mit Server erfüllbar. Folgt aus #1. |
| 3 | **Datenspeicher** | „Real persistent database“, Backup, Migrationen | IndexedDB nur im Browser + JSON/CSV-Export | IndexedDB bedeutet: Daten liegen nur auf *einem* Rechner/Browser. Löscht der Arbeitsrechner den Browser-Cache, sind Monate an Anrufhistorie weg. Kein Zugriff vom Handy. Folgt aus #1. |
| 4 | **Vorgehen** | Erst Planung, nichts bauen, auf Freigabe warten | Phasen sofort bauen, nach jeder Phase deployen, Rückfragen nur bei Blockern | Kombinieren: **ein** kurzes Planungsdokument + Freigabe, danach baue ich P2-Phasen am Stück und deploye nach jeder. |
| 5 | **CRM-Umfang** | Vollständiges CRM in der App (Firmen, Kontakte, Opportunities, Tasks, Stages …) | Führendes CRM ist extern („Project Manager“), App liefert nur Übergabe (Kopieren/CSV) | Doppelte Pflege vermeiden: Die App hält Leads, Anrufe und Wiedervorlagen. Opportunities/Pipeline bleiben im Project Manager. **Neu:** Für Project Manager gibt es bereits einen MCP-Connector (u. a. `create_crm_lead`, `list_crm_companies`). Der in P2 erwähnte CRM-Adapter ist also absehbar machbar. |
| 6 | **Webformance fest eingebaut?** | „Do not hardcode around Webformance“, mehrere Auftraggeber | Webformance/AuftragsPlus-Regeln fest einbauen (in Einstellungen bearbeitbar) | Kein echter Konflikt, wenn man es so löst: Produkt, ICP, Preise und Scoring liegen als **Konfigurationsprofil** vor. Webformance/AuftragsPlus ist das erste Profil, nicht Programmcode. |
| 7 | **Gesprächsführung** | „Kein aufdringlicher Teleprompter, keine starren Skripte“ | Einstiegssatz groß + feste Erstfrage auf der Rundown-Karte | Vereinbar: ein Einstiegssatz plus eine Frage ist kein Skript. Kein Gesprächsleitfaden über den Einstieg hinaus. |
| 8 | **Onboarding** | Produkt, ICP usw. kommen aus einem separaten Onboarding-Interview | Produkt, ICP, Preise usw. stehen bereits vollständig drin | P2 ersetzt das Interview. Interview nur für Lücken (z. B. Einwandbehandlung, Vorlieben). |

## B. Kernentscheidung Architektur (B1)

**Option P2: statisch (GitHub Pages + IndexedDB + Key im Browser)**
- \+ kostenlos, am schnellsten gebaut, kein Account außer Anthropic-API
- − Daten nur in einem Browser, Verlust beim Cache-Löschen, kein Handy-Zugriff
- − **Das Repo ist öffentlich.** GitHub Pages ist gratis nur für öffentliche Repos. Damit sind der Code *und* eine `CLAUDE.md` mit Webformance-Preisen, Referenzen und Namen (Jan Grimm, Leon Haider) für alle einsehbar.
- − kein Login: Jeder mit der URL sieht die App (die Daten aber nicht, die liegen lokal)

**Option P1: mit Server (z. B. Next.js + Supabase)**
- \+ Daten zentral und gesichert, Zugriff von überall (auch Handy), Key sicher am Server, Login
- \+ ermöglicht später geplante Recherche-Läufe (z. B. täglich 6 Uhr), ohne dass der Browser offen ist
- − 2 zusätzliche Accounts (Hosting + Datenbank), etwas mehr Aufwand
- − Achtung: Vercel Hobby ist laut AGB nur für nicht-kommerzielle Nutzung. Alternativen: Supabase + Cloudflare Pages/Netlify, oder Vercel Pro (~20 $/Monat)

**Empfehlung:** Ein Server ist sinnvoll, weil die Daten (Leads, Nachweis „Lead von David Parikyan“ = Provisionsgrundlage) nicht nur in einem Browser liegen sollten. Die Fachlogik, die Bildschirme und die Phasen kommen aus P2. Repo auf **privat** stellen, unabhängig von der Option.

## C. Nur in einem Prompt enthalten (kein Widerspruch, Umfangsfrage)

- **Nur P1:** Obsidian-Integration, Voice-*Befehle* (Intent-Erkennung), persönliche Wissensbasis, Dashboard, Opportunities, Dark Mode, Mobile, Doku-Set (PRODUCT/ARCHITECTURE/ROADMAP/DECISIONS/TESTING.md), Playwright-Tests. Vorschlag: Obsidian und Voice-Befehle nach dem MVP. Doku-Set und Tests ab Start.
- **Nur P2:** Break-even-Szenarien, Lead-Typ A/B, Freigabe-Tabelle, Dubletten-/Ausschlussliste, Termin-Übergabe an Jan/Leon, Tageszähler mit 60 Versuchen, Montagvormittag ohne Anrufe, Kostenanzeige pro Lauf, Testmodus ohne Key. Alles übernehmen.
- **Spracherkennung:** P1 „austauschbarer Anbieter“, P2 „Web Speech API“. Vereinbar: Web Speech API als erster Anbieter hinter einer Schnittstelle. Hinweis: Chrome schickt die Audiodaten dabei an Google-Server (DSGVO, betrifft auch Gesprächsinhalte über Dritte).

## D. Risiken, die keiner der beiden Prompts anspricht

1. **Kaltakquise per Telefon in Österreich.** Nach § 174 TKG 2021 (früher § 107) sind Werbeanrufe ohne vorherige Einwilligung unzulässig. Nach meinem Kenntnisstand gilt das in Österreich **auch gegenüber Unternehmen**, anders als in Deutschland (dort B2B mit „mutmaßlicher Einwilligung“). Bitte rechtlich bzw. mit Webformance klären. Das ist keine Rechtsberatung. Für die App bedeutet das eventuell: Einwilligung bzw. Kontaktgrundlage dokumentieren.
2. **DSGVO:** GF-Namen, Telefonnummern und Gesprächsnotizen sind personenbezogene Daten. Löschfristen, Export und Löschung pro Person sind einzuplanen (P1 fordert das, P2 nicht).
3. **Öffentliches Repo** (siehe B).
4. **Recherchequalität und -kosten:** Firmenbuch/evi und WKO sind nicht immer per Websuche erreichbar. Daher bleiben Felder lieber „offen“, wie P2 es verlangt. Kosten pro Tagesliste (~18 Leads mit Verifizierung) grob 1–5 € API-Kosten, abhängig vom Modell und von der Anzahl der Suchen. Genaue Zahl nach dem ersten Testlauf.
