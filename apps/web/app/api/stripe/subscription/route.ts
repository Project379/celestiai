import { auth } from '@clerk/nextjs/server'
import { getSubscriptionOverview } from '@/lib/stripe/subscription-overview'

export async function GET() {
  await auth.protect()

  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const overview = await getSubscriptionOverview(userId)
  return Response.json(overview)
}
