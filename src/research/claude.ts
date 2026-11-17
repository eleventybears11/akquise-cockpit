/**
 * Aufruf der Anthropic Messages API direkt aus dem Browser (eigener API-Key, nur lokal gespeichert).
 * Serverseitige Websuche und Web-Abruf, strukturierte JSON-Antwort.
 * Sammelt alle URLs, die tatsächlich gesucht/abgerufen wurden – für die Quellenprüfung.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { ModellId } from "../data/types";
import { NULL_USAGE, addUsage, normalizeUrl, type Usage } from "./logic";

export interface CallOptions {
  apiKey: string;
  modell: ModellId;
  aufwand: "low" | "medium" | "high";
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxSuchen: number;
  maxAbrufe: number;
  signal?: AbortSignal;
}

export interface CallResult<T> {
  data: T;
  urls: Set<string>;
  usage: Usage;
}

export class RechercheFehler extends Error {}

const MAX_FORTSETZUNGEN = 5;

export function createClient(apiKey: string): Anthropic {
  // dangerouslyAllowBrowser: der Key stammt vom Nutzer selbst und bleibt in seinem Browser.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 3, timeout: 9 * 60 * 1000 });
}

/** Prüft den API-Key mit einer kostenlosen Modell-Abfrage. */
export async function pruefeKey(apiKey: string, modell: ModellId): Promise<string> {
  const m = await createClient(apiKey).models.retrieve(modell);
  return m.display_name;
}

type Block = { type: string; [k: string]: unknown };

function sammleUrls(content: Block[], urls: Set<string>) {
  for (const b of content) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content as { url?: string }[]) if (r.url) urls.add(normalizeUrl(r.url));
    }
    if (b.type === "web_fetch_tool_result") {
      const c = b.content as { type?: string; url?: string } | undefined;
      if (c?.type === "web_fetch_result" && c.url) urls.add(normalizeUrl(c.url));
    }
  }
}

function usageAus(u: {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number; web_fetch_requests?: number } | null;
}): Usage {
  return {
    inputTokens: u.input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
    cacheReadTokens: u.cache_read_input_tokens ?? 0,
    cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    suchen: u.server_tool_use?.web_search_requests ?? 0,
    abrufe: u.server_tool_use?.web_fetch_requests ?? 0,
  };
}

export async function callClaude<T>(o: CallOptions): Promise<CallResult<T>> {
  const client = createClient(o.apiKey);
  const urls = new Set<string>();
  let usage = NULL_USAGE;
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [{ role: "user", content: o.prompt }];
  // Bei pause_turn wird die bisherige Antwort vollständig (inkl. Denk-Blöcken) als Assistant-Turn zurückgeschickt
  const bisher: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
  // Server-seitiger Fallback bei Ablehnung (nicht für Haiku verfügbar)
  const fallback = o.modell === "claude-haiku-5-5" ? {} : { betas: ["server-side-fallback-2026-07-01" as const], fallbacks: "default" as const };

  for (let i = 0; i <= MAX_FORTSETZUNGEN; i++) {
    const res = await client.beta.messages.create(
      {
        model: o.modell,
        max_tokens: 16000,
        system: o.system,
        messages,
        cache_control: { type: "ephemeral" },
        output_config: { effort: o.aufwand, format: { type: "json_schema", schema: o.schema } },
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: o.maxSuchen, user_location: { type: "approximate", country: "AT", timezone: "Europe/Vienna" } },
          { type: "web_fetch_20260209", name: "web_fetch", max_uses: o.maxAbrufe },
        ],
        ...fallback,
      },
      { signal: o.signal },
    );
    usage = addUsage(usage, usageAus(res.usage));
    sammleUrls(res.content as unknown as Block[], urls);

    if (res.stop_reason === "pause_turn") {
      // Server-Werkzeugschleife pausiert: Antwort unverändert zurückgeben, der Server macht weiter
      bisher.push(...(res.content as unknown as Anthropic.Beta.Messages.BetaContentBlockParam[]));
      messages.length = 1;
      messages.push({ role: "assistant", content: [...bisher] });
      continue;
    }
    if (res.stop_reason === "refusal") throw new RechercheFehler("Die KI hat diese Anfrage abgelehnt.");
    if (res.stop_reason === "max_tokens") throw new RechercheFehler("Antwort zu lang (Token-Limit erreicht).");

    const text = res.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    try {
      return { data: JSON.parse(text) as T, urls, usage };
    } catch {
      throw new RechercheFehler("Antwort war kein gültiges JSON.");
    }
  }
  throw new RechercheFehler("Recherche nach mehreren Fortsetzungen nicht abgeschlossen.");
}

/** Verständliche Fehlermeldung für die Oberfläche. */
export function fehlerText(err: unknown): string {
  if (err instanceof RechercheFehler) return err.message;
  if (err instanceof Anthropic.AuthenticationError) return "API-Key ungültig.";
  if (err instanceof Anthropic.PermissionDeniedError) return "Keine Berechtigung für dieses Modell oder Werkzeug.";
  if (err instanceof Anthropic.RateLimitError) return "Zu viele Anfragen – bitte in einer Minute erneut versuchen.";
  if (err instanceof Anthropic.BadRequestError) return `Anfrage abgelehnt: ${err.message}`;
  if (err instanceof Anthropic.APIUserAbortError) return "Abgebrochen.";
  if (err instanceof Anthropic.APIConnectionError) return "Keine Verbindung zur Anthropic-API.";
  if (err instanceof Anthropic.APIError) return `API-Fehler ${err.status ?? ""}: ${err.message}`;
  return err instanceof Error ? err.message : String(err);
}
