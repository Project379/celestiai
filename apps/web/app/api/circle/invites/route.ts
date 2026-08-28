import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { createInviteToken, hashInviteToken } from '@/lib/circle/token'
import { ApiError, readJsonBody } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import {
  getLatestChartRowForUser,
  getSpaceById,
  getUserTier,
  hasActiveRomanticSpace,
  listPendingInvitesForUser,
  listSpaceMembers,
} from '@/lib/circle/service'

const createInviteSchema = z.object({
  chartId: z.string().uuid().optional(),
  label: z.string().trim().max(80).optional(),
  relationshipType: z.enum(['romantic', 'friendship', 'work', 'family']).default('romantic'),
  existingSpaceId: z.string().uuid().optional(),
})

// GET added for the mobile port (Batch 4 sub-batch B) — web never needed
// this either; CircleHub reads pendingInvites off getCircleDashboardData's
// direct server-side DB call. Returns metadata only (no shareUrl/token —
// the raw token is never persisted server-side, only its hash, same
// reason web keeps shareUrl in localStorage rather than re-fetching it).
// A client showing this list can only offer copy/share for invites it
// itself just created and cached locally.
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-invites-list:${userId}`,
      limit: 60,
      windowMs: 60_000,
    })

    const invites = await listPendingInvitesForUser(userId)
    return Response.json(invites)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Invite] list failed:', error)
    return Response.json({ error: 'Не успяхме да заредим поканите.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-invites-create:${userId}`,
      limit: 10,
      windowMs: 60_000,
    })

    const parsed = createInviteSchema.safeParse(await readJsonBody(req))
    if (!parsed.success) {
      return Response.json({ error: 'Невалидни данни' }, { status: 400 })
    }

    const tier = await getUserTier(userId)
    if (tier !== 'premium') {
      return Response.json(
        { error: 'Само Premium потребители могат да изпращат покани за връзка.' },
        { status: 403 },
      )
    }

    const supabase = createServiceSupabaseClient()
    const chart = parsed.data.chartId
      ? await supabase
          .from('charts')
          .select('*')
          .eq('id', parsed.data.chartId)
          .eq('user_id', userId)
          .maybeSingle()
      : { data: await getLatestChartRowForUser(userId), error: null }

    if (chart.error || !chart.data) {
      return Response.json(
        { error: 'Нужна е твоя натална карта, за да изпратиш покана.' },
        { status: 404 },
      )
    }

    if (parsed.data.relationshipType === 'romantic' && !parsed.data.existingSpaceId) {
      const alreadyHasRomantic = await hasActiveRomanticSpace(userId)
      if (alreadyHasRomantic) {
        return Response.json(
          { error: 'Вече имаш активна романтична връзка в Кръг.' },
          { status: 409 },
        )
      }
    }

    if (parsed.data.existingSpaceId) {
      const space = await getSpaceById(parsed.data.existingSpaceId)
      if (!space) {
        return Response.json({ error: 'Пространството не е намерено.' }, { status: 404 })
      }
      if (space.relationship_type === 'romantic') {
        return Response.json(
          { error: 'Романтичните пространства са ограничени до двама души.' },
          { status: 409 },
        )
      }

      const members = await listSpaceMembers(space.id)
      if (!members.some((member) => member.user_id === userId)) {
        return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 403 })
      }
    }

    const token = createInviteToken()
    const tokenHash = hashInviteToken(token)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()

    const { data: invite, error } = await supabase
      .from('connection_invites')
      .insert({
        space_id: parsed.data.existingSpaceId ?? null,
        inviter_user_id: userId,
        inviter_chart_id: chart.data.id,
        invite_label: parsed.data.label || null,
        relationship_type: parsed.data.relationshipType,
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select('*')
      .single()

    if (error || !invite) {
      console.error('[Circle Invite] create failed:', error)
      return Response.json({ error: 'Не успяхме да създадем поканата.' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const shareUrl = `${appUrl}/connect/${token}`

    void logAuditEvent(userId, 'relationship.invite_created', {
      inviteId: invite.id,
      chartId: chart.data.id,
      relationshipType: parsed.data.relationshipType,
      existingSpaceId: parsed.data.existingSpaceId ?? null,
      expiresAt,
    })

    return Response.json({
      inviteId: invite.id,
      expiresAt,
      shareUrl,
      token,
      relationshipType: parsed.data.relationshipType,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Invite] unhandled error:', error)
    return Response.json({ error: 'Не успяхме да създадем поканата.' }, { status: 500 })
  }
}
