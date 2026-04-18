import Stripe from 'stripe'

/**
 * Stripe client factory for @celestia/core. Env-only. No framework
 * coupling. Mirrors the singleton pattern in apps/web/lib/stripe/client.ts
 * but lives in the shared package so core functions can reach Stripe
 * without importing across workspace boundaries.
 */
export function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('Missing STRIPE_SECRET_KEY env var')
  }
  return new Stripe(key, {
    apiVersion: '2026-01-28.clover',
    typescript: true,
  })
}
