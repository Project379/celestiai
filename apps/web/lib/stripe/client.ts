import Stripe from 'stripe'

/**
 * Stripe client for server-side use only.
 *
 * IMPORTANT: Never import this in client components.
 * Use via API routes and server actions only.
 *
 * API version '2026-01-28.clover' matches stripe@20.x requirements.
 *
 * LAZY (2026-08-27): the real `new Stripe()` runs on first property access,
 * not at module load. The Stripe SDK throws synchronously if the API key is
 * undefined, and Next.js evaluates every route module during build-time
 * page-data collection — so a module-scope `new Stripe(process.env
 * .STRIPE_SECRET_KEY!)` turned a missing/rotated key into a total `next
 * build` failure (every route, whole deployment) instead of a 500 on the
 * four `/api/stripe/*` routes. Same principle as lib/supabase/service.ts's
 * createServiceSupabaseClient(): construct on use, throw on use, never at
 * import. The `turbo.json` env allowlist (commit 83317a6) is what makes the
 * key actually reach `next build`; this makes a future env slip a contained
 * incident rather than a catastrophic one. Build-time and runtime secret
 * requirements are now disjoint for web.
 *
 * Exposed as a Proxy so every existing `import { stripe }` call site and the
 * `vi.mock('@/lib/stripe/client', …)` test doubles keep working unchanged.
 */
let instance: Stripe | null = null

function getStripe(): Stripe {
  if (instance) return instance
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set — Stripe operations are unavailable in this environment.',
    )
  }
  instance = new Stripe(apiKey, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  })
  return instance
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripe()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
