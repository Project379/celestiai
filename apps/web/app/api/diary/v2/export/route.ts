import { auth } from '@clerk/nextjs/server'
import { listAllDiaryEntriesV2 } from '@stellaeum/core/diary/entries-v2'
import { buildFullDiaryJson, buildFullDiaryMarkdown } from '@stellaeum/core/diary/export-v2'
import { assertRateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  await assertRateLimit({ key: `diary-v2-export:${userId}`, limit: 5, windowMs: 60_000 })
  const format = new URL(request.url).searchParams.get('format') === 'json' ? 'json' : 'markdown'
  const entries = await listAllDiaryEntriesV2(userId)
  const body = format === 'json' ? buildFullDiaryJson(entries) : buildFullDiaryMarkdown(entries)
  const extension = format === 'json' ? 'json' : 'md'
  return new Response(body, {
    headers: {
      'Content-Type': format === 'json' ? 'application/json; charset=utf-8' : 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="stellaeum-diary.${extension}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
