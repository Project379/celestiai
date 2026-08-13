import { auth } from '@clerk/nextjs/server'
import { calculateChartForUser } from '@stellaeum/core/charts/calculate'
import { chartCalculationSchema } from '@/lib/validators/chart'
import { logAuditEvent } from '@/lib/audit'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/chart/calculate
 *
 * Thin wrapper over @stellaeum/core calculateChartForUser(). Core returns a
 * discriminated-union result; we map it to HTTP. Audit event fires only on
 * fresh (non-cached) compute to preserve the pre-extraction behavior.
 */
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `chart-calculate:${userId}`,
      limit: 30,
      windowMs: 60_000,
    })

    const body = await request.json()

    const validation = chartCalculationSchema.safeParse(body)
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

    const { chartId } = validation.data
    const result = await calculateChartForUser(userId, chartId)

    if (result.ok) {
      if (!result.cached) {
        logAuditEvent(userId, 'data.chart_calculation', { chartId })
      }
      return Response.json(result.data)
    }

    switch (result.error) {
      case 'CHART_NOT_FOUND':
        return Response.json({ error: 'Картата не е намерена' }, { status: 404 })
      case 'FORBIDDEN':
        return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 403 })
      case 'CALC_ERROR':
        return Response.json(
          { error: 'Грешка при изчисление. Провери данните.' },
          { status: 500 },
        )
      case 'INTERNAL':
      default:
        return Response.json(
          { error: 'Грешка при обработка на заявката' },
          { status: 500 },
        )
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('Error in chart calculation:', error)
    return Response.json(
      { error: 'Грешка при обработка на заявката' },
      { status: 500 },
    )
  }
}
