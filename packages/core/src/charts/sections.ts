/**
 * Карта section identifiers + Bulgarian sign/aspect labels + degree
 * formatter. Shared by web `apps/web/components/chart/*` and mobile
 * `apps/mobile/components/chart/*`.
 *
 * Lifted from apps/web/components/chart/chart-sections.ts at P.2-a per
 * the D1 mirror discipline — universal-first, lift data + Bulgarian
 * editorial copy. Both surfaces consume from here.
 */

export type ChartSection = 'essence' | 'details' | 'aspects' | 'houses'

export const SIGN_BG: Record<string, string> = {
  aries:       'Овен',
  taurus:      'Телец',
  gemini:      'Близнаци',
  cancer:      'Рак',
  leo:         'Лъв',
  virgo:       'Дева',
  libra:       'Везни',
  scorpio:     'Скорпион',
  sagittarius: 'Стрелец',
  capricorn:   'Козирог',
  aquarius:    'Водолей',
  pisces:      'Риби',
}

// Lowercase aspect labels — styled for the inline aspect-row sentence
// ("Нептун тригон Плутон") rather than the title-cased ASPECTS_BG used
// in headers. Kept local because it's a styling adapter, not drift.
export const ASPECT_BG: Record<string, string> = {
  conjunction: 'съединение',
  sextile:     'секстил',
  square:      'квадрат',
  trine:       'тригон',
  opposition:  'опозиция',
}

export const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌',
  sextile:     '⚹',
  square:      '□',
  trine:       '△',
  opposition:  '☍',
}

/** Format degree + minutes within a sign — e.g. "12°34' Лъв". */
export function formatDegreeInSign(degreeInSign: number, signKey: string): string {
  const degrees = Math.floor(degreeInSign)
  const minutes = Math.floor((degreeInSign - degrees) * 60)
  const signBg = SIGN_BG[signKey] ?? signKey
  const mm = minutes.toString().padStart(2, '0')
  return `${degrees}°${mm}' ${signBg}`
}
