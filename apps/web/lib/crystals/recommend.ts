/**
 * Crystal recommendation rules engine
 *
 * Pure function. Takes a moment in time, a natal chart, active transit
 * aspects and the catalog, and returns the set of recommendations that
 * should exist right now.
 *
 * Cadence stays deliberately sparse — roughly 2-3 recommendations per
 * lunar month plus the odd transit window. Dedup by `reasonCode` happens
 * in the DB layer (insertRecommendationIfNew).
 *
 * Triggers:
 *   - birthstone: once per chart, valid forever, from the natal Sun sign
 *   - lunar_phase: active during the new moon / full moon window (±3 days)
 *   - transit: outer-planet hard aspects to natal personal planets
 */

import type { LunarPhase } from '@/lib/moon-phase'
import type { PlanetPosition } from '@celestia/astrology'

export type CrystalTriggerType = 'birthstone' | 'lunar_phase' | 'transit'

export interface CrystalCatalogEntry {
  id: string
  slug: string
  nameEn: string
  nameBg: string | null
  planet: string | null
  zodiacSigns: string[]
  moonPhases: string[]
  rarity: string
}

export interface CrystalRecommendationDraft {
  crystalSlug: string
  triggerType: CrystalTriggerType
  reasonCode: string
  reasonTextEn: string
  reasonTextBg: string
  validFrom: Date
  validUntil: Date
}

interface TransitAspectLite {
  transitPlanet: string
  natalPlanet: string
  aspect: string
  orb: number
  applying: boolean
}

interface RecommendInput {
  now: Date
  lunarPhase: LunarPhase
  natalPlanets: PlanetPosition[]
  transitAspects: TransitAspectLite[]
  catalog: CrystalCatalogEntry[]
}

function pickBestMatch(
  catalog: CrystalCatalogEntry[],
  predicate: (c: CrystalCatalogEntry) => boolean,
  deterministicKey: string
): CrystalCatalogEntry | null {
  const matches = catalog.filter(predicate)
  if (matches.length === 0) return null

  const rarityWeight: Record<string, number> = {
    common: 4,
    uncommon: 3,
    rare: 2,
    legendary: 1,
  }

  matches.sort((a, b) => {
    const weightDiff =
      (rarityWeight[b.rarity] ?? 0) - (rarityWeight[a.rarity] ?? 0)
    if (weightDiff !== 0) return weightDiff
    return a.slug.localeCompare(b.slug)
  })

  const topWindow = matches.slice(0, Math.min(3, matches.length))
  const hash = simpleHash(deterministicKey)
  return topWindow[hash % topWindow.length]
}

function simpleHash(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function getSunSign(planets: PlanetPosition[]): string | null {
  const sun = planets.find((p) => p.planet === 'sun')
  return sun?.sign ?? null
}

function currentLunarEvent(
  phase: LunarPhase,
  now: Date
): { id: 'new' | 'full'; validFrom: Date; validUntil: Date } | null {
  const SYNODIC_MONTH = 29.530588853
  const MS_PER_DAY = 86_400_000

  const distToNew = Math.min(phase.phaseDay, SYNODIC_MONTH - phase.phaseDay)
  const distToFull = Math.abs(phase.phaseDay - SYNODIC_MONTH / 2)

  if (distToNew <= 3) {
    const offset =
      phase.phaseDay <= SYNODIC_MONTH / 2
        ? phase.phaseDay
        : phase.phaseDay - SYNODIC_MONTH
    const exact = new Date(now.getTime() - offset * MS_PER_DAY)
    return {
      id: 'new',
      validFrom: new Date(exact.getTime() - 3 * MS_PER_DAY),
      validUntil: new Date(exact.getTime() + 3 * MS_PER_DAY),
    }
  }

  if (distToFull <= 3) {
    const offset = phase.phaseDay - SYNODIC_MONTH / 2
    const exact = new Date(now.getTime() - offset * MS_PER_DAY)
    return {
      id: 'full',
      validFrom: new Date(exact.getTime() - 3 * MS_PER_DAY),
      validUntil: new Date(exact.getTime() + 3 * MS_PER_DAY),
    }
  }

  return null
}

function formatMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

const ZODIAC_BG: Record<string, string> = {
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
}

const TRANSIT_PLANET_BG: Record<string, string> = {
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
}

const NATAL_PLANET_BG: Record<string, string> = {
  sun: 'Слънцето ти',
  moon: 'Луната ти',
  mercury: 'Меркурий в картата ти',
  venus: 'Венера в картата ти',
  mars: 'Марс в картата ти',
}

const OUTER_PLANETS = new Set([
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
])

const PERSONAL_PLANETS = new Set([
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
])

const HARD_ASPECTS = new Set(['conjunction', 'square', 'opposition'])

export function recommendCrystals({
  now,
  lunarPhase,
  natalPlanets,
  transitAspects,
  catalog,
}: RecommendInput): CrystalRecommendationDraft[] {
  const drafts: CrystalRecommendationDraft[] = []

  // ——— 1. Birthstone (once per chart, valid forever) ———
  const sunSign = getSunSign(natalPlanets)
  if (sunSign) {
    const birthstone = pickBestMatch(
      catalog,
      (c) => c.zodiacSigns.includes(sunSign),
      `birthstone:${sunSign}`
    )
    if (birthstone) {
      const signBg = ZODIAC_BG[sunSign] ?? sunSign
      drafts.push({
        crystalSlug: birthstone.slug,
        triggerType: 'birthstone',
        reasonCode: `birthstone_${sunSign}`,
        reasonTextEn: `Your Sun sits in ${capitalize(sunSign)} and ${birthstone.nameBg ?? birthstone.nameEn} is its traditional guardian stone — a birthright crystal that stays with you regardless of phase or transit.`,
        reasonTextBg: `Слънцето ти е в ${signBg}, а ${birthstone.nameBg ?? birthstone.nameEn} е неговият пазител от най-старите текстове. Това е рожденият ти камък — остава с теб независимо от фазата и от това какво прави небето.`,
        validFrom: new Date('2000-01-01T00:00:00Z'),
        validUntil: new Date('2099-12-31T00:00:00Z'),
      })
    }
  }

  // ——— 2. Lunar phase trigger ———
  const event = currentLunarEvent(lunarPhase, now)
  if (event) {
    const phaseIdFilter = event.id
    const phaseCrystal = pickBestMatch(
      catalog,
      (c) => c.moonPhases.includes(phaseIdFilter),
      `lunar:${phaseIdFilter}:${formatMonthKey(event.validFrom)}${sunSign ?? ''}`
    )
    if (phaseCrystal) {
      const monthKey = formatMonthKey(event.validFrom)
      const labelEn = event.id === 'new' ? 'new moon' : 'full moon'
      const labelBg = event.id === 'new' ? 'новолунието' : 'пълнолунието'
      drafts.push({
        crystalSlug: phaseCrystal.slug,
        triggerType: 'lunar_phase',
        reasonCode: `${event.id}_moon_${monthKey}`,
        reasonTextEn: `The ${labelEn} has opened a window. ${phaseCrystal.nameBg ?? phaseCrystal.nameEn} amplifies this phase.`,
        reasonTextBg: `${capitalize(labelBg)} отвори своя прозорец. ${phaseCrystal.nameBg ?? phaseCrystal.nameEn} усилва тази фаза и ти помага да я изживееш докрай.`,
        validFrom: event.validFrom,
        validUntil: event.validUntil,
      })
    }
  }

  // ——— 3. Transit trigger ———
  // Outer-planet hard aspect to a personal natal planet = a meaningful
  // shift. Pick the tightest such aspect, map the transit planet to its
  // crystal. One per month to stay sparse.
  const monthKey = formatMonthKey(now)
  const hardTransits = transitAspects
    .filter(
      (t) =>
        OUTER_PLANETS.has(t.transitPlanet) &&
        PERSONAL_PLANETS.has(t.natalPlanet) &&
        HARD_ASPECTS.has(t.aspect)
    )
    .sort((a, b) => a.orb - b.orb)

  const tightestTransit = hardTransits[0]
  if (tightestTransit) {
    const transitCrystal = pickBestMatch(
      catalog,
      (c) => c.planet === tightestTransit.transitPlanet,
      `transit:${tightestTransit.transitPlanet}:${monthKey}`
    )
    if (transitCrystal) {
      const planetBg =
        TRANSIT_PLANET_BG[tightestTransit.transitPlanet] ??
        tightestTransit.transitPlanet
      const natalBg =
        NATAL_PLANET_BG[tightestTransit.natalPlanet] ??
        tightestTransit.natalPlanet
      const validUntil = new Date(now.getTime() + 14 * 86_400_000)
      drafts.push({
        crystalSlug: transitCrystal.slug,
        triggerType: 'transit',
        reasonCode: `transit_${tightestTransit.transitPlanet}_${tightestTransit.natalPlanet}_${monthKey}`,
        reasonTextEn: `${capitalize(tightestTransit.transitPlanet)} is pressing on your natal ${capitalize(tightestTransit.natalPlanet)} right now. ${transitCrystal.nameBg ?? transitCrystal.nameEn} holds that pressure in something you can carry in your hand.`,
        reasonTextBg: `${planetBg} в момента натиска ${natalBg} — усещаш го, дори когато не можеш да го назовеш. ${transitCrystal.nameBg ?? transitCrystal.nameEn} събира тази сила в нещо, което можеш да носиш.`,
        validFrom: now,
        validUntil,
      })
    }
  }

  return drafts
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
