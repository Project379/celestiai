/**
 * Planet interpretation data for natal chart display
 *
 * Provides Bulgarian text for planet/sign combinations.
 * Phase 4 uses placeholder interpretations; Phase 5 adds AI-generated content.
 */

import type { Planet, ZodiacSign } from '@celestia/astrology/client'
import { PLANETS_BG, ZODIAC_SIGNS_BG } from '@celestia/astrology/client'

/**
 * Interpretation data for a planet in a sign
 */
export interface InterpretationData {
  /** Title: "Слънце в Лъв" */
  title: string
  /** Position: "15°23' Лъв, Дом 5" */
  position: string
  /** Brief trait: 5-10 words describing this placement */
  brief: string
  /** Placeholder text for full interpretation (coming in Phase 5) */
  placeholder: string
}

/**
 * Planet descriptions (generic, sign-agnostic)
 */
const PLANET_DESCRIPTIONS: Record<Planet, string> = {
  sun: 'Вашето Слънце показва вашата същност и жизнена сила.',
  moon: 'Вашата Луна отразява емоционалния ви свят.',
  mercury: 'Меркурий определя начина, по който мислите и общувате.',
  venus: 'Венера показва как обичате и какво цените.',
  mars: 'Марс разкрива как действате и се борите.',
  jupiter: 'Юпитер показва къде намирате растеж и късмет.',
  saturn: 'Сатурн учи чрез ограничения и отговорности.',
  uranus: 'Уран носи иновации и неочаквани промени.',
  neptune: 'Нептун управлява мечтите и духовността.',
  pluto: 'Плутон показва дълбоката трансформация.',
  northNode: 'Северният възел разкрива вашата кармична посока и духовен път на развитие.',
}

/**
 * Brief traits per sign in Bulgarian
 */
const SIGN_TRAITS: Record<ZodiacSign, string> = {
  aries: 'енергичен и предприемчив',
  taurus: 'стабилен и практичен',
  gemini: 'любопитен и адаптивен',
  cancer: 'емоционален и грижовен',
  leo: 'харизматичен и щедър',
  virgo: 'аналитичен и прецизен',
  libra: 'дипломатичен и хармоничен',
  scorpio: 'интензивен и проницателен',
  sagittarius: 'оптимистичен и свободолюбив',
  capricorn: 'амбициозен и дисциплиниран',
  aquarius: 'иновативен и хуманен',
  pisces: 'интуитивен и съпричастен',
}

/**
 * Placeholder message for full interpretation (coming in Phase 5)
 */
const PLACEHOLDER_MESSAGE =
  'Пълна интерпретация скоро... В следващото обновление ще получите персонализирано тълкуване, базирано на вашата уникална карта.'

/**
 * Get interpretation data for a planet in a sign
 *
 * @param planet - Planet key (e.g., 'sun', 'moon')
 * @param sign - Zodiac sign key (e.g., 'leo', 'aries')
 * @param degree - Optional degree position (0-29.99)
 * @param house - Optional house number (1-12)
 * @returns InterpretationData with Bulgarian text
 *
 * @example
 * ```typescript
 * const data = getPlanetInterpretation('sun', 'leo', 15.38, 5)
 * // Returns:
 * // {
 * //   title: "Слънце в Лъв",
 * //   position: "15°23' Лъв, Дом 5",
 * //   brief: "харизматичен и щедър",
 * //   placeholder: "Пълна интерпретация скоро..."
 * // }
 * ```
 */
export function getPlanetInterpretation(
  planet: string,
  sign: string,
  degree?: number,
  house?: number
): InterpretationData {
  const planetKey = planet.toLowerCase() as Planet
  const signKey = sign.toLowerCase() as ZodiacSign

  // Get Bulgarian names
  const planetName = PLANETS_BG[planetKey] || planet
  const signName = ZODIAC_SIGNS_BG[signKey] || sign

  // Format title: "Слънце в Лъв"
  const title = `${planetName} в ${signName}`

  // Format position: "15°23' Лъв, Дом 5"
  let position = signName
  if (degree !== undefined) {
    const degrees = Math.floor(degree)
    const minutes = Math.floor((degree - degrees) * 60)
    position = `${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}`
    if (house !== undefined) {
      position += `, Дом ${house}`
    }
  }

  // Get trait for this sign
  const brief = SIGN_TRAITS[signKey] || ''

  // Combine planet description with placeholder
  const planetDesc = PLANET_DESCRIPTIONS[planetKey] || ''
  const placeholder = `${planetDesc}\n\n${PLACEHOLDER_MESSAGE}`

  return {
    title,
    position,
    brief,
    placeholder,
  }
}

/**
 * Get interpretation for Ascendant (Rising sign)
 *
 * @param sign - Zodiac sign key
 * @param degree - Degree position
 * @param isApproximate - Whether birth time is unknown
 * @returns InterpretationData for Rising sign
 */
export function getRisingInterpretation(
  sign: string,
  degree?: number,
  isApproximate?: boolean
): InterpretationData {
  const signKey = sign.toLowerCase() as ZodiacSign
  const signName = ZODIAC_SIGNS_BG[signKey] || sign

  const title = isApproximate ? '~Възходящ знак' : 'Възходящ знак'

  let position = signName
  if (degree !== undefined) {
    const degrees = Math.floor(degree)
    const minutes = Math.floor((degree - degrees) * 60)
    position = `${degrees}°${minutes.toString().padStart(2, '0')}' ${signName}`
  }

  const brief = SIGN_TRAITS[signKey] || ''

  const risingDesc =
    'Възходящият знак определя как се представяте пред света и първото впечатление, което създавате.'
  const approximateNote = isApproximate
    ? '\n\nЗабележка: Без точен час на раждане възходящият знак е приблизителен.'
    : ''

  const placeholder = `${risingDesc}${approximateNote}\n\n${PLACEHOLDER_MESSAGE}`

  return {
    title,
    position,
    brief,
    placeholder,
  }
}
