import { after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/gdpr/export
 * Instant GDPR data export - returns a downloadable JSON file containing
 * all user data (profile, charts, readings, horoscopes, diary, Кръг, crystals, usage counters, own audit events).
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `gdpr-export:${userId}`,
      limit: 5,
      windowMs: 60_000,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }

  const supabase = createServiceSupabaseClient()
  const { data: membershipRows } = await supabase
    .from('connection_members')
    .select('space_id')
    .eq('user_id', userId)

  const spaceIds = [...new Set((membershipRows ?? []).map((row) => row.space_id))]

  // Fetch all user data in parallel
  const [
    chartsRes,
    readingsRes,
    horoscopesRes,
    diaryRes,
    spacesRes,
    membersRes,
    invitesRes,
    savedProfilesRes,
    userRes,
    userCrystalsRes,
    userDailyCrystalsRes,
    recommendationDeliveriesRes,
    recommendationStatesRes,
    recommendationEventsRes,
    birthDataEditsRes,
    pushSubscriptionsRes,
    pushTokensRes,
    crystalRecommendationsRes,
    subscriptionQuotasRes,
    auditLogsRes,
  ] = await Promise.all([
      supabase.from('charts').select('*').eq('user_id', userId),
      supabase.from('ai_readings').select('*').eq('user_id', userId),
      supabase.from('daily_horoscopes').select('*').eq('user_id', userId),
      supabase.from('diary_entries').select('*').eq('user_id', userId),
      spaceIds.length > 0
        ? supabase.from('connection_spaces').select('*').in('id', spaceIds)
        : Promise.resolve({ data: [] }),
      spaceIds.length > 0
        ? supabase.from('connection_members').select('*').in('space_id', spaceIds)
        : Promise.resolve({ data: [] }),
      supabase.from('connection_invites').select('*').eq('inviter_user_id', userId),
      supabase.from('saved_people_profiles').select('*').eq('user_id', userId),
      supabase.from('users').select('*').eq('clerk_id', userId).single(),
      // GDPR fix (2026-08-26 sweep #13): these two tables have a user_id
      // column but were missing from export entirely.
      supabase.from('user_crystals').select('*').eq('user_id', userId),
      supabase.from('user_daily_crystals').select('*').eq('user_id', userId),
      supabase.from('recommendation_deliveries').select('*').eq('user_id', userId),
      supabase.from('user_recommendation_work_states').select('*').eq('user_id', userId),
      supabase.from('recommendation_events').select('*').eq('user_id', userId),
      // Birth-data edit ledger (quota-exemption bookkeeping) — user-linked, so exported.
      supabase.from('birth_data_edits').select('*').eq('user_id', userId),
      // Notification registrations + their preference columns (morning_enabled,
      // diary_enabled). Explicit column lists: the Web Push encryption secrets
      // (p256dh, auth) are deliberately NOT exported — they are credentials, not
      // information about the user. Previously neither table was exported at all.
      supabase
        .from('push_subscriptions')
        .select('id, endpoint, created_at, morning_enabled, diary_enabled')
        .eq('user_id', userId),
      supabase
        .from('push_tokens')
        .select('id, token, platform, device_id, registered_at, revoked_at, last_sent_at, morning_enabled, diary_enabled')
        .eq('user_id', userId),
      // Founder ruling 2026-10-07 (GDPR-EXPORT-UNDECIDED): derived crystal picks and the
      // monthly Oracle usage counter are exported.
      supabase.from('crystal_recommendations').select('*').eq('user_id', userId),
      supabase.from('subscription_quotas').select('*').eq('user_id', userId),
      // The user's OWN audit events only, explicit columns: no row id, no metadata. Metadata
      // can carry other people's identifiers (partnerUserId / inviterUserId) and internal ids,
      // and system.* rows have user_id NULL so are never matched.
      supabase
        .from('audit_logs')
        .select('event_type, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true }),
    ])

  const relationshipIds = (spacesRes.data ?? []).map((row) => row.id)
  const reportsRes =
    relationshipIds.length > 0
      ? await supabase
          .from('connection_reports')
          .select('*')
          .in('space_id', relationshipIds)
      : { data: [] }
  const savedProfileIds = (savedProfilesRes.data ?? []).map((row) => row.id)
  const savedProfileReportsRes =
    savedProfileIds.length > 0
      ? await supabase
          .from('saved_people_reports')
          .select('*')
          .in('profile_id', savedProfileIds)
      : { data: [] }

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: userRes.data
      ? {
          subscriptionTier: userRes.data.subscription_tier,
          createdAt: userRes.data.created_at,
        }
      : null,
    charts: chartsRes.data ?? [],
    aiReadings: readingsRes.data ?? [],
    dailyHoroscopes: horoscopesRes.data ?? [],
    diaryEntries: diaryRes.data ?? [],
    connectionSpaces: spacesRes.data ?? [],
    connectionMembers: membersRes.data ?? [],
    connectionInvites: invitesRes.data ?? [],
    connectionReports: reportsRes.data ?? [],
    savedProfiles: savedProfilesRes.data ?? [],
    savedProfileReports: savedProfileReportsRes.data ?? [],
    userCrystals: userCrystalsRes.data ?? [],
    userDailyCrystals: userDailyCrystalsRes.data ?? [],
    recommendationDeliveries: recommendationDeliveriesRes.data ?? [],
    recommendationWorkStates: recommendationStatesRes.data ?? [],
    recommendationEvents: recommendationEventsRes.data ?? [],
    birthDataEdits: birthDataEditsRes.data ?? [],
    pushSubscriptions: pushSubscriptionsRes.data ?? [],
    pushTokens: pushTokensRes.data ?? [],
    crystalRecommendations: crystalRecommendationsRes.data ?? [],
    subscriptionQuotas: subscriptionQuotasRes.data ?? [],
    auditLog: auditLogsRes.data ?? [],
  }

  after(() => logAuditEvent(userId, 'account.data_export'))

  const json = JSON.stringify(exportData, null, 2)
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="stellaeum-data-export.json"',
    },
  })
}
