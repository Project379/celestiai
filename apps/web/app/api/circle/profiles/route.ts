import { auth } from '@clerk/nextjs/server'
import { createBirthDataSchema } from '@stellaeum/core/charts/schemas'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { listSavedProfilesForUser } from '@/lib/circle/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-profiles-list:${userId}`,
      limit: 60,
      windowMs: 60_000,
    })

    const profiles = await listSavedProfilesForUser(userId)
    return Response.json(profiles)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Profiles] list failed:', error)
    return Response.json({ error: 'Не успяхме да заредим профилите.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-profiles-create:${userId}`,
      limit: 10,
      windowMs: 60_000,
    })

    const body = await req.json()
    const validation = createBirthDataSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }
      return Response.json({ error: 'Невалидни данни', details: fieldErrors }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()
    const birthDateISO = new Date(`${validation.data.birthDate}T00:00:00Z`).toISOString()

    // SECURITY FIX (2026-08-14, Batch 5.5 #3, migration authorised):
    // was a plain tier-check-then-insert with no DB constraint behind
    // it — two concurrent POSTs from the same free-tier user could both
    // pass the check and both insert, bypassing the 1-profile free-tier
    // cap (a paid boundary, not a minor bug). create_saved_profile_if_allowed
    // (20260814180000_saved_profile_quota_rpc.sql) wraps the tier check,
    // count check, and insert in one atomic Postgres function using a
    // per-user advisory lock — there's no existing row to lock on a
    // user's first profile, so a plain unique constraint can't express
    // this invariant. Returns null when the caller is non-premium and
    // already has an existing profile.
    const { data, error } = await supabase.rpc('create_saved_profile_if_allowed', {
      p_user_id: userId,
      p_kind: 'crush',
      p_name: validation.data.name,
      p_birth_date: birthDateISO,
      p_birth_time_known: validation.data.birthTimeKnown,
      p_birth_time: validation.data.birthTime ?? null,
      p_approximate_time_range: validation.data.approximateTimeRange ?? null,
      p_city_name: validation.data.cityName,
      p_latitude: validation.data.latitude,
      p_longitude: validation.data.longitude,
    })

    if (error) {
      console.error('[Circle Profiles] create failed:', error)
      return Response.json({ error: 'Не успяхме да запазим профила.' }, { status: 500 })
    }

    if (!data) {
      return Response.json(
        { error: 'Без Premium можеш да пазиш само един crush профил.' },
        { status: 403 },
      )
    }

    void logAuditEvent(userId, 'relationship.saved_profile_created', {
      profileId: data.id,
      kind: 'crush',
    })

    return Response.json(data, { status: 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Profiles] create unhandled error:', error)
    return Response.json({ error: 'Не успяхме да запазим профила.' }, { status: 500 })
  }
}
