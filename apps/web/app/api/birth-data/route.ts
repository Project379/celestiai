import { auth } from '@clerk/nextjs/server'
import {
  createBirthChart,
  listBirthCharts,
} from '@celestia/core/charts/birth-data'
import { createBirthDataSchema } from '@/lib/validators/birth-data'

/**
 * Error IDs emitted by this handler (see PRE_LAUNCH_PREREQS.md item 2
 * for the monitoring-swap path when Sentry/equivalent ships):
 *   ERR-BD-001 — POST insert failed (DB write rejected post-validation)
 *   ERR-BD-004 — GET list failed (listBirthCharts threw)
 */

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
    console.error('[ERR-BD-004] GET /api/birth-data list failed:', error)
    return Response.json(
      {
        error: 'Не успяхме да заредим списъка с рождени данни. Опитай отново. Код: ERR-BD-004.',
        code: 'ERR-BD-004',
      },
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
      console.error(
        '[ERR-BD-001] POST /api/birth-data insert failed:',
        result.error,
        result.message,
      )
      return Response.json(
        {
          error: 'Не успяхме да запазим рождените данни. Опитай отново. Код: ERR-BD-001.',
          code: 'ERR-BD-001',
        },
        { status: 500 },
      )
    }

    return Response.json(result.data, { status: 201 })
  } catch (error) {
    console.error('[ERR-BD-001] POST /api/birth-data unhandled error:', error)
    return Response.json(
      {
        error: 'Не успяхме да запазим рождените данни. Опитай отново. Код: ERR-BD-001.',
        code: 'ERR-BD-001',
      },
      { status: 500 },
    )
  }
}
