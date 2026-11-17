import type { Call, Company } from "../data/types";
import { isoDate } from "./dates";

const PRIO_RANK: Record<string, number> = { A: 0, B: 1, C: 2 };

export function isDue(c: Company, today: string): boolean {
  return c.status === "wiedervorlage" && !!c.wiedervorlage && c.wiedervorlage <= today;
}

/** Lead gehört heute in die Anrufliste? */
export function isCallable(c: Company, today: string): boolean {
  if (c.freigabe !== "rein") return false;
  return c.status === "anrufliste" || isDue(c, today);
}

function triedToday(c: Company, today: string): boolean {
  return !!c.letzterVersuch && isoDate(new Date(c.letzterVersuch)) === today;
}

/**
 * Reihenfolge der Anrufliste:
 * 1. fällige Wiedervorlagen (ältestes Datum zuerst)
 * 2. übrige Leads nach Score (absteigend), dann CRM-Priorität, dann Nr
 * 3. heute schon „nicht erreicht“ – ans Ende, ältester Versuch zuerst
 */
export function buildCallList(companies: Company[], today: string = isoDate()): Company[] {
  const callable = companies.filter((c) => isCallable(c, today));
  // Heute schon versucht geht immer ans Ende, auch bei fälliger Wiedervorlage (sonst Endlosschleife).
  const group = (c: Company) => (triedToday(c, today) ? 2 : isDue(c, today) ? 0 : 1);
  return callable.sort((a, b) => {
    const g = group(a) - group(b);
    if (g !== 0) return g;
    if (group(a) === 0) return (a.wiedervorlage ?? "").localeCompare(b.wiedervorlage ?? "");
    if (group(a) === 2) return (a.letzterVersuch ?? "").localeCompare(b.letzterVersuch ?? "");
    const s = (b.score ?? -1) - (a.score ?? -1);
    if (s !== 0) return s;
    const p = (PRIO_RANK[a.crmPrioritaet] ?? 9) - (PRIO_RANK[b.crmPrioritaet] ?? 9);
    if (p !== 0) return p;
    return (a.nr ?? 9999) - (b.nr ?? 9999);
  });
}

export interface DayStats {
  versuche: number;
  erreicht: number;
  gfGespraeche: number;
  termine: number;
}

export function dayStats(calls: Call[], day: string = isoDate()): DayStats {
  const today = calls.filter((c) => isoDate(new Date(c.ts)) === day);
  return {
    versuche: today.length,
    erreicht: today.filter((c) => c.ergebnis !== "nicht_erreicht").length,
    gfGespraeche: today.filter((c) => c.gfGesprochen).length,
    termine: today.filter((c) => c.ergebnis === "termin").length,
  };
}
