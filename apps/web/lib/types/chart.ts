/**
 * Canonical type for a chart row as returned by Supabase queries.
 *
 * Supabase returns snake_case column names, unlike the Drizzle schema
 * (`@celestia/db/schema`) which uses camelCase. This type is the single
 * source of truth for the Supabase response shape across the web app.
 *
 * If the Drizzle `charts` schema changes, update this type to match.
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
