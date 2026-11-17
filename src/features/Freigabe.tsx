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
            <Button variant="primary" disabled={offen.length === 0} onClick={() => void decide(offen.map((c) => c.id), "rein")}>
              Alle rein ({offen.length})
            </Button>
          </>
        }
      />

      {data.faellig.length > 0 && (
        <section className="mb-6" aria-label="Fällige Wiedervorlagen">
          <h2 className="mb-2 text-sm font-semibold text-warn">Fällige Wiedervorlagen ({data.faellig.length}) – stehen oben in der Anrufliste</h2>
          <div className="flex flex-wrap gap-2">
            {data.faellig.map((c) => (
              <a key={c.id} href={`#/anrufen/${c.id}`} className="rounded-lg border border-line bg-warn-soft px-3 py-1.5 text-sm hover:border-warn">
                <span className="font-medium">{c.name}</span> <span className="text-muted">· seit {formatDate(c.wiedervorlage)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {offen.length === 0 ? (
        <Empty>
          Keine Leads zur Freigabe.{" "}
          <a href="#/import" className="text-accent hover:underline">CSV importieren</a> oder in der{" "}
          <a href="#/anrufen" className="text-accent hover:underline">Anrufliste</a> weitermachen.
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[1500px] border-collapse text-sm" data-testid="freigabe-tabelle">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                {["Nr", "Firma", "Freigabe", "Score", "Ort", "Anlass + Datum", "Einstiegssatz", "GF", "Telefon", "Website", "MA", "Break-even", "Offene Punkte / Hinweis", "Quelle"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">{h}</th>
                ))}
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
                    className={`border-t border-line align-top ${active ? "bg-accent-soft/60 outline-2 -outline-offset-2 outline-accent" : "hover:bg-surface-2"}`}
                  >
                    <td className="px-3 py-2.5 tabular-nums text-muted">{c.nr ?? ""}</td>
                    <td className="px-3 py-2.5 font-medium min-w-44">{c.name}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button className="!px-2.5 !py-1" variant="secondary" onClick={() => void decide([c.id], "rein")} aria-label={`${c.name} rein`}>Rein</Button>
                        <Button className="!px-2.5 !py-1" variant="ghost" onClick={() => void decide([c.id], "raus")} aria-label={`${c.name} raus`}>Raus</Button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><ScoreBadge score={c.score} /></td>
                    <td className="px-3 py-2.5 min-w-32">{c.ort}</td>
                    <td className="px-3 py-2.5 min-w-60">{c.anlass}</td>
                    <td className="px-3 py-2.5 min-w-72">{c.einstiegssatz ? c.einstiegssatz : <Val v="" />}</td>
                    <td className="px-3 py-2.5 min-w-40"><Val v={c.gf} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><Val v={c.telefon} /></td>
                    <td className="px-3 py-2.5"><ExtLink value={c.website} /></td>
                    <td className="px-3 py-2.5"><Val v={c.ma} /></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{c.breakEven}</td>
                    <td className="px-3 py-2.5 min-w-56">
                      {hasWarning(c.hinweis) ? <Badge tone="danger">{c.hinweis}</Badge> : c.hinweis}
                    </td>
                    <td className="px-3 py-2.5 min-w-40"><ExtLink value={c.quelle} /></td>
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
