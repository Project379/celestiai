import { auth } from '@clerk/nextjs/server'
import {
  listDiaryEntries,
  upsertDiaryEntry,
} from '@celestia/core/diary/entries'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { createDiaryEntrySchema } from '@/lib/validators/diary'

/**
 * Error IDs emitted by this handler (see PRE_LAUNCH_PREREQS.md item 2
 * for the monitoring-swap path when Sentry/equivalent ships):
 *   ERR-DI-003 — POST upsert failed (core returned UPSERT_FAILED or
 *                unhandled throw during the upsert path)
 *   ERR-DI-004 — GET list failed (listDiaryEntries threw)
 *
 * The ERR-DI-NNN namespace was opened in §8.1 with 001/002 (client-side
 * localStorage read/write) and extends here with 003/004 for the
 * collection endpoint. Per §8.2 Decision B's two-voice framing, Zod
 * rejections surface as 400 with Bulgarian field errors; DB CHECK
 * violations that slip past Zod surface as ERR-DI-003 (generic write
 * failed) with the constraint detail console.error'd but not exposed
 * to the user.
 */

/**
 * users.created_at bound check for POST entry_date validation (§A2
 * sealing). Uses the established service-role factory — consistent
 * with the 14+ other user-scoped endpoints in the codebase. Returns
 * null if the user row doesn't exist yet — caller treats absent-user
 * as "no lower bound to enforce"; the users row will be upserted on
 * first write elsewhere in the system if needed.
 */
async function readUserCreatedAt(userId: string): Promise<string | null> {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase
    .from('users')
    .select('created_at')
    .eq('clerk_id', userId)
    .maybeSingle()
  return (data?.created_at as string | undefined) ?? null
}

/**
 * GET /api/diary/entries — list the caller's diary entries.
 * Supports optional ?phase_id= filter for the §8.8 variant-count query.
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const phaseId = url.searchParams.get('phase_id') ?? undefined
    const entries = await listDiaryEntries(userId, phaseId ? { phaseId } : {})
    return Response.json(entries)
  } catch (error) {
    console.error('[ERR-DI-004] GET /api/diary/entries list failed:', error)
    return Response.json(
      {
        error: 'Не успяхме да заредим дневника. Опитай отново. Код: ERR-DI-004.',
        code: 'ERR-DI-004',
      },
      { status: 500 },
    )
  }
}

/**
 * POST /api/diary/entries — upsert on (user_id, entry_date).
 *
 * HTTP semantic (sealed 2026-04-21 post commit-2 surface, Alt A):
 * **always 200 OK**, with the create-vs-update signal carried in the
 * response body as `{ ...DiaryEntryRow, created: boolean }`. Unifies
 * the success path at the HTTP layer (no status-code branching in
 * hook / mobile / integration tests) while preserving the telemetric
 * signal for any client that needs it. Inconsistent with birth-data.ts's
 * 201-on-create pattern — birth-data isn't an upsert so the parity
 * argument is weaker than it looks; pragmatic-post-REST convention
 * used by Stripe and similar favors unified 200 for upsert paths.
 */
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const validation = createDiaryEntrySchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }
      return Response.json(
        { error: 'Невалидни данни', details: fieldErrors },
        { status: 400 },
      )
    }

    // §A2 sealing bound: entry_date >= users.created_at (lower bound
    // from the account's existence, not from a fixed constant). Route
    // layer does this rather than Zod because it requires a DB read.
    const userCreatedAt = await readUserCreatedAt(userId)
    if (userCreatedAt) {
      const userCreatedUtc = new Date(userCreatedAt).getTime()
      const [y, m, d] = validation.data.entryDate.split('-').map(Number)
      const entryUtc = Date.UTC(y!, m! - 1, d!)
      // Use calendar-day granularity: allow entry_date matching account
      // creation day even if created-time is later the same day.
      const userCreatedDateUtc = Date.UTC(
        new Date(userCreatedAt).getUTCFullYear(),
        new Date(userCreatedAt).getUTCMonth(),
        new Date(userCreatedAt).getUTCDate(),
      )
      if (entryUtc < userCreatedDateUtc) {
        return Response.json(
          {
            error: 'Невалидни данни',
            details: {
              entryDate: ['Датата е преди създаването на профила'],
            },
          },
          { status: 400 },
        )
      }
      // userCreatedUtc referenced to silence unused-var if a future
      // refinement moves to timestamp comparison.
      void userCreatedUtc
    }

    const result = await upsertDiaryEntry(userId, validation.data)
    if (!result.ok) {
      console.error(
        '[ERR-DI-003] POST /api/diary/entries upsert failed:',
        result.error,
        result.message,
      )
      return Response.json(
        {
          error: 'Не успяхме да запазим страницата в дневника. Опитай отново. Код: ERR-DI-003.',
          code: 'ERR-DI-003',
        },
        { status: 500 },
      )
    }

    return Response.json(
      { ...result.data, created: result.created },
      { status: 200 },
    )
  } catch (error) {
    console.error('[ERR-DI-003] POST /api/diary/entries unhandled error:', error)
    return Response.json(
      {
        error: 'Не успяхме да запазим страницата в дневника. Опитай отново. Код: ERR-DI-003.',
        code: 'ERR-DI-003',
      },
      { status: 500 },
    )
  }
}
