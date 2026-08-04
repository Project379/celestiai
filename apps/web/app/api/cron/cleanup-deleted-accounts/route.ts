import { clerkClient } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { deleteUserDiaryEntries } from '@stellaeum/core/diary/entries'

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
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
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

      // Delete crush / saved-people reports before profiles
      await supabase
        .from('saved_people_reports')
        .delete()
        .eq('user_id', clerkId)

      await supabase
        .from('saved_people_profiles')
        .delete()
        .eq('user_id', clerkId)

      // Delete connection-space records where the user participated or initiated
      await supabase
        .from('connection_reports')
        .delete()
        .eq('generated_by', clerkId)

      await supabase
        .from('connection_invites')
        .delete()
        .eq('inviter_user_id', clerkId)

      const { data: spaceMemberships } = await supabase
        .from('connection_members')
        .select('space_id')
        .eq('user_id', clerkId)

      const spaceIds = (spaceMemberships ?? []).map((row: { space_id: string }) => row.space_id)

      await supabase
        .from('connection_members')
        .delete()
        .eq('user_id', clerkId)

      if (spaceIds.length > 0) {
        await supabase
          .from('connection_spaces')
          .delete()
          .in('id', spaceIds)
          .eq('created_by_user_id', clerkId)
      }

      // Delete charts
      await supabase
        .from('charts')
        .delete()
        .eq('user_id', clerkId)

      // Delete push subscriptions (web)
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', clerkId)

      // Delete push tokens (mobile, P.16 / REVISIT-26). Sending push to a
      // deleted account's device is a GDPR problem, not a tidiness one —
      // explicit delete here rather than relying solely on the table's
      // ON DELETE CASCADE FK to users.clerk_id, matching this cron's
      // existing defense-in-depth style for every other cascade above.
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', clerkId)

      // Delete diary entries (§8.7). Uses the core helper per the
      // §8.7 direction-of-travel ratification — new cascade tables go
      // through packages/core/src/diary/entries.ts rather than inline
      // Supabase calls. Helper returns { ok: true } | { ok: false, error,
      // message }; a false result is logged and the batch continues,
      // matching the "one failure shouldn't stop the batch" semantic.
      const diaryResult = await deleteUserDiaryEntries(clerkId)
      if (!diaryResult.ok) {
        console.error(
          `[Cron Cleanup] diary_entries delete failed for ${clerkId}:`,
          diaryResult.message,
        )
      }

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
      // Continue with remaining users - one failure shouldn't stop the batch
    }
  }

  console.log(
    `[Cron Cleanup] Completed: ${deleted}/${usersToDelete.length} accounts deleted`
  )

  // Prune expired rate_limit_buckets rows (20260803130000_rate_limit_buckets.sql).
  // Keys are route:userId(:ip), so cardinality is bounded by active users —
  // a daily sweep is enough, no need for hot-path cleanup on every request.
  const { error: rateLimitCleanupError, count: rateLimitRowsDeleted } = await supabase
    .from('rate_limit_buckets')
    .delete({ count: 'exact' })
    .lt('reset_at', now)

  if (rateLimitCleanupError) {
    console.error(
      '[Cron Cleanup] Failed to prune rate_limit_buckets:',
      rateLimitCleanupError
    )
  } else {
    console.log(`[Cron Cleanup] Pruned ${rateLimitRowsDeleted ?? 0} expired rate_limit_buckets rows`)
  }

  return Response.json({ deleted })
}
