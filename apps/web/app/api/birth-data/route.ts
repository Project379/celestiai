import { auth } from '@clerk/nextjs/server'
import {
  createBirthChart,
  listBirthCharts,
} from '@stellaeum/core/charts/birth-data'
import { createBirthDataSchema } from '@stellaeum/core/charts/schemas'
import { logServerError } from '@/lib/monitoring/log-server-error'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * Error IDs emitted by this handler (wired to Sentry via logServerError
 * in §10.2; see PRE_LAUNCH_PREREQS.md item 2 for the monitoring rationale):
 *   ERR-BD-001 — POST insert failed (DB write rejected post-validation)
 *   ERR-BD-004 — GET list failed (listBirthCharts threw)
 *   ERR-BD-005 — POST rejected: caller already has MAX_CHARTS_PER_USER charts
 */

/**
 * GET /api/birth-data — list the caller's birth charts.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `birth-data-list:${userId}`,
      limit: 60,
      windowMs: 60_000,
    })

    const charts = await listBirthCharts(userId)
    return Response.json(charts)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    logServerError('ERR-BD-004', error, {
      context: 'GET /api/birth-data list failed',
    })
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
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `birth-data-create:${userId}`,
      limit: 10,
      windowMs: 60_000,
    })

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
      if (result.error === 'CHART_LIMIT_REACHED') {
        return Response.json(
          {
            error: 'Достигна лимита за брой рождени карти.',
            code: 'ERR-BD-005',
          },
          { status: 429 },
        )
      }
      logServerError('ERR-BD-001', result.error, {
        context: 'POST /api/birth-data insert failed',
        message: result.message,
      })
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
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    logServerError('ERR-BD-001', error, {
      context: 'POST /api/birth-data unhandled error',
    })
    return Response.json(
      {
        error: 'Не успяхме да запазим рождените данни. Опитай отново. Код: ERR-BD-001.',
        code: 'ERR-BD-001',
      },
      { status: 500 },
    )
  }
}
