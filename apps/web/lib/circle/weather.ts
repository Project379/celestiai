import {
  ASPECTS_BG,
  PLANETS_BG,
  calculateDailyTransits,
  calculateTransitAspects,
  type AspectType,
  type ChartData,
} from '@stellaeum/astrology'
import type { CompositeChartData } from '@stellaeum/core/relationships/types'
import type {
  RelationshipWeatherDay,
  RelationshipWeatherOverview,
  RelationshipWeatherSignal,
} from './types'

const PLANET_WEIGHTS: Record<string, number> = {
  sun: 1.15,
  moon: 1.15,
  mercury: 0.95,
  venus: 1.2,
  mars: 1.1,
  jupiter: 1.1,
  saturn: 1.1,
  uranus: 1,
  neptune: 1,
  pluto: 1.05,
  northNode: 0.85,
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat('bg-BG', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'UTC',
  }).format(date)
}

function formatPlanet(planet: string): string {
  return PLANETS_BG[planet as keyof typeof PLANETS_BG] ?? planet
}

function formatAspect(aspect: string): string {
  return ASPECTS_BG[aspect as AspectType] ?? aspect
}

function toneForAspect(aspect: string, transitPlanet: string): RelationshipWeatherSignal['tone'] {
  if (aspect === 'trine' || aspect === 'sextile') return 'supportive'
  if (aspect === 'square' || aspect === 'opposition') return 'challenging'
  if (aspect === 'conjunction') {
    if (['venus', 'jupiter', 'sun', 'moon'].includes(transitPlanet)) return 'supportive'
    if (['mars', 'saturn', 'pluto'].includes(transitPlanet)) return 'challenging'
  }
  return 'mixed'
}

function scoreSignal(orb: number, transitPlanet: string, compositePlanet: string): number {
  const orbWeight = Math.max(0, 1 - orb / 4.2)
  const transitWeight = PLANET_WEIGHTS[transitPlanet] ?? 1
  const compositeWeight = PLANET_WEIGHTS[compositePlanet] ?? 1
  return Number((orbWeight * transitWeight * compositeWeight * 100).toFixed(1))
}

function buildSignalSummary(
  tone: RelationshipWeatherSignal['tone'],
  transitPlanet: string,
  compositePlanet: string,
  aspect: string,
  applying: boolean,
): string {
  const transit = formatPlanet(transitPlanet)
  const composite = formatPlanet(compositePlanet)
  const aspectLabel = formatAspect(aspect).toLowerCase()
  const phase = applying ? 'се усилва' : 'вече се разгръща'

  if (tone === 'supportive') {
    return `${transit} прави ${aspectLabel} с композитния ${composite.toLowerCase()} и темата ${phase} по-меко и по-свързано.`
  }

  if (tone === 'challenging') {
    return `${transit} прави ${aspectLabel} с композитния ${composite.toLowerCase()} и темата ${phase} с повече триене и реактивност.`
  }

  return `${transit} прави ${aspectLabel} с композитния ${composite.toLowerCase()} и внася смесен, но важен акцент в общия ви ритъм.`
}

function buildDayHeadline(day: RelationshipWeatherDay): string {
  if (day.signals.length === 0) {
    return 'По-тих ден за връзката, подходящ за естествен ритъм без силен астрологичен натиск.'
  }

  const top = day.signals[0]
  if (day.tone === 'supportive') {
    return `${top.title} отваря по-мек прозорец за близост, синхрон и по-лесен контакт.`
  }

  if (day.tone === 'challenging') {
    return `${top.title} иска повече такт, защото натиска уязвима точка в общата ви динамика.`
  }

  return `${top.title} носи смесен заряд: има движение и искра, но и нужда да не четете прибързано намеренията си.`
}

function computeDayTone(signals: RelationshipWeatherSignal[]): RelationshipWeatherDay['tone'] {
  if (signals.length === 0) return 'quiet'

  let supportive = 0
  let challenging = 0

  for (const signal of signals) {
    if (signal.tone === 'supportive') supportive += signal.strength
    else if (signal.tone === 'challenging') challenging += signal.strength
    else {
      supportive += signal.strength * 0.5
      challenging += signal.strength * 0.5
    }
  }

  if (supportive > challenging * 1.2) return 'supportive'
  if (challenging > supportive * 1.2) return 'challenging'
  return 'mixed'
}

function buildOverviewSummary(
  tone: RelationshipWeatherOverview['tone'],
  topSignal: RelationshipWeatherSignal | null,
): string {
  if (!topSignal) {
    return 'Седмицата е по-спокойна и не се води от един доминиращ транзитен натиск.'
  }

  if (tone === 'supportive') {
    return `Седмицата е по-отворена за свързване. Най-силно се усеща ${topSignal.title.toLowerCase()}.`
  }

  if (tone === 'challenging') {
    return `Седмицата не е затворена, но иска повече внимание. Най-силно се усеща ${topSignal.title.toLowerCase()}.`
  }

  return `Седмицата е смесена: има и поток, и напрежение. Централният акцент идва от ${topSignal.title.toLowerCase()}.`
}

export function buildRelationshipWeatherOverview(
  compositeChartData: CompositeChartData,
  now: Date = new Date(),
): RelationshipWeatherOverview {
  const compositePlanets = compositeChartData.planets as ChartData['planets']
  const start = startOfUtcDay(now)
  const days: RelationshipWeatherDay[] = []

  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000)
    const transitData = calculateDailyTransits(date)
    const aspects = calculateTransitAspects(transitData, compositePlanets)

    const signals = aspects
      .map((aspect) => {
        const tone = toneForAspect(aspect.aspect, aspect.transitPlanet)
        const strength = scoreSignal(aspect.orb, aspect.transitPlanet, aspect.natalPlanet)
        const title = `${formatPlanet(aspect.transitPlanet)} ${formatAspect(aspect.aspect)} ${formatPlanet(aspect.natalPlanet)}`

        return {
          id: `${transitData.date}:${aspect.transitPlanet}:${aspect.aspect}:${aspect.natalPlanet}`,
          title,
          summary: buildSignalSummary(
            tone,
            aspect.transitPlanet,
            aspect.natalPlanet,
            aspect.aspect,
            aspect.applying,
          ),
          date: transitData.date,
          tone,
          strength,
          orb: Number(aspect.orb.toFixed(2)),
          applying: aspect.applying,
          transitPlanet: aspect.transitPlanet,
          compositePlanet: aspect.natalPlanet,
          aspect: aspect.aspect,
        } satisfies RelationshipWeatherSignal
      })
      .sort((left, right) => right.strength - left.strength)
      .slice(0, 4)

    const tone = computeDayTone(signals)

    days.push({
      date: transitData.date,
      label: formatDayLabel(date),
      headline: buildDayHeadline({
        date: transitData.date,
        label: formatDayLabel(date),
        tone,
        headline: '',
        signals,
      }),
      tone,
      signals,
    })
  }

  const allSignals = days
    .flatMap((day) => day.signals)
    .sort((left, right) => right.strength - left.strength)
  const topSignal = allSignals[0] ?? null

  let overviewTone: RelationshipWeatherOverview['tone'] = 'quiet'
  const toneCounts = days.reduce(
    (acc, day) => {
      acc[day.tone] += 1
      return acc
    },
    { supportive: 0, challenging: 0, mixed: 0, quiet: 0 },
  )

  if (toneCounts.supportive > Math.max(toneCounts.challenging, toneCounts.mixed)) {
    overviewTone = 'supportive'
  } else if (toneCounts.challenging > Math.max(toneCounts.supportive, toneCounts.mixed)) {
    overviewTone = 'challenging'
  } else if (toneCounts.mixed > 0 || topSignal) {
    overviewTone = 'mixed'
  }

  return {
    generatedAt: now.toISOString(),
    summary: buildOverviewSummary(overviewTone, topSignal),
    tone: overviewTone,
    topSignal,
    days,
  }
}
