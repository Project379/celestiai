import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * POST /api/gdpr/delete-account
 * Request account deletion with 30-day grace period.
 * Sets deleted_at and deletion_scheduled_at on users table.
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date()
  const scheduledDeletion = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { error } = await supabase
    .from('users')
    .update({
      deleted_at: now.toISOString(),
      deletion_scheduled_at: scheduledDeletion.toISOString(),
    })
    .eq('clerk_id', userId)

  if (error) {
    console.error('[GDPR Delete] Failed to request deletion:', error)
    return Response.json(
      { error: 'Грешка при заявка за изтриване' },
      { status: 500 }
    )
  }

  return Response.json({
    message: 'Заявката за изтриване е регистрирана',
    scheduledDeletion: scheduledDeletion.toISOString(),
  })
}

/**
 * DELETE /api/gdpr/delete-account
 * Cancel pending account deletion during grace period.
 * Clears deleted_at and deletion_scheduled_at on users table.
 */
export async function DELETE() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()

  const { error } = await supabase
    .from('users')
    .update({
      deleted_at: null,
      deletion_scheduled_at: null,
    })
    .eq('clerk_id', userId)

  if (error) {
    console.error('[GDPR Delete] Failed to cancel deletion:', error)
    return Response.json(
      { error: 'Грешка при отмяна на изтриването' },
      { status: 500 }
    )
  }

  return Response.json({
    message: 'Изтриването е отменено успешно',
  })
}
