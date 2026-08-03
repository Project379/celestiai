import { after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'

/**
 * GET /api/gdpr/export
 * Instant GDPR data export - returns a downloadable JSON file containing
 * all user data: profile, charts, AI readings, and daily horoscopes.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const { data: membershipRows } = await supabase
    .from('connection_members')
    .select('space_id')
    .eq('user_id', userId)

  const spaceIds = [...new Set((membershipRows ?? []).map((row) => row.space_id))]

  // Fetch all user data in parallel
  const [chartsRes, readingsRes, horoscopesRes, diaryRes, spacesRes, membersRes, invitesRes, savedProfilesRes, userRes] =
    await Promise.all([
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
