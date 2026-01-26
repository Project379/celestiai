import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { updateBirthDataSchema } from '@/lib/validators/birth-data'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/birth-data/[id]
 * Retrieve a single birth chart by ID
 * RLS ensures user can only access their own charts
 */
export async function GET(request: Request, { params }: RouteParams) {
  // Protect route - returns 404 if not authenticated
  await auth.protect()

  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('charts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return Response.json(
        { error: 'Dannite ne biaha namereni' },
        { status: 404 }
      )
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error fetching birth data:', error)
    return Response.json(
      { error: 'Greshka pri zarejdane na dannite' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/birth-data/[id]
 * Update an existing birth chart
 * RLS ensures user can only update their own charts
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  // Protect route - returns 404 if not authenticated
  await auth.protect()

  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const validation = updateBirthDataSchema.safeParse(body)
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

    // Build update object - only include fields that were provided
    const updateData: Record<string, unknown> = {}

    if (validData.name !== undefined) updateData.name = validData.name
    if (validData.birthDate !== undefined) updateData.birth_date = validData.birthDate
    if (validData.birthTimeKnown !== undefined) updateData.birth_time_known = validData.birthTimeKnown
    if (validData.birthTime !== undefined) updateData.birth_time = validData.birthTime
    if (validData.approximateTimeRange !== undefined) updateData.approximate_time_range = validData.approximateTimeRange
    if (validData.cityId !== undefined) updateData.city_id = validData.cityId
    if (validData.cityName !== undefined) updateData.city_name = validData.cityName
    if (validData.latitude !== undefined) updateData.latitude = validData.latitude
    if (validData.longitude !== undefined) updateData.longitude = validData.longitude

    // Always update the updated_at timestamp
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('charts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      // RLS will make this appear as not found if user doesn't own the chart
      return Response.json(
        { error: 'Dannite ne biaha namereni' },
        { status: 404 }
      )
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error updating birth data:', error)
    return Response.json(
      { error: 'Greshka pri zapazvane' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/birth-data/[id]
 * Delete a birth chart
 * RLS ensures user can only delete their own charts
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  // Protect route - returns 404 if not authenticated
  await auth.protect()

  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('charts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error deleting chart:', error)
      return Response.json(
        { error: 'Greshka pri iztrivane' },
        { status: 500 }
      )
    }

    // Return 204 No Content on successful delete
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting birth data:', error)
    return Response.json(
      { error: 'Greshka pri iztrivane' },
      { status: 500 }
    )
  }
}
