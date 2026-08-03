/**
 * Canonical type for a chart row as returned by Supabase queries.
 *
 * Hand-maintained snake_case type matching the Supabase REST response
 * shape. Planned replacement is the generated Database type from
 * `supabase gen types typescript` (see MIGRATION_TOOLING.md open items)
 * — until that lands, this stays the source of truth for web code.
 *
 * If the `charts` DB schema changes, update this type and the matching
 * input shapes in `packages/core/src/charts/birth-data.ts` together.
 */
export interface ChartRow {
  id: string
  name: string
  birth_date: string
  birth_time_known: boolean
  birth_time: string | null
  approximate_time_range: string | null
  city_name: string
  latitude: number
  longitude: number
  city_id: string | null
}
