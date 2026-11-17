/**
 * Der Anthropic-API-Key liegt nur im localStorage dieses Browsers –
 * nie in IndexedDB-Backups, Exporten, Logs oder im Repository.
 */
const KEY = "lead-cockpit:anthropic-api-key";

export function getApiKey(): string | undefined {
  try {
    return localStorage.getItem(KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function setApiKey(value: string): void {
  try {
    if (value.trim()) localStorage.setItem(KEY, value.trim());
    else localStorage.removeItem(KEY);
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus) – Key gilt dann nur bis zum Neuladen nicht
  }
}

/** „sk-ant-…abcd“ zur Anzeige */
export function maskKey(value: string | undefined): string {
  if (!value) return "";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}
