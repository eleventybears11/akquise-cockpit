import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import type { CallResult, Company } from "../data/types";
import { deleteCompany, logCall, undoCall } from "../data/repo";
import { buildCallList, isDue } from "../lib/callList";
import { addDays, addMonths, formatDate, formatDateTime, isMondayMorning, isoDate } from "../lib/dates";
import { hasWarning, isOpen, parsePhones } from "../lib/normalize";
import { navigate, useKeys, useNow, useProfile } from "../lib/hooks";
import { lastCall, toast } from "../lib/toast";
import { Badge, Button, Card, Empty, ExtLink, ScoreBadge, Val } from "../components/ui";

const RESULTS: { key: string; ergebnis: CallResult; label: string; cls: string }[] = [
  { key: "1", ergebnis: "nicht_erreicht", label: "Nicht erreicht", cls: "" },
  { key: "2", ergebnis: "absage", label: "Absage", cls: "hover:!bg-danger-soft hover:!text-danger" },
  { key: "3", ergebnis: "wiedervorlage", label: "Wiedervorlage", cls: "hover:!bg-warn-soft hover:!text-warn" },
  { key: "4", ergebnis: "termin", label: "Termin", cls: "hover:!bg-ok-soft hover:!text-ok" },
];

const STATUS_LABEL: Record<Company["status"], string> = {
  neu: "nicht freigegeben",
  anrufliste: "Anrufliste",
  wiedervorlage: "Wiedervorlage",
  termin: "Termin",
  absage: "Absage",
  raus: "aussortiert",
};

export function Anrufen({ id }: { id?: string }) {
  const now = useNow();
  const today = isoDate(now);
  const all = useLiveQuery(() => db.companies.toArray(), []);
  if (!all) return null;
  const list = buildCallList(all, today);
  const current = (id && all.find((c) => c.id === id)) || list[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="order-2 lg:order-1" aria-label="Anrufliste">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Anrufliste</h2>
          <span className="text-xs text-muted tabular-nums">{list.length} offen</span>
        </div>
        <ol className="max-h-[calc(100vh-11rem)] space-y-1 overflow-y-auto pr-1" data-testid="anrufliste">
          {list.map((c) => (
            <li key={c.id}>
              <a
                href={`#/anrufen/${c.id}`}
                className={`block rounded-lg px-3 py-2 text-sm ${c.id === current?.id ? "bg-accent-soft text-accent" : "hover:bg-surface-2"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  <ScoreBadge score={c.score} />
                </div>
                <div className="truncate text-xs text-muted">
                  {isDue(c, today) ? <span className="text-warn">WV {formatDate(c.wiedervorlage)} · </span> : null}
                  {c.letzterVersuch && isoDate(new Date(c.letzterVersuch)) === today ? "heute nicht erreicht · " : ""}
                  {c.ort}
                </div>
              </a>
            </li>
          ))}
        </ol>
      </aside>
      <section className="order-1 lg:order-2 min-w-0">
        {isMondayMorning(now) && (
          <div className="mb-4 rounded-lg border border-line bg-warn-soft px-4 py-2 text-sm text-warn">
            Montagvormittag: laut deinem Plan Recherche und Follow-ups, keine Anrufe.
          </div>
        )}
        {current ? (
          <Rundown key={current.id} c={current} position={list.findIndex((x) => x.id === current.id)} total={list.length} />
        ) : (
          <Empty>
            Die Anrufliste ist leer. Neue Leads in der <a href="#/freigabe" className="text-accent hover:underline">Freigabe</a> mit „Rein“ übernehmen.
          </Empty>
        )}
      </section>
    </div>
  );
}

function Rundown({ c, position, total }: { c: Company; position: number; total: number }) {
  const profile = useProfile();
  const [notiz, setNotiz] = useState("");
  const [gf, setGf] = useState(false);
  const [wv, setWv] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notizRef = useRef<HTMLTextAreaElement>(null);
  const wvRef = useRef<HTMLInputElement>(null);
  const calls = useLiveQuery(() => db.calls.where("companyId").equals(c.id).reverse().sortBy("ts"), [c.id], []);
  const phones = parsePhones(c.telefon);
  const warn = hasWarning(c.hinweis);
  const today = isoDate();

  useEffect(() => {
    if (wv !== null) wvRef.current?.focus();
  }, [wv]);

  const submit = async (ergebnis: CallResult, wiedervorlage?: string) => {
    if (busy) return;
    if (ergebnis === "wiedervorlage" && !wiedervorlage) {
      setWv(addDays(today, 7));
      return;
    }
    setBusy(true);
    try {
      const call = await logCall({ companyId: c.id, ergebnis, gfGesprochen: gf || ergebnis === "termin", notiz, wiedervorlage });
      lastCall.set(call.id);
      const label = RESULTS.find((r) => r.ergebnis === ergebnis)!.label;
      toast({
        text: `${c.name}: ${label}${wiedervorlage ? ` (${formatDate(wiedervorlage)})` : ""} gespeichert`,
        tone: "ok",
        action: { label: "Rückgängig", run: () => undo(call.id) },
      });
      navigate("anrufen");
    } catch (err) {
      toast({ text: `Nicht gespeichert: ${(err as Error).message}`, tone: "danger" });
    } finally {
      setBusy(false);
    }
  };

  const undo = async (callId?: string) => {
    const target = callId ?? lastCall.get();
    if (!target) return;
    const call = await db.calls.get(target);
    await undoCall(target);
    lastCall.set(undefined);
    if (call) navigate(`anrufen/${call.companyId}`);
    toast({ text: "Letzter Anruf rückgängig gemacht" });
  };

  useKeys(
    (e) => {
      if (wv !== null) return;
      const r = RESULTS.find((x) => x.key === e.key);
      if (r) {
        e.preventDefault();
        void submit(r.ergebnis);
      } else if (e.key === "n") {
        e.preventDefault();
        notizRef.current?.focus();
      } else if (e.key === "e") {
        e.preventDefault();
        setGf((v) => !v);
      } else if (e.key === "u") {
        e.preventDefault();
        void undo();
      } else if (e.key === "t" && phones[0]) {
        e.preventDefault();
        window.location.href = `tel:${phones[0].tel}`;
      }
    },
    [wv, notiz, gf, c.id, busy],
  );

  const remove = async () => {
    if (!window.confirm(`„${c.name}“ mit allen Anrufen endgültig löschen?`)) return;
    await deleteCompany(c.id);
    toast({ text: `${c.name} gelöscht` });
    navigate("anrufen");
  };

  return (
    <Card>
      <div data-testid="rundown" className="p-5 sm:p-7">
        {/* Kopf */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="firma">{c.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{c.ort}</span>
              {c.leadTyp && <Badge>{c.leadTyp}</Badge>}
              {c.crmPrioritaet && <Badge>Prio {c.crmPrioritaet}</Badge>}
              {c.imCrm && <Badge tone="accent">im CRM</Badge>}
              <span className="flex items-center gap-1">Score <ScoreBadge score={c.score} /></span>
              {c.status !== "anrufliste" && (
                <Badge tone={c.status === "termin" ? "ok" : c.status === "absage" ? "danger" : "warn"}>
                  {STATUS_LABEL[c.status]}
                  {c.status === "wiedervorlage" && c.wiedervorlage ? ` ${formatDate(c.wiedervorlage)}` : ""}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-muted">{position >= 0 ? `${position + 1} von ${total}` : "nicht in der Anrufliste"}</div>
        </div>

        {/* Kontakt */}
        <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Geschäftsführung</div>
            <div className="mt-0.5 text-lg"><Val v={c.gf} /></div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Telefon</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {phones.length === 0 ? (
                <span className="text-lg italic text-muted">offen</span>
              ) : (
                phones.map((p, i) => (
                  <a
                    key={p.tel + i}
                    href={`tel:${p.tel}`}
                    className="rounded-lg bg-accent px-4 py-2 text-lg font-semibold tabular-nums text-accent-ink hover:opacity-90"
                    title={i === 0 ? "Taste t" : undefined}
                  >
                    {p.label}
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span><span className="text-muted">Website </span><ExtLink value={c.website} /></span>
          <span><span className="text-muted">MA </span><Val v={c.ma} /></span>
          <span><span className="text-muted">Lead von </span>{c.leadOwner}</span>
        </div>

        {warn && (
          <div className="mt-5 rounded-lg border border-danger/40 bg-danger-soft px-4 py-3 text-danger" role="alert">
            <b>Achtung:</b> {c.hinweis}
          </div>
        )}

        {/* Einstieg */}
        <div className="mt-6">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">Anlass</div>
          <p className="mt-1 text-base">{c.anlass || <Val v="" />}</p>
        </div>
        <div className="mt-4 rounded-xl bg-accent-soft px-5 py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-accent">Einstiegssatz</div>
          <p className="mt-1 text-xl leading-relaxed sm:text-2xl" data-testid="einstiegssatz">
            {c.einstiegssatz || <span className="italic text-muted">kein Einstiegssatz hinterlegt</span>}
          </p>
          <p className="mt-3 text-sm text-muted">Erstfrage: „{profile.erstfrage}“</p>
        </div>

        {/* Details */}
        <dl className="mt-6 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Break-even</dt>
            <dd className="mt-0.5">
              {c.breakEven ? `${c.breakEven} Aufträge` : <Val v="" />}{" "}
              <span className="text-muted">bei {profile.mindestinvestition.toLocaleString("de-AT")} € netto ({profile.produkt})</span>
            </dd>
          </div>
          {!warn && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Offene Punkte / Hinweis</dt>
              <dd className="mt-0.5">{c.hinweis || <span className="text-muted">–</span>}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Quelle</dt>
            <dd className="mt-0.5"><ExtLink value={c.quelle} /></dd>
          </div>
          {!isOpen(c.letzterKontakt) && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-muted">Letzter Kontakt</dt>
              <dd className="mt-0.5">{c.letzterKontakt}</dd>
            </div>
          )}
        </dl>

        {calls.length > 0 && (
          <div className="mt-5">
            <div className="text-xs font-medium uppercase tracking-wide text-muted">Anrufe</div>
            <ul className="mt-1 space-y-0.5 text-sm">
              {calls.map((call) => (
                <li key={call.id}>
                  <span className="tabular-nums text-muted">{formatDateTime(call.ts)}</span> ·{" "}
                  {RESULTS.find((r) => r.ergebnis === call.ergebnis)?.label}
                  {call.gfGesprochen ? " · GF" : ""}
                  {call.notiz ? ` · ${call.notiz}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Erfassen */}
      <div className="sticky bottom-0 z-10 rounded-b-xl border-t border-line bg-surface-2 p-4 shadow-[0_-6px_16px_-12px_rgba(0,0,0,0.35)] sm:px-7">
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            ref={notizRef}
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.blur();
            }}
            rows={1}
            placeholder="Notiz (Taste n, Esc zum Verlassen)"
            className="min-h-10 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm"
            aria-label="Notiz"
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm select-none">
            <input type="checkbox" checked={gf} onChange={(e) => setGf(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Mit GF gesprochen <kbd>e</kbd>
          </label>
        </div>

        {wv !== null ? (
          <form
            className="mt-3 flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (wv) void submit("wiedervorlage", wv);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setWv(null);
            }}
            aria-label="Wiedervorlage-Datum"
          >
            <span className="text-sm font-medium">Wiedervorlage am</span>
            <input
              ref={wvRef}
              type="date"
              value={wv}
              min={today}
              onChange={(e) => setWv(e.target.value)}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm"
              aria-label="Datum"
            />
            {[
              ["+1 Woche", addDays(today, 7)],
              ["+2 Wochen", addDays(today, 14)],
              ["+1 Monat", addMonths(today, 1)],
              ["+3 Monate", addMonths(today, 3)],
            ].map(([label, d]) => (
              <Button key={label} variant="ghost" onClick={() => setWv(d!)}>{label}</Button>
            ))}
            <Button variant="primary" type="submit" disabled={!wv || busy}>Speichern <kbd className="!bg-transparent !text-accent-ink">Enter</kbd></Button>
            <Button variant="ghost" onClick={() => setWv(null)}>Abbrechen</Button>
          </form>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RESULTS.map((r) => (
              <Button key={r.key} className={`!py-3 ${r.cls}`} disabled={busy} onClick={() => void submit(r.ergebnis)}>
                <kbd>{r.key}</kbd> {r.label}
              </Button>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            <kbd>t</kbd> anrufen · <kbd>u</kbd> letzten Anruf rückgängig · danach geht es automatisch zum nächsten Lead
          </span>
          <button type="button" onClick={() => void remove()} className="hover:text-danger">Lead löschen</button>
        </div>
      </div>
    </Card>
  );
}
