import { auth } from '@clerk/nextjs/server'
import { getDiaryEntry } from '@celestia/core/diary/entries'

/**
 * Error IDs emitted by this handler (see PRE_LAUNCH_PREREQS.md item 2
 * for the monitoring-swap path when Sentry/equivalent ships):
 *   ERR-DI-005 — GET single diary-entry fetch threw unexpectedly
 *                (404 stays a distinct category — "запис не е намерен"
 *                is a legitimate response, not an error).
 *
 * Subsequent commits add PATCH (ERR-DI-006) and DELETE (ERR-DI-007)
 * to this same handler file.
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
