import { after } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { requireAppUser } from '@/lib/auth/guards'
import { isDeletionPending } from '@/lib/users/ensure-user'

/**
 * POST /api/gdpr/delete-account
 * Request account deletion with 30-day grace period.
 * Sets deleted_at and deletion_scheduled_at on users table.
 *
 * Narrow requireAccountActive-class guard (B.0h-1): rejects a second
 * request while one is already pending, rather than silently resetting
 * the 30-day clock or double-logging the audit event.
 */
export async function POST() {
  const { userId, user } = await requireAppUser()

  if (isDeletionPending(user)) {
    return Response.json(
      { error: 'Вече има чакаща заявка за изтриване', code: 'DELETION_ALREADY_PENDING' },
      { status: 409 }
    )
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

  after(() => logAuditEvent(userId, 'account.deletion_request', { scheduledDeletion: scheduledDeletion.toISOString() }))

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

  after(() => logAuditEvent(userId, 'account.deletion_confirm', { action: 'cancelled' }))

  return Response.json({
    message: 'Изтриването е отменено успешно',
  })
}
