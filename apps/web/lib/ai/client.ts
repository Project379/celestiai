import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Single source of truth for the LLM used by both Bulgarian-generation call
// sites (daily horoscope and Oracle). Gemini 3.7 Flash is the production
// Bulgarian model. Keep the ID centralized so future evaluations do not
// create diverging route-level configuration.
export const AI_MODEL = 'gemini-3.7-flash'
export const ORACLE_FALLBACK_MODEL = 'gemini-3.6-flash'

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

/**
 * True when `err` is an upstream AI-provider / transport failure (bad
 * gateway, non-JSON body, network drop, rate-limit) rather than a bug in
 * our own code. The `ai` SDK does NOT wrap a non-JSON provider response —
 * `JSON.parse` throws a raw `SyntaxError` straight out of
 * `generateText`/`streamText`.
 *
 * Call sites use this to turn an unexpected 500 into a deliberate 502 with
 * a retry hint, so a provider hiccup is not indistinguishable from "our
 * route is broken". Anything not matched here re-throws unchanged — a real
 * bug must still surface as a 500.
 *
 * History: added 2026-08-27 while chasing a production `SyntaxError` on
 * /api/horoscope/generate that turned out to be a stale deployment serving
 * pre-fix code (COMPLETION-TRACKER.md §0.8). The specific failure was a
 * phantom, but the guard is kept: an upstream provider WILL return garbage
 * eventually, and an opaque 500 that also burns a quota claim is a real
 * defect whether or not it has fired yet.
 */
export function isUpstreamAiError(err: unknown): boolean {
  if (err instanceof SyntaxError) return true
  if (
    err instanceof TypeError &&
    /fetch failed|network|terminated|socket|ECONNRESET|ETIMEDOUT/i.test(err.message)
  ) {
    return true
  }
  const name = (err as { name?: string } | null | undefined)?.name ?? ''
  // NB: LoadAPIKeyError is deliberately NOT here — a missing/blank key is
  // our misconfiguration, and a "try again shortly" 502 would be a lie
  // (retrying won't help). It stays a loud 500.
  return (
    name === 'APICallError' ||
    name === 'AI_APICallError' ||
    name === 'AI_RetryError' ||
    name === 'DownloadError'
  )
}
