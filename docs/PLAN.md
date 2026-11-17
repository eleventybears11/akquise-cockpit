# Lead-Cockpit – Plan (zur Freigabe)

Stand: 17.11.2026 · Grundlage: `docs/prompts/` (P1 ChatGPT, P2 Claude, Abgleich in `00-ABGLEICH.md`)
Entscheidungen bisher: **rein im Browser**, Hosting **GitHub Pages** (Repo öffentlich).

---

## 1. Architektur und Technik

```
Chrome (Arbeitsrechner)
 ├─ Lead-Cockpit (statische SPA, GitHub Pages)
 │   ├─ UI: React + TypeScript + Tailwind, Tastaturkürzel, Hell/Dunkel
 │   ├─ Datenschicht: Repository-Interface ──► IndexedDB (Dexie)
 │   │                                    └─► später: CRM-Adapter (Project Manager)
 │   ├─ Recherche-Pipeline (mehrstufig, Prompts in src/prompts/*.md)
 │   └─ Diktat: Web Speech API (de-AT) hinter austauschbarer Schnittstelle
 └─► Anthropic Messages API (direkt aus dem Browser, eigener API-Key)
       └─ serverseitige Tools: Websuche + Web-Fetch (Anthropic führt sie aus)
```

| Baustein | Wahl | Begründung |
|---|---|---|
| Build | Vite + React + TypeScript | wie P2, schnell, statisch |
| UI | Tailwind CSS + eigene Komponenten (Radix-Primitives wo nötig) | P1: Design-Tokens, kein Template-Look |
| Speicher | IndexedDB über Dexie | P2; mit Migrationen (Dexie-Versionen) |
| KI | offizielles Anthropic-TypeScript-SDK, Browser-Modus | Key bleibt im Browser; strukturierte JSON-Ausgaben per Schema |
| Validierung | Zod | typsichere Datenverträge (P1) |
| Tests | Vitest (Logik) + Playwright (Abläufe im Browser) | P1 + P2 |
| Deploy | GitHub Action → GitHub Pages | P2 |

**Sicherheit trotz Key im Browser:** keine Fremd-Skripte, strenge Content-Security-Policy (nur eigene Dateien plus `api.anthropic.com`), Key nie in Logs, Exporten oder dem Repo, „Key löschen“-Knopf. Empfehlung: In der Anthropic-Konsole einen eigenen Key mit **Ausgabenlimit** anlegen.

**Gegen erfundene Daten (Kernregel aus beiden Prompts):** Jede Aussage hat den Status `fakt | hypothese | offen` und eine Quelle. Die App prüft automatisch, ob jede genannte Quellen-URL tatsächlich in den Such- oder Fetch-Ergebnissen dieses Laufs vorkam. Ist das nicht der Fall, wird die Aussage auf „offen“ herabgestuft. Namen und Telefonnummern gelten nur als Fakt, wenn sie aus einer abgerufenen Quelle stammen.

**Nicht auf Webformance festgelegt (P1):** Produkt, Zielkunden (ICP), Preise, Deckungsbeitrags-Annahmen und Scoring-Gewichte liegen als **Profil** in den Einstellungen. „Webformance / AuftragsPlus“ ist das erste Profil. Weitere Auftraggeber kommen später als weitere Profile dazu.

## 2. Datenmodell (IndexedDB)

| Tabelle | Wichtigste Felder |
|---|---|
| `profiles` | Produkt, Preise, Mindestinvestition, ICP (Branchen, Gebiete, Mindest-MA), DB-Annahmen je Gewerk, Scoring-Gewichte, Übergabe-Empfänger (Jan, Leon) |
| `settings` | aktives Profil, Modellwahl, Tagesziele (18 Leads / 60 Versuche), Startpaket 60 |
| `companies` | Name, normalisierter Name (Dubletten), Ort, Bundesland, Land, Website, Telefon, MA (+Quelle), Gewerk, Lead-Typ A/B, Score + Aufschlüsselung, **Status** (vorgeschlagen → freigegeben/raus → in Anrufliste → Termin/Absage/Wiedervorlage), `leadOwner = "David Parikyan"`, angelegt am |
| `contacts` | Firma, Name, Rolle (GF), Quelle |
| `evidence` | Firma, Art (Anlass, GF, MA, Telefon, Prüfpunkt …), Aussage, Status fakt/hypothese/offen, Quellen-URL, Datum |
| `briefs` | Firma, Einstiegssatz, Break-even (3 Szenarien + Annahmen), Warnhinweise, offene Punkte, Zweitprodukt, Recherche-Lauf |
| `calls` | Firma, Zeitpunkt, Ergebnis (nicht erreicht / Absage / Wiedervorlage / Termin), Diktat roh, strukturierte Notiz (editierbar), nächster Schritt |
| `followUps` | Firma, fällig am, Grund, erledigt |
| `handovers` | Firma, Empfänger, 3-Zeilen-Text mit „Lead von David Parikyan“ |
| `researchRuns` | Datum, Status, Schritte, Tokens, Suchanfragen, Kosten, erzeugte Leads |
| `exclusions` | normalisierter Firmenname, Herkunft (CRM-CSV) |

KI-Texte (`briefs`, strukturierte Notizen) sind getrennt von den Stammdaten (`companies`, `contacts`), wie P1 es verlangt. Die KI überschreibt keine Stammdaten ohne Bestätigung.

## 3. Kern-Abläufe

1. **Morgens (werktags ab 6 Uhr):** App öffnen → Hinweis „Tagesliste erzeugen?“ → Fortschrittsanzeige → Freigabe-Tabelle (fällige Wiedervorlagen oben) → Rein/Raus per Taste → „Alle rein“ → Anrufliste.
2. **Nachmittags telefonieren:** Rundown-Karte → `tel:`-Link → Gespräch → Taste 1–4 → bei Bedarf diktieren → nächster Lead öffnet sich automatisch. Tageszähler läuft mit.
3. **Termin:** Taste 4 → 3-Zeilen-Übergabe für Jan oder Leon → kopieren → zusätzlich „Für CRM kopieren“.
4. **Sichern:** Ein Klick auf „Backup“ lädt eine JSON-Datei herunter. Die App erinnert daran, wenn das letzte Backup älter als 7 Tage ist.

## 4. UI-Vorschlag

- **Drei Hauptansichten** (Tasten `g f` / `g a` / `g w`): **Freigabe**, **Anrufen**, **Wiedervorlagen**. Dazu Statistik und Einstellungen.
- **Anrufen** ist eine Vollbild-Karte ohne Ablenkung:
  - oben Firma, GF und eine große Telefonnummer
  - in der Mitte groß der Anlass und der Einstiegssatz
  - darunter klein die Erstfrage, Break-even und Zweitprodukt; Warnhinweise rot
  - Prüfpunkte einklappbar
  - unten die vier Ergebnis-Tasten
- Ruhige, dichte Gestaltung: eine Schrift, viel Zeilenabstand, klare Status-Farben. Hell- und Dunkelmodus. Optimiert für Laptop, auf dem Handy lesbar.
- Ich zeige dir vor dem Bau der Oberfläche eine klickbare Skizze der Anruf-Karte und der Freigabe-Tabelle mit Demo-Daten (als „Demo“ gekennzeichnet).

## 5. Fahrplan (Meilensteine, jeder wird deployt)

| M | Inhalt | Abnahme |
|---|---|---|
| **M1 Telefonieren ohne KI** | Einstellungen/Profil, CSV-Import deiner Lead-Tabelle, Freigabe-Tabelle, Anrufliste, Rundown-Karte, Ergebnis-Tasten 1–4, Wiedervorlagen, Tageszähler, JSON/CSV-Export und -Import | Ich importiere eine Beispiel-CSV und telefoniere 10 Leads per Tastatur durch, ohne Maus. Nach dem Neuladen ist alles noch da, das Backup lässt sich wieder einspielen. Playwright-Tests sind grün. |
| **M2 KI-Tagesliste** | API-Key, Recherche-Pipeline (Suchen → Dubletten/Ausschluss → Verifizieren → Scoring → Einstiegssatz → Break-even), Kostenanzeige, Testmodus ohne Key, Ausschlussliste | Ein Lauf liefert Leads mit Quellen. Jede URL ist gegen die Suchergebnisse geprüft, fehlende Angaben stehen als „offen“ da. Kosten pro Lauf werden angezeigt. |
| **M3 Gespräch erfassen** | Diktat (de-AT) → strukturierte Notiz, Termin-Übergabe (3 Zeilen), „Rundown vertiefen“ (Prüfpunkte) | Diktat → Notiz → bearbeiten → speichern funktioniert. Die Übergabe enthält „Lead von David Parikyan“. |
| **M4 CRM & Statistik** | „Für CRM kopieren“ (einzeln/gesammelt, Tags, Notiz-Vorspann), Statistik nach Gewerk/Gebiet/Woche | Die CSV lässt sich in den Project Manager übernehmen. Die Zahlen stimmen mit den erfassten Anrufen überein. |
| **später (P1)** | Sprachbefehle („nächster Lead“, „Wiedervorlage Donnerstag“), Markdown-Export für Obsidian, Lernen aus Ergebnissen (welche Anlässe zu Terminen führen), Direktanbindung Project Manager, Deutschland-Gebiete | einzeln freizugeben |

**Abweichung von P2:** Ich ziehe das Telefonieren vor die KI-Recherche. Begründung: Mit deiner bestehenden Lead-Tabelle (CSV) kannst du ab M1 sofort damit arbeiten, ohne API-Kosten. Gleichzeitig steht die Datenbasis, auf der die KI-Leads später landen.

## 6. Laufende Kosten

| Posten | Kosten |
|---|---|
| Hosting (GitHub Pages) | 0 € |
| Websuche über die API | ca. 10 $ pro 1.000 Suchen. Bei ca. 60–120 Suchen pro Tagesliste sind das ca. 0,60–1,20 $ |
| KI-Tokens pro Tagesliste (18 Leads, inkl. aussortierter Kandidaten) | Grobe Schätzung: **Opus-Klasse ca. 5–15 $**, **Sonnet-Klasse ca. 3–8 $** pro Tag. Suchergebnisse sind textlastig und treiben die Eingabe-Tokens. Prompt-Caching und das Filtern der Suchergebnisse senken das. |
| Startpaket (60 Leads, einmalig) | ca. 3× eine Tagesliste |
| Diktat (Web Speech API) | 0 € |
| Monat (20 Werktage) | grob **60–300 $**, je nach Modell. Genaue Zahl nach dem ersten echten Lauf in M2, die App zeigt die Kosten pro Lauf an. |

Modell ist in den Einstellungen wählbar. Standard ist das stärkste Modell (Opus-Klasse), weil Verifizieren und „nichts erfinden“ hier am wichtigsten sind. Ein günstigeres Modell lässt sich per Klick testen.

## 7. Benötigte Konten

- **Anthropic-Konsole** (console.anthropic.com): API-Key mit Guthaben. Das Claude-Abo deckt die API **nicht** ab. Ausgabenlimit setzen.
- GitHub (vorhanden). In den Repo-Einstellungen muss Pages einmal auf „GitHub Actions“ gestellt werden, die Anleitung kommt mit M1.

## 8. Risiken

1. **Recht – Kaltakquise in Österreich:** Nach § 174 TKG 2021 sind Werbeanrufe ohne vorherige Einwilligung nach meinem Kenntnisstand auch gegenüber Unternehmen unzulässig. Bitte mit Webformance oder einem Anwalt klären. Das ist keine Rechtsberatung.
2. **Datenverlust:** Die Daten liegen nur in diesem Chrome-Profil. Gegenmaßnahmen: Backup-Erinnerung und Export. Löscht die IT des Arbeitsrechners das Browser-Profil, hilft nur ein Backup.
3. **DSGVO:** Es werden personenbezogene Daten verarbeitet (GF-Namen, Nummern, Gesprächsnotizen). Geplant: Löschfunktion pro Firma oder Person und ein Hinweis zu Speicherdauer. Chrome-Diktat schickt Audio an Google.
4. **Recherchequalität:** Firmenbuch, evi und WKO sind per Websuche nicht immer vollständig erreichbar. Deshalb wird es Leads mit „offen“ geben, das ist so gewollt. Es kann sein, dass „18 gute Leads pro Tag“ nicht jeden Tag erreicht wird.
5. **Öffentliches Repo:** Code und Doku sind öffentlich einsehbar. Lead-Daten liegen nie im Repo.
6. **Key im Browser:** Abgesichert durch CSP und keine Fremd-Skripte. Ausgabenlimit in der Konsole als zweite Sicherung.

## 9. Offene Fragen (nur was M1 betrifft)

1. **Deine bestehende Lead-Tabelle:** Kannst du eine Beispiel-CSV hochladen (gern mit 2–3 anonymisierten Zeilen)? Sonst baue ich den Import auf die Spalten aus P2 und mache die Zuordnung frei wählbar.
2. **Montagvormittag:** Soll die App die Anrufliste da nur ausblenden oder nur einen Hinweis zeigen? Ohne Antwort setze ich einen Hinweis um.

---

**Kleinster sinnvoller Schritt = M1.** Danach kannst du am selben Tag mit deiner vorhandenen Lead-Liste schneller telefonieren: Tastatur statt Klicks, Rundown auf einen Blick, Wiedervorlagen, die nicht verloren gehen, und alles gesichert. Die KI-Recherche (M2) setzt direkt darauf auf.
