import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  const { inviteId } = await context.params
  const supabase = createServiceSupabaseClient()

  const { data: invite } = await supabase
    .from('connection_invites')
    .select('id, inviter_user_id, status')
    .eq('id', inviteId)
    .maybeSingle()

  if (!invite) {
    return Response.json({ error: 'Поканата не е намерена.' }, { status: 404 })
  }

  if (invite.inviter_user_id !== userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 403 })
  }

  if (invite.status !== 'pending') {
    return Response.json({ error: 'Поканата вече не е активна.' }, { status: 409 })
  }

  const { error } = await supabase
    .from('connection_invites')
    .update({ status: 'cancelled' })
    .eq('id', inviteId)

  if (error) {
    console.error('[Circle Invite] cancel failed:', error)
    return Response.json({ error: 'Не успяхме да отменим поканата.' }, { status: 500 })
  }

  void logAuditEvent(userId, 'relationship.invite_cancelled', { inviteId })
  return Response.json({ ok: true })
}
