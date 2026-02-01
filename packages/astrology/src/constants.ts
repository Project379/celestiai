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
} as const

/**
 * Aspects in Bulgarian
 */
export const ASPECTS_BG: Record<AspectType, string> = {
  conjunction: 'Съвпад',
  sextile: 'Секстил',
  square: 'Квадрат',
  trine: 'Тригон',
  opposition: 'Опозиция',
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
 * Default time when birth time is unknown (noon)
 * Astrological convention to minimize maximum error
 */
export const DEFAULT_UNKNOWN_TIME = '12:00'

/**
 * Bulgarian disclaimer for unknown birth time
 */
export const UNKNOWN_TIME_DISCLAIMER_BG =
  'Часът на раждане е неизвестен. Възходящият знак и домовете са приблизителни.'
