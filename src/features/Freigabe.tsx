import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import type { Company, Freigabe as FreigabeT } from "../data/types";
import { setFreigabe } from "../data/repo";
import { isDue } from "../lib/callList";
import { formatDate, isoDate } from "../lib/dates";
import { hasWarning } from "../lib/normalize";
import { navigate, useKeys, useNow } from "../lib/hooks";
import { toast } from "../lib/toast";
import { Badge, Button, Empty, ExtLink, PageHeader, ScoreBadge, Val } from "../components/ui";
import { ResearchPanel } from "./ResearchPanel";
import { BelegBadge } from "./LeadDetails";
import { NeueLeadsButton } from "./NeueLeads";

function sortOffen(a: Company, b: Company) {
  return (b.score ?? -1) - (a.score ?? -1) || (a.nr ?? 9999) - (b.nr ?? 9999);
}

export function Freigabe() {
  const today = isoDate(useNow());
  const data = useLiveQuery(async () => {
    const all = await db.companies.toArray();
    return {
      offen: all.filter((c) => c.freigabe === "offen").sort(sortOffen),
      faellig: all.filter((c) => isDue(c, today)).sort((a, b) => (a.wiedervorlage ?? "").localeCompare(b.wiedervorlage ?? "")),
    };
  }, [today]);
  const offen = useMemo(() => data?.offen ?? [], [data]);
  const [sel, setSel] = useState(0);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const index = Math.min(sel, Math.max(0, offen.length - 1));

  useEffect(() => {
    rowRefs.current[index]?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const decide = async (ids: string[], f: FreigabeT) => {
    if (ids.length === 0) return;
    await setFreigabe(ids, f);
    toast({
      text: ids.length === 1 ? `${f === "rein" ? "In die Anrufliste" : "Aussortiert"}` : `${ids.length} Leads in die Anrufliste`,
      action: { label: "Rückgängig", run: () => setFreigabe(ids, "offen") },
    });
  };

  useKeys(
    (e) => {
      const current = offen[index];
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSel(Math.min(index + 1, offen.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSel(Math.max(index - 1, 0));
      } else if (e.key === "r" && current) {
        e.preventDefault();
        void decide([current.id], "rein");
      } else if ((e.key === "x" || e.key === "Delete") && current) {
        e.preventDefault();
        void decide([current.id], "raus");
      } else if (e.key === "A") {
        e.preventDefault();
        void decide(offen.map((c) => c.id), "rein");
      }
    },
    [offen, index],
  );

  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="Freigabe"
        sub={
          <>
            Neue Leads prüfen: <kbd>r</kbd> rein · <kbd>x</kbd> raus · <kbd>↑</kbd>/<kbd>↓</kbd> wählen · <kbd>Shift</kbd>+<kbd>A</kbd> alle rein
          </>
        }
        actions={
          <>
            <Button onClick={() => navigate("import")}>CSV importieren</Button>
            <Button disabled={offen.length === 0} onClick={() => void decide(offen.map((c) => c.id), "rein")}>
              Alle rein ({offen.length})
            </Button>
          </>
        }
      />

      <ResearchPanel />

      {data.faellig.length > 0 && (
        <section className="mb-6" aria-label="Fällige Wiedervorlagen">
          <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-warn">Fällige Wiedervorlagen ({data.faellig.length}) <span className="font-normal text-muted">– stehen oben in der Anrufliste</span></h2>
          <div className="flex flex-wrap gap-2">
            {data.faellig.map((c) => (
              <a key={c.id} href={`#/anrufen/${c.id}`} className="rounded-full border border-warn/30 bg-warn-soft px-3.5 py-1.5 text-sm transition hover:border-warn">
                <span className="font-medium">{c.name}</span> <span className="text-muted">· seit {formatDate(c.wiedervorlage)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {offen.length === 0 ? (
        <Empty action={<NeueLeadsButton />}>
          <p className="font-medium text-ink">Keine Leads zur Freigabe</p>
          <p className="mt-1 text-sm">
            Neue Leads holen, <a href="#/import" className="text-accent hover:underline">CSV importieren</a> oder in der{" "}
            <a href="#/anrufen" className="text-accent hover:underline">Anrufliste</a> weitermachen.
          </p>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
          <table className="w-full min-w-[1040px] table-fixed border-collapse text-sm" data-testid="freigabe-tabelle">
            <thead className="text-left text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="w-14 px-4 py-3 font-medium">Nr</th>
                <th className="w-[20%] px-4 py-3 font-medium">Firma</th>
                <th className="w-[32%] px-4 py-3 font-medium">Anlass & Einstieg</th>
                <th className="w-[18%] px-4 py-3 font-medium">Kontakt</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="w-44 px-4 py-3 text-right font-medium">Freigabe</th>
              </tr>
            </thead>
            <tbody>
              {offen.map((c, i) => {
                const active = i === index;
                return (
                  <tr
                    key={c.id}
                    ref={(el) => {
                      rowRefs.current[i] = el;
                    }}
                    onClick={() => setSel(i)}
                    aria-selected={active}
                    className={`border-t border-line/70 align-top transition ${active ? "bg-accent-soft/50 shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-surface-2/60"}`}
                  >
                    <td className="px-4 py-4 tabular-nums text-muted">{c.nr ?? ""}</td>
                    <td className="px-4 py-4">
                      <div className="font-semibold leading-snug">{c.name}</div>
                      <div className="mt-0.5 text-xs text-muted">{c.ort}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5" title={c.teilscores?.map((t) => `${t.kriterium}: ${t.punkte} – ${t.begruendung}`).join("\n")}>
                        <span className="text-xs text-muted">Score</span> <ScoreBadge score={c.score} />
                        {c.leadTyp && <Badge>{c.leadTyp}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="leading-snug">{c.anlass || <Val v="" />}</div>
                      {c.einstiegssatz && <div className="mt-2 border-l-2 border-accent/40 pl-3 text-[13px] leading-snug text-muted italic">{c.einstiegssatz}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="leading-snug"><Val v={c.gf} /><BelegBadge c={c} feld="gf" /></div>
                      <div className="mt-1 tabular-nums"><Val v={c.telefon} /></div>
                      <div className="mt-1 text-xs"><ExtLink value={c.website} /></div>
                      <div className="mt-1 text-xs text-muted">MA <Val v={c.ma} /></div>
                    </td>
                    <td className="px-4 py-4 text-[13px] break-words">
                      {c.breakEven && <div><span className="text-muted">Break-even </span>{c.breakEven} Aufträge</div>}
                      {c.hinweis && <div className="mt-1.5">{hasWarning(c.hinweis) ? <Badge tone="danger">{c.hinweis}</Badge> : <span className="text-muted">{c.hinweis}</span>}</div>}
                      <div className="mt-1.5 text-xs"><ExtLink value={c.quelle} /></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1.5">
                        <Button className="!px-3 !py-1.5" variant="primary" onClick={() => void decide([c.id], "rein")} aria-label={`${c.name} rein`}>Rein</Button>
                        <Button className="!px-3 !py-1.5" variant="secondary" onClick={() => void decide([c.id], "raus")} aria-label={`${c.name} raus`}>Raus</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
