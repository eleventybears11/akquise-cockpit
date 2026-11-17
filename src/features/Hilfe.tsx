import { Button, Card } from "../components/ui";

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "Überall",
    keys: [
      ["g f", "Freigabe"],
      ["g a", "Anrufen"],
      ["g w", "Wiedervorlagen"],
      ["g l", "Alle Leads"],
      ["g i", "Import"],
      ["g r", "Anreichern (FullEnrich)"],
      ["g e", "Einstellungen"],
      ["?", "diese Hilfe"],
    ],
  },
  {
    title: "Freigabe",
    keys: [
      ["↑ ↓ / j k", "Zeile wählen"],
      ["r", "rein (Anrufliste)"],
      ["x", "raus"],
      ["Shift + A", "alle rein"],
    ],
  },
  {
    title: "Anrufen",
    keys: [
      ["t", "erste Nummer anrufen"],
      ["1", "nicht erreicht"],
      ["2", "Absage"],
      ["3", "Wiedervorlage (Datum, Enter)"],
      ["4", "Termin"],
      ["e", "mit GF gesprochen"],
      ["n", "Notiz schreiben (Esc verlässt)"],
      ["u", "letzten Anruf rückgängig"],
    ],
  },
];

export function Hilfe({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-label="Tastaturkürzel">
      <Card className="w-full max-w-2xl p-6">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tastaturkürzel</h2>
            <Button variant="ghost" onClick={onClose}>Schließen <kbd>Esc</kbd></Button>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <h3 className="mb-2 text-sm font-medium text-muted">{g.title}</h3>
                <ul className="space-y-1.5 text-sm">
                  {g.keys.map(([k, label]) => (
                    <li key={k} className="flex items-center justify-between gap-2">
                      <span>{label}</span>
                      <kbd>{k}</kbd>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
