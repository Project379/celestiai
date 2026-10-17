// Ported from change-ai-to-bulgarian-fluent (Petko), unchanged. Scoped
// deliberately narrow: this file's isTransientAIError is used INSIDE
// generate-final-text.ts to decide whether to try the same-provider
// fallback model, and at the route level as the FIRST classifier in the
// outer catch (checked before lib/ai/client.ts's isUpstreamAiError — see
// that file's header comment for why both exist).

type AIErrorLike = {
  cause?: unknown
  errors?: unknown[]
  isRetryable?: unknown
  lastError?: unknown
  name?: unknown
  statusCode?: unknown
}

/**
 * Thrown by generateFinalText when a model call outlives its own timeout
 * (GEMINI-SLOW-NO-FAILOVER). A slow Gemini call SUCCEEDS slowly instead of
 * failing, so without a timeout nothing ever triggered the fallback model and a
 * bad Google day held the request open until the platform limit. It is TRANSIENT
 * by definition: isTransientAIError() below returns true for it, so the primary's
 * timeout falls over to the fallback model and, when the fallback also times out,
 * the route answers with aiTemporarilyUnavailableResponse() (the ratified
 * «Звездите са временно недостъпни…» 503, no Sentry capture).
 */
export class AiTimeoutError extends Error {
  readonly model: string
  readonly timeoutMs: number

  constructor(model: string, timeoutMs: number, options?: { cause?: unknown }) {
    super(`Gemini model ${model} did not answer within ${timeoutMs} ms`, options)
    this.name = 'AI_TimeoutError'
    this.model = model
    this.timeoutMs = timeoutMs
  }
}

export const AI_TEMPORARILY_UNAVAILABLE_CODE = 'AI_TEMPORARILY_UNAVAILABLE'
export const AI_RETRY_AFTER_SECONDS = 30

function errorChain(error: unknown): AIErrorLike[] {
  const queue = [error]
  const seen = new Set<unknown>()
  const chain: AIErrorLike[] = []

  while (queue.length > 0) {
    const current = queue.shift()
    if (current === null || typeof current !== 'object' || seen.has(current)) continue

    seen.add(current)
    const candidate = current as AIErrorLike
    chain.push(candidate)

    if (candidate.lastError !== undefined) queue.push(candidate.lastError)
    if (candidate.cause !== undefined) queue.push(candidate.cause)
    if (Array.isArray(candidate.errors)) queue.push(...candidate.errors)
  }

  return chain
}

export function getAIStatusCode(error: unknown): number | undefined {
  for (const candidate of errorChain(error)) {
    if (typeof candidate.statusCode === 'number') return candidate.statusCode
  }
  return undefined
}

export function isTransientAIError(error: unknown): boolean {
  for (const candidate of errorChain(error)) {
    if (candidate.isRetryable === true) return true
    if (
      typeof candidate.statusCode === 'number' &&
      (candidate.statusCode === 408 ||
        candidate.statusCode === 429 ||
        candidate.statusCode >= 500)
    ) {
      return true
    }
    // AI_NoOutputGeneratedError (the `ai` SDK's structured-output failure,
    // thrown when the model responds but no valid Output.object() content
    // comes back) carries no statusCode/isRetryable — it isn't an
    // HTTP-level failure, so the checks above never catch it. Gate 9
    // (2026-09-04, THINKING-BUDGET-SPIKE — .planning/PLACEHOLDERS.md)
    // confirmed it empirically non-deterministic: a thinking-token spike
    // starved the output budget and threw this on one call, then an
    // isolated retry of the IDENTICAL prompt completed cleanly. That's
    // exactly what "transient" means here — worth the same-provider
    // fallback attempt, not a hard fail.
    if (candidate.name === 'AI_NoOutputGeneratedError') return true
    // Our own per-call timeout (see AiTimeoutError above).
    if (candidate.name === 'AI_TimeoutError') return true
  }
  return false
}

export function aiTemporarilyUnavailableResponse(): Response {
  return Response.json(
    {
      code: AI_TEMPORARILY_UNAVAILABLE_CODE,
      error: 'Звездите са временно недостъпни. Опитай отново след малко.',
    },
    {
      status: 503,
      headers: { 'Retry-After': String(AI_RETRY_AFTER_SECONDS) },
    },
  )
}
