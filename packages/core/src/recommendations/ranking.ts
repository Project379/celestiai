import type { LunarPhaseId } from '../lib/moon-phase'
import type {
  RecommendationExplanation,
  RecommendationSlot,
} from './schemas'

export const RECOMMENDATION_TRAITS = [
  'wonder',
  'reflection',
  'comfort',
  'connection',
  'courage',
  'renewal',
  'curiosity',
  'playfulness',
  'intensity',
  'pace',
] as const

export type RecommendationTrait = (typeof RECOMMENDATION_TRAITS)[number]
export type RecommendationTraitVector = Partial<Record<RecommendationTrait, number>>

export interface RankableWork {
  id: string
  traits: Record<string, unknown>
  contentFlags: Record<string, unknown>
  metadataQuality: number
  tagline: string
  description: string
}

export interface TasteSignal {
  traits: Record<string, unknown>
  weight: number
}

export interface RankedWork<T extends RankableWork> {
  work: T
  score: number
  scoreDetail: {
    astrology: number
    taste: number
    quality: number
    exploration: number
    topTraits: RecommendationTrait[]
  }
}

const SIGN_TARGETS: Record<string, RecommendationTraitVector> = {
  Овен: { courage: 1, pace: 0.9, renewal: 0.8 },
  Телец: { comfort: 1, connection: 0.8, reflection: 0.65 },
  Близнаци: { curiosity: 1, playfulness: 0.9, pace: 0.75 },
  Рак: { comfort: 0.95, connection: 1, reflection: 0.8 },
  Лъв: { courage: 0.9, playfulness: 0.85, connection: 0.8 },
  Дева: { curiosity: 0.9, reflection: 0.9, pace: 0.55 },
  Везни: { connection: 1, comfort: 0.75, wonder: 0.7 },
  Скорпион: { reflection: 1, intensity: 0.75, courage: 0.75 },
  Стрелец: { curiosity: 0.95, wonder: 1, courage: 0.85 },
  Козирог: { courage: 0.9, reflection: 0.75, pace: 0.65 },
  Водолей: { curiosity: 1, wonder: 0.95, renewal: 0.9 },
  Риби: { wonder: 1, reflection: 0.95, connection: 0.8 },
}

const PHASE_TARGETS: Record<LunarPhaseId, RecommendationTraitVector> = {
  new: { renewal: 1, wonder: 0.85, reflection: 0.7 },
  waxing_crescent: { renewal: 0.95, courage: 0.8, pace: 0.65 },
  first_quarter: { courage: 1, pace: 0.85, curiosity: 0.65 },
  waxing_gibbous: { curiosity: 0.85, reflection: 0.75, pace: 0.6 },
  full: { connection: 0.95, wonder: 0.9, intensity: 0.65 },
  waning_gibbous: { reflection: 0.95, connection: 0.8, comfort: 0.75 },
  last_quarter: { reflection: 1, renewal: 0.7, courage: 0.55 },
  waning_crescent: { comfort: 1, reflection: 0.9, pace: 0.2, intensity: 0.15 },
}

const TRAIT_LABEL_BG: Record<RecommendationTrait, string> = {
  wonder: 'усещане за чудо',
  reflection: 'вътрешен размисъл',
  comfort: 'мекота и спокойствие',
  connection: 'човешка близост',
  courage: 'смелост за следващата крачка',
  renewal: 'ново начало',
  curiosity: 'любопитство',
  playfulness: 'лекота и игра',
  intensity: 'емоционална дълбочина',
  pace: 'жив ритъм',
}

function numericTrait(traits: Record<string, unknown>, key: RecommendationTrait): number {
  const value = traits[key]
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0.5
}

function mergeTargets(
  phase: LunarPhaseId,
  sunSign: string | null,
): RecommendationTraitVector {
  const phaseTarget = PHASE_TARGETS[phase]
  const signTarget = sunSign ? SIGN_TARGETS[sunSign] : undefined
  if (!signTarget) return { ...phaseTarget }

  const merged: RecommendationTraitVector = { ...phaseTarget }
  for (const trait of RECOMMENDATION_TRAITS) {
    const phaseValue = phaseTarget[trait]
    const signValue = signTarget[trait]
    if (phaseValue == null && signValue == null) continue
    if (phaseValue == null) merged[trait] = signValue
    else if (signValue == null) merged[trait] = phaseValue
    else merged[trait] = phaseValue * 0.6 + signValue * 0.4
  }
  return merged
}

function targetCompatibility(
  traits: Record<string, unknown>,
  target: RecommendationTraitVector,
): { score: number; topTraits: RecommendationTrait[] } {
  const contributions: Array<{ trait: RecommendationTrait; score: number }> = []
  for (const trait of RECOMMENDATION_TRAITS) {
    const targetValue = target[trait]
    if (targetValue == null) continue
    const score = 1 - Math.abs(numericTrait(traits, trait) - targetValue)
    contributions.push({ trait, score })
  }
  if (contributions.length === 0) return { score: 0.5, topTraits: [] }
  const score = contributions.reduce((sum, item) => sum + item.score, 0) / contributions.length
  return {
    score,
    topTraits: contributions
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.trait),
  }
}

export function buildTasteVector(signals: TasteSignal[]): RecommendationTraitVector | null {
  const sums: RecommendationTraitVector = {}
  const weights: RecommendationTraitVector = {}

  for (const signal of signals) {
    if (signal.weight === 0) continue
    for (const trait of RECOMMENDATION_TRAITS) {
      const value = numericTrait(signal.traits, trait)
      sums[trait] = (sums[trait] ?? 0) + (value - 0.5) * signal.weight
      weights[trait] = (weights[trait] ?? 0) + Math.abs(signal.weight)
    }
  }

  if (Object.keys(weights).length === 0) return null
  const result: RecommendationTraitVector = {}
  for (const trait of RECOMMENDATION_TRAITS) {
    const weight = weights[trait]
    if (!weight) continue
    // Negative signals invert the preference around the midpoint.
    const delta = (sums[trait] ?? 0) / weight
    result[trait] = Math.max(0, Math.min(1, 0.5 + delta))
  }
  return result
}

export function isSafeRecommendationWork(work: RankableWork): boolean {
  const flags = work.contentFlags
  if (flags.verified !== true) return false
  const explicit = Number(flags.explicit_sexual ?? 1)
  const graphicViolence = Number(flags.graphic_violence ?? 1)
  const grossOut = Number(flags.gross_out ?? 1)
  return explicit === 0 && graphicViolence === 0 && grossOut === 0
}

function stableUnit(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

export function rankRecommendationWorks<T extends RankableWork>(options: {
  works: T[]
  phase: LunarPhaseId
  sunSign: string | null
  taste: RecommendationTraitVector | null
  seed: string
  excludedWorkIds?: ReadonlySet<string>
}): Array<RankedWork<T>> {
  const astrologyTarget = mergeTargets(options.phase, options.sunSign)

  return options.works
    .filter((work) => !options.excludedWorkIds?.has(work.id))
    .filter(isSafeRecommendationWork)
    .map((work) => {
      const astrology = targetCompatibility(work.traits, astrologyTarget)
      const taste = options.taste
        ? targetCompatibility(work.traits, options.taste).score
        : 0.5
      const quality = Math.max(0, Math.min(1, work.metadataQuality / 100))
      const exploration = stableUnit(`${options.seed}:${work.id}`)
      return {
        work,
        score: astrology.score * 0.72 + taste * 0.18 + quality * 0.07 + exploration * 0.03,
        scoreDetail: {
          astrology: astrology.score,
          taste,
          quality,
          exploration,
          topTraits: astrology.topTraits,
        },
      }
    })
    .sort((a, b) => b.score - a.score || a.work.id.localeCompare(b.work.id))
}

export function buildRecommendationExplanation(options: {
  slot: RecommendationSlot
  phaseName: string
  sunSign: string | null
  topTraits: RecommendationTrait[]
  tagline: string
  description: string
}): RecommendationExplanation {
  const traitText = options.topTraits
    .slice(0, 2)
    .map((trait) => TRAIT_LABEL_BG[trait])
    .join(' и ')
  const skyContext = options.sunSign
    ? `${options.phaseName} и слънцето ти в ${options.sunSign}`
    : options.phaseName

  return {
    howItConnects: `${skyContext} насочват избора към ${traitText || 'история с подходящ емоционален ритъм'}. Астрологичният контекст е отправна точка, а реакциите ти постепенно настройват подбора.`,
    whyNow:
      options.slot === 'daily_movie'
        ? `Филмът е подбран за днешния ритъм на ${options.phaseName.toLowerCase()} и остава същият до края на деня.`
        : `Книгата е подбрана като по-дълга нишка за този месец — не е нужно да я четеш наведнъж.`,
    whatItGives: options.tagline || options.description,
  }
}
