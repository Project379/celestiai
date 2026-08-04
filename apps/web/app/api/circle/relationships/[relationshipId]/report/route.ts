import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { buildCompatibilityReportContent } from '@/lib/circle/report'
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

    const computed = await buildSpaceComputation(resolvedCharts, relationshipType)
    const reportContent = buildCompatibilityReportContent(
      computed.compatibilitySummary,
      space.label || 'вашето пространство',
    )

    const { data: latest } = await supabase
      .from('connection_reports')
      .select('version')
      .eq('space_id', relationshipId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = (latest?.version ?? 0) + 1

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
      console.error('[Circle Report] insert failed:', error)
      return Response.json({ error: 'Не успяхме да генерираме доклада.' }, { status: 500 })
    }

    await supabase
      .from('connection_spaces')
      .update({
        relationship_type: relationshipType,
        member_count: members.length,
        compatibility_summary: computed.compatibilitySummary,
        synastry_aspects: computed.synastryAspects,
        composite_chart_data: computed.compositeChartData,
      })
      .eq('id', relationshipId)

    void logAuditEvent(userId, 'relationship.report_generated', {
      spaceId: relationshipId,
      version: nextVersion,
      relationshipType,
    })

    return Response.json(inserted)
  } catch (error) {
    console.error('[Circle Report] unhandled error:', error)
    return Response.json({ error: 'Не успяхме да генерираме доклада.' }, { status: 500 })
  }
}
