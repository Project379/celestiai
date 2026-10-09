import { afterEach, describe, expect, it } from 'vitest'

import { buildDailyHoroscopePrompt, buildDnesV2Prompt } from '@/lib/horoscope/prompts'
import { buildLegacyDailyHoroscopePrompt } from '@/lib/horoscope/prompts-legacy'
import { dnesV2Server, isNewFormatHoroscope } from '@/lib/horoscope/v2'

/**
 * FF_DNES_V2_SERVER: with it OFF (default) the live web Днес and the old mobile screen must
 * get exactly the old prompt. With it ON the new 3-part, no-numbers prompt is used.
 */
const ORIGINAL = process.env.FF_DNES_V2_SERVER
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FF_DNES_V2_SERVER
  else process.env.FF_DNES_V2_SERVER = ORIGINAL
})

describe('FF_DNES_V2_SERVER', () => {
  it('is off unless exactly "true"', () => {
    delete process.env.FF_DNES_V2_SERVER
    expect(dnesV2Server()).toBe(false)
    process.env.FF_DNES_V2_SERVER = '1'
    expect(dnesV2Server()).toBe(false)
    process.env.FF_DNES_V2_SERVER = 'true'
    expect(dnesV2Server()).toBe(true)
  })

  it('OFF: the prompt is byte-for-byte the legacy one (420-450 characters, tokens allowed)', () => {
    delete process.env.FF_DNES_V2_SERVER
    const p = buildDailyHoroscopePrompt()
    expect(p).toBe(buildLegacyDailyHoroscopePrompt())
    expect(p).toContain('between 420 and 450 characters')
    expect(p).toContain('[taspect:T-N]')
  })

  it('ON: the new prompt: three short parts, no numbers, no figure-producing tokens', () => {
    process.env.FF_DNES_V2_SERVER = 'true'
    const p = buildDailyHoroscopePrompt()
    expect(p).toBe(buildDnesV2Prompt())
    expect(p).toContain('PLAIN LANGUAGE, NO NUMBERS')
    expect(p).toContain('between 54 and 62 characters')
    expect(p).toContain('«Слънцето» and «Луната»')
    expect(p).not.toContain('[taspect:')
    expect(p).not.toContain('[pos:')
    expect(p).not.toContain('420 and 450')
    expect(p).toContain('Never speak as "we"')
  })
})

describe('isNewFormatHoroscope', () => {
  const SEP = '\n\n'
  it('accepts three short number-free paragraphs', () => {
    const ok = ['Меркурий носи бързо общуване.', 'Разговорите днес са по-топли.', 'Говори открито.'].join(SEP)
    expect(isNewFormatHoroscope(ok)).toBe(true)
  })
  it('rejects the old long format, a digit, or the wrong number of paragraphs', () => {
    const long = 'Днес транзитното Слънце оформя силен секстил, който събужда у теб скрита решителност и дълбока увереност.'
    expect(isNewFormatHoroscope([long, long, long].join(SEP))).toBe(false)
    expect(isNewFormatHoroscope(['Орб 1.2 градуса.', 'Добре.', 'Говори.'].join(SEP))).toBe(false)
    expect(isNewFormatHoroscope('Само едно.')).toBe(false)
  })
})
