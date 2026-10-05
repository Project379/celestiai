import { auth } from '@clerk/nextjs/server'
import { summarizeDiaryWeek } from '@stellaeum/core/diary/entries-v2'
import { z } from 'zod'

const querySchema = z.object({ from: z.string().date(), to: z.string().date() })

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  const url = new URL(request.url)
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return Response.json({ error: 'Невалиден период' }, { status: 400 })
  const from = new Date(`${parsed.data.from}T00:00:00Z`)
  const to = new Date(`${parsed.data.to}T00:00:00Z`)
  if (to.getTime() < from.getTime() || to.getTime() - from.getTime() > 31 * 86_400_000) {
    return Response.json({ error: 'Периодът трябва да е до 31 дни' }, { status: 400 })
  }
  try {
    return Response.json(await summarizeDiaryWeek(userId, parsed.data.from, parsed.data.to))
  } catch {
    return Response.json({ error: 'Не успяхме да заредим обобщението.' }, { status: 500 })
  }
}
