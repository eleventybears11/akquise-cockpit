import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import type { LeadStatus } from "../data/types";
import { normalizeName } from "../lib/normalize";
import { formatDate } from "../lib/dates";
import { Badge, Button, Empty, PageHeader, ScoreBadge, Val } from "../components/ui";
import { deleteDemoLeads, isDemoLead } from "../data/repo";
import { toast } from "../lib/toast";

const FILTERS: { value: LeadStatus | "alle"; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "neu", label: "Neu" },
  { value: "anrufliste", label: "Anrufliste" },
  { value: "wiedervorlage", label: "Wiedervorlage" },
  { value: "termin", label: "Termin" },
  { value: "absage", label: "Absage" },
  { value: "raus", label: "Raus" },
];

const TONE: Record<LeadStatus, "neutral" | "accent" | "ok" | "warn" | "danger"> = {
  neu: "neutral",
  anrufliste: "accent",
  wiedervorlage: "warn",
  termin: "ok",
  absage: "danger",
  raus: "neutral",
};

export function Leads() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "alle">("alle");
  const all = useLiveQuery(() => db.companies.toArray(), []);
  const testRunIds = useLiveQuery(async () => new Set((await db.runs.toArray()).filter((r) => r.modell === "test").map((r) => r.id)), [], new Set<string>());
  if (!all) return null;
  const demoCount = all.filter((c) => isDemoLead(c, testRunIds)).length;
  const demoLoeschen = async () => {
    if (!window.confirm(`${demoCount} DEMO-Leads aus dem Testmodus endgültig löschen? Echte Leads bleiben erhalten.`)) return;
    const n = await deleteDemoLeads();
    toast({ text: `${n} DEMO-Leads gelöscht`, tone: "ok" });
  };

  const needle = normalizeName(q);
  const rows = all
    .filter((c) => filter === "alle" || c.status === filter)
    .filter((c) => !needle || c.normName.includes(needle) || c.ort.toLowerCase().includes(q.toLowerCase()) || c.gf.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.nr ?? 9999) - (b.nr ?? 9999) || a.name.localeCompare(b.name));
  const count = (s: LeadStatus | "alle") => (s === "alle" ? all.length : all.filter((c) => c.status === s).length);

  return (
    <div>
      <PageHeader
        title="Alle Leads"
        sub={`${all.length} Leads in der App`}
        actions={demoCount > 0 ? <Button variant="danger" onClick={() => void demoLoeschen()}>Alle DEMO-Leads löschen ({demoCount})</Button> : undefined}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Suchen: Firma, Ort, GF"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm sm:w-72"
          aria-label="Suchen"
        />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-2.5 py-1.5 text-sm ${filter === f.value ? "bg-accent-soft text-accent font-medium" : "text-muted hover:bg-surface-2"}`}
          >
            {f.label} <span className="tabular-nums text-xs">{count(f.value)}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>Keine Treffer.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[900px] text-sm" data-testid="leads-tabelle">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                {["Nr", "Firma", "Status", "Score", "Ort", "GF", "Telefon", "Letzter Kontakt"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line hover:bg-surface-2">
                  <td className="px-3 py-2.5 tabular-nums text-muted">{c.nr ?? ""}</td>
                  <td className="px-3 py-2.5 font-medium">
                    <a href={`#/anrufen/${c.id}`} className="hover:text-accent hover:underline">{c.name}</a>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Badge tone={TONE[c.status]}>
                      {FILTERS.find((f) => f.value === c.status)?.label}
                      {c.status === "wiedervorlage" ? ` ${formatDate(c.wiedervorlage)}` : ""}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5"><ScoreBadge score={c.score} /></td>
                  <td className="px-3 py-2.5">{c.ort}</td>
                  <td className="px-3 py-2.5"><Val v={c.gf} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><Val v={c.telefon} /></td>
                  <td className="px-3 py-2.5 text-muted">{c.letzterKontakt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
