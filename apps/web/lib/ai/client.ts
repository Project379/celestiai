import { createOpenAI } from '@ai-sdk/openai'

// Single source of truth for the LLM used by both Bulgarian-generation call
// sites (daily horoscope, Oracle) — was previously duplicated as a local
// `const LLAMA_MODEL` in each route file, so swapping models meant hunting
// down every call site individually. A model swap (e.g. once the Bulgarian-
// coverage research lands) is now a one-line change here, not a hunt.
//
// Currently Llama 3.3 70B — a known-weak-Bulgarian placeholder per the
// founder's explicit instruction, not a considered choice. Do not add
// prompt workarounds, retries, or post-processing to compensate for its
// output quality; that work becomes dead weight the moment this constant
// changes, and would mask whether a new model actually fixes anything.
export const AI_MODEL = 'meta-llama/llama-3.3-70b-instruct'

export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
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
