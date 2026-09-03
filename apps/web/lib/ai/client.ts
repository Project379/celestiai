import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Single source of truth for the LLM used by both Bulgarian-generation call
// sites (daily horoscope, Oracle) — was previously duplicated as a local
// `const LLAMA_MODEL` in each route file, so swapping models meant hunting
// down every call site individually. A model swap is now a one-line change
// here, not a hunt.
//
// Gemini 3.7 Flash — ported from change-ai-to-bulgarian-fluent (Petko),
// reconciled onto the injection/validation layer on this branch
// (gemini/rebased-onto-injection). ORACLE_FALLBACK_MODEL is the one-step
// same-provider fallback generateFinalText() (lib/ai/generate-final-text.ts)
// tries after a TRANSIENT primary-model failure only — see that file and
// lib/ai/errors.ts's isTransientAIError. Shared by both the Oracle and
// horoscope routes (his branch wired it to Oracle only; extended to
// horoscope here for consistency — both are paid, user-facing generation
// paths and there is no reason one should retry past a hiccup and the
// other not).
// STELLAEUM_PLACEHOLDER: LLM-MODEL-SWAP — decision resolved, implementation
// not landed ON MAIN; this branch (gemini/rebased-onto-injection) is that
// implementation, not yet merged. See .planning/PLACEHOLDERS.md.
export const AI_MODEL = 'gemini-3.7-flash'
export const ORACLE_FALLBACK_MODEL = 'gemini-3.6-flash'

// STELLAEUM_PLACEHOLDER: LLM-FAILOVER — one provider (Google), no
// alternate-PROVIDER fallback. ORACLE_FALLBACK_MODEL above is a same-
// provider model swap (3.7 -> 3.6) on a transient failure, not a
// different-provider fallback — a Google-wide outage still has nothing to
// fall back to. See .planning/PLACEHOLDERS.md.
export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
})

/**
 * True when `err` is an upstream AI-provider / transport failure (bad
 * gateway, non-JSON body, network drop, rate-limit) rather than a bug in
 * our own code. The `ai` SDK does NOT wrap a non-JSON provider response —
 * `JSON.parse` throws a raw `SyntaxError` straight out of
 * `generateText`/`streamText`. Provider-agnostic: these are `ai`-SDK-level
 * error shapes, not OpenAI/OpenRouter-specific ones, so this is unchanged
 * by the Gemini swap.
 *
 * Call sites use this as the LAST-RESORT classifier for an error that
 * escaped generateFinalText() entirely (its own fallback also failed, or
 * threw something isTransientAIError — lib/ai/errors.ts — doesn't
 * recognize), turning an unexpected 500 into a deliberate 502 with a retry
 * hint. isTransientAIError is checked FIRST at those call sites (a more
 * specific, chain-aware classification used to decide the primary/fallback
 * model switch inside generateFinalText); this stays the broader net
 * behind it. Anything not matched by either re-throws unchanged — a real
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
