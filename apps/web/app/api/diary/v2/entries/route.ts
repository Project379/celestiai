import { auth } from '@clerk/nextjs/server'
import {
  createDiaryEntryV2,
  listDiaryEntriesV2,
} from '@stellaeum/core/diary/entries-v2'
import {
  createDiaryEntryV2Schema,
  diaryListQuerySchema,
} from '@stellaeum/core/diary/v2'
import { getDiaryDate, isValidTimeZone } from '@stellaeum/core/diary/time'
import { assertRateLimit } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'
import { logServerError } from '@/lib/monitoring/log-server-error'

function validationError(issues: { path: PropertyKey[]; message: string }[]) {
  const details: Record<string, string[]> = {}
  for (const issue of issues) {
    const path = issue.path.join('.') || 'request'
    ;(details[path] ??= []).push(issue.message)
  }
  return Response.json({ error: 'Невалидни данни', details }, { status: 400 })
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  try {
    await assertRateLimit({ key: `diary-v2-list:${userId}`, limit: 90, windowMs: 60_000 })
    const url = new URL(request.url)
    const validation = diaryListQuerySchema.safeParse(Object.fromEntries(url.searchParams))
    if (!validation.success) return validationError(validation.error.issues)
    return Response.json(await listDiaryEntriesV2(userId, validation.data))
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    logServerError('ERR-DI-004', error, { context: 'GET /api/diary/v2/entries' })
    return Response.json({ error: 'Не успяхме да заредим дневника.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  try {
    await assertRateLimit({ key: `diary-v2-create:${userId}`, limit: 30, windowMs: 60_000 })
    const validation = createDiaryEntryV2Schema.safeParse(await request.json())
    if (!validation.success) return validationError(validation.error.issues)
    if (!isValidTimeZone(validation.data.timezone)) {
      return validationError([{ path: ['timezone'], message: 'Невалидна часова зона' }])
    }
    if (getDiaryDate(new Date(validation.data.occurredAt), validation.data.timezone) !== validation.data.entryDate) {
      return validationError([{ path: ['entryDate'], message: 'Датата не съответства на часа на записа' }])
    }
    const result = await createDiaryEntryV2(userId, validation.data)
    if (!result.ok) {
      if (result.error === 'CONFLICT') return Response.json({ error: 'Вече имаш проверка за този ден. Отвори я за редактиране.', code: 'CONFLICT', current: result.current }, { status: 409 })
      if (result.error === 'INVALID_RELATED_ENTRY') {
        return Response.json({ error: 'Свързаният запис не беше намерен' }, { status: 400 })
      }
      logServerError('ERR-DI-003', result.error, { context: 'POST /api/diary/v2/entries' })
      return Response.json({ error: 'Не успяхме да запазим записа.' }, { status: 500 })
    }
    return Response.json(result.entry, { status: result.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    logServerError('ERR-DI-003', error, { context: 'POST /api/diary/v2/entries unhandled' })
    return Response.json({ error: 'Не успяхме да запазим записа.' }, { status: 500 })
  }
}
