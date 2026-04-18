import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Catalog row shape as returned by Supabase REST.
 *
 * Superset of the CrystalRowSchema in `./schemas.ts` — the DB catalog
 * carries additional fields (planet, zodiac_signs, moon_phases, element,
 * chakra, hardness, keywords, properties) that are used internally by
 * recommendation logic but not exposed on the public crystal-of-the-day
 * wire contract. Keep this type local to packages/core/crystals/.
 */
export interface CatalogRow {
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

export async function fetchCatalog(
  supabase: SupabaseClient,
): Promise<CatalogRow[]> {
  const { data, error } = await supabase
    .from('crystals')
    .select('*')
    .order('rarity', { ascending: true })
    .order('slug', { ascending: true })

  if (error) throw error
  return (data ?? []) as CatalogRow[]
}
