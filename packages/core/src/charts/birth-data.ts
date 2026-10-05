import { createCoreSupabaseClient } from '../lib/supabase'
import type { BirthData, UpdateBirthData } from './schemas'

/**
 * Input types are z.infer aliases over the shared schemas in ./schemas.
 * Single source of truth: the Zod definition (with Bulgarian error
 * messages) is the wire contract for web route handlers, web wizard
 * components, mobile wizard components, and these core helpers.
 */
export type CreateBirthChartInput = BirthData
export type UpdateBirthChartInput = UpdateBirthData

export interface BirthChartRow {
  id: string
  user_id: string
  name: string
  birth_date: string
  birth_time: string | null
  birth_time_known: boolean
  approximate_time_range: string | null
  city_id: string | null
  city_name: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string
  /**
   * A derived row (reading, horoscope, Кръг report) older than this is STALE.
   * Bumped only by a birth-affecting edit — see apply_birth_data_edit().
   */
  birth_data_edited_at: string
}

export type CreateBirthChartResult =
  | { ok: true; data: BirthChartRow }
  | { ok: false; error: 'INSERT_FAILED'; message: string }
  | { ok: false; error: 'CHART_LIMIT_REACHED'; message: string }

// A real user needs at most a handful of charts (self, plus a couple of
// time-uncertainty variants or family members added outside Кръг). This
// caps chart-creation spam — uncapped, each chart is a fresh cache key
// that unlocks another paid AI horoscope generation regardless of the
// account's subscription tier or quota (2026-08-26 sweep, finding #3).
const MAX_CHARTS_PER_USER = 20

export type BirthChartByIdResult =
  | { ok: true; data: BirthChartRow }
  | { ok: false; error: 'NOT_FOUND' }

export interface BirthDataEditOutcome {
  /** False for a name-only or no-op save — nothing was invalidated. */
  birthDataChanged: boolean
  /** True when this edit's regenerations skip the premium quota claim. */
  quotaExempt: boolean
}

export type UpdateBirthChartResult =
  | { ok: true; data: BirthChartRow; edit: BirthDataEditOutcome }
  | { ok: false; error: 'NOT_FOUND' }
  | { ok: false; error: 'UPDATE_FAILED'; message: string }

export type DeleteBirthChartResult =
  | { ok: true }
  | { ok: false; error: 'DELETE_FAILED'; message: string }

export async function listBirthCharts(
  userId: string,
): Promise<BirthChartRow[]> {
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[core/charts/birth-data] list failed:', error)
    throw error
  }

  return (data ?? []) as BirthChartRow[]
}

export async function createBirthChart(
  userId: string,
  input: CreateBirthChartInput,
): Promise<CreateBirthChartResult> {
  const supabase = createCoreSupabaseClient()

  const { count, error: countError } = await supabase
    .from('charts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (countError) {
    console.error('[core/charts/birth-data] chart count check failed:', countError)
    return {
      ok: false,
      error: 'INSERT_FAILED',
      message: countError.message,
    }
  }

  if ((count ?? 0) >= MAX_CHARTS_PER_USER) {
    return {
      ok: false,
      error: 'CHART_LIMIT_REACHED',
      message: `Chart limit of ${MAX_CHARTS_PER_USER} reached.`,
    }
  }

  // Ensure the user row exists before inserting a chart (FK constraint)
  await supabase
    .from('users')
    .upsert(
      { clerk_id: userId },
      { onConflict: 'clerk_id', ignoreDuplicates: true },
    )

  const birthDateISO = new Date(
    input.birthDate + 'T00:00:00Z',
  ).toISOString()

  const { data, error } = await supabase
    .from('charts')
    .insert({
      user_id: userId,
      name: input.name,
      birth_date: birthDateISO,
      birth_time_known: input.birthTimeKnown,
      birth_time: input.birthTime ?? null,
      approximate_time_range: input.approximateTimeRange ?? null,
      city_id: input.cityId ?? null,
      city_name: input.cityName,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[core/charts/birth-data] create failed:', error)
    return {
      ok: false,
      error: 'INSERT_FAILED',
      message: error?.message ?? 'unknown',
    }
  }

  return { ok: true, data: data as BirthChartRow }
}

export async function getBirthChart(
  userId: string,
  id: string,
): Promise<BirthChartByIdResult> {
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('charts')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return { ok: false, error: 'NOT_FOUND' }
  }
  return { ok: true, data: data as BirthChartRow }
}

/**
 * Applies a birth-data edit to the EXISTING chart row (never an insert) via
 * the apply_birth_data_edit() Postgres function, which does the whole edit in
 * one transaction: it diffs against the stored values, bumps
 * charts.birth_data_edited_at only for a birth-affecting change, records the
 * edit (quota exemption: active chart + first 2 per rolling 30 days), and
 * drops the chart_calculations cache and uncollected crystal
 * recommendations. supabase-js has no transactions, and two concurrent edits
 * must not both read "1 exempt edit".
 *
 * Tier is deliberately NOT an input: a free user's once-ever regrant of the
 * lifetime Oracle reading is spent at GENERATION time (oracle/generate), and a
 * premium edit never touches it.
 */
export async function updateBirthChart(
  userId: string,
  id: string,
  input: UpdateBirthChartInput,
): Promise<UpdateBirthChartResult> {
  const supabase = createCoreSupabaseClient()
  // Only the keys the caller provided; a key present with null clears a
  // nullable column inside the function.
  const changes: Record<string, unknown> = {}

  if (input.name !== undefined) changes.name = input.name
  if (input.birthDate !== undefined) {
    changes.birth_date = new Date(input.birthDate + 'T00:00:00Z').toISOString()
  }
  if (input.birthTimeKnown !== undefined) changes.birth_time_known = input.birthTimeKnown
  if (input.birthTime !== undefined) changes.birth_time = input.birthTime
  if (input.approximateTimeRange !== undefined) {
    changes.approximate_time_range = input.approximateTimeRange
  }
  if (input.cityId !== undefined) changes.city_id = input.cityId
  if (input.cityName !== undefined) changes.city_name = input.cityName
  if (input.latitude !== undefined) changes.latitude = input.latitude
  if (input.longitude !== undefined) changes.longitude = input.longitude

  const { data, error } = await supabase.rpc('apply_birth_data_edit', {
    p_user_id: userId,
    p_chart_id: id,
    p_changes: changes,
  })

  if (error) {
    console.error('[core/charts/birth-data] apply_birth_data_edit failed:', error)
    return { ok: false, error: 'UPDATE_FAILED', message: error.message }
  }
  if (!data) {
    // The function returns NULL when no chart matches (id, user_id).
    return { ok: false, error: 'NOT_FOUND' }
  }

  const result = data as {
    chart: BirthChartRow
    birth_data_changed: boolean
    quota_exempt: boolean
  }
  return {
    ok: true,
    data: result.chart,
    edit: {
      birthDataChanged: result.birth_data_changed,
      quotaExempt: result.quota_exempt,
    },
  }
}

export async function deleteBirthChart(
  userId: string,
  id: string,
): Promise<DeleteBirthChartResult> {
  const supabase = createCoreSupabaseClient()
  const { error } = await supabase
    .from('charts')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[core/charts/birth-data] delete failed:', error)
    return { ok: false, error: 'DELETE_FAILED', message: error.message }
  }

  return { ok: true }
}
