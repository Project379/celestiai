export type SubscriptionTier = 'free' | 'premium'

export interface QuotaLimits {
  ai_readings: number
}

export const TIER_LIMITS: Record<SubscriptionTier, QuotaLimits> = {
  free: { ai_readings: 3 },
  premium: { ai_readings: -1 },
}

export function getPriceToTier() {
  return new Map<string, SubscriptionTier>(
    [
      [process.env.STRIPE_PRICE_MONTHLY, 'premium'],
      [process.env.STRIPE_PRICE_ANNUAL, 'premium'],
    ].filter((entry): entry is [string, SubscriptionTier] => Boolean(entry[0]))
  )
}
