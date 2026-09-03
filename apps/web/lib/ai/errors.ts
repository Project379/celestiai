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
  statusCode?: unknown
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
