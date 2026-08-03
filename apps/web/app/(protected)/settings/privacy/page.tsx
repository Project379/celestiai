import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { PrivacySettingsContent } from './PrivacySettingsContent'
import { ensureUserRecord } from '@/lib/users/ensure-user'

export const metadata: Metadata = {
  title: 'Поверителност',
  description: 'Управлявай поверителността и изтриването на акаунта си',
}

/**
 * /settings/privacy — Privacy settings page.
 * Server component: fetches user deletion state and passes to client.
 */
export default async function PrivacySettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth')

  const user = await ensureUserRecord(userId)

  return (
    <PrivacySettingsContent
      deletedAt={user.deleted_at}
      deletionScheduledAt={user.deletion_scheduled_at}
    />
  )
}
