import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import { logAuditEvent } from '@/lib/audit'
import { buildCompatibilityReportContent, MAX_REPORT_VERSIONS_PER_PAIR } from '@/lib/circle/report'
import {
  buildSpaceComputation,
  getChartById,
  getSpaceById,
  getUserTier,
  listSpaceMembers,
} from '@/lib/circle/service'

const generateReportSchema = z.object({
  relationshipType: z.enum(['romantic', 'friendship', 'work', 'family']).optional(),
})

export async function POST(
  req: Request,
  context: { params: Promise<{ relationshipId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-relationship-report:${userId}`,
      limit: 5,
      windowMs: 60_000,
    })

    const { relationshipId } = await context.params
    const parsed = generateReportSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return Response.json({ error: 'Невалидни данни.' }, { status: 400 })
    }

    const tier = await getUserTier(userId)
    if (tier !== 'premium') {
      return Response.json(
        { error: 'Само Premium потребители могат да генерират нов доклад.' },
        { status: 403 },
      )
    }

    const supabase = createServiceSupabaseClient()
    const [space, members] = await Promise.all([
      getSpaceById(relationshipId),
      listSpaceMembers(relationshipId),
    ])

    if (!space) {
      return Response.json({ error: 'Пространството не е намерено.' }, { status: 404 })
    }

    if (!members.some((member) => member.user_id === userId)) {
      return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 403 })
    }

    const relationshipType = parsed.data.relationshipType ?? space.relationship_type
    const charts = await Promise.all(members.map((member) => getChartById(member.chart_id)))
    const resolvedCharts = charts.filter((chart): chart is NonNullable<typeof chart> => Boolean(chart))

    if (resolvedCharts.length < 2) {
      return Response.json(
        { error: 'Нужни са поне двама души с валидни карти.' },
        { status: 404 },
      )
    }

    const { data: baseline } = await supabase
      .from('connection_reports')
      .select('version')
      .eq('space_id', relationshipId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()
    const baselineVersion = baseline?.version ?? 0

    if (baselineVersion >= MAX_REPORT_VERSIONS_PER_PAIR) {
      return Response.json(
        { error: 'Достигнат е лимитът от доклади за това пространство.' },
        { status: 429 },
      )
    }

    const computed = await buildSpaceComputation(resolvedCharts, relationshipType)
    const reportContent = buildCompatibilityReportContent(
      computed.compatibilitySummary,
      space.label || 'вашето пространство',
    )

    const nextVersion = baselineVersion + 1

    const { data: inserted, error } = await supabase
      .from('connection_reports')
      .insert({
        space_id: relationshipId,
        generated_by: userId,
        version: nextVersion,
        relationship_type: relationshipType,
        headline_score: computed.compatibilitySummary.headline_score,
        domain_scores: computed.compatibilitySummary,
        report_content: reportContent,
      })
      .select('*')
      .single()

    if (error || !inserted) {
      // `connection_reports_unique_version` — UNIQUE(space_id, version),
      // live since the original schema migration — is the actual
      // exclusivity control here, the same shape the invite-accept fix
      // added deliberately, except this one already existed. Two
      // concurrent generations racing the same `nextVersion` both attempt
      // this insert; Postgres serializes the two, and the loser gets a
      // 23505 unique-violation, not a generic failure. Treat that
      // specific error as "someone else already generated this version" —
      // fetch and return their (now-current) report instead of a 500. Any
      // OTHER insert error still fails loudly; a unique-violation on this
      // exact constraint is the one case with a well-defined non-error
      // resolution.
      if (error && (error as { code?: string }).code === '23505') {
        const { data: winner } = await supabase
          .from('connection_reports')
          .select('*')
          .eq('space_id', relationshipId)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (winner) return Response.json(winner)
      }
      console.error('[Circle Report] insert failed:', error)
      return Response.json({ error: 'Не успяхме да генерираме доклада.' }, { status: 500 })
    }

    const { error: spaceUpdateError } = await supabase
      .from('connection_spaces')
      .update({
        relationship_type: relationshipType,
        member_count: members.length,
        compatibility_summary: computed.compatibilitySummary,
        synastry_aspects: computed.synastryAspects,
        composite_chart_data: computed.compositeChartData,
      })
      .eq('id', relationshipId)

    if (spaceUpdateError) {
      // Not fatal (Batch 5.5 #12) — cache staleness only, the report row
      // itself was already inserted successfully above.
      console.error('[Circle Report] failed to refresh space cache:', spaceUpdateError)
    }

    void logAuditEvent(userId, 'relationship.report_generated', {
      spaceId: relationshipId,
      version: nextVersion,
      relationshipType,
    })

    return Response.json(inserted)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Report] unhandled error:', error)
    return Response.json({ error: 'Не успяхме да генерираме доклада.' }, { status: 500 })
  }
}
