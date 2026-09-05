import { beforeEach, describe, expect, it, vi } from 'vitest'

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
import { generateFinalText } from '@/lib/ai/generate-final-text'

const request = {
  system: 'system',
  prompt: 'prompt',
  maxOutputTokens: 100,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateFinalText', () => {
  it('makes only one request when no fallback is configured', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      output: { content: 'Финален текст' },
    } as never)

    await expect(generateFinalText(request)).resolves.toMatchObject({
      model: 'gemini-primary',
      text: 'Финален текст',
    })
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(vi.mocked(generateText).mock.calls[0]?.[0]).toMatchObject({
      maxRetries: 0,
      model: 'model:gemini-primary',
    })
  })

  it('uses the fallback exactly once after a transient primary failure', async () => {
    const overload = Object.assign(new Error('high demand'), {
      isRetryable: true,
      statusCode: 503,
    })
    vi.mocked(generateText)
      .mockRejectedValueOnce(overload)
      .mockResolvedValueOnce({ output: { content: 'Финален fallback текст' } } as never)

    await expect(generateFinalText({
      ...request,
      fallbackModel: 'gemini-fallback',
    })).resolves.toMatchObject({
      model: 'gemini-fallback',
      text: 'Финален fallback текст',
    })

    expect(generateText).toHaveBeenCalledTimes(2)
    expect(vi.mocked(generateText).mock.calls[1]?.[0]).toMatchObject({
      maxRetries: 0,
      model: 'model:gemini-fallback',
    })
  })

  it('uses the fallback after AI_NoOutputGeneratedError (thinking-budget spike), not a bare failure', async () => {
    // Real `ai`-SDK shape (verified against node_modules/ai/dist/
    // index.mjs's GenerateTextResult): `.output` is a LAZY GETTER that
    // throws NoOutputGeneratedError on ACCESS — generateText() itself
    // resolves normally even when structured-output parsing failed. A
    // rejected promise (mockRejectedValueOnce) does NOT reproduce this;
    // it must be a resolved value whose `output` getter throws, exactly
    // like this. THINKING-BUDGET-SPIKE (.planning/PLACEHOLDERS.md): a
    // live Gate 9 run first "fixed" this with only an errors.ts change
    // and a rejected-promise test, and the fallback still never fired —
    // this getter-shaped mock is what caught that gap in the first
    // attempt at this fix. No statusCode, no isRetryable on the thrown
    // error — the only classifiable signal is `name`.
    const throwingResult = {
      providerMetadata: undefined,
      get output(): never {
        throw Object.assign(new Error('No output generated.'), {
          name: 'AI_NoOutputGeneratedError',
        })
      },
    }
    vi.mocked(generateText)
      .mockResolvedValueOnce(throwingResult as never)
      .mockResolvedValueOnce({ output: { content: 'Финален fallback текст' } } as never)

    await expect(generateFinalText({
      ...request,
      fallbackModel: 'gemini-fallback',
    })).resolves.toMatchObject({
      model: 'gemini-fallback',
      text: 'Финален fallback текст',
    })

    expect(generateText).toHaveBeenCalledTimes(2)
    expect(vi.mocked(generateText).mock.calls[1]?.[0]).toMatchObject({
      maxRetries: 0,
      model: 'model:gemini-fallback',
    })
  })

  it('logs usage for a failing call, not just the eventual successful one (THINKING-BUDGET-SPIKE gap)', async () => {
    // Forcing the lazy `.output` getter inside callModel (so the throw is
    // classified and the fallback engages — see the test above) had a
    // side effect: logAiUsage was only ever reached on a successful
    // return, so a spiking call's real token counts — the ones that
    // matter most for THINKING-BUDGET-SPIKE — were invisible whenever the
    // call failed outright (no fallback configured, or the fallback also
    // failed). This proves the primary attempt's usage is logged even
    // though that attempt itself throws.
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const throwingResult = {
      providerMetadata: {
        google: {
          usageMetadata: {
            promptTokenCount: 1655,
            candidatesTokenCount: 24,
            thoughtsTokenCount: 862,
            totalTokenCount: 2541,
          },
        },
      },
      get output(): never {
        throw Object.assign(new Error('No output generated.'), {
          name: 'AI_NoOutputGeneratedError',
        })
      },
    }
    vi.mocked(generateText).mockResolvedValueOnce(throwingResult as never)

    // No fallbackModel — this is a bare failure with nothing to log
    // afterward, so the ONLY chance to observe this call's usage is
    // inside callModel, before the throw.
    await expect(generateFinalText(request)).rejects.toThrow('No output generated.')

    expect(logSpy).toHaveBeenCalledWith(
      '[AI usage]',
      JSON.stringify({
        model: 'gemini-primary',
        promptTokenCount: 1655,
        candidatesTokenCount: 24,
        thoughtsTokenCount: 862,
        totalTokenCount: 2541,
      }),
    )

    logSpy.mockRestore()
  })

  it('does not use the fallback after a non-transient failure', async () => {
    const invalidRequest = Object.assign(new Error('invalid request'), {
      statusCode: 400,
    })
    vi.mocked(generateText).mockRejectedValueOnce(invalidRequest)

    await expect(generateFinalText({
      ...request,
      fallbackModel: 'gemini-fallback',
    })).rejects.toBe(invalidRequest)

    expect(generateText).toHaveBeenCalledTimes(1)
  })

  it('logs the raw Gemini usage counts (and only the counts) on a successful generation', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(generateText).mockResolvedValueOnce({
      output: { content: 'Финален текст' },
      providerMetadata: {
        google: {
          usageMetadata: {
            promptTokenCount: 1234,
            candidatesTokenCount: 56,
            thoughtsTokenCount: 78,
            totalTokenCount: 1368,
          },
        },
      },
    } as never)

    await generateFinalText(request)

    expect(logSpy).toHaveBeenCalledWith(
      '[AI usage]',
      JSON.stringify({
        model: 'gemini-primary',
        promptTokenCount: 1234,
        candidatesTokenCount: 56,
        thoughtsTokenCount: 78,
        totalTokenCount: 1368,
      }),
    )
    // No prompt/response content or user identifiers in the logged payload.
    const loggedPayload = logSpy.mock.calls[0]?.[1] as string
    expect(loggedPayload).not.toContain('Финален текст')

    logSpy.mockRestore()
  })

  it('logs nulls instead of throwing when providerMetadata is absent', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(generateText).mockResolvedValueOnce({
      output: { content: 'Финален текст' },
    } as never)

    await expect(generateFinalText(request)).resolves.toBeDefined()

    expect(logSpy).toHaveBeenCalledWith(
      '[AI usage]',
      JSON.stringify({
        model: 'gemini-primary',
        promptTokenCount: null,
        candidatesTokenCount: null,
        thoughtsTokenCount: null,
        totalTokenCount: null,
      }),
    )

    logSpy.mockRestore()
  })
})
