import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { createBirthDataSchema } from '@/lib/validators/birth-data'

/**
 * GET /api/birth-data
 * Retrieve all birth charts for the authenticated user
 */
export async function GET() {
  // Check authentication - return JSON error if not authenticated
  const { userId } = await auth()
  if (!userId) {
    return Response.json(
      { error: 'Неоторизиран достъп' },
      { status: 401 }
    )
  }

  try {
    const supabase = createServiceSupabaseClient()

    // Manually filter by user_id since we're using service role
    const { data, error } = await supabase
      .from('charts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error fetching charts:', error)
      return Response.json(
        { error: 'Грешка при зареждане на данните' },
        { status: 500 }
      )
    }

    return Response.json(data || [])
  } catch (error) {
    console.error('Error fetching birth data:', error)
    return Response.json(
      { error: 'Грешка при зареждане на данните' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/birth-data
 * Create a new birth chart for the authenticated user
 */
export async function POST(request: Request) {
  // Check authentication - return JSON error if not authenticated
  const { userId } = await auth()
  if (!userId) {
    return Response.json(
      { error: 'Неоторизиран достъп' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()

    console.log('[Birth Data] User:', userId)
    console.log('[Birth Data] Received body:', JSON.stringify(body, null, 2))

    // Validate input
    const validation = createBirthDataSchema.safeParse(body)
    if (!validation.success) {
      console.error('[Birth Data] Validation failed:', validation.error.issues)
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      return Response.json(
        { error: 'Невалидни данни', details: fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createServiceSupabaseClient()
    const validData = validation.data

    console.log('[Birth Data] Inserting for user:', userId)

    // Convert birth date string to ISO timestamp
    const birthDateISO = new Date(validData.birthDate + 'T00:00:00Z').toISOString()

    // Insert chart with explicit user_id
    const { data, error } = await supabase
      .from('charts')
      .insert({
        user_id: userId, // Explicitly set user_id from Clerk
        name: validData.name,
        birth_date: birthDateISO,
        birth_time_known: validData.birthTimeKnown,
        birth_time: validData.birthTime ?? null,
        approximate_time_range: validData.approximateTimeRange ?? null,
        city_id: validData.cityId ?? null,
        city_name: validData.cityName,
        latitude: validData.latitude,
        longitude: validData.longitude,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating chart:', JSON.stringify(error, null, 2))
      return Response.json(
        { error: 'Грешка при запазване: ' + error.message },
        { status: 500 }
      )
    }

    console.log('[Birth Data] Created:', data)
    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating birth data:', error)
    return Response.json(
      { error: 'Грешка при запазване' },
      { status: 500 }
    )
  }
}
