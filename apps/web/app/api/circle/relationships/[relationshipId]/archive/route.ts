import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { listSpaceMembers } from '@/lib/circle/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

export async function POST(
  _req: Request,
  context: { params: Promise<{ relationshipId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-relationships-archive:${userId}`,
      limit: 10,
      windowMs: 60_000,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }

  const { relationshipId } = await context.params
  const supabase = createServiceSupabaseClient()

  const { data: space } = await supabase
    .from('connection_spaces')
    .select('id, status')
    .eq('id', relationshipId)
    .maybeSingle()

  if (!space) {
    return Response.json({ error: 'Пространството не е намерено.' }, { status: 404 })
  }

  const members = await listSpaceMembers(relationshipId)
  if (!members.some((member) => member.user_id === userId)) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 403 })
  }

  if (space.status !== 'active') {
    return Response.json({ error: 'Пространството вече е архивирано.' }, { status: 409 })
  }

  const archivedAt = new Date().toISOString()
  const { error } = await supabase
    .from('connection_spaces')
    .update({
      status: 'archived',
      archived_at: archivedAt,
    })
    .eq('id', relationshipId)

  if (error) {
    console.error('[Circle Connection] archive failed:', error)
    // CAUGHT-500S (historical) — see .planning/PLACEHOLDERS.md.
    Sentry.captureException(error, { extra: { context: 'POST /api/circle/relationships/[relationshipId]/archive' } })
    return Response.json({ error: 'Не успяхме да архивираме пространството.' }, { status: 500 })
  }

  // FIX (2026-08-26, follow-up to sweep #7): this was previously
  // unchecked. The space update above already committed, so this isn't
  // rolled back on failure — but leaving it unchecked meant a failure here
  // was invisible: connection_spaces.status = 'archived' while
  // connection_members.status stayed 'active', a real data-integrity
  // split (hasActiveRomanticSpace and listSpaceMembers read member status
  // independently of space status), with nothing logged to find it by.
  const { error: memberArchiveError } = await supabase
    .from('connection_members')
    .update({
      status: 'archived',
      archived_at: archivedAt,
    })
    .eq('space_id', relationshipId)
    .eq('status', 'active')

  if (memberArchiveError) {
    console.error(
      '[Circle Connection] space archived but member-status cascade failed — connection_spaces/connection_members now inconsistent:',
      { spaceId: relationshipId, error: memberArchiveError },
    )
    // The request still returns 200 (the space IS archived) so this never
    // reaches a caught-500 path, but it leaves connection_spaces.status
    // 'archived' while connection_members.status stays 'active' — a real
    // data-integrity split that hasActiveRomanticSpace / listSpaceMembers
    // read independently. console.error alone lands only in Vercel runtime
    // logs; server-side Sentry needs an explicit call (sentry.server.config
    // captures no console). Warning level: not a user-facing failure, but a
    // state a human must reconcile.
    Sentry.captureMessage('Circle archive: member-status cascade failed after space archived', {
      level: 'warning',
      extra: {
        context: 'POST /api/circle/relationships/[relationshipId]/archive',
        spaceId: relationshipId,
        error: memberArchiveError.message,
      },
    })
  }

  void logAuditEvent(userId, 'relationship.archived', { spaceId: relationshipId })
  return Response.json({ ok: true })
}
