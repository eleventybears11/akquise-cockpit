import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./data/db";
import { buildCallList, dayStats } from "./lib/callList";
import { isoDate } from "./lib/dates";
import { navigate, useKeys, useNow, useRoute, useSettings, type Route } from "./lib/hooks";
import { dismiss, useToasts } from "./lib/toast";
import { Freigabe } from "./features/Freigabe";
import { Anrufen } from "./features/Anrufen";
import { Wiedervorlagen } from "./features/Wiedervorlagen";
import { Leads } from "./features/Leads";
import { Import } from "./features/Import";
import { Anreichern } from "./features/Anreichern";
import { Einstellungen } from "./features/Einstellungen";
import { BackupBanner } from "./features/BackupBanner";
import { Hilfe } from "./features/Hilfe";
import { useTageslisteFaellig } from "./features/ResearchPanel";
import { starteLauf, useResearch } from "./research/store";
import { getApiKey } from "./research/key";

const NAV: { view: Route["view"]; label: string; key: string }[] = [
  { view: "freigabe", label: "Freigabe", key: "f" },
  { view: "anrufen", label: "Anrufen", key: "a" },
  { view: "wiedervorlagen", label: "Wiedervorlagen", key: "w" },
  { view: "leads", label: "Alle Leads", key: "l" },
  { view: "import", label: "Import", key: "i" },
  { view: "anreichern", label: "Anreichern", key: "r" },
  { view: "einstellungen", label: "Einstellungen", key: "e" },
];

function useTheme() {
  const { theme } = useSettings();
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dunkel" || (theme === "system" && mq.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}

function DayCounter() {
  const now = useNow();
  const settings = useSettings();
  const today = isoDate(now);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const calls = useLiveQuery(() => db.calls.where("ts").aboveOrEqual(start).toArray(), [start], []);
  const s = dayStats(calls, today);
  const pct = Math.min(100, Math.round((s.versuche / Math.max(1, settings.tageszielVersuche)) * 100));
  return (
    <div className="flex items-center gap-4 text-xs text-muted" data-testid="tageszaehler" aria-label="Tageszähler">
      <div className="flex items-center gap-2">
        <span>
          <b className="text-ink text-sm tabular-nums" data-testid="versuche">{s.versuche}</b>/{settings.tageszielVersuche} Versuche
        </span>
        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="hidden 2xl:inline"><b className="text-ink tabular-nums">{s.erreicht}</b> erreicht</span>
      <span className="hidden 2xl:inline"><b className="text-ink tabular-nums">{s.gfGespraeche}</b> GF-Gespräche</span>
      <span><b className="text-ok tabular-nums" data-testid="termine">{s.termine}</b> Termine</span>
    </div>
  );
}

function Toaster() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm shadow-lg ${t.tone === "danger" ? "text-danger" : ""}`}
        >
          <span>{t.text}</span>
          {t.action && (
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={() => {
                void t.action!.run();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function TageslisteBanner() {
  const now = useNow();
  const settings = useSettings();
  const faellig = useTageslisteFaellig(now);
  const { laeuft } = useResearch();
  const bereit = settings.testmodus || !!getApiKey();
  if (!faellig || laeuft || !bereit) return null;
  return (
    <div className="border-b border-line bg-accent-soft">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-accent">
        <span>Für heute gibt es noch keine Tagesliste.</span>
        <button
          type="button"
          className="rounded-lg bg-accent px-3 py-1 font-medium text-accent-ink hover:opacity-90"
          onClick={() => {
            navigate("freigabe");
            void starteLauf(settings.tageszielNeueLeads);
          }}
        >
          Jetzt {settings.tageszielNeueLeads} Leads recherchieren
        </button>
      </div>
    </div>
  );
}

export function App() {
  useTheme();
  const route = useRoute();
  const [help, setHelp] = useState(false);
  const gPressed = useRef(0);
  const today = isoDate(useNow());
  const counts = useLiveQuery(
    async () => {
      const all = await db.companies.toArray();
      return {
        offen: all.filter((c) => c.freigabe === "offen").length,
        anrufen: buildCallList(all, today).length,
        faellig: all.filter((c) => c.status === "wiedervorlage" && c.wiedervorlage && c.wiedervorlage <= today).length,
      };
    },
    [today],
    { offen: 0, anrufen: 0, faellig: 0 },
  );

  useKeys(
    (e) => {
      if (e.key === "?") {
        setHelp((h) => !h);
        return;
      }
      if (e.key === "Escape") setHelp(false);
      if (e.key === "g") {
        gPressed.current = Date.now();
        e.preventDefault();
        return;
      }
      if (Date.now() - gPressed.current < 1200) {
        const target = NAV.find((n) => n.key === e.key);
        gPressed.current = 0;
        if (target) {
          // verhindert, dass die Ansicht dieselbe Taste zusätzlich auswertet
          e.preventDefault();
          navigate(target.view);
        }
      }
    },
    [],
    true,
  );

  const badge = (view: Route["view"]) =>
    view === "freigabe" ? counts.offen : view === "anrufen" ? counts.anrufen : view === "wiedervorlagen" ? counts.faellig : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
          <a href="#/freigabe" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-sm text-accent-ink">L</span>
            Lead-Cockpit
          </a>
          <nav className="-mx-1 flex flex-1 gap-1 overflow-x-auto" aria-label="Hauptnavigation">
            {NAV.map((n) => {
              const active = route.view === n.view;
              const count = badge(n.view);
              return (
                <a
                  key={n.view}
                  href={`#/${n.view}`}
                  title={`Taste g, dann ${n.key}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${active ? "bg-accent-soft text-accent font-medium" : "text-muted hover:text-ink hover:bg-surface-2"}`}
                >
                  {n.label}
                  {count > 0 && <span className="rounded bg-surface-2 px-1.5 text-xs tabular-nums text-muted">{count}</span>}
                </a>
              );
            })}
          </nav>
          <DayCounter />
          <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setHelp(true)}>
            <kbd>?</kbd> <span className="hidden 2xl:inline">Kürzel</span>
          </button>
        </div>
      </header>
      <BackupBanner />
      <TageslisteBanner />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6">
        {route.view === "freigabe" && <Freigabe />}
        {route.view === "anrufen" && <Anrufen id={route.id} />}
        {route.view === "wiedervorlagen" && <Wiedervorlagen />}
        {route.view === "leads" && <Leads />}
        {route.view === "import" && <Import />}
        {route.view === "anreichern" && <Anreichern />}
        {route.view === "einstellungen" && <Einstellungen />}
      </main>
      {help && <Hilfe onClose={() => setHelp(false)} />}
      <Toaster />
    </div>
  );
}
