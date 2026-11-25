import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import type { ResearchRun } from "../data/types";
import { formatDateTime, isoDate } from "../lib/dates";
import { navigate, useSettings } from "../lib/hooks";
import { abbrechen, starteLauf, useResearch } from "../research/store";
import { getApiKey } from "../research/key";
import { Badge, Button, Card } from "../components/ui";

const MODELL_NAME: Record<string, string> = {
  "claude-opus-5-5": "Opus",
  "claude-sonnet-5-5": "Sonnet",
  "claude-haiku-5-5": "Haiku",
  test: "Testmodus",
};

function RunLog({ run }: { run: ResearchRun }) {
  return (
    <ol className="max-h-56 space-y-0.5 overflow-y-auto font-mono text-xs" data-testid="run-log">
      {run.log.map((l, i) => (
        <li key={i} className={l.art === "fehler" ? "text-danger" : l.art === "warn" ? "text-warn" : l.art === "ok" ? "text-ok" : "text-muted"}>
          {new Date(l.ts).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} {l.text}
        </li>
      ))}
    </ol>
  );
}

export function ResearchPanel() {
  const settings = useSettings();
  const { laeuft, run, fortschritt } = useResearch();
  const letzte = useLiveQuery(() => db.runs.orderBy("startedAt").reverse().limit(1).first(), []);
  const anzahlLaeufe = useLiveQuery(() => db.runs.count(), [], 0);
  const anzeigen = laeuft ? run : (letzte ?? undefined);
  const test = settings.testmodus;
  const bereit = test || !!getApiKey();
  const pct = run ? Math.round((fortschritt.angenommen / Math.max(1, run.ziel)) * 100) : 0;

  return (
    <Card className="mb-6 p-5" >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">KI-Tagesliste</h2>
          <p className="text-sm text-muted">
            {test
              ? "Testmodus ist eingeschaltet: erfundene DEMO-Leads, keine Kosten. Für echte Leads unter Einstellungen ausschalten."
              : bereit
                ? `Echte Recherche mit ${MODELL_NAME[settings.modell]} · nur Leads mit belegter Geschäftsführung, Telefonnummer und Anlass · Kostenlimit ${settings.maxKostenProLauf} $ pro Lauf`
                : "Für echte Leads fehlt der API-Key. Ohne Key recherchiert die App nicht."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {laeuft ? (
            <Button variant="danger" onClick={abbrechen}>Abbrechen</Button>
          ) : !bereit ? (
            <Button variant="primary" onClick={() => navigate("einstellungen")}>API-Key eintragen</Button>
          ) : (
            <>
              {anzahlLaeufe === 0 && (
                <Button onClick={() => void starteLauf(settings.startpaket)}>Startpaket ({settings.startpaket})</Button>
              )}
              <Button variant="primary" onClick={() => void starteLauf(settings.tageszielNeueLeads)}>
                Tagesliste erzeugen ({settings.tageszielNeueLeads})
              </Button>
            </>
          )}
        </div>
      </div>

      {laeuft && run && (
        <div className="mt-4" data-testid="run-progress">
          <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
            <span>
              <b className="tabular-nums">{fortschritt.angenommen}</b> von {run.ziel} Leads · {fortschritt.kandidaten} Kandidaten · {fortschritt.geprueft} geprüft
            </span>
            {run.modell !== "test" && <span className="tabular-nums text-muted">{run.usage.suchen} Suchen · ca. {run.kostenUsd.toFixed(2)} $</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${Math.max(3, pct)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Läuft weiter, auch wenn du die Ansicht wechselst. Neue Leads erscheinen laufend unten in der Tabelle.</p>
          <div className="mt-2"><RunLog run={run} /></div>
        </div>
      )}

      {!laeuft && anzeigen && (
        <details className="mt-3 text-sm" data-testid="run-summary">
          <summary className="cursor-pointer">
            <span className="text-muted">Letzter Lauf {formatDateTime(anzeigen.startedAt)}: </span>
            <Badge tone={anzeigen.status === "fertig" ? "ok" : anzeigen.status === "fehler" ? "danger" : "warn"}>
              {anzeigen.status === "fertig" ? "fertig" : anzeigen.status === "fehler" ? "Fehler" : anzeigen.status === "abgebrochen" ? "abgebrochen" : "unterbrochen"}
            </Badge>{" "}
            {anzeigen.leadIds.length} von {anzeigen.ziel} Leads, {anzeigen.verworfen} verworfen
            {anzeigen.modell !== "test" && ` · ${anzeigen.usage.suchen} Suchen · ${(anzeigen.usage.inputTokens / 1000).toFixed(0)}k/${(anzeigen.usage.outputTokens / 1000).toFixed(0)}k Tokens · ca. ${anzeigen.kostenUsd.toFixed(2)} $`}
            {anzeigen.fehler && <span className="text-danger"> · {anzeigen.fehler}</span>}
          </summary>
          <div className="mt-2"><RunLog run={anzeigen} /></div>
        </details>
      )}
    </Card>
  );
}

/** Werktags ab 6 Uhr: Hinweis, wenn es für heute noch keinen Lauf gibt. */
export function useTageslisteFaellig(now: Date): boolean {
  const heute = isoDate(now);
  const lauefeHeute = useLiveQuery(
    async () => (await db.runs.toArray()).filter((r) => isoDate(new Date(r.startedAt)) === heute).length,
    [heute],
    1,
  );
  const werktag = now.getDay() >= 1 && now.getDay() <= 5;
  return werktag && now.getHours() >= 6 && lauefeHeute === 0;
}
