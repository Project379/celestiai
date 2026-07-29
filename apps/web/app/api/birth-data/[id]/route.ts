import { auth } from '@clerk/nextjs/server'
import {
  deleteBirthChart,
  getBirthChart,
  updateBirthChart,
} from '@stellaeum/core/charts/birth-data'
import { logAuditEvent } from '@/lib/audit'
import { updateBirthDataSchema } from '@stellaeum/core/charts/schemas'
import { logServerError } from '@/lib/monitoring/log-server-error'

/**
 * Error IDs emitted by this handler (wired to Sentry via logServerError
 * in §10.2; see PRE_LAUNCH_PREREQS.md item 2 for the monitoring rationale):
 *   ERR-BD-002 — PATCH update threw / failed unexpectedly (404 stays as
 *                plain "Данните не бяха намерени", distinct category)
 *   ERR-BD-003 — DELETE failed (core returned DELETE_FAILED or threw)
 *   ERR-BD-005 — GET single-chart fetch threw unexpectedly (404 stays
 *                as plain "Данните не бяха намерени", distinct)
 */

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
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
    logServerError('ERR-BD-005', error, {
      context: 'GET /api/birth-data/[id] failed',
    })
    return Response.json(
      {
        error: 'Не успяхме да заредим рождените данни. Опитай отново. Код: ERR-BD-005.',
        code: 'ERR-BD-005',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
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
    logServerError('ERR-BD-002', error, {
      context: 'PATCH /api/birth-data/[id] failed',
    })
    return Response.json(
      {
        error: 'Не успяхме да обновим рождените данни. Опитай отново. Код: ERR-BD-002.',
        code: 'ERR-BD-002',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    const { id } = await params
    const result = await deleteBirthChart(userId, id)
    if (!result.ok) {
      logServerError('ERR-BD-003', result.error, {
        context: 'DELETE /api/birth-data/[id] delete failed',
        message: result.message,
      })
      return Response.json(
        {
          error: 'Не успяхме да изтрием рождените данни. Опитай отново. Код: ERR-BD-003.',
          code: 'ERR-BD-003',
        },
        { status: 500 },
      )
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    logServerError('ERR-BD-003', error, {
      context: 'DELETE /api/birth-data/[id] unhandled error',
    })
    return Response.json(
      {
        error: 'Не успяхме да изтрием рождените данни. Опитай отново. Код: ERR-BD-003.',
        code: 'ERR-BD-003',
      },
      { status: 500 },
    )
  }
}
