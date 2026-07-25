/**
 * Global API error surface — deduped toasts for failures users would
 * otherwise never see (previously logged to console only).
 *
 * Policy:
 * - Network failures and 5xx responses toast (one per endpoint per 5s).
 * - 4xx responses stay silent — forms and feature code own those.
 * - Callers can opt out per request with `fetchAPI(url, { silent: true })`.
 */

import { toast } from "@/hooks/use-toast"

const DEDUPE_WINDOW_MS = 5000

const lastNotified = new Map<string, number>()

/** Strip ids/query so /messages/123 and /messages/456 dedupe together. */
function endpointKey(endpoint: string): string {
  return endpoint
    .split("?")[0]
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
    .replace(/\/\d+(\/|$)/g, "/:id$1")
}

export type ApiErrorKind = "network" | "server" | "timeout"

/**
 * @param reference Support reference id from the error envelope
 *   (`error.reference`). Shown to the user so a mysterious failure becomes a
 *   quotable ticket, and printed to the console for in-session debugging.
 */
export function notifyApiError(
  endpoint: string,
  kind: ApiErrorKind,
  reference?: string,
): void {
  if (typeof window === "undefined") return

  const key = `${kind}:${endpointKey(endpoint)}`
  const now = Date.now()
  const last = lastNotified.get(key)
  if (last && now - last < DEDUPE_WINDOW_MS) return
  lastNotified.set(key, now)

  // Bound the dedupe map.
  if (lastNotified.size > 200) {
    const cutoff = now - DEDUPE_WINDOW_MS
    for (const [k, ts] of lastNotified) {
      if (ts < cutoff) lastNotified.delete(k)
    }
  }

  if (kind === "timeout") {
    toast({
      variant: "destructive",
      title: "Request timed out",
      description: "The server is taking too long to respond. Please try again.",
    })
  } else if (kind === "network") {
    toast({
      variant: "destructive",
      title: "Connection problem",
      description: "We couldn't reach the server. Check your connection and try again.",
    })
  } else {
    if (reference) {
      // Help future debugging: the same id is on the response header, in
      // Sentry, and in the backend logs.
      console.error(`API error on ${endpoint} — reference ${reference}`)
    }
    toast({
      variant: "destructive",
      title: "Something went wrong",
      description: reference
        ? `An unexpected error occurred. Please try again. If it continues, quote reference ${reference} to support.`
        : "An unexpected error occurred. Please try again in a moment.",
    })
  }
}
