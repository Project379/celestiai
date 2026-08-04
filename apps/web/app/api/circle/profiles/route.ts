import { auth } from '@clerk/nextjs/server'
import { createBirthDataSchema } from '@stellaeum/core/charts/schemas'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { listSavedProfilesForUser, getUserTier } from '@/lib/circle/service'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    const profiles = await listSavedProfilesForUser(userId)
    return Response.json(profiles)
  } catch (error) {
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

    const tier = await getUserTier(userId)
    const existingProfiles = await listSavedProfilesForUser(userId)
    if (tier !== 'premium' && existingProfiles.length >= 1) {
      return Response.json(
        { error: 'Без Premium можеш да пазиш само един crush профил.' },
        { status: 403 },
      )
    }

    const supabase = createServiceSupabaseClient()
    const birthDateISO = new Date(`${validation.data.birthDate}T00:00:00Z`).toISOString()
    const { data, error } = await supabase
      .from('saved_people_profiles')
      .insert({
        user_id: userId,
        kind: 'crush',
        name: validation.data.name,
        birth_date: birthDateISO,
        birth_time_known: validation.data.birthTimeKnown,
        birth_time: validation.data.birthTime ?? null,
        approximate_time_range: validation.data.approximateTimeRange ?? null,
        city_name: validation.data.cityName,
        latitude: validation.data.latitude,
        longitude: validation.data.longitude,
      })
      .select('*')
      .single()

    if (error || !data) {
      console.error('[Circle Profiles] create failed:', error)
      return Response.json({ error: 'Не успяхме да запазим профила.' }, { status: 500 })
    }

    void logAuditEvent(userId, 'relationship.saved_profile_created', {
      profileId: data.id,
      kind: 'crush',
    })

    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error('[Circle Profiles] create unhandled error:', error)
    return Response.json({ error: 'Не успяхме да запазим профила.' }, { status: 500 })
  }
}
