import * as sweph from 'sweph'
import {
  ASPECTS_BG,
  PLANET_IDS,
  PLANETS_BG,
  PLANETS_ORDER,
  ZODIAC_SIGNS_BG,
  getJulianDay,
  getZodiacSign,
  longitudeToSignDegree,
} from '@celestia/astrology'
import type {
  AspectType,
  HouseData,
  Planet,
  PlanetPosition,
  ZodiacSign,
} from '@celestia/astrology/client'
import type { TransitAspect } from '@celestia/astrology'

type TimedTransitPlanet = Omit<PlanetPosition, 'house'> & { house: number }

interface NatalCalculationData {
  planet_positions: PlanetPosition[]
  house_cusps?: HouseData[]
  birth_time_known?: boolean
}

interface AspectDefinition {
  name: AspectType
  angle: number
  orbInner: number
  orbOuter: number
}

export interface ActiveTransitDetail extends TransitAspect {
  id: string
  house: number
  speedBand: 'fast' | 'slow'
  title: string
  summary: string
  detail: string
}

export interface UpcomingTransitDetail {
  id: string
  transitPlanet: Planet
  natalPlanet: Planet
  aspect: AspectType
  exactAt: string
  hoursUntil: number
  currentOrb: number
  house: number
  speedBand: 'fast' | 'slow'
  title: string
  summary: string
  detail: string
}

export interface LunarEventDetail {
  id: string
  type: 'new_moon' | 'full_moon'
  exactAt: string
  sign: ZodiacSign
  signDegree: number
  house: number
  aspects: Array<{
    natalPlanet: Planet
    aspect: AspectType
    orb: number
  }>
  title: string
  summary: string
  detail: string
}

export interface TransitOverview {
  generatedAt: string
  birthTimeKnown: boolean
  activeTransits: ActiveTransitDetail[]
  upcomingExacts: UpcomingTransitDetail[]
  lunarEvents: LunarEventDetail[]
  pacing: {
    emphasis: 'fast' | 'slow' | 'mixed' | 'quiet'
    fastCount: number
    slowCount: number
  }
}

const FAST_PLANETS = new Set<Planet>(['sun', 'moon', 'mercury', 'venus', 'mars'])
const OUTER_PLANETS = new Set<Planet>([
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'northNode',
])

const TRANSIT_ASPECT_DEFINITIONS: AspectDefinition[] = [
  { name: 'conjunction', angle: 0, orbInner: 3, orbOuter: 4 },
  { name: 'sextile', angle: 60, orbInner: 2, orbOuter: 3 },
  { name: 'square', angle: 90, orbInner: 2.5, orbOuter: 3.5 },
  { name: 'trine', angle: 120, orbInner: 2.5, orbOuter: 3.5 },
  { name: 'opposition', angle: 180, orbInner: 3, orbOuter: 4 },
]

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360
}

function shortestAngle(lon1: number, lon2: number): number {
  let diff = Math.abs(normalizeLongitude(lon1) - normalizeLongitude(lon2))
  if (diff > 180) diff = 360 - diff
  return diff
}

function signedPhaseDifference(angle: number, target: number): number {
  return ((angle - target + 540) % 360) - 180
}

function getHouseForLongitude(longitude: number, houses: HouseData[]): number {
  const normalizedLon = normalizeLongitude(longitude)

  for (let i = 0; i < 12; i++) {
    const currentCusp = normalizeLongitude(houses[i].cuspLongitude)
    const nextCusp = normalizeLongitude(houses[(i + 1) % 12].cuspLongitude)

    if (nextCusp < currentCusp) {
      if (normalizedLon >= currentCusp || normalizedLon < nextCusp) {
        return houses[i].number
      }
    } else if (normalizedLon >= currentCusp && normalizedLon < nextCusp) {
      return houses[i].number
    }
  }

  return 1
}

function calculateTransitsAt(date: Date, houses: HouseData[]): TimedTransitPlanet[] {
  const time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(
    date.getUTCMinutes()
  ).padStart(2, '0')}`
  const jd = getJulianDay(date, time)
  const flags = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED

  return PLANETS_ORDER.map((planet) => {
    const result = sweph.calc_ut(jd, PLANET_IDS[planet], flags)
    const longitude = result.data[0]
    const latitude = result.data[1]
    const speed = result.data[3]

    return {
      planet,
      longitude,
      latitude,
      speed,
      sign: getZodiacSign(longitude),
      signDegree: longitudeToSignDegree(longitude),
      house: getHouseForLongitude(longitude, houses),
    }
  })
}

function calculateActiveTransitDetails(
  transitPlanets: TimedTransitPlanet[],
  natalPlanets: PlanetPosition[]
): ActiveTransitDetail[] {
  const aspects: ActiveTransitDetail[] = []

  for (const transitPlanet of transitPlanets) {
    const isSlow = OUTER_PLANETS.has(transitPlanet.planet as Planet)

    for (const natalPlanet of natalPlanets) {
      const angle = shortestAngle(transitPlanet.longitude, natalPlanet.longitude)

      for (const aspectDef of TRANSIT_ASPECT_DEFINITIONS) {
        const orb = Math.abs(angle - aspectDef.angle)
        const maxOrb = isSlow ? aspectDef.orbOuter : aspectDef.orbInner

        if (orb <= maxOrb) {
          const futureLon = transitPlanet.longitude + transitPlanet.speed
          const futureAngle = shortestAngle(futureLon, natalPlanet.longitude)
          const futureOrb = Math.abs(futureAngle - aspectDef.angle)

          aspects.push({
            id: `active-${transitPlanet.planet}-${aspectDef.name}-${natalPlanet.planet}`,
            transitPlanet: transitPlanet.planet,
            natalPlanet: natalPlanet.planet as Planet,
            aspect: aspectDef.name,
            orb,
            applying: futureOrb < orb,
            house: transitPlanet.house,
            speedBand: FAST_PLANETS.has(transitPlanet.planet as Planet) ? 'fast' : 'slow',
            title: '',
            summary: '',
            detail: '',
          })
          break
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb)
}

function getAspectDefinition(
  planet: Planet,
  aspect: AspectType
): AspectDefinition | undefined {
  const definition = TRANSIT_ASPECT_DEFINITIONS.find((item) => item.name === aspect)
  if (!definition) return undefined
  return definition
}

function getOrbForAspect(
  transitPlanet: TimedTransitPlanet,
  natalPlanet: PlanetPosition,
  aspect: AspectType
): number {
  const definition = getAspectDefinition(transitPlanet.planet as Planet, aspect)
  if (!definition) return Number.POSITIVE_INFINITY

  const angle = shortestAngle(transitPlanet.longitude, natalPlanet.longitude)
  return Math.abs(angle - definition.angle)
}

function refineExactTime(
  start: Date,
  end: Date,
  transitPlanetName: Planet,
  natalPlanet: PlanetPosition,
  aspect: AspectType,
  houses: HouseData[]
): { exactAt: Date; orb: number; house: number } {
  let left = start.getTime()
  let right = end.getTime()

  for (let i = 0; i < 18; i++) {
    const leftThird = new Date(left + (right - left) / 3)
    const rightThird = new Date(right - (right - left) / 3)
    const leftTransit = calculateTransitsAt(leftThird, houses).find(
      (planet) => planet.planet === transitPlanetName
    )!
    const rightTransit = calculateTransitsAt(rightThird, houses).find(
      (planet) => planet.planet === transitPlanetName
    )!

    const leftOrb = getOrbForAspect(leftTransit, natalPlanet, aspect)
    const rightOrb = getOrbForAspect(rightTransit, natalPlanet, aspect)

    if (leftOrb <= rightOrb) {
      right = rightThird.getTime()
    } else {
      left = leftThird.getTime()
    }
  }

  const exactAt = new Date((left + right) / 2)
  const transit = calculateTransitsAt(exactAt, houses).find(
    (planet) => planet.planet === transitPlanetName
  )!

  return {
    exactAt,
    orb: getOrbForAspect(transit, natalPlanet, aspect),
    house: transit.house,
  }
}

function calculateUpcomingExacts(
  now: Date,
  houses: HouseData[],
  natalPlanets: PlanetPosition[],
  currentTransits: TimedTransitPlanet[]
): UpcomingTransitDetail[] {
  const sampleHours = 6
  const daysAhead = 7
  const sampleDates: Date[] = []

  for (let hour = 0; hour <= daysAhead * 24; hour += sampleHours) {
    sampleDates.push(new Date(now.getTime() + hour * 60 * 60 * 1000))
  }

  const snapshots = sampleDates.map((date) => ({
    date,
    planets: calculateTransitsAt(date, houses),
  }))

  const upcoming: UpcomingTransitDetail[] = []

  for (const transitPlanetName of PLANETS_ORDER) {
    for (const natalPlanet of natalPlanets) {
      for (const aspectDef of TRANSIT_ASPECT_DEFINITIONS) {
        const series = snapshots.map((snapshot) => {
          const transitPlanet = snapshot.planets.find(
            (planet) => planet.planet === transitPlanetName
          )!
          return {
            date: snapshot.date,
            planet: transitPlanet,
            orb: getOrbForAspect(transitPlanet, natalPlanet, aspectDef.name),
          }
        })

        for (let i = 1; i < series.length - 1; i++) {
          const prev = series[i - 1]
          const current = series[i]
          const next = series[i + 1]
          const maxOrb = OUTER_PLANETS.has(transitPlanetName)
            ? aspectDef.orbOuter
            : aspectDef.orbInner

          if (
            current.orb <= maxOrb &&
            current.orb <= prev.orb &&
            current.orb <= next.orb
          ) {
            const refined = refineExactTime(
              prev.date,
              next.date,
              transitPlanetName,
              natalPlanet,
              aspectDef.name,
              houses
            )

            if (refined.exactAt <= now || refined.orb > maxOrb) {
              continue
            }

            const currentTransit = currentTransits.find(
              (planet) => planet.planet === transitPlanetName
            )!

            upcoming.push({
              id: `upcoming-${transitPlanetName}-${aspectDef.name}-${natalPlanet.planet}-${refined.exactAt.getTime()}`,
              transitPlanet: transitPlanetName,
              natalPlanet: natalPlanet.planet as Planet,
              aspect: aspectDef.name,
              exactAt: refined.exactAt.toISOString(),
              hoursUntil: Math.round((refined.exactAt.getTime() - now.getTime()) / 36e5),
              currentOrb: getOrbForAspect(currentTransit, natalPlanet, aspectDef.name),
              house: refined.house,
              speedBand: FAST_PLANETS.has(transitPlanetName) ? 'fast' : 'slow',
              title: '',
              summary: '',
              detail: '',
            })
            break
          }
        }
      }
    }
  }

  const unique = new Map<string, UpcomingTransitDetail>()

  for (const item of upcoming) {
    const key = `${item.transitPlanet}:${item.natalPlanet}:${item.aspect}`
    const existing = unique.get(key)
    if (!existing || new Date(item.exactAt) < new Date(existing.exactAt)) {
      unique.set(key, item)
    }
  }

  return [...unique.values()]
    .sort((a, b) => new Date(a.exactAt).getTime() - new Date(b.exactAt).getTime())
    .slice(0, 6)
}

function findPhaseEvent(
  start: Date,
  targetAngle: 0 | 180,
  houses: HouseData[]
): LunarEventDetail | null {
  const end = new Date(start.getTime() + 32 * 24 * 60 * 60 * 1000)
  let previousDate = start
  let previousError: number | null = null

  for (
    let timestamp = start.getTime();
    timestamp <= end.getTime();
    timestamp += 60 * 60 * 1000
  ) {
    const currentDate = new Date(timestamp)
    const planets = calculateTransitsAt(currentDate, houses)
    const sun = planets.find((planet) => planet.planet === 'sun')!
    const moon = planets.find((planet) => planet.planet === 'moon')!
    const angle = normalizeLongitude(moon.longitude - sun.longitude)
    const error = signedPhaseDifference(angle, targetAngle)

    if (previousError !== null && Math.sign(previousError) !== Math.sign(error)) {
      let left = previousDate.getTime()
      let right = currentDate.getTime()

      for (let i = 0; i < 24; i++) {
        const mid = new Date((left + right) / 2)
        const midPlanets = calculateTransitsAt(mid, houses)
        const midSun = midPlanets.find((planet) => planet.planet === 'sun')!
        const midMoon = midPlanets.find((planet) => planet.planet === 'moon')!
        const midAngle = normalizeLongitude(midMoon.longitude - midSun.longitude)
        const midError = signedPhaseDifference(midAngle, targetAngle)

        if (Math.sign(previousError) === Math.sign(midError)) {
          left = mid.getTime()
          previousError = midError
        } else {
          right = mid.getTime()
        }
      }

      const exactAt = new Date((left + right) / 2)
      const exactPlanets = calculateTransitsAt(exactAt, houses)
      const exactMoon = exactPlanets.find((planet) => planet.planet === 'moon')!

      return {
        id: `${targetAngle === 0 ? 'new-moon' : 'full-moon'}-${exactAt.getTime()}`,
        type: targetAngle === 0 ? 'new_moon' : 'full_moon',
        exactAt: exactAt.toISOString(),
        sign: exactMoon.sign as ZodiacSign,
        signDegree: exactMoon.signDegree,
        house: exactMoon.house,
        aspects: [],
        title: '',
        summary: '',
        detail: '',
      }
    }

    previousDate = currentDate
    previousError = error
  }

  return null
}

function attachLunarAspects(
  event: LunarEventDetail,
  natalPlanets: PlanetPosition[],
  houses: HouseData[]
): LunarEventDetail {
  const eventPlanets = calculateTransitsAt(new Date(event.exactAt), houses)
  const moon = eventPlanets.find((planet) => planet.planet === 'moon')!

  const aspects = natalPlanets
    .map((natalPlanet) => {
      const entries = TRANSIT_ASPECT_DEFINITIONS.map((definition) => ({
        natalPlanet: natalPlanet.planet as Planet,
        aspect: definition.name,
        orb: Math.abs(shortestAngle(moon.longitude, natalPlanet.longitude) - definition.angle),
      }))
      return entries.sort((a, b) => a.orb - b.orb)[0]
    })
    .filter((entry) => entry.orb <= 4)
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3)

  return {
    ...event,
    aspects,
  }
}

function calculateLunarEvents(
  now: Date,
  natalPlanets: PlanetPosition[],
  houses: HouseData[]
): LunarEventDetail[] {
  const events = [findPhaseEvent(now, 0, houses), findPhaseEvent(now, 180, houses)]
    .filter((value): value is LunarEventDetail => Boolean(value))
    .map((event) => attachLunarAspects(event, natalPlanets, houses))
    .sort((a, b) => new Date(a.exactAt).getTime() - new Date(b.exactAt).getTime())

  return events
}

export function buildTransitOverview(
  natalCalculation: NatalCalculationData,
  now: Date = new Date()
): TransitOverview {
  const houses = natalCalculation.house_cusps ?? []
  const natalPlanets = natalCalculation.planet_positions ?? []

  if (houses.length !== 12 || natalPlanets.length === 0) {
    return {
      generatedAt: now.toISOString(),
      birthTimeKnown: natalCalculation.birth_time_known !== false,
      activeTransits: [],
      upcomingExacts: [],
      lunarEvents: [],
      pacing: { emphasis: 'quiet', fastCount: 0, slowCount: 0 },
    }
  }

  const currentTransits = calculateTransitsAt(now, houses)
  const activeTransits = calculateActiveTransitDetails(currentTransits, natalPlanets).map(
    enrichActiveTransit
  )
  const upcomingExacts = calculateUpcomingExacts(
    now,
    houses,
    natalPlanets,
    currentTransits
  ).map(enrichUpcomingTransit)
  const lunarEvents = calculateLunarEvents(now, natalPlanets, houses).map(enrichLunarEvent)

  const fastCount = activeTransits.filter((item) => item.speedBand === 'fast').length
  const slowCount = activeTransits.filter((item) => item.speedBand === 'slow').length

  let emphasis: TransitOverview['pacing']['emphasis'] = 'quiet'
  if (fastCount > 0 || slowCount > 0) {
    if (fastCount >= slowCount * 2) emphasis = 'fast'
    else if (slowCount >= fastCount * 2) emphasis = 'slow'
    else emphasis = 'mixed'
  }

  return {
    generatedAt: now.toISOString(),
    birthTimeKnown: natalCalculation.birth_time_known !== false,
    activeTransits,
    upcomingExacts,
    lunarEvents,
    pacing: { emphasis, fastCount, slowCount },
  }
}

function formatPlanet(planet: Planet): string {
  return PLANETS_BG[planet] ?? planet
}

function formatAspect(aspect: AspectType): string {
  return ASPECTS_BG[aspect] ?? aspect
}

function formatSign(sign: ZodiacSign): string {
  return ZODIAC_SIGNS_BG[sign] ?? sign
}

function houseTheme(house: number): string {
  switch (house) {
    case 1:
      return 'личната ви посока и начинът, по който се заявявате'
    case 2:
      return 'ценностите, парите и чувството ви за стабилност'
    case 3:
      return 'комуникацията, ученето и ежедневните разговори'
    case 4:
      return 'дома, семейството и вътрешната сигурност'
    case 5:
      return 'любовта, творчеството и радостта от себеизразяване'
    case 6:
      return 'работния ритъм, навиците и грижата за тялото'
    case 7:
      return 'партньорствата и огледалните отношения'
    case 8:
      return 'дълбоките обвързвания, споделените ресурси и уязвимостта'
    case 9:
      return 'смисъла, знанието и по-широката перспектива'
    case 10:
      return 'кариерата, образа ви и посоката на амбицията'
    case 11:
      return 'приятелствата, общностите и бъдещите планове'
    case 12:
      return 'скритите процеси, почивката и вътрешното пренареждане'
    default:
      return 'важна житейска тема'
  }
}

function aspectMeaning(aspect: AspectType): string {
  switch (aspect) {
    case 'conjunction':
      return 'засилва темата директно и я прави трудно пренебрежима'
    case 'sextile':
      return 'отваря възможност, която работи най-добре, ако я използвате съзнателно'
    case 'square':
      return 'създава напрежение, което иска корекция, действие или честност'
    case 'trine':
      return 'пуска енергията по-леко и естествено, но иска да не я приемате за даденост'
    case 'opposition':
      return 'ви среща с контраст, обратна връзка и нужда от баланс'
  }
}

function speedMeaning(speedBand: 'fast' | 'slow'): string {
  return speedBand === 'fast'
    ? 'Това е по-бърз транзит и се усеща като моментен акцент в идните часове или дни.'
    : 'Това е по-бавен транзит и говори за по-дълбок процес, който не се изчерпва за един ден.'
}

function enrichActiveTransit(item: ActiveTransitDetail): ActiveTransitDetail {
  const transit = formatPlanet(item.transitPlanet as Planet)
  const natal = formatPlanet(item.natalPlanet as Planet)
  const aspect = formatAspect(item.aspect)
  const theme = houseTheme(item.house)
  const applyingText = item.applying
    ? 'Влиянието още се усилва.'
    : 'Пикът вече е минал, но темата още е активна.'

  return {
    ...item,
    title: `${transit} ${aspect} ${natal}`,
    summary: `${transit} активира ${theme}.`,
    detail: `${transit} прави ${aspect.toLowerCase()} с вашия натален ${natal.toLowerCase()}, което ${aspectMeaning(
      item.aspect
    )}. Това насочва вниманието към ${theme}. ${applyingText} ${speedMeaning(item.speedBand)}`,
  }
}

function enrichUpcomingTransit(item: UpcomingTransitDetail): UpcomingTransitDetail {
  const transit = formatPlanet(item.transitPlanet)
  const natal = formatPlanet(item.natalPlanet)
  const aspect = formatAspect(item.aspect)
  const theme = houseTheme(item.house)

  return {
    ...item,
    title: `${transit} ${aspect} ${natal}`,
    summary: `Наближава точен пик по теми като ${theme}.`,
    detail: `${transit} се движи към точен ${aspect.toLowerCase()} с вашия натален ${natal.toLowerCase()}. Това подсказва, че през следващите ${
      item.hoursUntil
    } часа ще се изостри тема, свързана с ${theme}. ${aspectMeaning(item.aspect)} ${speedMeaning(
      item.speedBand
    )}`,
  }
}

function enrichLunarEvent(item: LunarEventDetail): LunarEventDetail {
  const phase = item.type === 'new_moon' ? 'Новолуние' : 'Пълнолуние'
  const sign = formatSign(item.sign)
  const theme = houseTheme(item.house)
  const aspectsText =
    item.aspects.length > 0
      ? ` Събитието докосва и ${item.aspects
          .slice(0, 2)
          .map(
            (aspect) =>
              `${formatPlanet(aspect.natalPlanet)} чрез ${formatAspect(aspect.aspect).toLowerCase()}`
          )
          .join(' и ')}.`
      : ''

  return {
    ...item,
    title: `${phase} в ${sign}`,
    summary: `${phase} осветява ${theme}.`,
    detail: `${phase} в ${sign} активира ${theme}. ${
      item.type === 'new_moon'
        ? 'Това е момент за засяване на намерение и нова посока.'
        : 'Това е момент за кулминация, яснота и емоционално осъзнаване.'
    }${aspectsText}`,
  }
}

export function transitOverviewToPromptText(overview: TransitOverview): string {
  const lines: string[] = []

  lines.push('ДНЕВНА ТРАНЗИТНА ДИНАМИКА:')

  if (overview.activeTransits.length === 0) {
    lines.push('(Няма силни активни транзити в момента)')
  } else {
    for (const aspect of overview.activeTransits.slice(0, 8)) {
      lines.push(
        `Транзитен ${formatPlanet(aspect.transitPlanet as Planet)} ${formatAspect(
          aspect.aspect
        )} натален ${formatPlanet(aspect.natalPlanet as Planet)} в дом ${aspect.house} (орб ${aspect.orb.toFixed(1)}°, ${aspect.applying ? 'прилагащ' : 'раздалечаващ'}, ${aspect.speedBand === 'fast' ? 'бърз ритъм' : 'бавен ритъм'})`
      )
    }
  }

  lines.push('')
  lines.push('ПРЕДСТОЯЩИ ТОЧНИ ТРАНЗИТИ (7 ДНИ):')

  if (overview.upcomingExacts.length === 0) {
    lines.push('(Няма точни пикове през следващите 7 дни)')
  } else {
    for (const item of overview.upcomingExacts) {
      lines.push(
        `${formatPlanet(item.transitPlanet)} ${formatAspect(item.aspect)} ${formatPlanet(
          item.natalPlanet
        )} — пик около ${item.exactAt} в дом ${item.house} (след ~${item.hoursUntil} ч.)`
      )
    }
  }

  lines.push('')
  lines.push('ЛУННИ СЪБИТИЯ:')

  if (overview.lunarEvents.length === 0) {
    lines.push('(Няма открити близки новолуния или пълнолуния)')
  } else {
    for (const event of overview.lunarEvents) {
      const aspectsText =
        event.aspects.length > 0
          ? `; активира ${event.aspects
              .map(
                (aspect) =>
                  `${formatPlanet(aspect.natalPlanet)} чрез ${formatAspect(
                    aspect.aspect
                  )} (орб ${aspect.orb.toFixed(1)}°)`
              )
              .join(', ')}`
          : ''
      lines.push(
        `${event.type === 'new_moon' ? 'Новолуние' : 'Пълнолуние'} около ${
          event.exactAt
        } в ${formatSign(event.sign)} ${Math.floor(event.signDegree)}° в дом ${event.house}${aspectsText}`
      )
    }
  }

  lines.push('')
  lines.push(
    `ТЕМПО НА ПЕРИОДА: ${
      overview.pacing.emphasis === 'fast'
        ? 'доминират бързите транзити'
        : overview.pacing.emphasis === 'slow'
        ? 'доминират бавните дълбоки транзити'
        : overview.pacing.emphasis === 'mixed'
        ? 'има смес от бързи и бавни влияния'
        : 'денят е сравнително тих'
    }`
  )

  if (!overview.birthTimeKnown) {
    lines.push('(Часът на раждане е неизвестен — домовете и лунните домове са приблизителни.)')
  }

  return lines.join('\n')
}
