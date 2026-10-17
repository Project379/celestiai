import { auth } from '@clerk/nextjs/server'
import {
  deleteDiaryEntryV2,
  getDiaryEntryV2,
  updateDiaryEntryV2,
} from '@stellaeum/core/diary/entries-v2'
import {
  deleteDiaryEntryV2Schema,
  updateDiaryEntryV2Schema,
} from '@stellaeum/core/diary/v2'
import { assertRateLimit } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'
import { logServerError } from '@/lib/monitoring/log-server-error'

interface RouteParams { params: Promise<{ id: string }> }

function validationError(issues: { path: PropertyKey[]; message: string }[]) {
  return Response.json({
    error: 'Невалидни данни',
    details: Object.fromEntries(issues.map((issue) => [issue.path.join('.') || 'request', [issue.message]])),
  }, { status: 400 })
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  const { id } = await params
  const entry = await getDiaryEntryV2(userId, id)
  return entry
    ? Response.json(entry)
    : Response.json({ error: 'Записът не беше намерен' }, { status: 404 })
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  try {
    await assertRateLimit({ key: `diary-v2-update:${userId}`, limit: 40, windowMs: 60_000 })
    const validation = updateDiaryEntryV2Schema.safeParse(await request.json())
    if (!validation.success) return validationError(validation.error.issues)
    const { id } = await params
    const result = await updateDiaryEntryV2(userId, id, validation.data)
    if (result.ok) return Response.json(result.entry)
    if (result.error === 'NOT_FOUND') return Response.json({ error: 'Записът не беше намерен' }, { status: 404 })
    if (result.error === 'CONFLICT') {
      return Response.json({ error: 'Записът е променен на друго устройство', code: 'DIARY_CONFLICT', current: result.current }, { status: 409 })
    }
    if (result.error === 'INVALID_RELATED_ENTRY') {
      return Response.json({ error: 'Свързаният запис не беше намерен' }, { status: 400 })
    }
    if (result.error === 'INVALID_CONTENT') {
      return Response.json({ error: 'Съдържанието не съответства на вида запис' }, { status: 400 })
    }
    logServerError('ERR-DI-006', result.error, { context: 'PATCH /api/diary/v2/entries/[id]' })
    return Response.json({ error: 'Не успяхме да обновим записа.' }, { status: 500 })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    logServerError('ERR-DI-006', error, { context: 'PATCH /api/diary/v2/entries/[id] unhandled' })
    return Response.json({ error: 'Не успяхме да обновим записа.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  try {
    await assertRateLimit({ key: `diary-v2-delete:${userId}`, limit: 20, windowMs: 60_000 })
    const url = new URL(request.url)
    const validation = deleteDiaryEntryV2Schema.safeParse({ revision: url.searchParams.get('revision') })
    if (!validation.success) return validationError(validation.error.issues)
    const { id } = await params
    const result = await deleteDiaryEntryV2(userId, id, validation.data.revision)
    if (result.ok || result.error === 'NOT_FOUND') return new Response(null, { status: 204 })
    if (result.error === 'CONFLICT') {
      return Response.json({ error: 'Записът е променен на друго устройство', code: 'DIARY_CONFLICT', current: result.current }, { status: 409 })
    }
    logServerError('ERR-DI-007', result.error, { context: 'DELETE /api/diary/v2/entries/[id]' })
    return Response.json({ error: 'Не успяхме да изтрием записа.' }, { status: 500 })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    logServerError('ERR-DI-007', error, { context: 'DELETE /api/diary/v2/entries/[id] unhandled' })
    return Response.json({ error: 'Не успяхме да изтрием записа.' }, { status: 500 })
  }
}
