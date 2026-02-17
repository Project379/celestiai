import Stripe from 'stripe'

/**
 * Stripe singleton client for server-side use only.
 *
 * IMPORTANT: Never import this in client components.
 * Use via API routes and server actions only.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})
