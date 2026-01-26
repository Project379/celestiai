import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createBirthDataSchema } from '@/lib/validators/birth-data'

/**
 * GET /api/birth-data
 * Retrieve all birth charts for the authenticated user
 * RLS automatically filters to user's own charts
 */
export async function GET() {
  // Protect route - returns 404 if not authenticated
  await auth.protect()

  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('charts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error fetching charts:', error)
      return Response.json(
        { error: 'Greshka pri zarejdane na dannite' },
        { status: 500 }
      )
    }

    return Response.json(data || [])
  } catch (error) {
    console.error('Error fetching birth data:', error)
    return Response.json(
      { error: 'Greshka pri zarejdane na dannite' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/birth-data
 * Create a new birth chart for the authenticated user
 * Validates input with Zod, RLS ensures user_id is set correctly
 */
export async function POST(request: Request) {
  // Protect route - returns 404 if not authenticated
  await auth.protect()

  try {
    const body = await request.json()

    // Validate input
    const validation = createBirthDataSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      return Response.json(
        { error: 'Nevalidni danni', details: fieldErrors },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const validData = validation.data

    // Insert chart - user_id is auto-set via RLS default
    const { data, error } = await supabase
      .from('charts')
      .insert({
        name: validData.name,
        birth_date: validData.birthDate,
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
      console.error('Supabase error creating chart:', error)
      return Response.json(
        { error: 'Greshka pri zapazvane' },
        { status: 500 }
      )
    }

    return Response.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating birth data:', error)
    return Response.json(
      { error: 'Greshka pri zapazvane' },
      { status: 500 }
    )
  }
}
