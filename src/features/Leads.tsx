import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import type { LeadStatus } from "../data/types";
import { normalizeName } from "../lib/normalize";
import { formatDate } from "../lib/dates";
import { Badge, Button, Empty, PageHeader, ScoreBadge, Val } from "../components/ui";
import { deleteDemoLeads, isDemoLead } from "../data/repo";
import { toast } from "../lib/toast";
import { navigate } from "../lib/hooks";
import { Icon } from "../components/icons";
import { NeueLeadsButton } from "./NeueLeads";

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
        sub={`${all.length} Leads in der App. Klick auf eine Zeile öffnet die Rundown-Karte.`}
        actions={
          <>
            {demoCount > 0 && (
              <Button variant="danger" onClick={() => void demoLoeschen()}>Alle DEMO-Leads löschen ({demoCount})</Button>
            )}
            <NeueLeadsButton className="hidden sm:inline-flex" />
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen: Firma, Ort, GF"
            className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-sm shadow-card"
            aria-label="Suchen"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 shadow-card" role="tablist" aria-label="Status">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-sm transition ${filter === f.value ? "bg-accent text-accent-ink font-medium" : "text-muted hover:bg-surface-2 hover:text-ink"}`}
            >
              {f.label} <span className="text-xs tabular-nums opacity-75">{count(f.value)}</span>
            </button>
          ))}
        </div>
      </div>
      {all.length === 0 ? (
        <Empty action={<NeueLeadsButton />}>
          <p className="font-medium text-ink">Noch keine Leads</p>
          <p className="mt-1 text-sm">Neue Leads recherchieren lassen oder deine Lead-Tabelle unter <a href="#/import" className="text-accent hover:underline">Import</a> einlesen.</p>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty>Keine Treffer.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[1000px] table-fixed text-sm" data-testid="leads-tabelle">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                {[
                  ["Nr", "w-14"],
                  ["Firma", "w-[20%]"],
                  ["Status", "w-36"],
                  ["Score", "w-20"],
                  ["Ort", "w-[13%]"],
                  ["GF", "w-[16%]"],
                  ["Telefon", "w-40"],
                  ["Letzter Kontakt", ""],
                ].map(([h, w]) => (
                  <th key={h} className={`px-4 py-3 font-medium ${w}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="cursor-pointer border-t border-line/70 transition hover:bg-accent-soft/40" onClick={() => navigate(`anrufen/${c.id}`)}>
                  <td className="px-4 py-3 tabular-nums text-muted">{c.nr ?? ""}</td>
                  <td className="px-4 py-3 font-medium">
                    <a href={`#/anrufen/${c.id}`} className="hover:text-accent" onClick={(e) => e.stopPropagation()}>{c.name}</a>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge tone={TONE[c.status]}>
                      {FILTERS.find((f) => f.value === c.status)?.label}
                      {c.status === "wiedervorlage" ? ` ${formatDate(c.wiedervorlage)}` : ""}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><ScoreBadge score={c.score} /></td>
                  <td className="px-4 py-3">{c.ort}</td>
                  <td className="px-4 py-3"><Val v={c.gf} /></td>
                  <td className="px-4 py-3 break-words tabular-nums"><Val v={c.telefon} /></td>
                  <td className="px-4 py-3 text-muted">{c.letzterKontakt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
