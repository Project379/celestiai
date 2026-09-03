import { describe, expect, it } from 'vitest'
import { buildDailyHoroscopePrompt } from '@/lib/horoscope/prompts'

describe('buildDailyHoroscopePrompt', () => {
  it('requires a compact horoscope of five or six complete sentences', () => {
    const prompt = buildDailyHoroscopePrompt()

    expect(prompt).toContain('exactly 5 or 6 complete sentences')
    expect(prompt).toContain('never stop after only 3 sentences')
    expect(prompt).toContain('between 600 and 850 characters')
    expect(prompt).toContain('3 compact paragraphs')
  })
})
