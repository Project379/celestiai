import { auth } from '@clerk/nextjs/server'
import { calculateChartForUser } from '@celestia/core/charts/calculate'
import { chartCalculationSchema } from '@/lib/validators/chart'
import { logAuditEvent } from '@/lib/audit'

/**
 * POST /api/chart/calculate
 *
 * Thin wrapper over @celestia/core calculateChartForUser(). Core returns a
 * discriminated-union result; we map it to HTTP. Audit event fires only on
 * fresh (non-cached) compute to preserve the pre-extraction behavior.
 */
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
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
        return Response.json({ error: 'Неоторизиран достъп' }, { status: 403 })
      case 'CALC_ERROR':
        return Response.json(
          { error: 'Грешка при изчисление. Моля, проверете данните.' },
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
    console.error('Error in chart calculation:', error)
    return Response.json(
      { error: 'Грешка при обработка на заявката' },
      { status: 500 },
    )
  }
}
