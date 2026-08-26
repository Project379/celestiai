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

export type UpdateBirthChartResult =
  | { ok: true; data: BirthChartRow }
  | { ok: false; error: 'NOT_FOUND' }

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

export async function updateBirthChart(
  userId: string,
  id: string,
  input: UpdateBirthChartInput,
): Promise<UpdateBirthChartResult> {
  const supabase = createCoreSupabaseClient()
  const updateData: Record<string, unknown> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.birthDate !== undefined) {
    updateData.birth_date = new Date(
      input.birthDate + 'T00:00:00Z',
    ).toISOString()
  }
  if (input.birthTimeKnown !== undefined) {
    updateData.birth_time_known = input.birthTimeKnown
  }
  if (input.birthTime !== undefined) updateData.birth_time = input.birthTime
  if (input.approximateTimeRange !== undefined) {
    updateData.approximate_time_range = input.approximateTimeRange
  }
  if (input.cityId !== undefined) updateData.city_id = input.cityId
  if (input.cityName !== undefined) updateData.city_name = input.cityName
  if (input.latitude !== undefined) updateData.latitude = input.latitude
  if (input.longitude !== undefined) updateData.longitude = input.longitude

  updateData.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('charts')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) {
    return { ok: false, error: 'NOT_FOUND' }
  }

  // Invalidate cached natal calc — birth data changed, old calc is stale.
  const { error: calcDeleteError } = await supabase
    .from('chart_calculations')
    .delete()
    .eq('chart_id', id)

  if (calcDeleteError) {
    console.error(
      '[core/charts/birth-data] cache invalidation failed:',
      calcDeleteError,
    )
  }

  return { ok: true, data: data as BirthChartRow }
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
