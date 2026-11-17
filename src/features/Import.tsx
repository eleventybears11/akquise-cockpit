import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import { importDrafts } from "../data/repo";
import { CSV_FIELDS, guessMapping, parseCsv, planImport, rowsToDrafts, type ColumnMapping, type CsvFieldKey, type ParsedCsv } from "../lib/csv";
import { navigate, useProfile } from "../lib/hooks";
import { toast } from "../lib/toast";
import { Badge, Button, Card, PageHeader } from "../components/ui";

export function Import() {
  const profile = useProfile();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const existing = useLiveQuery(async () => new Set((await db.companies.toArray()).map((c) => c.normName)), [], new Set<string>());

  const load = (text: string, name: string) => {
    const p = parseCsv(text);
    if (p.headers.length === 0 || p.rows.length === 0) {
      toast({ text: "Keine Zeilen erkannt. Ist das eine CSV mit Kopfzeile?", tone: "danger" });
      return;
    }
    setParsed(p);
    setFileName(name);
    setMapping(guessMapping(p.headers));
  };

  const plan = useMemo(() => {
    if (!parsed) return null;
    return planImport(rowsToDrafts(parsed.rows, mapping, profile.leadOwner), existing);
  }, [parsed, mapping, profile.leadOwner, existing]);

  const hasName = Object.values(mapping).includes("name");

  const run = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const n = await importDrafts(plan.neu);
      toast({ text: `${n} Leads importiert${plan.dubletten.length ? `, ${plan.dubletten.length} Dubletten übersprungen` : ""}`, tone: "ok" });
      navigate("freigabe");
    } catch (err) {
      toast({ text: `Import fehlgeschlagen: ${(err as Error).message}`, tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const stats = plan && {
    offen: plan.neu.filter((d) => d.freigabe === "offen").length,
    anruf: plan.neu.filter((d) => d.status === "anrufliste").length,
    wv: plan.neu.filter((d) => d.status === "wiedervorlage").length,
    zu: plan.neu.filter((d) => d.status === "absage" || d.status === "termin" || d.status === "raus").length,
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="CSV importieren"
        sub="Deine Lead-Tabelle (Komma, Semikolon oder Tab). Spalten werden automatisch erkannt. Firmen, die schon in der App sind, werden übersprungen."
      />
      {!parsed ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <label
              className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line px-4 py-10 text-center hover:border-accent"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) load(await f.text(), f.name);
              }}
            >
              <span className="font-medium">CSV-Datei wählen</span>
              <span className="text-sm text-muted">oder hierher ziehen</span>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                className="sr-only"
                data-testid="csv-file"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) load(await f.text(), f.name);
                }}
              />
            </label>
          </Card>
          <Card className="flex flex-col gap-3 p-5">
            <label className="text-sm font-medium" htmlFor="paste">…oder CSV-Text einfügen</label>
            <textarea
              id="paste"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={7}
              className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 font-mono text-xs"
              placeholder={'"Nr","Firma","Freigabe","Score",…'}
            />
            <Button variant="primary" disabled={!paste.trim()} onClick={() => load(paste, "eingefügter Text")}>Weiter</Button>
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{fileName}: {parsed.rows.length} Zeilen</h2>
              <Button variant="ghost" onClick={() => setParsed(null)}>Andere Datei</Button>
            </div>
            <h3 className="mt-4 mb-2 text-sm font-medium text-muted">Spalten-Zuordnung</h3>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {parsed.headers.map((h) => (
                <label key={h} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate" title={h}>{h}</span>
                  <select
                    value={mapping[h] ?? ""}
                    onChange={(e) => setMapping({ ...mapping, [h]: e.target.value as CsvFieldKey | "" })}
                    className={`w-52 rounded-md border border-line bg-surface px-2 py-1 ${mapping[h] ? "" : "text-muted"}`}
                  >
                    <option value="">– ignorieren –</option>
                    {CSV_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </Card>

          {plan && stats && (
            <Card className="p-5" >
              <h2 className="font-semibold" data-testid="import-summary">
                {plan.neu.length} neue Leads, {plan.dubletten.length} Dubletten
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Badge>{stats.offen} zur Freigabe</Badge>
                <Badge tone="accent">{stats.anruf} direkt in die Anrufliste</Badge>
                <Badge tone="warn">{stats.wv} Wiedervorlagen</Badge>
                <Badge tone="danger">{stats.zu} abgeschlossen (Absage/Termin)</Badge>
              </div>
              <p className="mt-3 text-sm text-muted">
                Zeilen mit „Im CRM“ gelten als freigegeben. Ein Wiedervorlage-Datum wird übernommen. „Absage“ im letzten Kontakt schließt den Lead ab.
                Fehlt der Lead-Inhaber, wird „{profile.leadOwner}“ eingetragen.
              </p>
              {plan.dubletten.length > 0 && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-muted">Übersprungene Dubletten anzeigen</summary>
                  <ul className="mt-2 list-disc pl-5">
                    {plan.dubletten.map((d, i) => (
                      <li key={i}>{d.draft.name} <span className="text-muted">({d.grund})</span></li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="primary" disabled={!hasName || plan.neu.length === 0 || busy} onClick={() => void run()}>
                  {plan.neu.length} Leads importieren
                </Button>
                {!hasName && <span className="self-center text-sm text-danger">Bitte eine Spalte als „Firma“ zuordnen.</span>}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
