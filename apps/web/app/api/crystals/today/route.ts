import { auth } from '@clerk/nextjs/server'
import { getCrystalOfTheDay } from '@stellaeum/core/crystals/today'
import { assertRateLimit, getRequestIp } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals/today
 *
 * Thin HTTP wrapper over the shared `getCrystalOfTheDay` function in
 * `@stellaeum/core`. Route handlers import the unwrapped core function
 * directly — React.cache at the web-lib call site has no effect outside
 * a render pass, so importing the cached wrapper here would be wrong.
 *
 * Response shape is described by `CrystalOfTheDayResponseSchema` in
 * `@stellaeum/core/crystals/schemas`. Mobile clients validate against it.
 *
 * Deliberately open to unauthenticated callers (`getCrystalOfTheDay`
 * accepts `userId: string | null`) — today's crystal is public teaser
 * content, same category as a horoscope-of-the-day. Rate-limit key falls
 * back to IP when there's no session, since there's no userId to key on.
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    await assertRateLimit({
      key: userId ? `crystals-today:${userId}` : `crystals-today:ip:${getRequestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    })

    const data = await getCrystalOfTheDay(userId)
    return Response.json(data)
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[api/crystals/today] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
