import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { PrivacySettingsContent } from './PrivacySettingsContent'

/**
 * /settings/privacy — Privacy settings page.
 * Server component: fetches user deletion state and passes to client.
 */
export default async function PrivacySettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth')

  const supabase = createServiceSupabaseClient()
  const { data: user } = await supabase
    .from('users')
    .select('deleted_at, deletion_scheduled_at')
    .eq('clerk_id', userId)
    .single()

  return (
    <PrivacySettingsContent
      deletedAt={user?.deleted_at ?? null}
      deletionScheduledAt={user?.deletion_scheduled_at ?? null}
    />
  )
}
