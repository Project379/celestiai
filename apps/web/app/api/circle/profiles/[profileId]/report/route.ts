import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import { logAuditEvent } from '@/lib/audit'
import { buildSavedProfileFullContent, buildSavedProfileTeaserContent } from '@/lib/circle/report'
import {
  buildSavedProfileComputation,
  getLatestChartRowForUser,
  getLatestSavedProfileReport,
  getSavedProfileForUser,
  getUserTier,
} from '@/lib/circle/service'

const reportSchema = z.object({
  relationshipType: z.enum(['romantic', 'friendship', 'work', 'family']).optional(),
})

// GET added for the mobile port (web never needed this — CircleHub reads
// latestSavedProfileReports off getCircleDashboardData's direct server-side
// DB call). Mobile has no server-side DB access, only HTTP, so it needs a
// read path that doesn't burn a report generation (rate-limited to 5/min)
// just to redisplay an already-computed report on screen open.
export async function GET(
  _req: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-profile-report-get:${userId}`,
      limit: 60,
      windowMs: 60_000,
    })

    const { profileId } = await context.params
    const profile = await getSavedProfileForUser(userId, profileId)
    if (!profile) {
      return Response.json({ error: 'Профилът не е намерен.' }, { status: 404 })
    }

    const report = await getLatestSavedProfileReport(profileId)
    return Response.json(report)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Profiles] report fetch unhandled error:', error)
    return Response.json({ error: 'Не успяхме да заредим доклада.' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-profile-report:${userId}`,
      limit: 5,
      windowMs: 60_000,
    })

    const { profileId } = await context.params
    const parsed = reportSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return Response.json({ error: 'Невалидни данни.' }, { status: 400 })
    }

    const [tier, userChart, profile] = await Promise.all([
      getUserTier(userId),
      getLatestChartRowForUser(userId),
      getSavedProfileForUser(userId, profileId),
    ])

    if (!userChart) {
      return Response.json(
        { error: 'Нужна е твоя натална карта, за да сравниш с crush профил.' },
        { status: 404 },
      )
    }

    if (!profile) {
      return Response.json({ error: 'Профилът не е намерен.' }, { status: 404 })
    }

    const relationshipType = parsed.data.relationshipType ?? 'romantic'
    const computed = await buildSavedProfileComputation(userChart, profile, relationshipType)
    const isFull = tier === 'premium'
    const reportContent = isFull
      ? buildSavedProfileFullContent(computed.compatibilitySummary, profile.name)
      : buildSavedProfileTeaserContent(computed.compatibilitySummary, profile.name)

    const supabase = createServiceSupabaseClient()
    const { data: latest } = await supabase
      .from('saved_people_reports')
      .select('version')
      .eq('profile_id', profileId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = (latest?.version ?? 0) + 1
    const { data, error } = await supabase
      .from('saved_people_reports')
      .insert({
        profile_id: profileId,
        user_id: userId,
        version: nextVersion,
        relationship_type: relationshipType,
        headline_score: computed.compatibilitySummary.headline_score,
        domain_scores: computed.compatibilitySummary,
        report_content: reportContent,
        is_full: isFull,
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('[Circle Profiles] report failed:', error)
      return Response.json({ error: 'Не успяхме да анализираме профила.' }, { status: 500 })
    }

    void logAuditEvent(userId, 'relationship.saved_profile_report_generated', {
      profileId,
      version: nextVersion,
      isFull,
      relationshipType,
    })

    return Response.json(data)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Profiles] report unhandled error:', error)
    return Response.json({ error: 'Не успяхме да анализираме профила.' }, { status: 500 })
  }
}
