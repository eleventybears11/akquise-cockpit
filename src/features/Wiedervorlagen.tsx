import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import { formatDate, isoDate } from "../lib/dates";
import { useNow } from "../lib/hooks";
import { Badge, Empty, PageHeader, Val } from "../components/ui";

export function Wiedervorlagen() {
  const today = isoDate(useNow());
  const items = useLiveQuery(
    () => db.companies.where("status").equals("wiedervorlage").sortBy("wiedervorlage"),
    [],
  );
  if (!items) return null;
  const faellig = items.filter((c) => c.wiedervorlage && c.wiedervorlage <= today).length;

  return (
    <div>
      <PageHeader title="Wiedervorlagen" sub={`${items.length} gesamt · ${faellig} fällig (stehen oben in der Anrufliste)`} />
      {items.length === 0 ? (
        <Empty>Keine Wiedervorlagen.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-sm" data-testid="wv-tabelle">
            <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Datum</th>
                <th className="px-3 py-2 font-medium">Firma</th>
                <th className="px-3 py-2 font-medium">Ort</th>
                <th className="px-3 py-2 font-medium">Letzter Kontakt</th>
                <th className="px-3 py-2 font-medium">Telefon</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const d = c.wiedervorlage ?? "";
                const tone = d < today ? "danger" : d === today ? "warn" : "neutral";
                return (
                  <tr key={c.id} className="border-t border-line hover:bg-surface-2">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Badge tone={tone}>{formatDate(d)}{d < today ? " überfällig" : d === today ? " heute" : ""}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      <a href={`#/anrufen/${c.id}`} className="hover:text-accent hover:underline">{c.name}</a>
                    </td>
                    <td className="px-3 py-2.5">{c.ort}</td>
                    <td className="px-3 py-2.5 text-muted">{c.letzterKontakt}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><Val v={c.telefon} /></td>
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
