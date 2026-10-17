import { beforeEach, describe, expect, it, vi } from 'vitest'

// Smoke must never turn green because the FALLBACK model quietly answered: that would hide a
// failing or slow primary behind a passing probe (it did not log which model served it).

vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'gemini-primary',
  ORACLE_FALLBACK_MODEL: 'gemini-fallback',
}))

const { generateFinalText } = vi.hoisted(() => ({ generateFinalText: vi.fn() }))
vi.mock('@/lib/ai/generate-final-text', () => ({
  GEMINI_THINKING_LEVEL: { oracle: 'low', horoscope: 'low', smoke: 'low' },
  SMOKE_AI_TIMEOUT_MS: 15_000,
  generateFinalText,
}))

import { checkAi } from '@/lib/smoke/check-ai'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('smoke AI probe', () => {
  it('passes and names the served model when the primary answered', async () => {
    generateFinalText.mockResolvedValueOnce({ model: 'gemini-primary', text: 'ok' })
    const detail = await checkAi()
    expect(detail).toContain('gemini-primary')
    expect(detail).toContain('primary')
  })

  it('FAILS when the fallback model served the probe', async () => {
    generateFinalText.mockResolvedValueOnce({ model: 'gemini-fallback', text: 'ok' })
    await expect(checkAi()).rejects.toThrow(/fallback.*served/i)
  })

  it('FAILS on empty text', async () => {
    generateFinalText.mockResolvedValueOnce({ model: 'gemini-primary', text: '   ' })
    await expect(checkAi()).rejects.toThrow(/empty/i)
  })

  it('uses the short smoke timeouts and the smoke thinking level', async () => {
    generateFinalText.mockResolvedValueOnce({ model: 'gemini-primary', text: 'ok' })
    await checkAi()
    expect(generateFinalText).toHaveBeenCalledWith(
      expect.objectContaining({
        thinkingLevel: 'low',
        timeoutMs: { primary: 15_000, fallback: 15_000 },
        fallbackModel: 'gemini-fallback',
      }),
    )
  })
})
