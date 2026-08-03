import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { buildCompatibilityReportContent } from '@/lib/circle/report'
import {
  buildSpaceComputation,
  getChartById,
  getConnectionInviteByTokenHash,
  getLatestChartRowForUser,
  getSpaceById,
  hasActiveRomanticSpace,
  listSpaceMembers,
} from '@/lib/circle/service'
import { hashInviteToken } from '@/lib/circle/token'

const acceptInviteSchema = z.object({
  token: z.string().min(16),
})

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const parsed = acceptInviteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: 'Невалидна покана.' }, { status: 400 })
    }

    const tokenHash = hashInviteToken(parsed.data.token)
    const invite = await getConnectionInviteByTokenHash(tokenHash)
    if (!invite) {
      return Response.json({ error: 'Поканата е изтекла или не е валидна.' }, { status: 404 })
    }

    if (invite.inviter_user_id === userId) {
      return Response.json({ error: 'Не можеш да приемеш собствената си покана.' }, { status: 409 })
    }

    const supabase = createServiceSupabaseClient()
    const inviteeChart = await getLatestChartRowForUser(userId)
    if (!inviteeChart) {
      return Response.json(
        { error: 'Трябва да имаш натална карта, за да се присъединиш.' },
        { status: 404 },
      )
    }

    if (invite.relationship_type === 'romantic') {
      const inviteeHasRomantic = await hasActiveRomanticSpace(userId)
      if (inviteeHasRomantic) {
        return Response.json(
          { error: 'Вече имаш активна романтична връзка в Кръг.' },
          { status: 409 },
        )
      }
    }

    let spaceId = invite.space_id
    let label = invite.invite_label

    if (spaceId) {
      const space = await getSpaceById(spaceId)
      if (!space) {
        return Response.json({ error: 'Пространството вече не съществува.' }, { status: 404 })
      }
      if (space.status !== 'active') {
        return Response.json({ error: 'Пространството вече не е активно.' }, { status: 409 })
      }

      const members = await listSpaceMembers(space.id)
      if (members.some((member) => member.user_id === userId)) {
        return Response.json({ error: 'Вече си част от това пространство.' }, { status: 409 })
      }
      if (space.relationship_type === 'romantic') {
        return Response.json(
          { error: 'Романтичните пространства не могат да имат повече от двама души.' },
          { status: 409 },
        )
      }

      const { error: memberError } = await supabase.from('connection_members').insert({
        space_id: space.id,
        user_id: userId,
        chart_id: inviteeChart.id,
        role: 'member',
      })

      if (memberError) {
        console.error('[Circle Invite] accept existing-space member insert failed:', memberError)
        return Response.json({ error: 'Не успяхме да добавим човека в групата.' }, { status: 500 })
      }

      label = label || space.label
      spaceId = space.id
    } else {
      const inviterChart = await getChartById(invite.inviter_chart_id)
      if (!inviterChart) {
        return Response.json(
          { error: 'Липсва карта на изпращача на поканата.' },
          { status: 404 },
        )
      }

      if (invite.relationship_type === 'romantic') {
        const inviterHasRomantic = await hasActiveRomanticSpace(invite.inviter_user_id)
        if (inviterHasRomantic) {
          return Response.json(
            { error: 'Изпращачът вече има активна романтична връзка.' },
            { status: 409 },
          )
        }
      }

      const { data: insertedSpace, error: spaceError } = await supabase
        .from('connection_spaces')
        .insert({
          label: label || `${inviterChart.name || 'Вие'} & ${inviteeChart.name || 'Ново пространство'}`,
          created_by_user_id: invite.inviter_user_id,
          relationship_type: invite.relationship_type,
          max_members: invite.relationship_type === 'romantic' ? 2 : null,
          member_count: 2,
        })
        .select('id')
        .single()

      if (spaceError || !insertedSpace) {
        console.error('[Circle Invite] accept new-space create failed:', spaceError)
        return Response.json({ error: 'Не успяхме да създадем пространството.' }, { status: 500 })
      }

      spaceId = insertedSpace.id
      label = label || `${inviterChart.name || 'Вие'} & ${inviteeChart.name || 'Ново пространство'}`

      const { error: membersError } = await supabase.from('connection_members').insert([
        {
          space_id: spaceId,
          user_id: invite.inviter_user_id,
          chart_id: inviterChart.id,
          role: 'owner',
        },
        {
          space_id: spaceId,
          user_id: userId,
          chart_id: inviteeChart.id,
          role: 'member',
        },
      ])

      if (membersError) {
        console.error('[Circle Invite] accept new-space members insert failed:', membersError)
        return Response.json({ error: 'Не успяхме да свържем членовете.' }, { status: 500 })
      }
    }

    if (!spaceId) {
      return Response.json({ error: 'Липсва пространство за поканата.' }, { status: 500 })
    }

    const members = await listSpaceMembers(spaceId)
    const charts = await Promise.all(members.map((member) => getChartById(member.chart_id)))
    const resolvedCharts = charts.filter((chart): chart is NonNullable<typeof chart> => Boolean(chart))
    const computed = await buildSpaceComputation(resolvedCharts, invite.relationship_type)

    const { data: latest } = await supabase
      .from('connection_reports')
      .select('version')
      .eq('space_id', spaceId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = (latest?.version ?? 0) + 1

    await supabase
      .from('connection_spaces')
      .update({
        member_count: members.length,
        compatibility_summary: computed.compatibilitySummary,
        synastry_aspects: computed.synastryAspects,
        composite_chart_data: computed.compositeChartData,
      })
      .eq('id', spaceId)

    await supabase.from('connection_reports').insert({
      space_id: spaceId,
      generated_by: userId,
      version: nextVersion,
      relationship_type: invite.relationship_type,
      headline_score: computed.compatibilitySummary.headline_score,
      domain_scores: computed.compatibilitySummary,
      report_content: buildCompatibilityReportContent(
        computed.compatibilitySummary,
        label || 'вашето пространство',
      ),
    })

    await supabase
      .from('connection_invites')
      .update({
        status: 'accepted',
        accepted_by_user_id: userId,
        accepted_at: new Date().toISOString(),
        space_id: spaceId,
      })
      .eq('id', invite.id)

    void logAuditEvent(invite.inviter_user_id, 'relationship.connected', {
      spaceId,
      inviteId: invite.id,
      partnerUserId: userId,
      relationshipType: invite.relationship_type,
    })
    void logAuditEvent(userId, 'relationship.connected', {
      spaceId,
      inviteId: invite.id,
      inviterUserId: invite.inviter_user_id,
      relationshipType: invite.relationship_type,
    })

    return Response.json({ spaceId })
  } catch (error) {
    console.error('[Circle Invite] accept unhandled error:', error)
    return Response.json({ error: 'Не успяхме да приемем поканата.' }, { status: 500 })
  }
}
