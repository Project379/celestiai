import { auth } from '@clerk/nextjs/server'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import { buildCircleSpaceView, listSpacesForUser } from '@/lib/circle/service'

// GET added for the mobile port (Batch 4 sub-batch B) — web never needed
// this, CircleHub reads spaces off getCircleDashboardData's direct
// server-side DB call. Mobile only has HTTP. Returns full CircleSpaceView[]
// (space + members + latestReport + weather, via the existing
// buildCircleSpaceView) rather than a bare space list plus a second
// per-id detail route — a typical user has very few spaces (1 romantic +
// a couple friend/work groups at most), so eagerly bundling detail for
// all of them in one call is cheaper than a list-then-fetch-detail round
// trip for each one.
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `circle-relationships-list:${userId}`,
      limit: 60,
      windowMs: 60_000,
    })

    const spaces = await listSpacesForUser(userId)
    const views = await Promise.all(spaces.map((space) => buildCircleSpaceView(space)))
    return Response.json(views)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Circle Relationships] list failed:', error)
    return Response.json({ error: 'Не успяхме да заредим пространствата.' }, { status: 500 })
  }
}
