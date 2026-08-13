import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { getSavedProfileForUser } from '@/lib/circle/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-profiles-delete:${userId}`,
      limit: 10,
      windowMs: 60_000,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }

  const { profileId } = await context.params
  const profile = await getSavedProfileForUser(userId, profileId)
  if (!profile) {
    return Response.json({ error: 'Профилът не е намерен.' }, { status: 404 })
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('saved_people_profiles')
    .delete()
    .eq('id', profileId)
    .eq('user_id', userId)

  if (error) {
    console.error('[Circle Profiles] delete failed:', error)
    return Response.json({ error: 'Не успяхме да изтрием профила.' }, { status: 500 })
  }

  void logAuditEvent(userId, 'relationship.saved_profile_deleted', { profileId })
  return Response.json({ ok: true })
}
