import { auth } from '@clerk/nextjs/server'
import { getCrystalOfTheDay } from '@celestia/core/crystals/today'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals/today
 *
 * Thin HTTP wrapper over the shared `getCrystalOfTheDay` function in
 * `@celestia/core`. Route handlers import the unwrapped core function
 * directly — React.cache at the web-lib call site has no effect outside
 * a render pass, so importing the cached wrapper here would be wrong.
 *
 * Response shape is described by `CrystalOfTheDayResponseSchema` in
 * `@celestia/core/crystals/schemas`. Mobile clients validate against it.
 */
export async function GET() {
  try {
    const { userId } = await auth()
    const data = await getCrystalOfTheDay(userId)
    return Response.json(data)
  } catch (error) {
    console.error('[api/crystals/today] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
