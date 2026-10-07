import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// GEMINI-SLOW-NO-FAILOVER: a slow primary used to hold the request open until the platform
// timeout because the call SUCCEEDS slowly instead of failing. These tests pin the new
// behaviour: primary gets its own timeout, then the fallback model gets ITS own timeout, and
// when both run out the caller receives a transient error the routes map to the ratified 503.

vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'gemini-primary',
  gemini: vi.fn((model: string) => `model:${model}`),
  isUpstreamAiError: vi.fn(() => false),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((options) => options) },
}))

import { generateText } from 'ai'
import {
  GEMINI_FALLBACK_TIMEOUT_MS,
  GEMINI_PRIMARY_TIMEOUT_MS,
  generateFinalText,
} from '@/lib/ai/generate-final-text'
import { isTransientAIError } from '@/lib/ai/errors'

const request = { system: 's', prompt: 'p', maxOutputTokens: 100, thinkingLevel: 'low' as const }

/** A generateText that never answers until its abort signal fires, then rejects like fetch does. */
function hangUntilAborted() {
  return (opts: { abortSignal?: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      opts.abortSignal?.addEventListener('abort', () => reject(opts.abortSignal?.reason ?? new Error('aborted')))
    })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
})

describe('generateFinalText timeouts', () => {
  it('gives the primary call its own abort signal and the documented timeout (25 s primary, 20 s fallback)', () => {
    expect(GEMINI_PRIMARY_TIMEOUT_MS).toBe(25_000)
    expect(GEMINI_FALLBACK_TIMEOUT_MS).toBe(20_000)
  })

  it('passes an AbortSignal to the primary request', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({ output: { content: 'ok' } } as never)
    await generateFinalText(request)
    const signal = vi.mocked(generateText).mock.calls[0]?.[0]?.abortSignal
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)
  })

  it('aborts a slow primary at 25 s and answers from the fallback', async () => {
    vi.mocked(generateText)
      .mockImplementationOnce(hangUntilAborted() as never)
      .mockResolvedValueOnce({ output: { content: 'from fallback' } } as never)

    const pending = generateFinalText({ ...request, fallbackModel: 'gemini-fallback' })
    await vi.advanceTimersByTimeAsync(GEMINI_PRIMARY_TIMEOUT_MS - 1)
    expect(generateText).toHaveBeenCalledTimes(1) // still waiting on the primary
    await vi.advanceTimersByTimeAsync(1)

    await expect(pending).resolves.toMatchObject({ model: 'gemini-fallback', text: 'from fallback' })
    expect(generateText).toHaveBeenCalledTimes(2)
    expect(vi.mocked(generateText).mock.calls[1]?.[0]).toMatchObject({ model: 'model:gemini-fallback' })
  })

  it('gives the fallback its OWN timeout, then throws a transient timeout error (worst case = primary + fallback)', async () => {
    vi.mocked(generateText).mockImplementation(hangUntilAborted() as never)

    const pending = generateFinalText({ ...request, fallbackModel: 'gemini-fallback' })
    const settled = pending.then(
      () => 'resolved',
      (e: unknown) => e,
    )
    await vi.advanceTimersByTimeAsync(GEMINI_PRIMARY_TIMEOUT_MS)
    expect(generateText).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(GEMINI_FALLBACK_TIMEOUT_MS - 1)
    // not yet: the fallback has a full 20 s of its own
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    await vi.advanceTimersByTimeAsync(1)

    const err = await settled
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).name).toBe('AI_TimeoutError')
    expect(isTransientAIError(err)).toBe(true) // routes map this to the ratified 503
    expect(generateText).toHaveBeenCalledTimes(2) // exactly one fallback, no hidden retries
  })

  it('with no fallback configured a slow primary ends in the same transient timeout error', async () => {
    vi.mocked(generateText).mockImplementation(hangUntilAborted() as never)
    const settled = generateFinalText(request).then(
      () => 'resolved',
      (e: unknown) => e,
    )
    await vi.advanceTimersByTimeAsync(GEMINI_PRIMARY_TIMEOUT_MS)
    const err = await settled
    expect((err as Error).name).toBe('AI_TimeoutError')
    expect(generateText).toHaveBeenCalledTimes(1)
  })

  it('honours per-call timeout overrides (the smoke probe uses shorter ones)', async () => {
    vi.mocked(generateText).mockImplementation(hangUntilAborted() as never)
    const settled = generateFinalText({
      ...request,
      fallbackModel: 'gemini-fallback',
      timeoutMs: { primary: 1_000, fallback: 2_000 },
    }).then(
      () => 'resolved',
      (e: unknown) => e,
    )
    await vi.advanceTimersByTimeAsync(3_000)
    expect(((await settled) as Error).name).toBe('AI_TimeoutError')
  })

  it('does not leave timers running after a fast answer', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({ output: { content: 'fast' } } as never)
    await generateFinalText(request)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a non-timeout failure still follows the old transient/fallback rules (not mislabelled as a timeout)', async () => {
    const overload = Object.assign(new Error('high demand'), { isRetryable: true, statusCode: 503 })
    vi.mocked(generateText)
      .mockRejectedValueOnce(overload)
      .mockResolvedValueOnce({ output: { content: 'fallback text' } } as never)
    await expect(generateFinalText({ ...request, fallbackModel: 'gemini-fallback' })).resolves.toMatchObject({
      model: 'gemini-fallback',
    })
  })
})
