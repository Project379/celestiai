import Stripe from 'stripe'

/**
 * Stripe singleton client for server-side use only.
 *
 * IMPORTANT: Never import this in client components.
 * Use via API routes and server actions only.
 *
 * API version '2026-01-28.clover' matches stripe@20.x requirements.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
})
