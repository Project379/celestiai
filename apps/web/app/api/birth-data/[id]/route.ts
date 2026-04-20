import { auth } from '@clerk/nextjs/server'
import {
  deleteBirthChart,
  getBirthChart,
  updateBirthChart,
} from '@celestia/core/charts/birth-data'
import { logAuditEvent } from '@/lib/audit'
import { updateBirthDataSchema } from '@/lib/validators/birth-data'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const { id } = await params
    const result = await getBirthChart(userId, id)
    if (!result.ok) {
      return Response.json(
        { error: 'Данните не бяха намерени' },
        { status: 404 },
      )
    }
    return Response.json(result.data)
  } catch (error) {
    console.error('Error fetching birth data:', error)
    return Response.json(
      { error: 'Грешка при зареждане на данните' },
      { status: 500 },
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
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }

      return Response.json(
        { error: 'Невалидни данни', details: fieldErrors },
        { status: 400 },
      )
    }

    const result = await updateBirthChart(userId, id, validation.data)
    if (!result.ok) {
      return Response.json(
        { error: 'Данните не бяха намерени' },
        { status: 404 },
      )
    }

    logAuditEvent(userId, 'account.birth_data_edit', { chartId: id })

    return Response.json(result.data)
  } catch (error) {
    console.error('Error updating birth data:', error)
    return Response.json({ error: 'Грешка при запазване' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const { id } = await params
    const result = await deleteBirthChart(userId, id)
    if (!result.ok) {
      return Response.json({ error: 'Грешка при изтриване' }, { status: 500 })
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting birth data:', error)
    return Response.json({ error: 'Грешка при изтриване' }, { status: 500 })
  }
}
