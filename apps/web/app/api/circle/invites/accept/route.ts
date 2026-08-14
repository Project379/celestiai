import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { buildCompatibilityReportContent } from '@/lib/circle/report'
import {
  buildSpaceComputation,
  getChartById,
  getLatestChartRowForUser,
  getSpaceById,
  hasActiveRomanticSpace,
  listSpaceMembers,
} from '@/lib/circle/service'
import type { ConnectionInviteRow } from '@/lib/circle/types'
import { hashInviteToken } from '@/lib/circle/token'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

const acceptInviteSchema = z.object({
  token: z.string().min(16),
})

const INVALID_INVITE_RESPONSE = { error: 'Поканата е изтекла или не е валидна.' } as const

// Thrown by the post-claim work to unwind through a single catch that
// releases the claim before responding — see the AcceptRejected handling
// below the claim block for why every early exit after a successful claim
// goes through this instead of a bare `return`.
class AcceptRejected extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super('AcceptRejected')
  }
}

/**
 * Releases a claimed-but-not-completed invite back to 'pending' so the
 * token remains usable (by the same or a different request) instead of
 * being permanently burned by a failure that happened after the claim
 * but before a space existed. Best-effort, not transactional — see the
 * claim block's comment for why a true rollback would need a database
 * transaction (an RPC function, which is a migration) rather than a
 * second REST call. Guarded by `.eq('status', 'accepted')` so it's a
 * no-op if the invite was already moved on by something else.
 */
async function releaseClaim(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  inviteId: string,
) {
  const { error } = await supabase
    .from('connection_invites')
    .update({ status: 'pending', accepted_by_user_id: null, accepted_at: null })
    .eq('id', inviteId)
    .eq('status', 'accepted')

  if (error) {
    // Nothing further to do — the invite stays claimed-but-incomplete
    // until it expires naturally (expires_at is untouched by the claim).
    // Logged so a stuck token is at least visible, not silent.
    console.error('[Circle Invite] failed to release claim after a post-claim failure:', inviteId, error)
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  let claimedInvite: ConnectionInviteRow | null = null

  try {
    await assertRateLimit({
      key: `circle-invites-accept:${userId}`,
      limit: 10,
      windowMs: 60_000,
    })

    // Rate-limit-first invariant (Batch 3 finding, routes-surface-429.test.ts)
    // — the client must not be constructed, let alone queried, before the
    // burst guard has passed.
    const supabase = createServiceSupabaseClient()

    const parsed = acceptInviteSchema.safeParse(await req.json())
    if (!parsed.success) {
      return Response.json({ error: 'Невалидна покана.' }, { status: 400 })
    }

    const tokenHash = hashInviteToken(parsed.data.token)
    const now = new Date().toISOString()

    // Atomic claim — a single conditional UPDATE...RETURNING, not a
    // check-then-update. This is the one statement that decides which
    // concurrent request (if any) owns the invite; everything below
    // assumes exclusive ownership won here. Two POSTs racing the same
    // still-valid token both reach this statement, but only one UPDATE
    // can match `status = 'pending'` — Postgres serializes the two
    // writes, the second sees the row already flipped to 'accepted' and
    // matches zero rows. That's what makes this safe where the previous
    // SELECT-then-UPDATE version wasn't: a plain read can't exclude a
    // second reader from also passing the same check before either
    // commits its write.
    const { data: claimed, error: claimError } = await supabase
      .from('connection_invites')
      .update({ status: 'accepted', accepted_by_user_id: userId, accepted_at: now })
      .eq('token_hash', tokenHash)
      .eq('status', 'pending')
      .gt('expires_at', now)
      .select('*')
      .maybeSingle()

    if (claimError) {
      console.error('[Circle Invite] accept claim failed:', claimError)
      return Response.json({ error: 'Не успяхме да приемем поканата.' }, { status: 500 })
    }

    if (!claimed) {
      // A losing racer, an already-accepted token, an expired token, and
      // an unknown token are all indistinguishable here — same status,
      // same message, no timing signal about which case it was.
      return Response.json(INVALID_INVITE_RESPONSE, { status: 404 })
    }

    claimedInvite = claimed as ConnectionInviteRow

    try {
      if (claimedInvite.inviter_user_id === userId) {
        throw new AcceptRejected(409, { error: 'Не можеш да приемеш собствената си покана.' })
      }

      const inviteeChart = await getLatestChartRowForUser(userId)
      if (!inviteeChart) {
        throw new AcceptRejected(404, { error: 'Трябва да имаш натална карта, за да се присъединиш.' })
      }

      if (claimedInvite.relationship_type === 'romantic') {
        const inviteeHasRomantic = await hasActiveRomanticSpace(userId)
        if (inviteeHasRomantic) {
          throw new AcceptRejected(409, { error: 'Вече имаш активна романтична връзка в Кръг.' })
        }
      }

      let spaceId = claimedInvite.space_id
      let label = claimedInvite.invite_label

      if (spaceId) {
        const space = await getSpaceById(spaceId)
        if (!space) {
          throw new AcceptRejected(404, { error: 'Пространството вече не съществува.' })
        }
        if (space.status !== 'active') {
          throw new AcceptRejected(409, { error: 'Пространството вече не е активно.' })
        }

        const members = await listSpaceMembers(space.id)
        if (members.some((member) => member.user_id === userId)) {
          throw new AcceptRejected(409, { error: 'Вече си част от това пространство.' })
        }
        if (space.relationship_type === 'romantic') {
          throw new AcceptRejected(409, {
            error: 'Романтичните пространства не могат да имат повече от двама души.',
          })
        }

        const { error: memberError } = await supabase.from('connection_members').insert({
          space_id: space.id,
          user_id: userId,
          chart_id: inviteeChart.id,
          role: 'member',
        })

        if (memberError) {
          console.error('[Circle Invite] accept existing-space member insert failed:', memberError)
          throw new AcceptRejected(500, { error: 'Не успяхме да добавим човека в групата.' })
        }

        label = label || space.label
        spaceId = space.id
      } else {
        const inviterChart = await getChartById(claimedInvite.inviter_chart_id)
        if (!inviterChart) {
          throw new AcceptRejected(404, { error: 'Липсва карта на изпращача на поканата.' })
        }

        if (claimedInvite.relationship_type === 'romantic') {
          const inviterHasRomantic = await hasActiveRomanticSpace(claimedInvite.inviter_user_id)
          if (inviterHasRomantic) {
            throw new AcceptRejected(409, { error: 'Изпращачът вече има активна романтична връзка.' })
          }
        }

        const { data: insertedSpace, error: spaceError } = await supabase
          .from('connection_spaces')
          .insert({
            label: label || `${inviterChart.name || 'Вие'} & ${inviteeChart.name || 'Ново пространство'}`,
            created_by_user_id: claimedInvite.inviter_user_id,
            relationship_type: claimedInvite.relationship_type,
            max_members: claimedInvite.relationship_type === 'romantic' ? 2 : null,
            member_count: 2,
          })
          .select('id')
          .single()

        if (spaceError || !insertedSpace) {
          console.error('[Circle Invite] accept new-space create failed:', spaceError)
          throw new AcceptRejected(500, { error: 'Не успяхме да създадем пространството.' })
        }

        spaceId = insertedSpace.id
        label = label || `${inviterChart.name || 'Вие'} & ${inviteeChart.name || 'Ново пространство'}`

        const { error: membersError } = await supabase.from('connection_members').insert([
          {
            space_id: spaceId,
            user_id: claimedInvite.inviter_user_id,
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
          throw new AcceptRejected(500, { error: 'Не успяхме да свържем членовете.' })
        }

        // Persist the newly-created space back onto the invite. The
        // claim above already set status/accepted_by_user_id/accepted_at
        // — this is a separate, non-exclusivity-relevant write, so it
        // doesn't need to be part of the same atomic statement.
        const { error: linkError } = await supabase
          .from('connection_invites')
          .update({ space_id: spaceId })
          .eq('id', claimedInvite.id)

        if (linkError) {
          console.error('[Circle Invite] accept failed to link new space to invite:', linkError)
          // Not fatal to the accepting user's flow — the space and
          // memberships exist and are usable. The invite row just won't
          // reflect which space it produced, same class of gap as any
          // other post-claim non-transactional write. Logged, not thrown.
        }
      }

      if (!spaceId) {
        throw new AcceptRejected(500, { error: 'Липсва пространство за поканата.' })
      }

      const members = await listSpaceMembers(spaceId)
      const charts = await Promise.all(members.map((member) => getChartById(member.chart_id)))
      const resolvedCharts = charts.filter((chart): chart is NonNullable<typeof chart> => Boolean(chart))
      const computed = await buildSpaceComputation(resolvedCharts, claimedInvite.relationship_type)

      const { data: latest } = await supabase
        .from('connection_reports')
        .select('version')
        .eq('space_id', spaceId)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextVersion = (latest?.version ?? 0) + 1

      const { error: spaceUpdateError } = await supabase
        .from('connection_spaces')
        .update({
          member_count: members.length,
          compatibility_summary: computed.compatibilitySummary,
          synastry_aspects: computed.synastryAspects,
          composite_chart_data: computed.compositeChartData,
        })
        .eq('id', spaceId)

      if (spaceUpdateError) {
        // Not fatal — cache staleness only (Batch 5.5 #12/#13, same
        // unchecked-update shape as the standalone report routes). The
        // member was already added successfully above.
        console.error('[Circle Invite] accept failed to refresh space cache:', spaceUpdateError)
      }

      const { error: reportInsertError } = await supabase.from('connection_reports').insert({
        space_id: spaceId,
        generated_by: userId,
        version: nextVersion,
        relationship_type: claimedInvite.relationship_type,
        headline_score: computed.compatibilitySummary.headline_score,
        domain_scores: computed.compatibilitySummary,
        report_content: buildCompatibilityReportContent(
          computed.compatibilitySummary,
          label || 'вашето пространство',
        ),
      })

      if (reportInsertError) {
        // SECURITY/CORRECTNESS FIX (2026-08-14, Batch 5.5 #2): same bug
        // class Batch 4 fixed in the two standalone report routes (commit
        // 7d60778) — connection_reports_unique_version (UNIQUE(space_id,
        // version)) is the real exclusivity control when two DIFFERENT
        // invites into the SAME existing group space are accepted
        // concurrently. Both requests already claimed their own distinct
        // token via the atomic UPDATE above and already added their own
        // member row (both real, already-committed writes) — this is a
        // genuine multi-invite race, not the single-token race the claim
        // already prevents — but both compute the same nextVersion from
        // the same pre-write read, so the loser's insert 23505s. Unlike
        // the standalone report routes, this route's success response is
        // just {spaceId} with no report content echoed, so there's
        // nothing to fetch-and-return: the winner's concurrent request
        // already produced a valid report for this space+version. Treat
        // that as success. Any OTHER error is real — surface it via
        // AcceptRejected rather than silently swallowing (the pre-fix
        // behavior: no error check at all, so a genuine insert failure
        // here still returned 200 with a member added and no report).
        const code = (reportInsertError as { code?: string }).code
        if (code !== '23505') {
          console.error('[Circle Invite] accept report insert failed:', reportInsertError)
          throw new AcceptRejected(500, { error: 'Не успяхме да генерираме доклада.' })
        }
      }

      void logAuditEvent(claimedInvite.inviter_user_id, 'relationship.connected', {
        spaceId,
        inviteId: claimedInvite.id,
        partnerUserId: userId,
        relationshipType: claimedInvite.relationship_type,
      })
      void logAuditEvent(userId, 'relationship.connected', {
        spaceId,
        inviteId: claimedInvite.id,
        inviterUserId: claimedInvite.inviter_user_id,
        relationshipType: claimedInvite.relationship_type,
      })

      return Response.json({ spaceId })
    } catch (innerError) {
      // Anything that fails after a successful claim burns the token
      // unless we hand it back. Best-effort release (see releaseClaim's
      // own comment on why this isn't a transaction) rather than leaving
      // the accepting user stuck with a token that's marked accepted but
      // produced nothing.
      await releaseClaim(supabase, claimedInvite.id)

      if (innerError instanceof AcceptRejected) {
        return Response.json(innerError.body, { status: innerError.status })
      }
      throw innerError
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Invite] accept unhandled error:', error)
    return Response.json({ error: 'Не успяхме да приемем поканата.' }, { status: 500 })
  }
}
