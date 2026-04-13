import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { ensureUserRecord } from '@/lib/users/ensure-user'

/**
 * GET /api/gdpr/export
 * Instant GDPR data export — returns a downloadable JSON file containing
 * all user data: profile, charts, AI readings, and daily horoscopes.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const appUser = await ensureUserRecord(userId)

  // Fetch all user data in parallel
  const [chartsRes, readingsRes, horoscopesRes] = await Promise.all([
    supabase.from('charts').select('*').eq('user_id', userId),
    supabase.from('ai_readings').select('*').eq('user_id', userId),
    supabase.from('daily_horoscopes').select('*').eq('user_id', userId),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: appUser
      ? {
          subscriptionTier: appUser.subscription_tier,
          createdAt: appUser.created_at,
        }
      : null,
    charts: chartsRes.data ?? [],
    aiReadings: readingsRes.data ?? [],
    dailyHoroscopes: horoscopesRes.data ?? [],
  }

  logAuditEvent(userId, 'account.data_export')

  const json = JSON.stringify(exportData, null, 2)
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="celestia-data-export.json"',
    },
  })
}
