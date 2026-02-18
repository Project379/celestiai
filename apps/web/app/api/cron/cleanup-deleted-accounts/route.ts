import { clerkClient } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * GET /api/cron/cleanup-deleted-accounts
 * Vercel cron endpoint that hard-deletes accounts past the 30-day grace period.
 * Removes all user data from Supabase and deletes the Clerk account.
 * Scheduled at 03:00 UTC daily via vercel.json.
 */
export const maxDuration = 60

export async function GET(req: Request) {
  // Verify CRON_SECRET to prevent unauthorized execution
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()

  // Find users whose grace period has expired
  const { data: usersToDelete, error: fetchError } = await supabase
    .from('users')
    .select('id, clerk_id')
    .not('deletion_scheduled_at', 'is', null)
    .lte('deletion_scheduled_at', now)

  if (fetchError) {
    console.error('[Cron Cleanup] Failed to fetch expired accounts:', fetchError)
    return Response.json({ error: 'Грешка при зареждане' }, { status: 500 })
  }

  if (!usersToDelete || usersToDelete.length === 0) {
    return Response.json({ deleted: 0 })
  }

  let deleted = 0

  for (const user of usersToDelete) {
    const clerkId = user.clerk_id

    try {
      // Get user's chart IDs for cascading deletion
      const { data: userCharts } = await supabase
        .from('charts')
        .select('id')
        .eq('user_id', clerkId)

      const chartIds = (userCharts ?? []).map((c: { id: string }) => c.id)

      // Delete data in dependency order
      if (chartIds.length > 0) {
        await supabase
          .from('daily_horoscopes')
          .delete()
          .in('chart_id', chartIds)

        await supabase
          .from('chart_calculations')
          .delete()
          .in('chart_id', chartIds)
      }

      // Delete AI readings by user_id
      await supabase
        .from('ai_readings')
        .delete()
        .eq('user_id', clerkId)

      // Delete charts
      await supabase
        .from('charts')
        .delete()
        .eq('user_id', clerkId)

      // Delete push subscriptions
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', clerkId)

      // Delete user record
      await supabase
        .from('users')
        .delete()
        .eq('clerk_id', clerkId)

      // Delete Clerk account
      const clerk = await clerkClient()
      await clerk.users.deleteUser(clerkId)

      deleted++
      console.log(`[Cron Cleanup] Deleted user ${clerkId}`)
    } catch (err) {
      console.error(`[Cron Cleanup] Failed to delete user ${clerkId}:`, err)
      // Continue with remaining users — one failure shouldn't stop the batch
    }
  }

  console.log(
    `[Cron Cleanup] Completed: ${deleted}/${usersToDelete.length} accounts deleted`
  )

  return Response.json({ deleted })
}
