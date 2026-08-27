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

// ---------------------------------------------------------------------------
// [OPENROUTER-DEBUG 2026-08-27] TEMPORARY — REMOVE once the empty-body 500
// on /api/horoscope/generate + /api/oracle/generate is root-caused
// (COMPLETION-TRACKER.md §0.8). Same discipline as [PERF-DEBUG]: loud
// prefix, dated, explicit removal condition. Logs the raw OpenRouter
// response (status + content-type + body) BEFORE the `ai` SDK parses it,
// plus the outgoing model, so a non-JSON error page (Cloudflare challenge,
// bad model slug, provider incident) is visible in Vercel Runtime Logs
// instead of only surfacing as `SyntaxError: Unexpected end of JSON input`.
// Reads via response.clone() so the SDK still sees an intact body/stream.
// REMOVAL: delete this block and the `fetch: debugFetch` line below; revert
// createOpenAI to the plain 3-arg form.
const debugFetch: typeof fetch = async (input, init) => {
  let outgoingModel = '<unknown>'
  try {
    if (typeof init?.body === 'string') {
      outgoingModel = (JSON.parse(init.body) as { model?: string }).model ?? '<none>'
    }
  } catch {
    outgoingModel = '<unparseable-body>'
  }

  const res = await fetch(input, init)

  try {
    const bodyText = await res.clone().text()
    console.error(
      `[OPENROUTER-DEBUG rm-after-diag] model=${outgoingModel} status=${res.status} ${res.statusText} ` +
        `content-type="${res.headers.get('content-type') ?? ''}" body-len=${bodyText.length} ` +
        `body=${JSON.stringify(bodyText.slice(0, 2000))}`,
    )
  } catch (err) {
    console.error('[OPENROUTER-DEBUG rm-after-diag] could not read response body for logging:', err)
  }

  return res
}
// ---------------------------------------------------------------------------

export const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  fetch: debugFetch, // [OPENROUTER-DEBUG] remove with the block above
})

/**
 * True when `err` is an upstream AI-provider / transport failure (bad
 * gateway, non-JSON body, network drop, rate-limit) rather than a bug in
 * our own code. The `ai` SDK does NOT wrap a non-JSON provider response —
 * `JSON.parse` throws a raw `SyntaxError` that propagates straight out of
 * `generateText`/`streamText` (this is exactly the §0.8 production 500).
 *
 * Call sites use this to turn an unexpected 500 into a deliberate 502 with
 * a retry hint, so a provider hiccup is not indistinguishable from "our
 * route is broken". Anything not matched here re-throws unchanged — a real
 * bug must still surface as a 500.
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
