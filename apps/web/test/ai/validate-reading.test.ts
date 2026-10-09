/**
 * Pre-display reading validator (Astrology Phase 2, Part 5).
 */
import { describe, expect, it } from 'vitest'
import { validateReading } from '@/lib/ai/validate-reading'

const VALUES: Record<string, string> = {
  'pos:sun': "24°06' Близнаци",
  'house:sun': 'дом 9',
  'pos:moon': "15°04' Риби",
  'aspect:moon-sun': 'тригон (орб 2.3°)',
}

/** A ~40-word Bulgarian paragraph builder to hit the word-count window. */
function pad(core: string, words = 45): string {
  const filler = Array.from({ length: words }, () => 'звезда').join(' ')
  return `${core} ${filler}.`
}

describe('validateReading', () => {
  it('accepts a clean reading and substitutes tokens', () => {
    const raw = pad(
      'Твоето [planet:sun]Слънце[/planet] на [pos:sun], в [house:sun], е в [aspect:sun-moon] с [planet:moon]Луна[/planet].',
    )
    const r = validateReading(raw, VALUES, { minWords: 20, maxWords: 200 })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.content).toContain("24°06' Близнаци")
    expect(r.content).toContain('дом 9')
    expect(r.content).toContain('тригон (орб 2.3°)')
    // content keeps sentinels, text strips them
    expect(r.content).toContain('[planet:sun]')
    expect(r.text).not.toContain('[planet:sun]')
    expect(r.text).toContain('Слънце')
  })

  it('rejects CJK / Hangul / other non-Bulgarian scripts (script purity)', () => {
    for (const bad of ['環ност', '快速ни', '환', 'emoción', 'ﬀ']) {
      const raw = pad(`Днес [planet:sun]Слънце[/planet] носи ${bad} промяна.`)
      const r = validateReading(raw, VALUES, { minWords: 20, maxWords: 200 })
      expect(r.ok).toBe(false)
      if (r.ok) return
      expect(r.code).toBe('NON_BULGARIAN_SCRIPT')
    }
  })

  it('rejects a model-authored figure instead of a token', () => {
    const raw = pad('Твоето Слънце на 24°06′ Близнаци те определя.')
    const r = validateReading(raw, VALUES, { minWords: 20, maxWords: 200 })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('MODEL_WROTE_DIGITS')
  })

  it('rejects a placeholder that references data not in the chart', () => {
    const raw = pad('Твоят [planet:pluto]Плутон[/planet] на [pos:pluto] тежи.')
    const r = validateReading(raw, VALUES, { minWords: 20, maxWords: 200 })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('UNRESOLVED_PLACEHOLDER')
  })

  it('rejects unbalanced sentinels', () => {
    const raw = pad('Твоето [planet:sun]Слънце на [pos:sun] грее.')
    const r = validateReading(raw, VALUES, { minWords: 20, maxWords: 200 })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('SENTINELS_UNBALANCED')
  })

  it('rejects an out-of-range word count', () => {
    const raw = 'Твоето [planet:sun]Слънце[/planet] на [pos:sun] грее.'
    const r = validateReading(raw, VALUES, { minWords: 400, maxWords: 700 })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('WORD_COUNT_OUT_OF_RANGE')
  })

  it('allows the degree sign, prime and Bulgarian typographic punctuation', () => {
    const raw = pad(
      'Твоето [planet:sun]Слънце[/planet] на [pos:sun] — то е „домът“ на волята ти…',
    )
    const r = validateReading(raw, VALUES, { minWords: 20, maxWords: 200 })
    expect(r.ok).toBe(true)
  })
})

describe('validateReading: three short parts (Днес v2)', () => {
  const opts = { minWords: 15, maxWords: 45, threeShortParts: true }
  const SEP = '\n\n'
  const GOOD = [
    '[planet:jupiter]Юпитер[/planet] подкрепя [planet:moon]Луната[/planet] ти и разговорите стават по-топли.',
    'Слънцето събужда твоя Марс и ти дава сили за действие днес.',
    'Усещаш прилив на сили и увереност във всичко, което започваш.',
  ].join(SEP)

  it('accepts three parts that fill two lines', () => {
    expect(validateReading(GOOD, VALUES, opts).ok).toBe(true)
  })

  it('rejects a part that is too short to fill two lines', () => {
    const short = [GOOD.split(SEP)[0], 'Говори открито днес.', GOOD.split(SEP)[2]].join(SEP)
    const r = validateReading(short, VALUES, opts)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('PART_TOO_SHORT')
  })

  it('rejects a part that is too long for two lines on a 360px screen', () => {
    const long =
      'Днес транзитното Слънце оформя силен секстил, който събужда у теб скрита решителност и дълбока увереност във всичко.'
    const r = validateReading([GOOD.split(SEP)[0], long, GOOD.split(SEP)[2]].join(SEP), VALUES, opts)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('PART_TOO_LONG')
  })

  it('rejects anything but three paragraphs', () => {
    const two = [GOOD.split(SEP)[0], GOOD.split(SEP)[1]].join(SEP)
    const r = validateReading(two, VALUES, { ...opts, minWords: 5 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('PARTS_NOT_THREE')
  })

  it('rejects a digit, including one that a token expands to (the v2 prompt bans numbers)', () => {
    const withToken = [GOOD.split(SEP)[0] + ' [taspect:mercury-sun]', GOOD.split(SEP)[1], GOOD.split(SEP)[2]].join(SEP)
    const r = validateReading(withToken, { ...VALUES, 'taspect:mercury-sun': 'тригон (орб 1.2°)' }, { ...opts, minWords: 3 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('DIGITS_IN_TEXT')
  })

  it('rejects the Sun or Moon as a subject without the article', () => {
    const bare = [GOOD.split(SEP)[0], 'Слънце събужда твоя Марс и ти дава сили за действие днес.', GOOD.split(SEP)[2]].join(SEP)
    const r = validateReading(bare, VALUES, opts)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('LUMINARY_WITHOUT_ARTICLE')
    // «твоето Слънце» is not a bare subject
    const possessive = [GOOD.split(SEP)[0], 'Марс докосва твоето Слънце и ти дава сили за действие днес.', GOOD.split(SEP)[2]].join(SEP)
    expect(validateReading(possessive, VALUES, opts).ok).toBe(true)
  })
})
