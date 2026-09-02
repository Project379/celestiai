/**
 * Astrology constants and Bulgarian translations
 *
 * All text displayed to users should use these Bulgarian translations.
 */

import type { AspectType, Planet, ZodiacSign } from './types'

/**
 * Zodiac signs in Bulgarian
 */
export const ZODIAC_SIGNS_BG: Record<ZodiacSign, string> = {
  aries: 'Овен',
  taurus: 'Телец',
  gemini: 'Близнаци',
  cancer: 'Рак',
  leo: 'Лъв',
  virgo: 'Дева',
  libra: 'Везни',
  scorpio: 'Скорпион',
  sagittarius: 'Стрелец',
  capricorn: 'Козирог',
  aquarius: 'Водолей',
  pisces: 'Риби',
} as const

/**
 * Ordered list of zodiac signs (Aries = 0, Pisces = 11)
 */
export const ZODIAC_SIGNS_ORDER: ZodiacSign[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]

/**
 * Planets in Bulgarian
 */
export const PLANETS_BG: Record<Planet, string> = {
  sun: 'Слънце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
  northNode: 'Северен възел',
} as const

/**
 * Grammatical gender of each planet's Bulgarian name, for adjective/pronoun
 * agreement in composed sentences (e.g. "твоя натален" must become
 * "твоето натално Слънце" / "твоята натална Луна"). "Северен възел" agrees
 * as masculine — "възел" is the head noun.
 */
export const PLANETS_BG_GENDER: Record<Planet, 'masc' | 'fem' | 'neut'> = {
  sun: 'neut',
  moon: 'fem',
  mercury: 'masc',
  venus: 'fem',
  mars: 'masc',
  jupiter: 'masc',
  saturn: 'masc',
  uranus: 'masc',
  neptune: 'masc',
  pluto: 'masc',
  northNode: 'masc',
} as const

/**
 * Planet glyphs (Unicode).
 *
 * Canonical single source of truth — any display surface wanting a
 * character glyph must import from here. The `Record<Planet, string>`
 * typing forces completeness: a new entry in the Planet union will
 * fail to compile here until its glyph is added, preventing the
 * silent-fallback drift that caused northNode to render as raw
 * "northNode" on the chart Аспекти / Детайли surfaces.
 */
export const PLANET_GLYPHS: Record<Planet, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  northNode: '☊',
} as const

/**
 * Zodiac sign glyphs (Unicode).
 *
 * Mobile uses these for system-font rendering of zodiac symbols on the
 * natal wheel; web has its own custom SVG line-art via `<GlyphDefs />`
 * but can fall back to these if the SVG path bundle is too heavy. Both
 * surfaces share the same source-of-truth via this Record.
 */
export const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpio: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓',
} as const

/**
 * Ordered list of planets for calculation
 */
export const PLANETS_ORDER: Planet[] = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'northNode',
]

/**
 * Swiss Ephemeris planet IDs
 * These map to sweph.SE_* constants
 */
export const PLANET_IDS: Record<Planet, number> = {
  sun: 0, // SE_SUN
  moon: 1, // SE_MOON
  mercury: 2, // SE_MERCURY
  venus: 3, // SE_VENUS
  mars: 4, // SE_MARS
  jupiter: 5, // SE_JUPITER
  saturn: 6, // SE_SATURN
  uranus: 7, // SE_URANUS
  neptune: 8, // SE_NEPTUNE
  pluto: 9, // SE_PLUTO
  // Mean Node per §9.1 precision-floor decision
  // (see .planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md)
  // True Node (id 11) under Moshier has ~70″ deviation from JPL; Mean Node (id 10)
  // has <20″ worst-case across full Moshier range, <5″ at modern dates.
  northNode: 10, // SE_MEAN_NODE
} as const

/**
 * Aspects in Bulgarian
 */
export const ASPECTS_BG: Record<AspectType, string> = {
  conjunction: 'Съединение',
  sextile: 'Секстил',
  square: 'Квадрат',
  trine: 'Тригон',
  opposition: 'Опозиция',
} as const

/**
 * Grammatical gender of each aspect's Bulgarian name, for adjective
 * agreement (e.g. "точен" must become "точна опозиция" / "точно съединение").
 */
export const ASPECTS_BG_GENDER: Record<AspectType, 'masc' | 'fem' | 'neut'> = {
  conjunction: 'neut',
  sextile: 'masc',
  square: 'masc',
  trine: 'masc',
  opposition: 'fem',
} as const

/**
 * Aspect definitions with angle and orb tolerance
 */
export interface AspectDefinition {
  name: AspectType
  angle: number
  orb: number
}

/**
 * Standard aspect definitions
 * Orbs are typical Western astrology values
 */
export const ASPECT_DEFINITIONS: AspectDefinition[] = [
  { name: 'conjunction', angle: 0, orb: 8 },
  { name: 'sextile', angle: 60, orb: 5 },
  { name: 'square', angle: 90, orb: 7 },
  { name: 'trine', angle: 120, orb: 7 },
  { name: 'opposition', angle: 180, orb: 8 },
]

/**
 * House system code for Placidus
 * Most common in Western/Bulgarian astrology
 */
export const HOUSE_SYSTEM_PLACIDUS = 'P'

/**
 * Default time when birth time is unknown and no approximate range was
 * given (noon). Astrological convention to minimize maximum error.
 */
export const DEFAULT_UNKNOWN_TIME = '12:00'

/**
 * Midpoint local time for each approximate birth-time range. Used when the
 * exact time is unknown but the user picked a window — a 3-hour-max error
 * beats the up-to-9-hour error of always assuming noon, and in particular
 * keeps the Moon (and often the Ascendant) in the right sign far more
 * often. Keys match `approximateTimeRanges` in
 * `packages/core/src/charts/schemas.ts`:
 *   morning   06:00-12:00 -> 09:00
 *   afternoon 12:00-18:00 -> 15:00
 *   evening   18:00-24:00 -> 21:00
 *   night     00:00-06:00 -> 03:00
 * The angles and houses are still approximate — the "unknown time"
 * disclaimer continues to apply — but the estimate is now materially
 * narrower than a blind noon.
 */
export const APPROX_TIME_RANGE_MIDPOINT: Record<string, string> = {
  morning: '09:00',
  afternoon: '15:00',
  evening: '21:00',
  night: '03:00',
}

/**
 * Bulgarian disclaimer for unknown birth time
 */
export const UNKNOWN_TIME_DISCLAIMER_BG =
  'Часът на раждане е неизвестен. Възходящият знак и домовете са приблизителни.'
