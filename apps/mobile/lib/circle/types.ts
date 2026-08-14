// Mobile-local mirror of the subset of apps/web/lib/circle/types.ts needed
// for the saved-profiles (crush) surface. Not importable directly — apps/web
// isn't a workspace package apps/mobile can depend on, and these shapes
// aren't in @stellaeum/core (they're API response/DB-row shapes, not shared
// domain logic). Kept in sync by hand; if web's shapes change, update here.
import type { RelationshipType } from '@stellaeum/core/relationships/types'

export interface SavedProfileRow {
  id: string
  user_id: string
  kind: 'crush' | 'friend' | 'person'
  name: string
  birth_date: string
  birth_time: string | null
  birth_time_known: boolean
  approximate_time_range: string | null
  city_name: string
  latitude: number
  longitude: number
  created_at: string
  updated_at: string
}

export interface ConnectionReportSection {
  headline: string
  core: string
  dayToDay: string
  watchFor: string
}

export interface SavedProfileReportContent {
  mode: 'teaser' | 'full'
  overview: {
    title: string
    summary: string
    strongestDomain: string
    growthDomain: string
  }
  snapshot?: {
    pull: string
    need: string
    misread: string
  }
  teaser?: string
  domains?: Record<string, ConnectionReportSection>
}

export interface SavedProfileReportRow {
  id: string
  profile_id: string
  user_id: string
  version: number
  relationship_type: RelationshipType
  headline_score: number
  report_content: SavedProfileReportContent
  is_full: boolean
  created_at: string
}
