import { clerkClient } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { deleteUserDiaryEntries } from '@stellaeum/core/diary/entries'
import { verifyCronSecret } from '@/lib/auth/cron-secret'

/**
 * GET /api/cron/cleanup-deleted-accounts
 * Vercel cron endpoint that hard-deletes accounts past the 30-day grace period.
 * Removes all user data from Supabase and deletes the Clerk account.
 * Scheduled at 03:00 UTC daily via vercel.json.
 */
export const maxDuration = 60

/**
 * SECURITY/GDPR FIX (2026-08-26 sweep finding #7): supabase-js `.delete()`
 * does not throw on failure — it returns `{ error }`. Every delete call in
 * this cron previously ignored that field, so a non-throwing failure (RLS
 * denial, constraint violation, transient error) was silently treated as
 * success: the loop proceeded, deleted the Clerk account, and deleted the
 * `users` row — destroying the Batch 5.5 #4 retry anchor with the user's
 * data for that table still sitting in Postgres, permanently, keyed to a
 * Clerk ID that no longer exists. Wrapping every delete in this and
 * throwing on error routes the failure into the per-user try/catch below,
 * which stops BEFORE the Clerk/users-row deletes — restoring the retry
 * anchor the ordering fix assumed a throwing failure would preserve.
 */
async function deleteOrThrow(
  label: string,
  promise: PromiseLike<{ error: { message?: string } | null }>,
) {
  const { error } = await promise
  if (error) {
    throw new Error(`${label} delete failed: ${error.message ?? JSON.stringify(error)}`)
  }
}

export async function GET(req: Request) {
  // Verify CRON_SECRET to prevent unauthorized execution
  //
  // Not rate-limited: request authenticity is enforced via this bearer-secret
  // check, a stronger control than a request-count limit here. If this
  // handler ever accepts requests without the CRON_SECRET check, it needs
  // rate limiting.
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  // Timing-safe comparison (Batch 5.5 #22) — plain !== permits a timing
  // side-channel, low real-world exploitability but a cheap fix.
  if (!verifyCronSecret(authHeader, cronSecret)) {
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
        await deleteOrThrow(
          'daily_horoscopes',
          supabase.from('daily_horoscopes').delete().in('chart_id', chartIds),
        )

        await deleteOrThrow(
          'chart_calculations',
          supabase.from('chart_calculations').delete().in('chart_id', chartIds),
        )
      }

      // Delete AI readings by user_id
      await deleteOrThrow(
        'ai_readings',
        supabase.from('ai_readings').delete().eq('user_id', clerkId),
      )

      // Delete crush / saved-people reports before profiles
      await deleteOrThrow(
        'saved_people_reports',
        supabase.from('saved_people_reports').delete().eq('user_id', clerkId),
      )

      await deleteOrThrow(
        'saved_people_profiles',
        supabase.from('saved_people_profiles').delete().eq('user_id', clerkId),
      )

      // Delete connection-space records where the user participated or initiated
      await deleteOrThrow(
        'connection_reports',
        supabase.from('connection_reports').delete().eq('generated_by', clerkId),
      )

      await deleteOrThrow(
        'connection_invites',
        supabase.from('connection_invites').delete().eq('inviter_user_id', clerkId),
      )

      const { data: spaceMemberships } = await supabase
        .from('connection_members')
        .select('space_id')
        .eq('user_id', clerkId)

      const spaceIds = (spaceMemberships ?? []).map((row: { space_id: string }) => row.space_id)

      await deleteOrThrow(
        'connection_members',
        supabase.from('connection_members').delete().eq('user_id', clerkId),
      )

      if (spaceIds.length > 0) {
        await deleteOrThrow(
          'connection_spaces',
          supabase
            .from('connection_spaces')
            .delete()
            .in('id', spaceIds)
            .eq('created_by_user_id', clerkId),
        )
      }

      // Delete charts
      await deleteOrThrow('charts', supabase.from('charts').delete().eq('user_id', clerkId))

      // Delete push subscriptions (web)
      await deleteOrThrow(
        'push_subscriptions',
        supabase.from('push_subscriptions').delete().eq('user_id', clerkId),
      )

      // Delete push tokens (mobile, P.16 / REVISIT-26). Sending push to a
      // deleted account's device is a GDPR problem, not a tidiness one —
      // explicit delete here rather than relying solely on the table's
      // ON DELETE CASCADE FK to users.clerk_id, matching this cron's
      // existing defense-in-depth style for every other cascade above.
      await deleteOrThrow(
        'push_tokens',
        supabase.from('push_tokens').delete().eq('user_id', clerkId),
      )

      // GDPR fix (2026-08-26 sweep #6): user_crystals and user_daily_crystals
      // both had a user_id column but no FK to users at all (only to
      // crystals) and neither appeared anywhere in this cron — a user's
      // crystal collection and daily-crystal history survived account
      // deletion permanently. A schema-level FK fix is prepared
      // (supabase/migrations/20260826140000_user_crystals_fk.sql) but
      // deliberately not yet applied — it found real orphaned production
      // rows that need a founder decision first. These explicit deletes
      // close the code-level gap immediately, independent of that migration.
      await deleteOrThrow(
        'user_crystals',
        supabase.from('user_crystals').delete().eq('user_id', clerkId),
      )

      await deleteOrThrow(
        'user_daily_crystals',
        supabase.from('user_daily_crystals').delete().eq('user_id', clerkId),
      )

      // Delete diary entries (§8.7). Uses the core helper per the
      // §8.7 direction-of-travel ratification — new cascade tables go
      // through packages/core/src/diary/entries.ts rather than inline
      // Supabase calls. Helper returns { ok: true } | { ok: false, error,
      // message }. FIX (2026-08-26 sweep #7): previously logged-and-
      // continued on failure — the one place in this cron where a delete
      // DID signal failure, and it was swallowed the same way the
      // non-throwing .delete() calls were. Now throws, same as every
      // other delete in this loop, so the per-user catch below stops
      // before the Clerk/users-row deletes destroy the retry anchor.
      const diaryResult = await deleteUserDiaryEntries(clerkId)
      if (!diaryResult.ok) {
        throw new Error(`diary_entries delete failed: ${diaryResult.message}`)
      }

      // SECURITY/GDPR FIX (2026-08-14, Batch 5.5 #4): Clerk account deleted
      // BEFORE the `users` row, not after. The `users` row is this cron's
      // own retry anchor — tomorrow's selection query
      // (`deletion_scheduled_at` not null + past) only finds a user while
      // their row still exists. Deleting it FIRST (the old order) meant
      // that if the Clerk API call failed afterward (rate limit, transient
      // outage — a realistic failure mode as the last step in a long
      // per-user chain), all Supabase data was already gone, the Clerk
      // account survived, and the next run could never find this user
      // again to retry — a live, loginable account with no data and no
      // path to actual deletion. Deleting Clerk first and the `users` row
      // last means any failure anywhere in this block (including the
      // Clerk call itself) leaves the row in place, so tomorrow's run
      // retries the whole per-user block — every delete above is already
      // idempotent against already-empty tables.
      const clerk = await clerkClient()
      try {
        await clerk.users.deleteUser(clerkId)
      } catch (err) {
        // Idempotency for the retry case one level deeper: if a PRIOR run
        // already deleted the Clerk account but then failed on this same
        // users-row delete below (the row is the only thing left, so a
        // narrow failure window still exists), tomorrow's retry would
        // otherwise throw here every time (Clerk 404s on deleting an
        // already-gone user) and get stuck forever, never reaching the
        // users-row delete that would stop the retries. Treat "already
        // deleted" as success and continue.
        const status = (err as { status?: number } | null)?.status
        if (status !== 404) {
          throw err
        }
      }

      // Delete user record LAST — only once the Clerk account is
      // confirmed gone (deleted just now, or already gone from a prior
      // run). See the comment above.
      await supabase
        .from('users')
        .delete()
        .eq('clerk_id', clerkId)

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
