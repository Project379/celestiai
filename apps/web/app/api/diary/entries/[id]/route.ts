import { auth } from '@clerk/nextjs/server'
import {
  deleteDiaryEntry,
  getDiaryEntry,
  updateDiaryEntry,
} from '@celestia/core/diary/entries'
import { updateDiaryEntrySchema } from '@/lib/validators/diary'

/**
 * Error IDs emitted by this handler (see PRE_LAUNCH_PREREQS.md item 2
 * for the monitoring-swap path when Sentry/equivalent ships):
 *   ERR-DI-005 — GET single diary-entry fetch threw unexpectedly
 *                (404 stays a distinct category — "запис не е намерен"
 *                is a legitimate response, not an error).
 *   ERR-DI-006 — PATCH update threw / core returned UPDATE_FAILED
 *                (404 on NOT_FOUND stays plain, distinct from 5xx).
 *   ERR-DI-007 — DELETE failed (core returned DELETE_FAILED or threw).
 */

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
    const result = await getDiaryEntry(userId, id)
    if (!result.ok) {
      return Response.json(
        { error: 'Страницата не беше намерена' },
        { status: 404 },
      )
    }
    return Response.json(result.data)
  } catch (error) {
    console.error('[ERR-DI-005] GET /api/diary/entries/[id] failed:', error)
    return Response.json(
      {
        error: 'Не успяхме да заредим страницата. Опитай отново. Код: ERR-DI-005.',
        code: 'ERR-DI-005',
      },
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

    const validation = updateDiaryEntrySchema.safeParse(body)
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

    const result = await updateDiaryEntry(userId, id, validation.data)
    if (!result.ok) {
      if (result.error === 'NOT_FOUND') {
        return Response.json(
          { error: 'Страницата не беше намерена' },
          { status: 404 },
        )
      }
      console.error(
        '[ERR-DI-006] PATCH /api/diary/entries/[id] update failed:',
        result.error,
        result.message,
      )
      return Response.json(
        {
          error: 'Не успяхме да обновим страницата. Опитай отново. Код: ERR-DI-006.',
          code: 'ERR-DI-006',
        },
        { status: 500 },
      )
    }

    return Response.json(result.data)
  } catch (error) {
    console.error('[ERR-DI-006] PATCH /api/diary/entries/[id] unhandled error:', error)
    return Response.json(
      {
        error: 'Не успяхме да обновим страницата. Опитай отново. Код: ERR-DI-006.',
        code: 'ERR-DI-006',
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const { id } = await params
    const result = await deleteDiaryEntry(userId, id)
    if (!result.ok) {
      console.error(
        '[ERR-DI-007] DELETE /api/diary/entries/[id] delete failed:',
        result.error,
        result.message,
      )
      return Response.json(
        {
          error: 'Не успяхме да изтрием страницата. Опитай отново. Код: ERR-DI-007.',
          code: 'ERR-DI-007',
        },
        { status: 500 },
      )
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('[ERR-DI-007] DELETE /api/diary/entries/[id] unhandled error:', error)
    return Response.json(
      {
        error: 'Не успяхме да изтрием страницата. Опитай отново. Код: ERR-DI-007.',
        code: 'ERR-DI-007',
      },
      { status: 500 },
    )
  }
}
