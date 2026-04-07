import { auth } from '@clerk/nextjs/server'
import { logAuditEvent } from '@/lib/audit'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { updateBirthDataSchema } from '@/lib/validators/birth-data'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = createServiceSupabaseClient()

    const { data, error } = await supabase
      .from('charts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Данните не бяха намерени' }, { status: 404 })
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error fetching birth data:', error)
    return Response.json(
      { error: 'Грешка при зареждане на данните' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()

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
        { error: 'Невалидни данни', details: fieldErrors },
        { status: 400 }
      )
    }

    const supabase = createServiceSupabaseClient()
    const validData = validation.data
    const updateData: Record<string, unknown> = {}

    if (validData.name !== undefined) updateData.name = validData.name
    if (validData.birthDate !== undefined) {
      updateData.birth_date = new Date(
        validData.birthDate + 'T00:00:00Z'
      ).toISOString()
    }
    if (validData.birthTimeKnown !== undefined) {
      updateData.birth_time_known = validData.birthTimeKnown
    }
    if (validData.birthTime !== undefined) updateData.birth_time = validData.birthTime
    if (validData.approximateTimeRange !== undefined) {
      updateData.approximate_time_range = validData.approximateTimeRange
    }
    if (validData.cityId !== undefined) updateData.city_id = validData.cityId
    if (validData.cityName !== undefined) updateData.city_name = validData.cityName
    if (validData.latitude !== undefined) updateData.latitude = validData.latitude
    if (validData.longitude !== undefined) updateData.longitude = validData.longitude

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('charts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) {
      return Response.json({ error: 'Данните не бяха намерени' }, { status: 404 })
    }

    const { error: calcDeleteError } = await supabase
      .from('chart_calculations')
      .delete()
      .eq('chart_id', id)

    if (calcDeleteError) {
      console.error('Failed to invalidate chart calculation cache:', calcDeleteError)
    }

    logAuditEvent(userId, 'account.birth_data_edit', { chartId: id })

    return Response.json(data)
  } catch (error) {
    console.error('Error updating birth data:', error)
    return Response.json({ error: 'Грешка при запазване' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const { id } = await params
    const supabase = createServiceSupabaseClient()

    const { error } = await supabase
      .from('charts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase error deleting chart:', error)
      return Response.json({ error: 'Грешка при изтриване' }, { status: 500 })
    }

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting birth data:', error)
    return Response.json({ error: 'Грешка при изтриване' }, { status: 500 })
  }
}
