import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * GET /api/stripe/status
 *
 * Returns the authenticated user's current subscription tier.
 * Used by the /subscription/success page to poll until webhook fires.
 *
 * Auth: Required (Clerk)
 * Returns: { tier: string }
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('clerk_id', userId)
    .single()

  if (error || !user) {
    console.error('[Stripe Status] Failed to fetch user tier:', error?.message)
    return Response.json({ tier: 'free' })
  }

  return Response.json({ tier: user.subscription_tier })
}
