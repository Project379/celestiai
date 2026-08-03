import {
  calculateAspects,
  calculateNatalChart,
  getZodiacSign,
  type ChartData,
  type PlanetPosition,
} from '@stellaeum/astrology'
import {
  buildCompositeChartData,
  calculateCompatibilitySummary,
  calculateCrossChartAspects,
  type CompatibilityDomainKey,
  type CompatibilitySummary,
  type CompositeChartData,
  type CrossChartAspect,
  type RelationshipType,
} from '@stellaeum/core'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import type { ChartRow } from '@/lib/types/chart'
import { buildRelationshipWeatherOverview } from './weather'
import type {
  CircleDashboardData,
  CircleSpaceView,
  ConnectionInviteRow,
  ConnectionMemberRow,
  ConnectionMemberView,
  ConnectionReportRow,
  ConnectionSpaceRow,
  RelationshipWeatherOverview,
  SavedProfileReportRow,
  SavedProfileRow,
} from './types'

type CalculationRow = {
  chart_id: string
  planet_positions: ChartData['planets']
  house_cusps: ChartData['houses']
  aspects: ChartData['aspects']
  ascendant: ChartData['ascendant']
  mc: ChartData['mc']
  birth_time_known: boolean
}

const DOMAIN_KEYS: CompatibilityDomainKey[] = [
  'emotional_resonance',
  'communication',
  'romance_attraction',
  'long_term_stability',
  'conflict_friction',
  'growth_expansion',
  'power_dynamics',
  'shared_values',
]

function asChartData(row: CalculationRow): ChartData {
  return {
    planets: row.planet_positions,
    houses: row.house_cusps,
    aspects: row.aspects,
    ascendant: row.ascendant,
    mc: row.mc,
    birthTimeKnown: row.birth_time_known,
  }
}

function circularMean(longitudes: number[]): number {
  const vector = longitudes.reduce(
    (acc, value) => {
      const radians = (value * Math.PI) / 180
      acc.x += Math.cos(radians)
      acc.y += Math.sin(radians)
      return acc
    },
    { x: 0, y: 0 },
  )

  const angle = (Math.atan2(vector.y, vector.x) * 180) / Math.PI
  return (angle + 360) % 360
}

function averagePlanet(planets: PlanetPosition[]): PlanetPosition {
  const longitude = circularMean(planets.map((planet) => planet.longitude))
  return {
    ...planets[0],
    longitude,
    latitude: planets.reduce((sum, planet) => sum + planet.latitude, 0) / planets.length,
    speed: planets.reduce((sum, planet) => sum + planet.speed, 0) / planets.length,
    sign: getZodiacSign(longitude),
    signDegree: longitude % 30,
    house: planets[0].house,
  }
}

function buildGroupCompositeChartData(charts: ChartData[]): CompositeChartData {
  const planets = charts[0].planets.map((planet) => {
    const samePlanet = charts
      .map((chart) => chart.planets.find((candidate) => candidate.planet === planet.planet))
      .filter((candidate): candidate is PlanetPosition => Boolean(candidate))
    return averagePlanet(samePlanet)
  })

  const allBirthTimesKnown = charts.every((chart) => chart.birthTimeKnown)
  const ascLongitude = allBirthTimesKnown
    ? circularMean(charts.map((chart) => chart.ascendant.longitude))
    : null
  const mcLongitude = allBirthTimesKnown
    ? circularMean(charts.map((chart) => chart.mc.longitude))
    : null

  return {
    planets,
    aspects: calculateAspects(planets),
    ascendant:
      ascLongitude === null
        ? null
        : {
            longitude: ascLongitude,
            sign: getZodiacSign(ascLongitude),
            degree: ascLongitude % 30,
          },
    mc:
      mcLongitude === null
        ? null
        : {
            longitude: mcLongitude,
            sign: getZodiacSign(mcLongitude),
            degree: mcLongitude % 30,
          },
    birthTimeKnown: allBirthTimesKnown,
  }
}

function buildDomainNarrative(key: CompatibilityDomainKey, score: number) {
  const labels: Record<CompatibilityDomainKey, string> = {
    emotional_resonance: 'Емоционалният тон',
    communication: 'Комуникацията',
    romance_attraction: 'Привличането',
    long_term_stability: 'Стабилността',
    conflict_friction: 'Триенето',
    growth_expansion: 'Растежът',
    power_dynamics: 'Силовата динамика',
    shared_values: 'Споделените ценности',
  }

  if (score >= 75) {
    return {
      headline: `${labels[key]} е естествена сила на това пространство.`,
      summary: `Тази тема се държи събрано и по-лесно носи синхрон между хората в групата.`,
    }
  }
  if (score <= 45) {
    return {
      headline: `${labels[key]} иска повече настройване между членовете.`,
      summary: `Тук групата вероятно има различни темпа, прагове или стилове на реакция, които искат по-ясни уговорки.`,
    }
  }
  return {
    headline: `${labels[key]} стои в работещ, но чувствителен баланс.`,
    summary: `Има материал за поток, но резултатът зависи от това колко съзнателно хората държат ритъма помежду си.`,
  }
}

function averageCompatibilitySummaries(
  summaries: CompatibilitySummary[],
  relationshipType: RelationshipType,
): CompatibilitySummary {
  const domains = Object.fromEntries(
    DOMAIN_KEYS.map((key) => {
      const scores = summaries.map((summary) => summary.domains[key].score)
      const avgScore = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      const avgModifier = Math.round(
        summaries.reduce((sum, summary) => sum + summary.domains[key].modifier, 0) / summaries.length,
      )
      const contributions = summaries
        .flatMap((summary) => summary.domains[key].contributing_aspects)
        .sort((left, right) => Math.abs(right.points) - Math.abs(left.points))
        .slice(0, 4)
      const narrative = buildDomainNarrative(key, avgScore)

      return [
        key,
        {
          score: avgScore,
          headline: narrative.headline,
          summary: narrative.summary,
          contributing_aspects: contributions,
          modifier: avgModifier,
        },
      ]
    }),
  ) as CompatibilitySummary['domains']

  const headlineScore = Math.round(
    summaries.reduce((sum, summary) => sum + summary.headline_score, 0) / summaries.length,
  )

  const strongestDomain = DOMAIN_KEYS.reduce(
    (best, current) => (domains[current].score > domains[best].score ? current : best),
    DOMAIN_KEYS[0],
  )

  const growthDomain = DOMAIN_KEYS.reduce(
    (worst, current) => (domains[current].score < domains[worst].score ? current : worst),
    DOMAIN_KEYS[0],
  )

  const notableAspects = Array.from(
    new Map(
      summaries
        .flatMap((summary) => summary.notable_aspects)
        .map((aspect) => [`${aspect.domain}:${aspect.description}`, aspect]),
    ).values(),
  )
    .sort((left, right) => {
      if (left.significance === right.significance) return 0
      return left.significance === 'high' ? -1 : 1
    })
    .slice(0, 6)

  return {
    headline_score: headlineScore,
    relationship_type: relationshipType,
    strongest_domain: strongestDomain,
    growth_domain: growthDomain,
    domains,
    notable_aspects: notableAspects,
  }
}

export async function getUserTier(userId: string): Promise<'free' | 'premium'> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('clerk_id', userId)
    .single()
  return data?.subscription_tier === 'premium' ? 'premium' : 'free'
}

export async function getLatestChartForUser(userId: string): Promise<Pick<ChartRow, 'id' | 'name'> | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('charts')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data ?? null
}

export async function getLatestChartRowForUser(userId: string): Promise<ChartRow | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ChartRow | null) ?? null
}

export async function getChartById(chartId: string): Promise<ChartRow | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase.from('charts').select('*').eq('id', chartId).maybeSingle()
  return (data as ChartRow | null) ?? null
}

export async function ensureChartCalculation(chart: ChartRow): Promise<ChartData> {
  const supabase = createServiceSupabaseClient()
  const { data: cached } = await supabase
    .from('chart_calculations')
    .select('*')
    .eq('chart_id', chart.id)
    .maybeSingle()

  if (cached) {
    return asChartData(cached as unknown as CalculationRow)
  }

  const computed = calculateNatalChart({
    date: new Date(chart.birth_date),
    time: chart.birth_time || null,
    lat: chart.latitude,
    lon: chart.longitude,
    birthTimeKnown: chart.birth_time_known,
  })

  await supabase.from('chart_calculations').upsert(
    {
      chart_id: chart.id,
      planet_positions: computed.planets,
      house_cusps: computed.houses,
      aspects: computed.aspects,
      ascendant: computed.ascendant,
      mc: computed.mc,
      birth_time_known: computed.birthTimeKnown,
    },
    { onConflict: 'chart_id' },
  )

  return computed
}

export async function buildSpaceComputation(
  charts: ChartRow[],
  relationshipType: RelationshipType = 'romantic',
): Promise<{
  compatibilitySummary: CompatibilitySummary
  synastryAspects: CrossChartAspect[]
  compositeChartData: CompositeChartData
}> {
  const calculations = await Promise.all(charts.map((chart) => ensureChartCalculation(chart)))

  if (calculations.length === 2) {
    return {
      compatibilitySummary: calculateCompatibilitySummary(
        calculations[0],
        calculations[1],
        relationshipType,
      ),
      synastryAspects: calculateCrossChartAspects(calculations[0], calculations[1]),
      compositeChartData: buildCompositeChartData(calculations[0], calculations[1]),
    }
  }

  const pairSummaries: CompatibilitySummary[] = []
  const pairAspects: CrossChartAspect[] = []

  for (let i = 0; i < calculations.length; i += 1) {
    for (let j = i + 1; j < calculations.length; j += 1) {
      pairSummaries.push(
        calculateCompatibilitySummary(calculations[i], calculations[j], relationshipType),
      )
      pairAspects.push(...calculateCrossChartAspects(calculations[i], calculations[j]).slice(0, 6))
    }
  }

  return {
    compatibilitySummary: averageCompatibilitySummaries(pairSummaries, relationshipType),
    synastryAspects: pairAspects.slice(0, 18),
    compositeChartData: buildGroupCompositeChartData(calculations),
  }
}

export async function buildSavedProfileComputation(
  userChart: ChartRow,
  savedProfile: SavedProfileRow,
  relationshipType: RelationshipType = 'romantic',
) {
  const userCalc = await ensureChartCalculation(userChart)
  const savedCalc = calculateNatalChart({
    date: new Date(savedProfile.birth_date),
    time: savedProfile.birth_time || null,
    lat: savedProfile.latitude,
    lon: savedProfile.longitude,
    birthTimeKnown: savedProfile.birth_time_known,
  })

  const compatibilitySummary = calculateCompatibilitySummary(
    userCalc,
    savedCalc,
    relationshipType,
  )
  const synastryAspects = calculateCrossChartAspects(userCalc, savedCalc)

  return {
    compatibilitySummary,
    synastryAspects,
  }
}

export async function listSavedProfilesForUser(userId: string): Promise<SavedProfileRow[]> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('saved_people_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as SavedProfileRow[] | null) ?? []
}

export async function getSavedProfileForUser(
  userId: string,
  profileId: string,
): Promise<SavedProfileRow | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('saved_people_profiles')
    .select('*')
    .eq('id', profileId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as SavedProfileRow | null) ?? null
}

export async function getLatestSavedProfileReport(
  profileId: string,
): Promise<SavedProfileReportRow | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('saved_people_reports')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as SavedProfileReportRow | null) ?? null
}

export async function getConnectionInviteByTokenHash(tokenHash: string): Promise<ConnectionInviteRow | null> {
  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('connection_invites')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .maybeSingle()
  return (data as ConnectionInviteRow | null) ?? null
}

export async function listPendingInvitesForUser(userId: string): Promise<ConnectionInviteRow[]> {
  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('connection_invites')
    .select('*')
    .eq('inviter_user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', now)
    .order('created_at', { ascending: false })
  return (data as ConnectionInviteRow[] | null) ?? []
}

export async function getSpaceById(spaceId: string): Promise<ConnectionSpaceRow | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('connection_spaces')
    .select('*')
    .eq('id', spaceId)
    .maybeSingle()
  return (data as ConnectionSpaceRow | null) ?? null
}

export async function listSpaceMembers(spaceId: string): Promise<ConnectionMemberRow[]> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('connection_members')
    .select('*')
    .eq('space_id', spaceId)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
  return (data as ConnectionMemberRow[] | null) ?? []
}

export async function getMemberViewsForSpace(spaceId: string): Promise<ConnectionMemberView[]> {
  const members = await listSpaceMembers(spaceId)
  if (members.length === 0) return []

  const chartIds = members.map((member) => member.chart_id)
  const supabase = createServiceSupabaseClient()
  const { data: charts } = await supabase
    .from('charts')
    .select('id, name')
    .in('id', chartIds)
  const namesByChartId = new Map((charts ?? []).map((chart) => [chart.id, chart.name as string | null]))

  return members.map((member) => ({
    ...member,
    chart_name: namesByChartId.get(member.chart_id) ?? null,
  }))
}

export async function getLatestConnectionReport(
  spaceId: string,
): Promise<ConnectionReportRow | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('connection_reports')
    .select('*')
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as ConnectionReportRow | null) ?? null
}

export async function listSpacesForUser(userId: string): Promise<ConnectionSpaceRow[]> {
  const supabase = createServiceSupabaseClient()
  const { data: memberships } = await supabase
    .from('connection_members')
    .select('space_id')
    .eq('user_id', userId)
    .eq('status', 'active')

  const spaceIds = [...new Set((memberships ?? []).map((row) => row.space_id as string))]
  if (spaceIds.length === 0) return []

  const { data: spaces } = await supabase
    .from('connection_spaces')
    .select('*')
    .in('id', spaceIds)
    .order('created_at', { ascending: false })
  return (spaces as ConnectionSpaceRow[] | null) ?? []
}

export async function hasActiveRomanticSpace(userId: string): Promise<boolean> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('connection_members')
    .select('space_id, connection_spaces!inner(status, relationship_type)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .eq('connection_spaces.status', 'active')
    .eq('connection_spaces.relationship_type', 'romantic')
    .limit(1)

  return (data ?? []).length > 0
}

export async function buildCircleSpaceView(space: ConnectionSpaceRow): Promise<CircleSpaceView> {
  const [members, latestReport] = await Promise.all([
    getMemberViewsForSpace(space.id),
    getLatestConnectionReport(space.id),
  ])

  const weather =
    space.member_count >= 2
      ? buildRelationshipWeatherOverview(space.composite_chart_data)
      : null

  return {
    space,
    members,
    latestReport,
    weather,
  }
}

export async function recomputeAndPersistSpace(
  spaceId: string,
  relationshipType?: RelationshipType,
): Promise<{
  space: ConnectionSpaceRow
  reportVersion: number
  reportSummary: CompatibilitySummary
}> {
  const supabase = createServiceSupabaseClient()
  const space = await getSpaceById(spaceId)
  if (!space) {
    throw new Error('Space not found')
  }

  const members = await listSpaceMembers(spaceId)
  const charts = await Promise.all(members.map((member) => getChartById(member.chart_id)))
  const resolvedCharts = charts.filter((chart): chart is ChartRow => Boolean(chart))
  const nextType = relationshipType ?? space.relationship_type

  if (resolvedCharts.length < 2) {
    throw new Error('At least two members are required')
  }

  const computed = await buildSpaceComputation(resolvedCharts, nextType)
  const { data: latest } = await supabase
    .from('connection_reports')
    .select('version')
    .eq('space_id', spaceId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const reportVersion = (latest?.version ?? 0) + 1

  await supabase
    .from('connection_spaces')
    .update({
      relationship_type: nextType,
      member_count: members.length,
      compatibility_summary: computed.compatibilitySummary,
      synastry_aspects: computed.synastryAspects,
      composite_chart_data: computed.compositeChartData,
    })
    .eq('id', spaceId)

  const refreshedSpace = await getSpaceById(spaceId)
  if (!refreshedSpace) {
    throw new Error('Failed to refresh space')
  }

  return {
    space: refreshedSpace,
    reportVersion,
    reportSummary: computed.compatibilitySummary,
  }
}

export async function getCircleDashboardData(userId: string): Promise<CircleDashboardData> {
  const [tier, latestChart, spaces, pendingInvites, savedProfiles] = await Promise.all([
    getUserTier(userId),
    getLatestChartForUser(userId),
    listSpacesForUser(userId),
    listPendingInvitesForUser(userId),
    listSavedProfilesForUser(userId),
  ])

  const spaceViews = await Promise.all(spaces.map((space) => buildCircleSpaceView(space)))
  const latestSavedProfileReportsEntries = await Promise.all(
    savedProfiles.map(async (profile) => [profile.id, await getLatestSavedProfileReport(profile.id)] as const),
  )
  const latestSavedProfileReports = Object.fromEntries(latestSavedProfileReportsEntries) as Record<
    string,
    SavedProfileReportRow | null
  >

  return {
    tier,
    chartId: latestChart?.id ?? null,
    chartName: latestChart?.name ?? null,
    spaces: spaceViews,
    pendingInvites,
    savedProfiles,
    latestSavedProfileReports,
  }
}
