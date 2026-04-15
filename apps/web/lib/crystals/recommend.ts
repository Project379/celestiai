/**
 * Crystal recommendation rules engine
 *
 * Pure function. Takes a moment in time, a natal chart, and the catalog,
 * and returns the set of recommendations that should exist right now.
 *
 * Cadence is deliberately sparse — roughly 2-3 recommendations per lunar
 * month. Deduplication against existing recommendations happens at the DB
 * layer via the unique index on (user_id, reason_code, valid_from).
 *
 * v1 triggers:
 *   - birthstone: once per chart, valid forever, based on the natal Sun sign
 *   - new_moon: active during the new moon window (±3 days)
 *   - full_moon: active during the full moon window (±3 days)
 *
 * Future triggers (framework in place, not generated yet):
 *   - transit: major outer-planet transits to natal personal planets
 */

import type { LunarPhase } from '@/lib/moon-phase'
import type { PlanetPosition } from '@celestia/astrology'

export type CrystalTriggerType = 'birthstone' | 'lunar_phase' | 'transit'

export interface CrystalCatalogEntry {
  id: string
  slug: string
  nameEn: string
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
  validFrom: Date
  validUntil: Date
}

interface RecommendInput {
  now: Date
  lunarPhase: LunarPhase
  natalPlanets: PlanetPosition[]
  catalog: CrystalCatalogEntry[]
}

/**
 * Pick a crystal from the catalog matching a predicate. Prefers common
 * stones over rare ones so the rarity tail stays special.
 */
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

  // Deterministic pick across the top candidates so two users on the same
  // day with the same trigger don't always get the exact same stone.
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

/**
 * Find the nearest calendar instant for a major lunar event. The phase
 * module already tracks `nextMajor.daysAway`; we derive the current major
 * event (if within ±3 days) from the phase id itself.
 */
function currentLunarEvent(
  phase: LunarPhase
): { id: 'new' | 'full'; validFrom: Date; validUntil: Date } | null {
  // Recommendation-eligible events — new moon and full moon only for v1
  // (2 per cycle guarantees the 2/month cadence).
  const eligible = new Set(['new', 'full'])
  if (!eligible.has(phase.id)) return null

  // ±3 day window around the exact event. Using phaseDay we can derive
  // the window without another Swiss-ephemeris call.
  const SYNODIC_MONTH = 29.530588853
  const daysSinceNew = phase.phaseDay
  const daysToNew = SYNODIC_MONTH - phase.phaseDay
  const daysFromFull = Math.abs(phase.phaseDay - SYNODIC_MONTH / 2)

  const now = new Date()
  const MS_PER_DAY = 86_400_000

  if (phase.id === 'new') {
    const offsetDays = Math.min(daysSinceNew, daysToNew)
    const exact = new Date(now.getTime() - offsetDays * MS_PER_DAY)
    return {
      id: 'new',
      validFrom: new Date(exact.getTime() - 3 * MS_PER_DAY),
      validUntil: new Date(exact.getTime() + 3 * MS_PER_DAY),
    }
  }

  // full
  const exact = new Date(now.getTime() - daysFromFull * MS_PER_DAY)
  return {
    id: 'full',
    validFrom: new Date(exact.getTime() - 3 * MS_PER_DAY),
    validUntil: new Date(exact.getTime() + 3 * MS_PER_DAY),
  }
}

function formatMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function recommendCrystals({
  now,
  lunarPhase,
  natalPlanets,
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
      drafts.push({
        crystalSlug: birthstone.slug,
        triggerType: 'birthstone',
        reasonCode: `birthstone_${sunSign}`,
        reasonTextEn: `Your Sun sits in ${capitalize(sunSign)}, and ${birthstone.nameEn} is its traditional guardian stone — a birthright crystal that supports you regardless of phase or transit.`,
        validFrom: now,
        validUntil: new Date('2099-12-31T00:00:00Z'),
      })
    }
  }

  // ——— 2. Lunar phase trigger (new moon / full moon, ±3 days) ———
  const event = currentLunarEvent(lunarPhase)
  if (event) {
    const phaseIdFilter = event.id // 'new' | 'full'
    const phaseCrystal = pickBestMatch(
      catalog,
      (c) => c.moonPhases.includes(phaseIdFilter),
      `lunar:${phaseIdFilter}:${formatMonthKey(event.validFrom)}${sunSign ?? ''}`
    )
    if (phaseCrystal) {
      const monthKey = formatMonthKey(event.validFrom)
      const label = event.id === 'new' ? 'new moon' : 'full moon'
      drafts.push({
        crystalSlug: phaseCrystal.slug,
        triggerType: 'lunar_phase',
        reasonCode: `${event.id}_moon_${monthKey}`,
        reasonTextEn: `The ${label} has opened a window. ${phaseCrystal.nameEn} amplifies this phase — collect it while the window is open.`,
        validFrom: event.validFrom,
        validUntil: event.validUntil,
      })
    }
  }

  // ——— 3. Transit triggers — v1 stub, returns nothing ———
  // Framework for future expansion: iterate over active outer-planet
  // transits with hard aspects to natal personal planets, map the
  // transiting planet to its crystal, cap at 1 per month.

  return drafts
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
