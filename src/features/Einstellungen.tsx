import { useEffect, useState, type ReactNode } from "react";
import type { Profile, Settings } from "../data/types";
import { deleteAll, importExclusions, clearExclusions, isBackup, restoreBackup, saveProfile, updateSettings } from "../data/repo";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import { parseCsv } from "../lib/csv";
import { getApiKey, maskKey, setApiKey } from "../research/key";
import { KRITERIEN } from "../research/logic";
import { formatDateTime } from "../lib/dates";
import { useProfile, useSettings } from "../lib/hooks";
import { toast } from "../lib/toast";
import { Button, Card, PageHeader } from "../components/ui";
import { downloadBackup, downloadCsv } from "./backup";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";

export function Einstellungen() {
  const profile = useProfile();
  const settings = useSettings();
  const [p, setP] = useState<Profile>(profile);
  const [s, setS] = useState<Settings>(settings);
  const [confirm, setConfirm] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [gespeicherterKey, setGespeicherterKey] = useState(getApiKey());
  const [keyStatus, setKeyStatus] = useState("");
  const ausschluss = useLiveQuery(() => db.exclusions.count(), [], 0);

  useEffect(() => setP(profile), [profile]);
  useEffect(() => setS(settings), [settings]);

  const save = async () => {
    await saveProfile({ ...p, terminEmpfaenger: p.terminEmpfaenger.map((x) => x.trim()).filter(Boolean) });
    await updateSettings({
      tageszielVersuche: s.tageszielVersuche,
      tageszielNeueLeads: s.tageszielNeueLeads,
      startpaket: s.startpaket,
      theme: s.theme,
      modell: s.modell,
      aufwand: s.aufwand,
      testmodus: s.testmodus,
      maxKostenProLauf: s.maxKostenProLauf,
    });
    toast({ text: "Einstellungen gespeichert", tone: "ok" });
  };

  const restore = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error("Das ist keine Lead-Cockpit-Sicherung.");
      if (!window.confirm(`Alle aktuellen Daten durch das Backup vom ${formatDateTime(data.exportedAt)} ersetzen (${data.companies.length} Leads, ${data.calls.length} Anrufe)?`)) return;
      await restoreBackup(data);
      toast({ text: "Backup eingespielt", tone: "ok" });
    } catch (err) {
      toast({ text: `Backup nicht eingespielt: ${(err as Error).message}`, tone: "danger" });
    }
  };

  const num = (v: string) => Math.max(0, Number.parseInt(v, 10) || 0);
  const liste = (v: string) => v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);

  const keySpeichern = async () => {
    setApiKey(keyInput);
    setGespeicherterKey(getApiKey());
    setKeyInput("");
    if (!keyInput.trim()) {
      setKeyStatus("Key entfernt.");
      return;
    }
    setKeyStatus("Prüfe …");
    const { fehlerText, pruefeKey } = await import("../research/claude");
    try {
      const name = await pruefeKey(keyInput.trim(), s.modell);
      setKeyStatus(`Key gültig – ${name} erreichbar.`);
    } catch (err) {
      setKeyStatus(`Gespeichert, aber Prüfung fehlgeschlagen: ${fehlerText(err)}`);
    }
  };

  const ausschlussImport = async (file: File) => {
    const p = parseCsv(await file.text());
    const col = p.headers.find((h) => /firma|firmenname|unternehmen|company|name/i.test(h)) ?? p.headers[0];
    if (!col) return;
    const n = await importExclusions(p.rows.map((r) => r[col] ?? ""), file.name);
    toast({ text: `${n} Firmen in der Ausschlussliste (Spalte „${col}“)`, tone: "ok" });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Einstellungen" actions={<Button variant="primary" onClick={() => void save()}>Speichern</Button>} />

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Profil: Auftraggeber & Produkt</h2>
        <p className="mb-4 text-sm text-muted">Weitere Auftraggeber kommen später als eigene Profile dazu.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Profilname"><input className={input} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Produkt"><input className={input} value={p.produkt} onChange={(e) => setP({ ...p, produkt: e.target.value })} /></Field>
          <Field label="Mindestinvestition" hint="€ netto, für den Break-even">
            <input className={input} type="number" min={0} value={p.mindestinvestition} onChange={(e) => setP({ ...p, mindestinvestition: num(e.target.value) })} />
          </Field>
          <Field label="Lead-Inhaber" hint="wird bei jedem Lead vermerkt">
            <input className={input} value={p.leadOwner} onChange={(e) => setP({ ...p, leadOwner: e.target.value })} />
          </Field>
          <Field label="Termine für" hint="kommagetrennt">
            <input className={input} value={p.terminEmpfaenger.join(", ")} onChange={(e) => setP({ ...p, terminEmpfaenger: e.target.value.split(",") })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Erstfrage" hint="steht auf jeder Rundown-Karte">
              <input className={input} value={p.erstfrage} onChange={(e) => setP({ ...p, erstfrage: e.target.value })} />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Tagesziele & Darstellung</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Anrufversuche/Tag">
            <input className={input} type="number" min={1} value={s.tageszielVersuche} onChange={(e) => setS({ ...s, tageszielVersuche: num(e.target.value) })} />
          </Field>
          <Field label="Neue Leads/Tag" hint="ab M2">
            <input className={input} type="number" min={0} value={s.tageszielNeueLeads} onChange={(e) => setS({ ...s, tageszielNeueLeads: num(e.target.value) })} />
          </Field>
          <Field label="Startpaket" hint="ab M2">
            <input className={input} type="number" min={0} value={s.startpaket} onChange={(e) => setS({ ...s, startpaket: num(e.target.value) })} />
          </Field>
          <Field label="Farbschema">
            <select className={input} value={s.theme} onChange={(e) => setS({ ...s, theme: e.target.value as Settings["theme"] })}>
              <option value="system">wie System</option>
              <option value="hell">hell</option>
              <option value="dunkel">dunkel</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Daten sichern</h2>
        <p className="mb-4 text-sm text-muted">
          Alle Daten liegen nur in diesem Browser. Sichere regelmäßig, z. B. in deinen OneDrive- oder Dokumente-Ordner.
          {settings.lastBackupAt ? ` Letztes Backup: ${formatDateTime(settings.lastBackupAt)}.` : " Noch kein Backup."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void downloadBackup()}>Backup herunterladen (JSON)</Button>
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-2">
            Backup einspielen
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              data-testid="backup-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restore(f);
                e.target.value = "";
              }}
            />
          </label>
          <Button onClick={() => void downloadCsv()}>Leads als CSV exportieren</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">KI-Recherche</h2>
        <p className="mb-4 text-sm text-muted">
          Der API-Key (console.anthropic.com) wird nur in diesem Browser gespeichert – nicht im Backup, nicht im Export.
          Setze in der Anthropic-Konsole ein Ausgabenlimit. Das Claude-Abo deckt die API nicht ab.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Anthropic API-Key" hint={gespeicherterKey ? `gespeichert: ${maskKey(gespeicherterKey)}` : "nicht gespeichert"}>
            <div className="flex gap-2">
              <input className={input} type="password" autoComplete="off" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={gespeicherterKey ? "neuen Key eingeben oder leer lassen zum Entfernen" : "sk-ant-…"} aria-label="API-Key" />
              <Button onClick={() => void keySpeichern()}>{keyInput ? "Speichern" : gespeicherterKey ? "Entfernen" : "Speichern"}</Button>
            </div>
            {keyStatus && <p className="mt-1 text-xs text-muted" data-testid="key-status">{keyStatus}</p>}
          </Field>
          <Field label="Modell" hint="Opus = beste Prüfung, Sonnet/Haiku = günstiger">
            <select className={input} value={s.modell} onChange={(e) => setS({ ...s, modell: e.target.value as Settings["modell"] })}>
              <option value="claude-opus-5-5">Claude Opus 5.5 (ca. 4/20 $ pro Mio. Tokens)</option>
              <option value="claude-sonnet-5-5">Claude Sonnet 5.5 (ca. 2/10 $)</option>
              <option value="claude-haiku-5-5">Claude Haiku 5.5 (ca. 0,10/0,50 $)</option>
            </select>
          </Field>
          <Field label="Gründlichkeit">
            <select className={input} value={s.aufwand} onChange={(e) => setS({ ...s, aufwand: e.target.value as Settings["aufwand"] })}>
              <option value="low">niedrig (günstiger)</option>
              <option value="medium">mittel</option>
              <option value="high">hoch (gründlicher, teurer)</option>
            </select>
          </Field>
          <Field label="Kostenlimit pro Lauf" hint="USD, Lauf stoppt danach">
            <input className={input} type="number" min={1} value={s.maxKostenProLauf} onChange={(e) => setS({ ...s, maxKostenProLauf: num(e.target.value) })} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={s.testmodus} onChange={(e) => setS({ ...s, testmodus: e.target.checked })} />
            Testmodus: erfundene DEMO-Leads statt echter Recherche (keine Kosten)
          </label>
        </div>
        <p className="mt-3 text-xs text-muted">Websuche zusätzlich ca. 0,01 $ pro Suche. Pro Tagesliste (18 Leads) grob 3–15 $, je nach Modell – die tatsächlichen Kosten zeigt jeder Lauf an.</p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Recherche-Regeln</h2>
        <p className="mb-4 text-sm text-muted">Gehen in jede KI-Recherche ein. Score und Break-even rechnet die App selbst mit diesen Werten.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branchen" hint="Priorität von links nach rechts, kommagetrennt">
            <textarea className={input} rows={2} value={p.branchen.join(", ")} onChange={(e) => setP({ ...p, branchen: liste(e.target.value) })} />
          </Field>
          <Field label="Gebiete" hint="kommagetrennt">
            <textarea className={input} rows={2} value={p.gebiete.join(", ")} onChange={(e) => setP({ ...p, gebiete: liste(e.target.value) })} />
          </Field>
          <Field label="Mindest-Mitarbeiterzahl">
            <input className={input} type="number" min={0} value={p.minMitarbeiter} onChange={(e) => setP({ ...p, minMitarbeiter: num(e.target.value) })} />
          </Field>
          <Field label="Gesprächsargument">
            <input className={input} value={p.gespraechsargument} onChange={(e) => setP({ ...p, gespraechsargument: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Wachstumssignale (wichtigster Filter)">
              <textarea className={input} rows={3} value={p.wachstumssignale} onChange={(e) => setP({ ...p, wachstumssignale: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Produktbeschreibung">
              <textarea className={input} rows={3} value={p.produktBeschreibung} onChange={(e) => setP({ ...p, produktBeschreibung: e.target.value })} />
            </Field>
          </div>
          <Field label="Referenz">
            <textarea className={input} rows={2} value={p.referenz} onChange={(e) => setP({ ...p, referenz: e.target.value })} />
          </Field>
          <Field label="Zweitprodukte">
            <textarea className={input} rows={2} value={p.zweitprodukte} onChange={(e) => setP({ ...p, zweitprodukte: e.target.value })} />
          </Field>
        </div>
        <h3 className="mt-5 mb-2 text-sm font-medium">Deckungsbeitrag pro zusätzlichem Auftrag (€, für den Break-even)</h3>
        <div className="grid gap-3 sm:grid-cols-4">
          {(["haustechnik", "pv", "elektro", "sonstiges"] as const).map((g) => (
            <div key={g} className="text-sm">
              <div className="mb-1 font-medium capitalize">{g === "pv" ? "PV" : g}</div>
              <div className="flex items-center gap-1">
                <input className={input} type="number" value={p.dbAnnahmen[g][0]} onChange={(e) => setP({ ...p, dbAnnahmen: { ...p.dbAnnahmen, [g]: [num(e.target.value), p.dbAnnahmen[g][1]] } })} aria-label={`${g} von`} />
                <span>–</span>
                <input className={input} type="number" value={p.dbAnnahmen[g][1]} onChange={(e) => setP({ ...p, dbAnnahmen: { ...p.dbAnnahmen, [g]: [p.dbAnnahmen[g][0], num(e.target.value)] } })} aria-label={`${g} bis`} />
              </div>
            </div>
          ))}
        </div>
        <h3 className="mt-5 mb-2 text-sm font-medium">Gewichtung im Score</h3>
        <div className="grid gap-3 sm:grid-cols-5">
          {KRITERIEN.map((k) => (
            <Field key={k.key} label={k.label}>
              <input className={input} type="number" min={0} value={p.gewichte[k.key]} onChange={(e) => setP({ ...p, gewichte: { ...p.gewichte, [k.key]: num(e.target.value) } })} />
            </Field>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Ausschlussliste (aus dem CRM)</h2>
        <p className="mb-3 text-sm text-muted">
          Firmen aus dieser Liste schlägt die KI-Recherche nie vor. CSV mit einer Spalte „Firma“ oder „Name“. Derzeit {ausschluss} Firmen.
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-2">
            CSV importieren
            <input type="file" accept=".csv,text/csv" className="sr-only" data-testid="exclusion-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void ausschlussImport(f); e.target.value = ""; }} />
          </label>
          {ausschluss > 0 && <Button variant="ghost" onClick={() => void clearExclusions()}>Liste leeren</Button>}
        </div>
      </Card>

      <Card className="border-danger/40 p-5">
        <h2 className="mb-1 font-semibold text-danger">Alle Leads und Anrufe löschen</h2>
        <p className="mb-3 text-sm text-muted">Profil und Einstellungen bleiben erhalten. Vorher ein Backup machen. Zum Bestätigen LÖSCHEN eintippen.</p>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} max-w-48`} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="LÖSCHEN" aria-label="Bestätigung" />
          <Button
            variant="danger"
            disabled={confirm !== "LÖSCHEN"}
            onClick={async () => {
              await deleteAll();
              setConfirm("");
              toast({ text: "Alle Leads und Anrufe gelöscht" });
            }}
          >
            Endgültig löschen
          </Button>
        </div>
      </Card>
    </div>
  );
}
