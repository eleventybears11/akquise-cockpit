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
import { NeueLeadsButton, NeueLeadsDialog } from "./features/NeueLeads";
import { Icon, type IconName } from "./components/icons";

const NAV: { view: Route["view"]; label: string; key: string; icon: IconName }[] = [
  { view: "freigabe", label: "Freigabe", key: "f", icon: "inbox" },
  { view: "anrufen", label: "Anrufen", key: "a", icon: "phone" },
  { view: "wiedervorlagen", label: "Wiedervorlagen", key: "w", icon: "clock" },
  { view: "leads", label: "Alle Leads", key: "l", icon: "list" },
  { view: "import", label: "Import", key: "i", icon: "upload" },
  { view: "anreichern", label: "Anreichern", key: "r", icon: "layers" },
  { view: "einstellungen", label: "Einstellungen", key: "e", icon: "settings" },
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
    <div
      className="hidden items-center gap-4 rounded-full border border-line bg-surface-2/60 px-4 py-1.5 text-xs text-muted sm:flex"
      data-testid="tageszaehler"
      aria-label="Tageszähler"
      title={`Heute: ${s.versuche} Versuche, ${s.erreicht} erreicht, ${s.gfGespraeche} GF-Gespräche, ${s.termine} Termine`}
    >
      <div className="flex items-center gap-2">
        <span>
          <b className="text-sm tabular-nums text-ink" data-testid="versuche">{s.versuche}</b>/{settings.tageszielVersuche} Versuche
        </span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="hidden lg:inline"><b className="tabular-nums text-ink">{s.erreicht}</b> erreicht</span>
      <span className="hidden xl:inline"><b className="tabular-nums text-ink">{s.gfGespraeche}</b> GF</span>
      <span><b className="tabular-nums text-ok" data-testid="termine">{s.termine}</b> Termine</span>
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
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-pop ${t.tone === "danger" ? "text-danger" : ""}`}
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
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-accent sm:px-6">
        <span className="flex items-center gap-2"><Icon name="sparkle" size={16} /> Für heute gibt es noch keine Tagesliste.</span>
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
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 pt-3 pb-2 sm:px-6">
          <a href="#/freigabe" className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink shadow-card">
              <Icon name="phone" size={16} />
            </span>
            <span className="text-[15px]">Lead-Cockpit</span>
          </a>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <DayCounter />
            <button type="button" className="hidden rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink sm:block" onClick={() => setHelp(true)} title="Tastaturkürzel (?)" aria-label="Tastaturkürzel">
              <Icon name="help" size={18} />
            </button>
            <NeueLeadsButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-3 sm:px-5" aria-label="Hauptnavigation">
          {NAV.map((n) => {
            const active = route.view === n.view;
            const count = badge(n.view);
            return (
              <a
                key={n.view}
                href={`#/${n.view}`}
                title={`Taste g, dann ${n.key}`}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition ${active ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"}`}
              >
                <Icon name={n.icon} size={16} className={active ? "text-accent" : ""} />
                {n.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"}`}>{count}</span>
                )}
              </a>
            );
          })}
        </nav>
      </header>
      <BackupBanner />
      <TageslisteBanner />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-8 sm:px-6">
        {route.view === "freigabe" && <Freigabe />}
        {route.view === "anrufen" && <Anrufen id={route.id} />}
        {route.view === "wiedervorlagen" && <Wiedervorlagen />}
        {route.view === "leads" && <Leads />}
        {route.view === "import" && <Import />}
        {route.view === "anreichern" && <Anreichern />}
        {route.view === "einstellungen" && <Einstellungen />}
      </main>
      {help && <Hilfe onClose={() => setHelp(false)} />}
      <NeueLeadsDialog />
      <Toaster />
    </div>
  );
}
