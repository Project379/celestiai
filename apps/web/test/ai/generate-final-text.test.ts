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
