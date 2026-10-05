import { auth } from '@clerk/nextjs/server'
import {
  getDiaryReminderPreference,
  setDiaryReminderPreference,
} from '@stellaeum/core/diary/entries-v2'
import { diaryReminderPreferenceSchema } from '@stellaeum/core/diary/v2'
import { getNextReminderDueAt, isValidTimeZone } from '@stellaeum/core/diary/time'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  try {
    const data = await getDiaryReminderPreference(userId)
    return Response.json({
      enabled: data.enabled,
      localTime: String(data.local_time).slice(0, 5),
      timezone: data.timezone,
      nextDueAt: data.next_due_at,
    })
  } catch {
    return Response.json({ error: 'Не успяхме да заредим напомнянето.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  const parsed = diaryReminderPreferenceSchema.safeParse(await request.json())
  if (!parsed.success || !isValidTimeZone(parsed.data?.timezone ?? '')) {
    return Response.json({ error: 'Невалидни настройки' }, { status: 400 })
  }
  const nextDueAt = parsed.data.enabled
    ? getNextReminderDueAt(parsed.data.localTime, parsed.data.timezone).toISOString()
    : null
  try {
    const data = await setDiaryReminderPreference(userId, parsed.data, nextDueAt)
    return Response.json({
      enabled: data.enabled,
      localTime: String(data.local_time).slice(0, 5),
      timezone: data.timezone,
      nextDueAt: data.next_due_at,
    })
  } catch {
    return Response.json({ error: 'Не успяхме да запазим напомнянето.' }, { status: 500 })
  }
}
