/**
 * Crystal database helpers (service-role Supabase client).
 *
 * API routes call these to avoid duplicating the fetch/upsert boilerplate.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CrystalCatalogEntry } from './recommend'

export interface CrystalRow {
  id: string
  slug: string
  name_en: string
  name_bg: string | null
  tagline_en: string
  tagline_bg: string | null
  description_en: string
  description_bg: string | null
  planet: string | null
  zodiac_signs: string[]
  moon_phases: string[]
  element: string | null
  chakra: string | null
  hardness: number | null
  color_primary: string
  color_secondary: string
  color_accent: string | null
  svg_variant: string
  rarity: string
  keywords: string[]
  properties: Record<string, unknown> | null
}

export interface UserCrystalRow {
  id: string
  user_id: string
  crystal_id: string
  source: string
  reason_text: string | null
  discovered_at: string
}

export interface CrystalRecommendationRow {
  id: string
  user_id: string
  chart_id: string | null
  crystal_id: string
  trigger_type: string
  reason_code: string
  reason_text_en: string
  reason_text_bg: string | null
  valid_from: string
  valid_until: string
  collected_at: string | null
  created_at: string
}

export async function fetchCatalog(
  supabase: SupabaseClient
): Promise<CrystalRow[]> {
  const { data, error } = await supabase
    .from('crystals')
    .select('*')
    .order('rarity', { ascending: true })
    .order('slug', { ascending: true })

  if (error) throw error
  return (data ?? []) as CrystalRow[]
}

export function toCatalogEntry(row: CrystalRow): CrystalCatalogEntry {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.name_en,
    planet: row.planet,
    zodiacSigns: row.zodiac_signs,
    moonPhases: row.moon_phases,
    rarity: row.rarity,
  }
}

export async function fetchUserCollection(
  supabase: SupabaseClient,
  userId: string
): Promise<UserCrystalRow[]> {
  const { data, error } = await supabase
    .from('user_crystals')
    .select('*')
    .eq('user_id', userId)
    .order('discovered_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as UserCrystalRow[]
}

export async function fetchActiveRecommendations(
  supabase: SupabaseClient,
  userId: string,
  now: Date
): Promise<CrystalRecommendationRow[]> {
  const { data, error } = await supabase
    .from('crystal_recommendations')
    .select('*')
    .eq('user_id', userId)
    .is('collected_at', null)
    .lte('valid_from', now.toISOString())
    .gte('valid_until', now.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as CrystalRecommendationRow[]
}

export interface NewRecommendationInput {
  userId: string
  chartId: string | null
  crystalId: string
  triggerType: string
  reasonCode: string
  reasonTextEn: string
  validFrom: Date
  validUntil: Date
}

/**
 * Insert a recommendation if one does not already exist for the
 * (user_id, reason_code, valid_from) tuple. Relies on the unique index
 * in the schema rather than pre-checking, so concurrent generates stay safe.
 */
export async function insertRecommendationIfNew(
  supabase: SupabaseClient,
  rec: NewRecommendationInput
): Promise<CrystalRecommendationRow | null> {
  const { data, error } = await supabase
    .from('crystal_recommendations')
    .insert({
      user_id: rec.userId,
      chart_id: rec.chartId,
      crystal_id: rec.crystalId,
      trigger_type: rec.triggerType,
      reason_code: rec.reasonCode,
      reason_text_en: rec.reasonTextEn,
      valid_from: rec.validFrom.toISOString(),
      valid_until: rec.validUntil.toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    // Unique-constraint violation means the rec already exists for this
    // trigger window — that's a benign no-op for the caller.
    if (error.code === '23505') return null
    throw error
  }
  return data as CrystalRecommendationRow
}

/**
 * Collect a recommendation: stamp it collected_at, then insert the
 * corresponding user_crystals row. Both writes happen via service-role
 * client so there is no client-side race condition.
 */
export async function collectRecommendation(
  supabase: SupabaseClient,
  userId: string,
  recommendationId: string
): Promise<{
  userCrystal: UserCrystalRow
  recommendation: CrystalRecommendationRow
} | null> {
  // First fetch the rec to make sure it belongs to the user and isn't claimed yet
  const { data: rec, error: recError } = await supabase
    .from('crystal_recommendations')
    .select('*')
    .eq('id', recommendationId)
    .eq('user_id', userId)
    .single()

  if (recError || !rec) return null
  if (rec.collected_at) return null

  const now = new Date().toISOString()

  // Stamp collected_at
  const { data: updatedRec, error: updateError } = await supabase
    .from('crystal_recommendations')
    .update({ collected_at: now })
    .eq('id', recommendationId)
    .select('*')
    .single()

  if (updateError || !updatedRec) return null

  // Upsert into user_crystals (unique on user+crystal — no duplicates)
  const { data: userCrystal, error: ucError } = await supabase
    .from('user_crystals')
    .upsert(
      {
        user_id: userId,
        crystal_id: rec.crystal_id,
        source: rec.trigger_type,
        reason_text: rec.reason_text_en,
        discovered_at: now,
      },
      { onConflict: 'user_id,crystal_id' }
    )
    .select('*')
    .single()

  if (ucError || !userCrystal) return null

  return {
    userCrystal: userCrystal as UserCrystalRow,
    recommendation: updatedRec as CrystalRecommendationRow,
  }
}
