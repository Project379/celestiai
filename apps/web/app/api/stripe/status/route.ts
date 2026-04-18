import { auth } from '@clerk/nextjs/server'
import { getStripeStatus } from '@celestia/core/stripe/status'

/**
 * GET /api/stripe/status?session_id=cs_xxx
 *
 * Thin wrapper over @celestia/core getStripeStatus(). Used by the
 * /subscription/success page to poll until premium is active.
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  try {
    const data = await getStripeStatus(userId, sessionId)
    return Response.json(data)
  } catch (err) {
    console.error('[api/stripe/status] error:', err)
    return Response.json({ tier: 'free' })
  }
}
