import { auth } from '@clerk/nextjs/server'
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
    return Response.json({ error: 'Не успяхме да архивираме пространството.' }, { status: 500 })
  }

  await supabase
    .from('connection_members')
    .update({
      status: 'archived',
      archived_at: archivedAt,
    })
    .eq('space_id', relationshipId)
    .eq('status', 'active')

  void logAuditEvent(userId, 'relationship.archived', { spaceId: relationshipId })
  return Response.json({ ok: true })
}
