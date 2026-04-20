import { auth } from '@clerk/nextjs/server'
import {
  createBirthChart,
  listBirthCharts,
} from '@celestia/core/charts/birth-data'
import { createBirthDataSchema } from '@/lib/validators/birth-data'

/**
 * GET /api/birth-data — list the caller's birth charts.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const charts = await listBirthCharts(userId)
    return Response.json(charts)
  } catch (error) {
    console.error('Error fetching birth data:', error)
    return Response.json(
      { error: 'Грешка при зареждане на данните' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/birth-data — create a birth chart for the caller.
 */
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const validation = createBirthDataSchema.safeParse(body)
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

    const result = await createBirthChart(userId, validation.data)
    if (!result.ok) {
      return Response.json(
        { error: 'Грешка при запазване: ' + result.message },
        { status: 500 },
      )
    }

    return Response.json(result.data, { status: 201 })
  } catch (error) {
    console.error('Error creating birth data:', error)
    return Response.json({ error: 'Грешка при запазване' }, { status: 500 })
  }
}
