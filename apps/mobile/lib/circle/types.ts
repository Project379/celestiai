// Mobile-local mirror of the subset of apps/web/lib/circle/types.ts needed
// for the saved-profiles (crush) surface. Not importable directly — apps/web
// isn't a workspace package apps/mobile can depend on, and these shapes
// aren't in @stellaeum/core (they're API response/DB-row shapes, not shared
// domain logic). Kept in sync by hand; if web's shapes change, update here.
import type { CompatibilityDomainKey, CompatibilitySummary, RelationshipType } from '@stellaeum/core/relationships/types'

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

export interface ConnectionSpaceRow {
  id: string
  label: string | null
  created_by_user_id: string
  status: 'active' | 'archived'
  relationship_type: RelationshipType
  max_members: number | null
  member_count: number
  connection_date: string
  compatibility_summary: CompatibilitySummary
  created_at: string
}

export interface ConnectionMemberView {
  id: string
  space_id: string
  user_id: string
  chart_id: string
  role: 'owner' | 'member'
  chart_name: string | null
}

export interface ConnectionInviteRow {
  id: string
  space_id: string | null
  inviter_user_id: string
  invite_label: string | null
  relationship_type: RelationshipType
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  created_at: string
}

export interface ConnectionReportContent {
  overview: {
    title: string
    summary: string
    strongestDomain: string
    growthDomain: string
  }
  domains: Record<string, ConnectionReportSection>
}

export interface ConnectionReportRow {
  id: string
  space_id: string
  version: number
  relationship_type: RelationshipType
  headline_score: number
  domain_scores: CompatibilitySummary
  report_content: ConnectionReportContent
  created_at: string
}

export interface RelationshipWeatherSignal {
  id: string
  title: string
  summary: string
  date: string
  tone: 'supportive' | 'challenging' | 'mixed'
}

export interface RelationshipWeatherDay {
  date: string
  label: string
  headline: string
  tone: 'supportive' | 'challenging' | 'mixed' | 'quiet'
  signals: RelationshipWeatherSignal[]
}

export interface RelationshipWeatherOverview {
  summary: string
  tone: 'supportive' | 'challenging' | 'mixed' | 'quiet'
  days: RelationshipWeatherDay[]
}

export interface CircleSpaceView {
  space: ConnectionSpaceRow
  members: ConnectionMemberView[]
  latestReport: ConnectionReportRow | null
  weather: RelationshipWeatherOverview | null
}

// Re-exported so consumers only need one import for both the domain
// scoring key and these API-shape types.
export type { CompatibilityDomainKey }
