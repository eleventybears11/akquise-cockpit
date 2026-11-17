/** Lokales Datum als YYYY-MM-DD (nicht UTC). */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date: string, days: number): string {
  const d = parseIsoDate(date);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function addMonths(date: string, months: number): string {
  const d = parseIsoDate(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return isoDate(d);
}

export function parseIsoDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Erkennt YYYY-MM-DD und TT.MM.JJJJ. */
export function parseLooseDate(value: string): string | undefined {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  return undefined;
}

/** „17.11.2026“ */
export function formatDate(date: string | undefined): string {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${formatDate(isoDate(d))} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Montagvormittag: keine Anrufe geplant. */
export function isMondayMorning(now: Date = new Date()): boolean {
  return now.getDay() === 1 && now.getHours() < 12;
}
