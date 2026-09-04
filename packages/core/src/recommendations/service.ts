import type { SupabaseClient } from '@supabase/supabase-js'
import { getSunSign } from '../welcome/sun-sign'
import { getLunarPhase, type LunarPhase } from '../lib/moon-phase'
import { createCoreSupabaseClient } from '../lib/supabase'
import {
  buildRecommendationExplanation,
  buildTasteVector,
  rankRecommendationWorks,
  type TasteSignal,
} from './ranking'
import type {
  PersonalizedRecommendation,
  RecommendationExplanation,
  RecommendationFeedbackRequest,
  RecommendationFeedbackResponse,
  RecommendationMediaType,
  RecommendationRerollReason,
  RecommendationsOverview,
  RecommendationSentiment,
  RecommendationSlot,
  RecommendationStatus,
} from './schemas'

const SOFIA_TIME_ZONE = 'Europe/Sofia'
const ALGORITHM_VERSION = 'media-v1'
const RECENT_DELIVERY_DAYS = 45

type RightsMode = 'development' | 'commercial'

interface ChartRow {
  id: string
  birth_date: string
}

interface RecommendationWorkRow {
  id: string
  source_id: string
  source_external_id: string
  source_url: string | null
  media_type: RecommendationMediaType
  canonical_title: string
  title_bg: string | null
  original_title: string | null
  creator_display: string
  release_year: number | null
  description_en: string | null
  description_bg: string | null
  tagline_en: string | null
  tagline_bg: string | null
  duration_minutes: number | null
  page_count: number | null
  genres: string[]
  traits: Record<string, unknown>
  content_flags: Record<string, unknown>
  metadata_quality: number
}

interface RecommendationAssetRow {
  work_id: string
  remote_url: string
  attribution_text: string | null
}

interface RecommendationDeliveryRow {
  id: string
  user_id: string
  chart_id: string | null
  work_id: string
  slot: RecommendationSlot
  period_key: string
  revision: 0 | 1
  status: 'active' | 'replaced'
  explanation: Record<string, unknown>
  score_detail: Record<string, unknown>
  context_snapshot: Record<string, unknown>
  created_at: string
}

interface WorkStateRow {
  work_id: string
  status: 'new' | 'saved' | 'consumed' | 'dismissed'
  sentiment: RecommendationSentiment | null
  consumed_before_recommendation?: boolean
  first_recommended_at?: string | null
}

interface CatalogWork extends RecommendationWorkRow {
  contentFlags: Record<string, unknown>
  metadataQuality: number
  tagline: string
  description: string
}

export type RecommendationServiceError =
  | 'CHART_NOT_FOUND'
  | 'NO_ELIGIBLE_CATALOG'
  | 'NOT_FOUND'
  | 'REROLL_USED'
  | 'INTERNAL'

export type RecommendationServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RecommendationServiceError }

function rightsMode(): RightsMode {
  const configured = process.env.RECOMMENDATION_RIGHTS_MODE
  if (configured === 'development' || configured === 'commercial') return configured
  return process.env.NODE_ENV === 'production' ? 'commercial' : 'development'
}

function allowedScopes(mode: RightsMode): string[] {
  return mode === 'commercial' ? ['commercial', 'both'] : ['development', 'both']
}

function sofiaParts(date: Date): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SOFIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function recommendationPeriodKey(slot: RecommendationSlot, date: Date): string {
  const { year, month, day } = sofiaParts(date)
  return slot === 'daily_movie' ? `${year}-${month}-${day}` : `${year}-${month}`
}

function toCatalogWork(row: RecommendationWorkRow): CatalogWork {
  const description = row.description_bg ?? row.description_en ?? row.tagline_bg ?? row.tagline_en ?? ''
  const tagline = row.tagline_bg ?? row.tagline_en ?? description
  return {
    ...row,
    description,
    tagline,
    contentFlags: row.content_flags,
    metadataQuality: row.metadata_quality,
  }
}

async function resolveChart(
  supabase: SupabaseClient,
  userId: string,
  requestedChartId?: string | null,
): Promise<{ chart: ChartRow | null; invalidRequestedChart: boolean }> {
  const query = supabase
    .from('charts')
    .select('id, birth_date')
    .eq('user_id', userId)

  if (requestedChartId) {
    const { data, error } = await query.eq('id', requestedChartId).maybeSingle()
    return {
      chart: error || !data ? null : (data as ChartRow),
      invalidRequestedChart: !!error || !data,
    }
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
  return { chart: (data as ChartRow | null) ?? null, invalidRequestedChart: false }
}

async function fetchCatalog(
  supabase: SupabaseClient,
  mediaType: RecommendationMediaType,
  mode: RightsMode,
): Promise<CatalogWork[]> {
  const { data, error } = await supabase
    .from('recommendation_works')
    .select('*')
    .eq('media_type', mediaType)
    .eq('publication_status', 'published')
    .eq('safety_status', 'approved')
    .gte('metadata_quality', 70)
    .in('rights_scope', allowedScopes(mode))

  if (error) throw error
  return ((data ?? []) as RecommendationWorkRow[]).map(toCatalogWork)
}

async function fetchAssets(
  supabase: SupabaseClient,
  workIds: string[],
  mode: RightsMode,
): Promise<Map<string, RecommendationAssetRow>> {
  if (workIds.length === 0) return new Map()
  const { data, error } = await supabase
    .from('recommendation_assets')
    .select('work_id, remote_url, attribution_text')
    .in('work_id', workIds)
    .eq('is_primary', true)
    .in('rights_scope', allowedScopes(mode))

  if (error) throw error
  return new Map(
    ((data ?? []) as RecommendationAssetRow[]).map((asset) => [asset.work_id, asset]),
  )
}

async function fetchStates(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkStateRow[]> {
  const { data, error } = await supabase
    .from('user_recommendation_work_states')
    .select('work_id, status, sentiment, consumed_before_recommendation, first_recommended_at')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? []) as WorkStateRow[]
}

async function fetchRecentDeliveryIds(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<Set<string>> {
  const since = new Date(now.getTime() - RECENT_DELIVERY_DAYS * 86_400_000).toISOString()
  const { data, error } = await supabase
    .from('recommendation_deliveries')
    .select('work_id')
    .eq('user_id', userId)
    .gte('created_at', since)
    .limit(500)
  if (error) throw error
  return new Set((data ?? []).map((row) => String(row.work_id)))
}

function stateWeight(state: WorkStateRow): number {
  if (state.sentiment === 'liked') return 1
  if (state.sentiment === 'okay') return 0.15
  if (state.sentiment === 'disliked') return -1
  if (state.status === 'saved') return 0.45
  if (state.status === 'dismissed') return -0.7
  // Merely watched/read is deliberately neutral. Consumption is not liking.
  return 0
}

function tasteSignals(
  states: WorkStateRow[],
  workById: Map<string, CatalogWork>,
): TasteSignal[] {
  return states.flatMap((state) => {
    const work = workById.get(state.work_id)
    const weight = stateWeight(state)
    return work && weight !== 0 ? [{ traits: work.traits, weight }] : []
  })
}

function stateByWorkId(states: WorkStateRow[]): Map<string, WorkStateRow> {
  return new Map(states.map((state) => [state.work_id, state]))
}

function hardExcludedStateIds(states: WorkStateRow[]): Set<string> {
  return new Set(
    states
      .filter((state) => state.status === 'consumed' || state.status === 'dismissed' || state.status === 'saved')
      .map((state) => state.work_id),
  )
}

function explanationFromRow(row: RecommendationDeliveryRow): RecommendationExplanation {
  const source = row.explanation
  return {
    howItConnects: typeof source.howItConnects === 'string' ? source.howItConnects : '',
    whyNow: typeof source.whyNow === 'string' ? source.whyNow : '',
    whatItGives: typeof source.whatItGives === 'string' ? source.whatItGives : '',
  }
}

function serializeDelivery(options: {
  delivery: RecommendationDeliveryRow
  work: CatalogWork
  asset: RecommendationAssetRow | undefined
  state: WorkStateRow | undefined
}): PersonalizedRecommendation {
  const { delivery, work, asset, state } = options
  const publicStatus: RecommendationStatus =
    state?.status === 'saved' || state?.status === 'consumed' ? state.status : 'new'
  const title = work.title_bg ?? work.canonical_title

  return {
    deliveryId: delivery.id,
    slot: delivery.slot,
    periodKey: delivery.period_key,
    rerollsRemaining: delivery.revision === 0 ? 1 : 0,
    work: {
      id: work.id,
      mediaType: work.media_type,
      title,
      originalTitle:
        work.original_title && work.original_title !== title ? work.original_title : null,
      creator: work.creator_display,
      year: work.release_year,
      description: work.description,
      tagline: work.tagline,
      durationMinutes: work.duration_minutes,
      pages: work.page_count,
      genres: work.genres,
      image: asset
        ? {
            url: asset.remote_url,
            alt: `${work.media_type === 'movie' ? 'Плакат' : 'Корица'} на „${title}“`,
            attribution: asset.attribution_text,
          }
        : null,
      sourceUrl: work.source_url,
    },
    status: publicStatus,
    sentiment: state?.sentiment ?? null,
    explanation: explanationFromRow(delivery),
  }
}

async function fetchActiveDelivery(
  supabase: SupabaseClient,
  userId: string,
  slot: RecommendationSlot,
  periodKey: string,
): Promise<RecommendationDeliveryRow | null> {
  const { data, error } = await supabase
    .from('recommendation_deliveries')
    .select('*')
    .eq('user_id', userId)
    .eq('slot', slot)
    .eq('period_key', periodKey)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw error
  return (data as RecommendationDeliveryRow | null) ?? null
}

async function recordNewDelivery(
  supabase: SupabaseClient,
  userId: string,
  delivery: RecommendationDeliveryRow,
): Promise<void> {
  const timestamp = delivery.created_at
  const { error: stateError } = await supabase
    .from('user_recommendation_work_states')
    .insert({
      user_id: userId,
      work_id: delivery.work_id,
      last_delivery_id: delivery.id,
      status: 'new',
      first_recommended_at: timestamp,
      last_recommended_at: timestamp,
    })
  if (stateError?.code === '23505') {
    const { error: refreshError } = await supabase
      .from('user_recommendation_work_states')
      .update({ last_delivery_id: delivery.id, last_recommended_at: timestamp })
      .eq('user_id', userId)
      .eq('work_id', delivery.work_id)
    if (refreshError) console.warn('[core/recommendations] state refresh failed', refreshError)
  } else if (stateError) {
    console.warn('[core/recommendations] state snapshot failed', stateError)
  }

  const { error: eventError } = await supabase.from('recommendation_events').insert({
    user_id: userId,
    delivery_id: delivery.id,
    work_id: delivery.work_id,
    event_type: 'delivered',
    metadata: { slot: delivery.slot, periodKey: delivery.period_key },
  })
  if (eventError) console.warn('[core/recommendations] delivery event failed', eventError)
}

async function getOrCreateDelivery(options: {
  supabase: SupabaseClient
  userId: string
  chartId: string | null
  slot: RecommendationSlot
  periodKey: string
  works: CatalogWork[]
  assets: Map<string, RecommendationAssetRow>
  states: WorkStateRow[]
  recentDeliveryIds: Set<string>
  phase: LunarPhase
  sunSign: string | null
  seedSuffix?: string
}): Promise<PersonalizedRecommendation | null> {
  const existing = await fetchActiveDelivery(
    options.supabase,
    options.userId,
    options.slot,
    options.periodKey,
  )
  const workMap = new Map(options.works.map((work) => [work.id, work]))
  const statesMap = stateByWorkId(options.states)
  if (existing) {
    const work = workMap.get(existing.work_id)
    if (!work) return null
    return serializeDelivery({
      delivery: existing,
      work,
      asset: options.assets.get(work.id),
      state: statesMap.get(work.id),
    })
  }

  const hardExcluded = hardExcludedStateIds(options.states)
  const recentAndStateExcluded = new Set([...hardExcluded, ...options.recentDeliveryIds])
  const taste = buildTasteVector(tasteSignals(options.states, workMap))
  const rank = (excludedWorkIds: Set<string>) =>
    rankRecommendationWorks({
      works: options.works,
      phase: options.phase.id,
      sunSign: options.sunSign,
      taste,
      seed: `${options.userId}:${options.periodKey}:${options.slot}:${options.seedSuffix ?? 'initial'}`,
      excludedWorkIds,
    })

  // Prefer no repeat within 45 days; if a small development catalog is
  // exhausted, rotate older safe works but never revive consumed/dismissed.
  const ranked = rank(recentAndStateExcluded)
  const selected = ranked[0] ?? rank(hardExcluded)[0]
  if (!selected) return null

  const explanation = buildRecommendationExplanation({
    slot: options.slot,
    phaseName: options.phase.name,
    sunSign: options.sunSign,
    topTraits: selected.scoreDetail.topTraits,
    tagline: selected.work.tagline,
    description: selected.work.description,
  })
  const contextSnapshot = {
    algorithmVersion: ALGORITHM_VERSION,
    lunarPhase: { id: options.phase.id, name: options.phase.name },
    sunSign: options.sunSign,
    rightsMode: rightsMode(),
  }

  const { data, error } = await options.supabase
    .from('recommendation_deliveries')
    .insert({
      user_id: options.userId,
      chart_id: options.chartId,
      work_id: selected.work.id,
      slot: options.slot,
      period_key: options.periodKey,
      revision: 0,
      status: 'active',
      explanation,
      score_detail: selected.scoreDetail,
      context_snapshot: contextSnapshot,
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      const raced = await fetchActiveDelivery(
        options.supabase,
        options.userId,
        options.slot,
        options.periodKey,
      )
      if (!raced) return null
      const racedWork = workMap.get(raced.work_id)
      return racedWork
        ? serializeDelivery({
            delivery: raced,
            work: racedWork,
            asset: options.assets.get(racedWork.id),
            state: statesMap.get(racedWork.id),
          })
        : null
    }
    throw error
  }

  const delivery = data as RecommendationDeliveryRow
  await recordNewDelivery(options.supabase, options.userId, delivery)
  return serializeDelivery({
    delivery,
    work: selected.work,
    asset: options.assets.get(selected.work.id),
    state: { work_id: selected.work.id, status: 'new', sentiment: null },
  })
}

export async function getRecommendationsOverview(
  userId: string,
  requestedChartId?: string | null,
  now = new Date(),
): Promise<RecommendationServiceResult<RecommendationsOverview>> {
  try {
    const supabase = createCoreSupabaseClient()
    const resolved = await resolveChart(supabase, userId, requestedChartId)
    if (resolved.invalidRequestedChart) return { ok: false, error: 'CHART_NOT_FOUND' }

    const phase = getLunarPhase(now)
    const sunSign = resolved.chart ? getSunSign(resolved.chart.birth_date) : null
    const mode = rightsMode()
    const [movies, books, states, recentDeliveryIds] = await Promise.all([
      fetchCatalog(supabase, 'movie', mode),
      fetchCatalog(supabase, 'book', mode),
      fetchStates(supabase, userId),
      fetchRecentDeliveryIds(supabase, userId, now),
    ])
    const allWorks = [...movies, ...books]
    const assets = await fetchAssets(
      supabase,
      allWorks.map((work) => work.id),
      mode,
    )

    const common = {
      supabase,
      userId,
      chartId: resolved.chart?.id ?? null,
      assets,
      states,
      recentDeliveryIds,
      phase,
      sunSign,
    }
    const [dailyMovie, monthlyBook] = await Promise.all([
      getOrCreateDelivery({
        ...common,
        slot: 'daily_movie',
        periodKey: recommendationPeriodKey('daily_movie', now),
        works: movies,
      }),
      getOrCreateDelivery({
        ...common,
        slot: 'monthly_book',
        periodKey: recommendationPeriodKey('monthly_book', now),
        works: books,
      }),
    ])

    if (!dailyMovie && !monthlyBook) return { ok: false, error: 'NO_ELIGIBLE_CATALOG' }
    return {
      ok: true,
      data: {
        dailyMovie,
        monthlyBook,
        generatedAt: now.toISOString(),
        personalization: {
          sunSign,
          lunarPhase: { id: phase.id, name: phase.name },
        },
      },
    }
  } catch (error) {
    console.error('[core/recommendations] overview failed', error)
    return { ok: false, error: 'INTERNAL' }
  }
}

export async function rerollRecommendation(
  userId: string,
  deliveryId: string,
  reason: RecommendationRerollReason,
  now = new Date(),
): Promise<RecommendationServiceResult<PersonalizedRecommendation>> {
  try {
    const supabase = createCoreSupabaseClient()
    const { data: currentData, error: currentError } = await supabase
      .from('recommendation_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('user_id', userId)
      .maybeSingle()
    if (currentError) throw currentError
    if (!currentData) return { ok: false, error: 'NOT_FOUND' }

    const current = currentData as RecommendationDeliveryRow
    if (current.status !== 'active' || current.revision !== 0) {
      return { ok: false, error: 'REROLL_USED' }
    }

    const resolved = await resolveChart(supabase, userId, current.chart_id)
    const phase = getLunarPhase(now)
    const sunSign = resolved.chart ? getSunSign(resolved.chart.birth_date) : null
    const mode = rightsMode()
    const mediaType: RecommendationMediaType = current.slot === 'daily_movie' ? 'movie' : 'book'
    const [works, states, recentDeliveryIds] = await Promise.all([
      fetchCatalog(supabase, mediaType, mode),
      fetchStates(supabase, userId),
      fetchRecentDeliveryIds(supabase, userId, now),
    ])
    const workMap = new Map(works.map((work) => [work.id, work]))
    const taste = buildTasteVector(tasteSignals(states, workMap))
    const hardExcluded = hardExcludedStateIds(states)
    hardExcluded.add(current.work_id)
    const preferredExcluded = new Set([...hardExcluded, ...recentDeliveryIds])
    const rank = (excludedWorkIds: Set<string>) =>
      rankRecommendationWorks({
        works,
        phase: phase.id,
        sunSign,
        taste,
        seed: `${userId}:${current.period_key}:${current.slot}:reroll`,
        excludedWorkIds,
      })
    const selected = rank(preferredExcluded)[0] ?? rank(hardExcluded)[0]
    if (!selected) return { ok: false, error: 'NO_ELIGIBLE_CATALOG' }

    const explanation = buildRecommendationExplanation({
      slot: current.slot,
      phaseName: phase.name,
      sunSign,
      topTraits: selected.scoreDetail.topTraits,
      tagline: selected.work.tagline,
      description: selected.work.description,
    })
    const contextSnapshot = {
      algorithmVersion: ALGORITHM_VERSION,
      lunarPhase: { id: phase.id, name: phase.name },
      sunSign,
      rightsMode: mode,
    }
    const { data: replacementData, error: replacementError } = await supabase.rpc(
      'reroll_media_recommendation',
      {
        p_user_id: userId,
        p_delivery_id: deliveryId,
        p_work_id: selected.work.id,
        p_reroll_reason: reason,
        p_explanation: explanation,
        p_score_detail: selected.scoreDetail,
        p_context_snapshot: contextSnapshot,
      },
    )

    if (replacementError) {
      if (replacementError.code === 'P0001' || replacementError.code === '23505') {
        return { ok: false, error: 'REROLL_USED' }
      }
      if (replacementError.code === 'P0002') return { ok: false, error: 'NOT_FOUND' }
      throw replacementError
    }
    const rawReplacement = Array.isArray(replacementData) ? replacementData[0] : replacementData
    if (!rawReplacement) return { ok: false, error: 'INTERNAL' }
    const replacement = rawReplacement as RecommendationDeliveryRow
    const assets = await fetchAssets(supabase, [selected.work.id], mode)

    return {
      ok: true,
      data: serializeDelivery({
        delivery: replacement,
        work: selected.work,
        asset: assets.get(selected.work.id),
        state: { work_id: selected.work.id, status: 'new', sentiment: null },
      }),
    }
  } catch (error) {
    console.error('[core/recommendations] reroll failed', error)
    return { ok: false, error: 'INTERNAL' }
  }
}

function nextEventType(
  previous: WorkStateRow | null,
  nextStatus: RecommendationStatus,
): 'saved' | 'unsaved' | 'consumed' | 'unconsumed' | null {
  if (previous?.status === nextStatus) return null
  if (nextStatus === 'saved') return 'saved'
  if (nextStatus === 'consumed') return 'consumed'
  if (previous?.status === 'saved') return 'unsaved'
  if (previous?.status === 'consumed') return 'unconsumed'
  return null
}

export async function updateRecommendationFeedback(
  userId: string,
  input: RecommendationFeedbackRequest,
): Promise<RecommendationServiceResult<RecommendationFeedbackResponse>> {
  try {
    const supabase = createCoreSupabaseClient()
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('recommendation_deliveries')
      .select('id, work_id, created_at')
      .eq('id', input.deliveryId)
      .eq('user_id', userId)
      .maybeSingle()
    if (deliveryError) throw deliveryError
    if (!deliveryData) return { ok: false, error: 'NOT_FOUND' }

    const { data: previousData, error: previousError } = await supabase
      .from('user_recommendation_work_states')
      .select('work_id, status, sentiment, consumed_before_recommendation, first_recommended_at')
      .eq('user_id', userId)
      .eq('work_id', deliveryData.work_id)
      .maybeSingle()
    if (previousError) throw previousError
    const previous = (previousData as WorkStateRow | null) ?? null
    const sentiment = input.status === 'consumed'
      ? input.sentiment === undefined
        ? previous?.sentiment ?? null
        : input.sentiment
      : null

    const { error: stateError } = await supabase
      .from('user_recommendation_work_states')
      .upsert(
        {
          user_id: userId,
          work_id: deliveryData.work_id,
          last_delivery_id: deliveryData.id,
          status: input.status,
          sentiment,
          consumed_before_recommendation: previous?.consumed_before_recommendation ?? false,
          first_recommended_at: previous?.first_recommended_at ?? deliveryData.created_at,
          last_recommended_at: deliveryData.created_at,
        },
        { onConflict: 'user_id,work_id' },
      )
    if (stateError) throw stateError

    const statusEvent = nextEventType(previous, input.status)
    const events: Array<Record<string, unknown>> = []
    if (statusEvent) {
      events.push({
        user_id: userId,
        delivery_id: deliveryData.id,
        work_id: deliveryData.work_id,
        event_type: statusEvent,
        metadata: {},
      })
    }
    if (sentiment != null && sentiment !== previous?.sentiment) {
      events.push({
        user_id: userId,
        delivery_id: deliveryData.id,
        work_id: deliveryData.work_id,
        event_type: 'sentiment_set',
        metadata: { sentiment },
      })
    }
    if (events.length > 0) {
      const { error: eventError } = await supabase.from('recommendation_events').insert(events)
      if (eventError) console.warn('[core/recommendations] feedback event failed', eventError)
    }

    return {
      ok: true,
      data: {
        workId: deliveryData.work_id,
        status: input.status,
        sentiment,
      },
    }
  } catch (error) {
    console.error('[core/recommendations] feedback failed', error)
    return { ok: false, error: 'INTERNAL' }
  }
}
