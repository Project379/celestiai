import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { getSavedProfileForUser } from '@/lib/circle/service'

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ profileId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
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
