import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import { navigate, useProfile, useSettings } from "../lib/hooks";
import { claudeAuftrag } from "../lib/claudeAuftrag";
import { toast } from "../lib/toast";
import { getApiKey } from "../research/key";
import { starteLauf, useResearch } from "../research/store";
import { Button, Modal } from "../components/ui";
import { Icon } from "../components/icons";

/* Öffnen/Schließen von überall (Kopfzeile, Freigabe, Alle Leads) */
let offen = false;
const listeners = new Set<() => void>();
export function oeffneNeueLeads() {
  offen = true;
  listeners.forEach((l) => l());
}
function schliessen() {
  offen = false;
  listeners.forEach((l) => l());
}
function useOffen() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => offen,
  );
}

/** Der gut sichtbare Haupt-Knopf. */
export function NeueLeadsButton({ className = "" }: { className?: string }) {
  const { laeuft, fortschritt, run } = useResearch();
  return (
    <Button variant="primary" className={className} onClick={oeffneNeueLeads} data-testid="neue-leads">
      <Icon name={laeuft ? "sparkle" : "plus"} size={16} className={laeuft ? "animate-pulse" : ""} />
      {laeuft && run ? `Recherche läuft · ${fortschritt.angenommen}/${run.ziel}` : "Neue Leads"}
    </Button>
  );
}

function Schritt({ nr, titel, children }: { nr: number; titel: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{nr}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{titel}</div>
        <div className="mt-1.5">{children}</div>
      </div>
    </li>
  );
}

export function NeueLeadsDialog() {
  const istOffen = useOffen();
  const settings = useSettings();
  const profile = useProfile();
  const { laeuft } = useResearch();
  const [anzahl, setAnzahl] = useState<number | null>(null);
  const daten = useLiveQuery(async () => {
    const [companies, exclusions, laeufe] = await Promise.all([db.companies.toArray(), db.exclusions.toArray(), db.runs.count()]);
    return {
      namen: [...new Set([...companies.map((c) => c.name), ...exclusions.map((e) => e.name)])].sort((a, b) => a.localeCompare(b, "de")),
      naechsteNr: companies.reduce((m, c) => Math.max(m, c.nr ?? 0), 0) + 1,
      laeufe,
    };
  }, [istOffen]);
  if (!istOffen) return null;

  const ziel = anzahl ?? settings.tageszielNeueLeads;
  const hatKey = !!getApiKey();
  const automatisch = hatKey || settings.testmodus;

  const kopieren = async () => {
    const text = claudeAuftrag(profile, ziel, daten?.namen ?? [], daten?.naechsteNr ?? 1);
    try {
      await navigator.clipboard.writeText(text);
      toast({ text: "Recherche-Auftrag kopiert – jetzt in Claude einfügen", tone: "ok" });
    } catch {
      toast({ text: "Kopieren nicht möglich – Browser erlaubt keinen Zugriff auf die Zwischenablage", tone: "danger" });
    }
  };

  const gehe = (pfad: string) => {
    schliessen();
    navigate(pfad);
  };

  return (
    <Modal title="Neue Leads" onClose={schliessen} wide>
      <div className="space-y-6">
        <label className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium">Wie viele?</span>
          <input
            type="number"
            min={1}
            max={100}
            value={ziel}
            onChange={(e) => setAnzahl(Math.max(1, Math.min(100, Number.parseInt(e.target.value, 10) || 1)))}
            className="w-20 rounded-lg border border-line bg-surface px-3 py-1.5"
            aria-label="Anzahl Leads"
          />
          <span className="text-muted">Nur Leads mit belegtem Anlass, Geschäftsführung und Telefonnummer.</span>
        </label>

        {/* Weg 1: automatisch in der App */}
        <section className={`rounded-xl border p-4 ${automatisch ? "border-accent/40 bg-accent-soft/40" : "border-line"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold"><Icon name="sparkle" size={16} /> Automatisch recherchieren</h3>
              <p className="mt-1 text-sm text-muted">
                {settings.testmodus
                  ? "Testmodus ist an: erzeugt erfundene DEMO-Leads."
                  : hatKey
                    ? "Die App sucht, prüft jede Quelle und legt die Leads direkt in die Freigabe. Kostet pro Lauf API-Guthaben."
                    : "Braucht einen Anthropic-API-Key (kostet pro Lauf API-Guthaben, nicht im Claude-Abo enthalten)."}
              </p>
            </div>
            {automatisch ? (
              <Button
                variant="primary"
                disabled={laeuft}
                onClick={() => {
                  void starteLauf(ziel);
                  gehe("freigabe");
                }}
              >
                {laeuft ? "Läuft bereits" : `${ziel} Leads recherchieren`}
              </Button>
            ) : (
              <Button onClick={() => gehe("einstellungen")}>
                <Icon name="key" size={16} /> API-Key eintragen
              </Button>
            )}
          </div>
        </section>

        {/* Weg 2: mit Claude, ohne API-Kosten */}
        <section className={`rounded-xl border p-4 ${automatisch ? "border-line" : "border-accent/40 bg-accent-soft/40"}`}>
          <h3 className="font-semibold">Mit Claude recherchieren – ohne API-Kosten</h3>
          <p className="mt-1 text-sm text-muted">Läuft über dein Claude-Abo. Der Auftrag enthält deine Regeln und alle {daten?.namen.length ?? 0} Firmen, die schon in der App sind.</p>
          <ol className="mt-4 space-y-4">
            <Schritt nr={1} titel="Recherche-Auftrag kopieren">
              <Button variant="primary" onClick={() => void kopieren()} data-testid="auftrag-kopieren">
                <Icon name="copy" size={16} /> Auftrag für {ziel} Leads kopieren
              </Button>
            </Schritt>
            <Schritt nr={2} titel="In Claude einfügen und abschicken">
              <div className="flex flex-wrap gap-2">
                <a href="https://claude.ai/new" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium shadow-card hover:bg-surface-2">
                  claude.ai öffnen <Icon name="external" size={14} />
                </a>
                <span className="self-center text-xs text-muted">oder in deiner Claude-Code-Session „nächste Leads“ schreiben</span>
              </div>
            </Schritt>
            <Schritt nr={3} titel="Ergebnis-CSV importieren">
              <Button onClick={() => gehe("import")}>
                <Icon name="upload" size={16} /> Zum Import
              </Button>
            </Schritt>
          </ol>
        </section>
      </div>
    </Modal>
  );
}
