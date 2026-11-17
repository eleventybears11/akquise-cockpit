# Prompt für Claude Code: Lead-Cockpit v2 (Recherche, Leadgenerierung, Rundown, Anrufdoku)

> Den ganzen Text unter der Linie als erste Nachricht in Claude Code (claude.ai/code) im Repository `akquise-cockpit` einfügen.

---

Baue mir eine Web-App, die komplett im Browser läuft: **„Lead-Cockpit“**. Sie ist mein Recherche- und Akquise-Werkzeug für die telefonische Kaltakquise. Arbeite die Phasen unten der Reihe nach ab. Nach jeder Phase soll eine lauffähige Version deployt sein.

## 0. Wer ich bin und was ich brauche
- Ich bin David Parikyan, selbstständiger B2B-Vermittler für **Webformance** (Graz). Bezahlt werde ich pro erfolgreichem Lead, deshalb muss jeder Lead nachweisbar als **meiner** markiert sein.
- Ich will verkaufen, nicht herumklicken. Die App nimmt mir Recherche und Verwaltung ab.
- Mein Tag: vormittags Recherche und Follow-ups (Montagvormittag keine Anrufe), nachmittags Anrufe, mindestens 60 Anrufversuche pro Tag. Zum Start brauche ich 60 Leads, danach 15–20 neue pro Werktag (im Schnitt etwa 18).
- Termine vereinbare ich für **Jan Grimm** oder **Leon Haider** von Webformance.

## 1. Technische Rahmenbedingungen
- Auf meinem Arbeitsrechner darf ich **nichts installieren**. Die App muss in Chrome laufen, ohne Desktop-Programm, ohne Admin-Rechte und ohne Browser-Erweiterung.
- Baue eine statische Single-Page-App (Vite + React + TypeScript), gehostet kostenlos auf **GitHub Pages**. Richte das Deployment per GitHub Action ein und nenne mir am Ende die URL.
- **KI-Recherche:** Die App ruft die **Anthropic Messages API direkt aus dem Browser** auf und nutzt dabei das serverseitige **Web-Search-Tool** (und, falls verfügbar, Web-Fetch). Prüfe die aktuelle Doku auf docs.claude.com: Modellname, Tool-Versionen und den Header für direkte Browser-Zugriffe. Den API-Key gebe ich einmal in den Einstellungen ein. Er wird **nur lokal** gespeichert, nie im Repository und nie in Logs. Zeig mir pro Recherche-Lauf die ungefähren Kosten (Tokens und Suchanfragen) an.
- Alle Daten liegen lokal in **IndexedDB**. Dazu gibt es Export und Import als JSON (Backup) und CSV.
- Oberfläche auf Deutsch (Österreich), gut lesbar am Laptop, große Klickflächen, Tastaturkürzel.
- Kapsle die Datenschicht so, dass später ein **CRM-Adapter** für mein CRM („Project Manager“) andocken kann. Die API dafür kenne ich noch nicht, also jetzt nicht bauen.

## 2. Fachliche Regeln für die Lead-Recherche (fest einbauen, in den Einstellungen bearbeitbar)

**Zielprodukt: AuftragsPlus von Webformance**
- Inhalt: Sichtbarkeit (Google, lokales SEO, KI-Assistenten), Website mit bis zu 6 Leistungsseiten und 10 Ortsseiten, Anfrage-Funnel mit Rechner, monatliches Reporting.
- Preis: 8.900 € netto Setup plus 690 € netto/Monat, Mindestlaufzeit 3 Monate, also mindestens **10.970 € netto** Gesamtinvestition. Go-Live nach etwa 6 Wochen. Optional Google Ads für 490 €/Monat plus Werbebudget. Webformance bietet Gebietsschutz je Gewerk und Einzugsgebiet.
- Referenz: Jänichen GmbH, Berlin (Heizung, Wärmepumpen, PV) mit 390 Rechner-Anfragen in 24 Monaten und 75 Bewerbungen. Das ist ein Referenzbeispiel, keine Garantie, und **keine ROI-Behauptung**.
- Zweitprodukt-Potenzial vermerken (andere Webformance-Leistungen), wenn erkennbar.
- Festes Gesprächsargument: **Potenzialanalyse vor Ort**.

**Ideal Customer Profile (harte Kriterien)**
- Branche: Wärmepumpen, Heizung/Sanitär, PV, Elektrotechnik, Klima/Lüftung. Danach Gebäudetechnik, Dach/Fassade, Kran/Erdbau.
- **Mindestens 8 Mitarbeiter**, ideal 10–80. Inhabergeführt, mit eigenen Monteuren. Keine Filialisten oder Konzerne.
- Gebiete: Oberösterreich, Niederösterreich und Wien, **gemischt** und sortiert nach Score (österreichische Leads zuerst). Später kommen Nord- und Westdeutschland dazu, dort nur Leads, bei denen die Nummer der Geschäftsführung öffentlich ist.
- **Wichtigster Filter:** belegte Dynamik oder Wachstum in den letzten 2–3 Jahren, z. B. Neubau, Hallen- oder Standorterweiterung, neue Geschäftsfelder, Übernahme der Geschäftsführung, viele oder lange offene Stellen, Investitionen. Ohne Dynamik gibt es kein Budget. Firmen, die nur Bestandskunden abwickeln, fliegen raus. Eine schlechte Website allein macht noch keinen Lead.
- Lead-Typ **A** = Wachstum/Expansion mit belegtem Ereignis. Lead-Typ **B** = möglicher Engpass bei der Neukundengewinnung.
- Der Lead muss plausibel rund 11.000 € netto investieren können.

**Pflichtangaben pro Lead**
- **Konkreter, datierter Anlass mit Quellen-URL** (Ereignis, Datum, Details, offene Punkte). „Website angeschaut“ reicht nicht. Der Anlass muss nicht zum Produkt passen: Er ist nur der Gesprächseinstieg, um die Geschäftsführung nach strategischen Zielen zu fragen.
- **Einstiegssatz:** ein fertiger Satz, den ich direkt sagen kann. Er nennt den Anlass und stellt eine offene Frage, z. B. „Sie haben 2025 in Wels angebaut. Inwieweit hat das bisher so geklappt, wie Sie sich das vorgestellt haben?“ Kein Smalltalk und kein Pitch.
- **Geschäftsführung** aus offiziellen Quellen (Firmenbuch/evi.gv.at, Impressum, WKO Firmen A–Z), mit Angabe der Quelle.
- Telefon, **Website-Link**, Mitarbeiterzahl (mit Quelle oder „offen“).
- **Score 0–10:** Stärke und Aktualität des Wachstumssignals, Produkt-Fit, wirtschaftliche Leistungsfähigkeit, Erreichbarkeit der GF, kurzfristiger Bedarf.
- **Break-even als Modellrechnung:** 10.970 € geteilt durch den angenommenen zusätzlichen Deckungsbeitrag pro Auftrag, aufgerundet. Drei Szenarien (konservativ, realistisch, optimistisch), Annahmen gekennzeichnet. Umsatz, Rohertrag, Deckungsbeitrag und Gewinn auseinanderhalten. Keine erfundenen Margen und kein Renditeversprechen gegenüber dem Kunden.
- Jede Aussage wird als **Fakt**, **Hypothese** oder **offen** markiert. **Niemals** Namen, Nummern, Investitionen oder Zahlen erfinden.
- **Warnhinweise** für sensible Hintergründe (Insolvenz, Todesfall o. Ä.). Der Einstiegssatz spricht so etwas nie an.
- **Dubletten:** Firmen, die schon in der App sind (egal welcher Status), werden nie erneut vorgeschlagen. Zusätzlich kann ich eine Ausschlussliste importieren (CSV mit Firmennamen aus meinem CRM).

## 3. Funktionen

**Phase 1: Kern (zuerst bauen)**
1. **Einstellungen:** API-Key, Tagesziel neue Leads (Standard 18), Startpaket (60), Gebiete, Branchen, Mindest-Mitarbeiterzahl, Produktdaten und Preise, Deckungsbeitrags-Annahmen je Gewerk (Standard: Haustechnik 2.000–4.000 €, PV 1.500–3.000 €, Elektro 1.000–2.500 €).
2. **„Tagesliste erzeugen“:** Startet die KI-Recherche nach den Regeln aus Abschnitt 2. Die Recherche läuft in mehreren Schritten: Kandidaten über Websuche finden (News, WKO-Meldungen, Regionalmedien, Stellenportale), Ausschluss- und Dublettenprüfung, Verifizierung (Firmenbuch/Impressum für GF, Telefon, Mitarbeiterzahl), Scoring, Einstiegssatz, Break-even. Mit Fortschrittsanzeige. Lieber weniger, dafür gute Leads. Fehlende Felder bleiben „offen“ und werden nicht geraten.
   - Öffne ich die App werktags nach 6 Uhr und für heute gibt es noch keine Liste, bietet sie den Lauf mit einem Klick an.
3. **Freigabe-Tabelle:** Fällige Wiedervorlagen ganz oben, darunter die neuen Leads. Spalten in dieser Reihenfolge: Nr, Firma, Freigabe (Rein/Raus), Score, Ort (Land), Anlass + Datum, Einstiegssatz, GF, Telefon, Website, MA, Break-even, Offene Punkte/Hinweis, Quelle. Freigabe per Klick oder Taste, „Alle rein“ als Button. Freigegebene Leads gehen in die Anrufliste.
4. **Import:** CSV aus meiner bestehenden Lead-Tabelle mit denselben Spalten.

**Phase 2: Telefonieren**
5. **Anrufliste** von oben nach unten, sortiert nach Score. Fällige Wiedervorlagen zuerst.
6. **Rundown-Karte (eine Bildschirmseite, auf einen Blick lesbar):** Firma, GF, Telefon als `tel:`-Link, Website-Link, Anlass mit Datum, Einstiegssatz groß, die Erstfrage „Inwieweit hat das bisher so geklappt, wie Sie sich das vorgestellt haben?“, Warnhinweise in Rot, Break-even mit Szenarien, Zweitprodukt-Potenzial.
   - **Prüfpunkte** recherchiert die App per Knopf „Rundown vertiefen“ selbst: offene Stellen, SEO-Sichtbarkeit, GEO (Sichtbarkeit in KI-Assistenten), Rechner oder Anfrageformular auf der Website, Karriereseite. Jeweils ein kurzer Befund mit Quelle.
7. **Ergebnis-Buttons** mit Tastaturkürzeln: Nicht erreicht (1), Absage (2), Wiedervorlage (3, mit Datum), Termin (4). Danach automatisch weiter zum nächsten Lead.
8. **Diktat** per Web Speech API (de-AT). Die KI macht daraus eine strukturierte Notiz mit Ergebnis, Gesprächspartner, Kernaussage, nächstem Schritt und Datum. Alles danach editierbar.
9. **Termin-Übergabe:** Bei „Termin“ erzeugt die App eine **3-Zeilen-Zusammenfassung** des Falls für meinen Anruf bei Jan oder Leon, mit dem Vermerk **„Lead von David Parikyan“**.
10. **Tageszähler:** Versuche, erreicht, Gespräche, Termine, Fortschritt zum Tagesziel (60 Versuche).

**Phase 3: CRM-Übergabe**
11. **„Für CRM kopieren“** pro Lead und gesammelt: ein fertiger Text bzw. eine CSV mit Firma, Kontakt, Telefon, Website, Tags (`AuftragsPlus`, Bundesland, Gewerk, `Lead: David Parikyan`) und einer Notiz, die mit „Lead-Quelle: David Parikyan (Kaltakquise), angelegt am <Datum>“ beginnt. Damit kann Claude den Lead in meinem Project Manager CRM anlegen.
12. **Wiedervorlagen-Ansicht** mit Datum, fällige Einträge hervorgehoben.
13. **Statistik:** Leads pro Woche, Trefferquote pro Gewerk und Gebiet, Termine. So sehe ich, welche Lead-Arten wirklich funktionieren.

## 4. Qualität
- Lege `CLAUDE.md` mit den fachlichen Regeln aus Abschnitt 2 an, damit spätere Änderungen sie einhalten.
- Lagere die Recherche-Prompts in eigene Dateien aus (z. B. `src/prompts/`), damit ich sie später anpassen kann.
- Teste jede Phase selbst im Browser (Import, Freigabe, Tastaturkürzel, Diktat, Export), bevor du fertig meldest. Für die KI-Recherche gibt es einen Testmodus mit Beispieldaten ohne API-Key.
- Schreib mir zum Schluss eine kurze Anleitung (max. 10 Zeilen): App öffnen, API-Key eintragen, Tagesliste erzeugen, Daten sichern. Nenne die ungefähren API-Kosten pro Tagesliste.
- Stell Rückfragen nur, wenn wirklich etwas blockiert. Sonst triff sinnvolle Annahmen und liste sie am Ende auf.
