import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  text: string;
  tone?: "ok" | "danger";
  action?: { label: string; run: () => void | Promise<void> };
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(t: Omit<Toast, "id">, ms = 6000): void {
  const item = { ...t, id: nextId++ };
  toasts = [...toasts.slice(-2), item];
  emit();
  window.setTimeout(() => dismiss(item.id), ms);
}

export function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
  );
}

/** Zuletzt erfasster Anruf, damit „u“ ihn überall rückgängig machen kann. */
let lastCallId: string | undefined;
export const lastCall = {
  get: () => lastCallId,
  set: (id: string | undefined) => {
    lastCallId = id;
  },
};
