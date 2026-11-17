import { useState } from "react";
import type { Beleg, Company, Profile } from "../data/types";
import { updateCompany } from "../data/repo";
import { normalizeName } from "../lib/normalize";
import { KRITERIEN } from "../research/logic";
import { toast } from "../lib/toast";
import { Badge, Button } from "../components/ui";

/** Kleines Status-Abzeichen für eine Aussage (Fakt/Hypothese/offen) mit Link zur Quelle. */
export function BelegBadge({ c, feld }: { c: Company; feld: Beleg["feld"] }) {
  const b = c.belege?.find((x) => x.feld === feld);
  if (!b) return null;
  const tone = b.status === "fakt" ? "ok" : b.status === "hypothese" ? "warn" : "neutral";
  const label = b.status === "fakt" ? "Fakt" : b.status === "hypothese" ? "Hypothese" : "offen";
  const title = [b.quelle, b.pruefung].filter(Boolean).join(" – ");
  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs" title={title}>
      <Badge tone={tone}>{label}</Badge>
      {b.quelle && /^https?:/.test(b.quelle) && (
        <a href={b.quelle} target="_blank" rel="noreferrer noopener" className="text-muted hover:text-accent hover:underline">Quelle</a>
      )}
    </span>
  );
}

export function ScoreDetails({ c }: { c: Company }) {
  if (!c.teilscores?.length) return null;
  return (
    <details className="text-sm" data-testid="score-details">
      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted">Score-Begründung</summary>
      <ul className="mt-1 space-y-1">
        {c.teilscores.map((t) => (
          <li key={t.kriterium} className="flex gap-2">
            <span className="w-8 shrink-0 text-right tabular-nums font-medium">{t.punkte}</span>
            <span>
              <span className="text-muted">{KRITERIEN.find((k) => k.key === t.kriterium)?.label}: </span>
              {t.begruendung}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function BreakEvenDetails({ c, profile }: { c: Company; profile: Profile }) {
  if (!c.breakEvenSzenarien?.length) return null;
  return (
    <div className="mt-1 space-y-0.5 text-sm" data-testid="break-even">
      {c.breakEvenSzenarien.map((s) => (
        <div key={s.szenario} className="flex gap-2">
          <span className="w-24 text-muted">{s.szenario}</span>
          <b className="tabular-nums">{s.auftraege} Aufträge</b>
          <span className="text-muted">bei {s.dbProAuftrag.toLocaleString("de-AT")} € DB/Auftrag</span>
        </div>
      ))}
      <p className="text-xs text-muted">
        Modellrechnung: {profile.mindestinvestition.toLocaleString("de-AT")} € ÷ angenommener zusätzlicher Deckungsbeitrag pro Auftrag (Annahme aus den Einstellungen, nicht recherchiert). Kein Renditeversprechen.
      </p>
    </div>
  );
}

const FELDER: { key: keyof Company; label: string; area?: boolean; beleg?: Beleg["feld"] }[] = [
  { key: "name", label: "Firma" },
  { key: "ort", label: "Ort (Land)" },
  { key: "gf", label: "GF", beleg: "gf" },
  { key: "telefon", label: "Telefon", beleg: "telefon" },
  { key: "website", label: "Website" },
  { key: "ma", label: "MA", beleg: "mitarbeiter" },
  { key: "anlass", label: "Anlass + Datum", area: true },
  { key: "einstiegssatz", label: "Einstiegssatz", area: true },
  { key: "hinweis", label: "Offene Punkte / Hinweis", area: true },
  { key: "quelle", label: "Quelle" },
  { key: "breakEven", label: "Break-even (Aufträge)" },
];

/** Manuelle Korrektur der Stammdaten. Geänderte Felder gelten danach als manuell geprüft. */
export function LeadEdit({ c, onClose }: { c: Company; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>(() => Object.fromEntries(FELDER.map((f) => [f.key, String(c[f.key] ?? "")])));
  const [score, setScore] = useState(c.score === undefined ? "" : String(c.score));

  const save = async () => {
    const patch: Partial<Company> = Object.fromEntries(FELDER.map((f) => [f.key, v[f.key]!.trim()]));
    if (!patch.name) {
      toast({ text: "Firma darf nicht leer sein", tone: "danger" });
      return;
    }
    patch.normName = normalizeName(patch.name);
    const n = Number.parseInt(score, 10);
    patch.score = Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : undefined;
    if (c.belege) {
      patch.belege = c.belege.map((b) => {
        const f = FELDER.find((x) => x.beleg === b.feld);
        if (!f || String(c[f.key] ?? "") === v[f.key]!.trim()) return b;
        return { ...b, wert: v[f.key]!.trim(), status: "fakt", quelle: "manuell geändert", pruefung: undefined };
      });
    }
    await updateCompany(c.id, patch);
    toast({ text: "Gespeichert", tone: "ok" });
    onClose();
  };

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      aria-label="Lead bearbeiten"
    >
      {FELDER.map((f) => (
        <label key={f.key} className={`block text-sm ${f.area ? "sm:col-span-2" : ""}`}>
          <span className="font-medium">{f.label}</span>
          {f.area ? (
            <textarea className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" rows={2} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          ) : (
            <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          )}
        </label>
      ))}
      <label className="block text-sm">
        <span className="font-medium">Score (0–10)</span>
        <input className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2" type="number" min={0} max={10} value={score} onChange={(e) => setScore(e.target.value)} />
      </label>
      <div className="flex items-end gap-2">
        <Button variant="primary" type="submit">Speichern</Button>
        <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
      </div>
    </form>
  );
}
