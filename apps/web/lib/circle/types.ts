import type {
  CompatibilitySummary,
  CompositeChartData,
  CrossChartAspect,
  RelationshipType,
} from '@stellaeum/core/relationships/types'

export interface ConnectionSpaceRow {
  id: string
  label: string | null
  created_by_user_id: string
  status: 'active' | 'archived'
  relationship_type: RelationshipType
  max_members: number | null
  member_count: number
  connection_date: string
  anniversary_date: string | null
  compatibility_summary: CompatibilitySummary
  synastry_aspects: CrossChartAspect[]
  composite_chart_data: CompositeChartData
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface ConnectionMemberRow {
  id: string
  space_id: string
  user_id: string
  chart_id: string
  role: 'owner' | 'member'
  status: 'active' | 'archived'
  joined_at: string
  archived_at: string | null
}

export interface ConnectionMemberView extends ConnectionMemberRow {
  chart_name: string | null
}

export interface ConnectionInviteRow {
  id: string
  space_id: string | null
  inviter_user_id: string
  inviter_chart_id: string
  invite_label: string | null
  relationship_type: RelationshipType
  token_hash: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  accepted_by_user_id: string | null
  accepted_at: string | null
  created_at: string
}

export interface ConnectionReportSection {
  headline: string
  core: string
  dayToDay: string
  watchFor: string
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
  generated_by: string
  version: number
  relationship_type: RelationshipType
  headline_score: number
  domain_scores: CompatibilitySummary
  report_content: ConnectionReportContent
  created_at: string
}

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
  domain_scores: CompatibilitySummary
  report_content: SavedProfileReportContent
  is_full: boolean
  created_at: string
}

export interface RelationshipWeatherSignal {
  id: string
  title: string
  summary: string
  date: string
  tone: 'supportive' | 'challenging' | 'mixed'
  strength: number
  orb: number
  applying: boolean
  transitPlanet: string
  compositePlanet: string
  aspect: string
}

export interface RelationshipWeatherDay {
  date: string
  label: string
  headline: string
  tone: 'supportive' | 'challenging' | 'mixed' | 'quiet'
  signals: RelationshipWeatherSignal[]
}

export interface RelationshipWeatherOverview {
  generatedAt: string
  summary: string
  tone: 'supportive' | 'challenging' | 'mixed' | 'quiet'
  topSignal: RelationshipWeatherSignal | null
  days: RelationshipWeatherDay[]
}

export interface CircleSpaceView {
  space: ConnectionSpaceRow
  members: ConnectionMemberView[]
  latestReport: ConnectionReportRow | null
  weather: RelationshipWeatherOverview | null
}

export interface CircleDashboardData {
  tier: 'free' | 'premium'
  chartId: string | null
  chartName: string | null
  spaces: CircleSpaceView[]
  pendingInvites: Array<ConnectionInviteRow & { shareToken?: string | null }>
  savedProfiles: SavedProfileRow[]
  latestSavedProfileReports: Record<string, SavedProfileReportRow | null>
}
