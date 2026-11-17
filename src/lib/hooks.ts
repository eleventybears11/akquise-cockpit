import { useEffect, useState, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from "../data/defaults";
import type { Profile, Settings } from "../data/types";

export type Route =
  | { view: "freigabe" }
  | { view: "anrufen"; id?: string }
  | { view: "wiedervorlagen" }
  | { view: "leads" }
  | { view: "import" }
  | { view: "anreichern" }
  | { view: "einstellungen" };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  switch (parts[0]) {
    case "anrufen":
      return { view: "anrufen", id: parts[1] };
    case "wiedervorlagen":
      return { view: "wiedervorlagen" };
    case "leads":
      return { view: "leads" };
    case "import":
      return { view: "import" };
    case "anreichern":
      return { view: "anreichern" };
    case "einstellungen":
      return { view: "einstellungen" };
    default:
      return { view: "freigabe" };
  }
}

export function navigate(path: string): void {
  window.location.hash = `#/${path}`;
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash);
  return parseHash(hash);
}

export function useSettings(): Settings {
  return useLiveQuery(async () => ({ ...DEFAULT_SETTINGS, ...(await db.meta.get("settings"))?.value }), [], DEFAULT_SETTINGS);
}

export function useProfile(): Profile {
  const settings = useSettings();
  // Neue Profilfelder (z. B. ab M2) mit Standardwerten ergänzen
  return useLiveQuery(async () => ({ ...DEFAULT_PROFILE, ...(await db.profiles.get(settings.aktivesProfil)) }), [settings.aktivesProfil], DEFAULT_PROFILE);
}

/** Ist der Fokus in einem Eingabefeld? Dann greifen Tastaturkürzel nicht. */
export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
}

/** Registriert Tastaturkürzel, solange die Komponente sichtbar ist. */
export function useKeys(handler: (e: KeyboardEvent) => void, deps: unknown[], capture = false): void {
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      handler(e);
    };
    window.addEventListener("keydown", listener, capture);
    return () => window.removeEventListener("keydown", listener, capture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Aktuelles Datum, aktualisiert sich jede Minute (für „heute“ über Mitternacht). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}
