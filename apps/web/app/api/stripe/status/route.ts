import { requireAppUser } from '@/lib/auth/guards'

export async function GET() {
  try {
    const { user } = await requireAppUser()
    return Response.json({ tier: user.subscription_tier })
  } catch (error) {
    console.error('[Stripe Status] Failed to fetch user tier:', error)
    return Response.json({ tier: 'free' })
  }
}
