import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import type { LeadStatus } from "../data/types";
import { addEnrichments } from "../data/repo";
import { parseCsv } from "../lib/csv";
import { isoDate } from "../lib/dates";
import { buildExportRows, exportCsv, guessColumnKinds, planEnrichment, type ColumnKind, type ExportRow } from "../lib/fullenrich";
import { toast } from "../lib/toast";
import { Badge, Button, Card, PageHeader, downloadFile } from "../components/ui";

const STATUS: { value: LeadStatus; label: string }[] = [
  { value: "neu", label: "Neu (Freigabe)" },
  { value: "anrufliste", label: "Anrufliste" },
  { value: "wiedervorlage", label: "Wiedervorlage" },
  { value: "termin", label: "Termin" },
  { value: "absage", label: "Absage" },
];

const KIND_LABEL: Record<ColumnKind, string> = {
  "": "– ignorieren –",
  id: "Lead-Cockpit ID",
  first: "Vorname",
  last: "Nachname",
  company: "Firma",
  domain: "Domain/Website",
  phone: "Telefon",
  email: "E-Mail",
};

export function Anreichern() {
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Anreichern mit FullEnrich"
        sub="FullEnrich sucht Handynummern und E-Mails der Geschäftsführung. Ablauf: hier exportieren → in FullEnrich hochladen → Ergebnis-CSV hier importieren."
      />
      <ExportStep />
      <ImportStep />
      <p className="text-xs text-muted">
        Gefundene Daten werden getrennt von deinen Stammdaten mit der Quelle „FullEnrich“ gespeichert und nie überschrieben.
        Handynummern von Personen sind personenbezogene Daten (DSGVO). Rechtliche Zulässigkeit von Anrufen bitte selbst prüfen.
      </p>
    </div>
  );
}

function ExportStep() {
  const [statuses, setStatuses] = useState<LeadStatus[]>(["neu", "anrufliste", "wiedervorlage"]);
  const [skipEnriched, setSkipEnriched] = useState(true);
  const [edits, setEdits] = useState<Record<string, Partial<ExportRow> & { off?: boolean }>>({});
  const data = useLiveQuery(async () => ({ companies: await db.companies.toArray(), enriched: new Set((await db.enrichments.toArray()).map((e) => e.companyId)) }), []);

  const rows = useMemo(() => {
    if (!data) return [];
    const selected = data.companies
      .filter((c) => statuses.includes(c.status))
      .filter((c) => !skipEnriched || !data.enriched.has(c.id))
      .sort((a, b) => (a.nr ?? 9999) - (b.nr ?? 9999));
    return buildExportRows(selected);
  }, [data, statuses, skipEnriched]);

  const keyOf = (r: ExportRow, i: number) => `${r.companyId}#${i}`;
  const finalRows = rows.map((r, i) => ({ ...r, ...edits[keyOf(r, i)] })).filter((r) => !r.off);
  const ohneGf = data ? data.companies.filter((c) => statuses.includes(c.status) && !rows.some((r) => r.companyId === c.id) && (!skipEnriched || !data.enriched.has(c.id))).length : 0;

  const download = () => {
    downloadFile(`fullenrich-export-${isoDate()}.csv`, `\uFEFF${exportCsv(finalRows)}`, "text/csv;charset=utf-8");
    toast({ text: `${finalRows.length} Personen exportiert. Jetzt in FullEnrich hochladen.`, tone: "ok" });
  };

  return (
    <Card className="p-5">
      <h2 className="font-semibold">1. Für FullEnrich exportieren</h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {STATUS.map((s) => (
          <label key={s.value} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={statuses.includes(s.value)}
              onChange={(e) => setStatuses(e.target.checked ? [...statuses, s.value] : statuses.filter((x) => x !== s.value))}
            />
            {s.label}
          </label>
        ))}
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={skipEnriched} onChange={(e) => setSkipEnriched(e.target.checked)} />
          bereits angereicherte überspringen
        </label>
      </div>
      <p className="mt-3 text-sm text-muted">
        {finalRows.length} Personen aus dem GF-Feld erkannt{ohneGf ? `, ${ohneGf} Leads ohne GF-Namen werden ausgelassen` : ""}. Namen bei Bedarf korrigieren.
        Kosten bei FullEnrich nur bei Treffern: Handy 10, E-Mail 1 Credit, also höchstens ca. {finalRows.length * 11} Credits.
      </p>
      {rows.length > 0 && (
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-sm" data-testid="fe-export-tabelle">
            <thead className="sticky top-0 bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-1.5"></th>
                <th className="px-2 py-1.5 font-medium">Vorname</th>
                <th className="px-2 py-1.5 font-medium">Nachname</th>
                <th className="px-2 py-1.5 font-medium">Firma</th>
                <th className="px-2 py-1.5 font-medium">Domain</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const k = keyOf(r, i);
                const e = edits[k] ?? {};
                const set = (patch: Partial<ExportRow> & { off?: boolean }) => setEdits({ ...edits, [k]: { ...e, ...patch } });
                return (
                  <tr key={k} className={`border-t border-line ${e.off ? "opacity-40" : ""}`}>
                    <td className="px-2 py-1"><input type="checkbox" checked={!e.off} onChange={(ev) => set({ off: !ev.target.checked })} aria-label="exportieren" /></td>
                    <td className="px-2 py-1"><input className="w-full rounded border border-line bg-surface px-1.5 py-0.5" value={e.firstName ?? r.firstName} onChange={(ev) => set({ firstName: ev.target.value })} /></td>
                    <td className="px-2 py-1"><input className="w-full rounded border border-line bg-surface px-1.5 py-0.5" value={e.lastName ?? r.lastName} onChange={(ev) => set({ lastName: ev.target.value })} /></td>
                    <td className="px-2 py-1">{r.companyName}</td>
                    <td className="px-2 py-1"><input className="w-full rounded border border-line bg-surface px-1.5 py-0.5" value={e.domain ?? r.domain} placeholder="fehlt" onChange={(ev) => set({ domain: ev.target.value })} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <Button variant="primary" disabled={finalRows.length === 0} onClick={download}>CSV für FullEnrich herunterladen ({finalRows.length})</Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        In FullEnrich: Enrich → CSV hochladen → Spalten First Name, Last Name, Company Name, Company Domain zuordnen. Die Spalte „Lead-Cockpit ID“ unverändert mitlaufen lassen, dann klappt die Zuordnung beim Rück-Import sicher.
      </p>
    </Card>
  );
}

function ImportStep() {
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [kinds, setKinds] = useState<Record<string, ColumnKind>>({});
  const [off, setOff] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const data = useLiveQuery(async () => ({ companies: await db.companies.toArray(), enrichments: await db.enrichments.toArray() }), []);

  const load = async (file: File) => {
    const p = parseCsv(await file.text());
    if (p.rows.length === 0) {
      toast({ text: "Keine Zeilen erkannt.", tone: "danger" });
      return;
    }
    setParsed(p);
    setKinds(guessColumnKinds(p.headers));
    setOff(new Set());
  };

  const plan = useMemo(() => (parsed && data ? planEnrichment(parsed.rows, kinds, data.companies, data.enrichments) : null), [parsed, kinds, data]);
  const chosen = plan ? plan.neu.filter((_, i) => !off.has(i)) : [];

  const save = async () => {
    setBusy(true);
    try {
      const n = await addEnrichments(chosen.map((f) => ({ companyId: f.companyId, person: f.person, typ: f.typ, wert: f.wert, quelle: "FullEnrich" })));
      toast({ text: `${n} Kontaktdaten übernommen`, tone: "ok" });
      setParsed(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5">
      <h2 className="font-semibold">2. FullEnrich-Ergebnis importieren</h2>
      {!parsed ? (
        <label className="mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-line px-4 py-8 text-center hover:border-accent">
          <span className="font-medium">Ergebnis-CSV aus FullEnrich wählen</span>
          <span className="text-sm text-muted">Nichts wird ohne deine Bestätigung übernommen.</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" data-testid="fe-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ""; }} />
        </label>
      ) : (
        <div className="mt-3 space-y-4">
          <details className="text-sm" open={!Object.values(kinds).includes("phone") && !Object.values(kinds).includes("email")}>
            <summary className="cursor-pointer text-muted">Spalten-Zuordnung ({parsed.headers.length} Spalten)</summary>
            <div className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {parsed.headers.map((h) => (
                <label key={h} className="flex items-center justify-between gap-3">
                  <span className="truncate" title={h}>{h}</span>
                  <select className="w-44 rounded-md border border-line bg-surface px-2 py-1" value={kinds[h] ?? ""} onChange={(e) => setKinds({ ...kinds, [h]: e.target.value as ColumnKind })}>
                    {Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </details>

          {plan && (
            <>
              <div className="flex flex-wrap gap-2 text-sm" data-testid="fe-summary">
                <Badge tone="ok">{plan.neu.length} neue Angaben</Badge>
                <Badge>{plan.bekannt} schon bekannt</Badge>
                {plan.nichtZugeordnet.length > 0 && <Badge tone="warn">{plan.nichtZugeordnet.length} nicht zuordenbar</Badge>}
              </div>
              {plan.neu.length > 0 && (
                <div className="max-h-80 overflow-auto rounded-lg border border-line">
                  <table className="w-full text-sm" data-testid="fe-import-tabelle">
                    <tbody>
                      {plan.neu.map((f, i) => (
                        <tr key={i} className={`border-t border-line first:border-t-0 ${off.has(i) ? "opacity-40" : ""}`}>
                          <td className="px-2 py-1.5">
                            <input type="checkbox" checked={!off.has(i)} aria-label="übernehmen" onChange={(e) => { const n = new Set(off); if (e.target.checked) n.delete(i); else n.add(i); setOff(n); }} />
                          </td>
                          <td className="px-2 py-1.5 font-medium">{f.companyName}</td>
                          <td className="px-2 py-1.5 text-muted">{f.person}</td>
                          <td className="px-2 py-1.5">{f.typ === "telefon" ? "Telefon" : "E-Mail"}</td>
                          <td className="px-2 py-1.5 tabular-nums">{f.wert}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {plan.nichtZugeordnet.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted">Nicht zuordenbare Zeilen</summary>
                  <ul className="mt-1 list-disc pl-5">{plan.nichtZugeordnet.map((n, i) => <li key={i}>{n}</li>)}</ul>
                </details>
              )}
              <div className="flex gap-2">
                <Button variant="primary" disabled={chosen.length === 0 || busy} onClick={() => void save()}>{chosen.length} Angaben übernehmen</Button>
                <Button variant="ghost" onClick={() => setParsed(null)}>Abbrechen</Button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
