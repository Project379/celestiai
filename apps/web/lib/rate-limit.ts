import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError } from '@/lib/auth/guards'

interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
  // 2026-08-26 sweep #17 (Tier 2): the default fail-open posture is correct
  // for guarding infrastructure — a Supabase blip shouldn't 500 every route
  // in the app. It is the wrong default for a route that spends real money
  // per call, where the limiter is often the ONLY brake against burst
  // velocity (the monthly quota cap in lib/subscriptions/quota.ts throws,
  // not fails open, on its own DB errors — see getCurrentPeriodQuota — so
  // this is specifically about protecting the limiter's burst-rate role).
  // Set true only on routes that call a paid external API or feed directly
  // into one being callable (oracle/generate, horoscope/generate,
  // birth-data creation — each new chart is a fresh quota-cache key per
  // sweep finding #3). Leave false/omitted everywhere else.
  failClosed?: boolean
}

/**
 * True client IP on Vercel: the platform overwrites x-forwarded-for at its
 * edge before the request reaches this function, so a client-supplied value
 * doesn't survive (non-Enterprise plans). REVISIT-63: if a CDN/WAF is ever
 * placed in front of Vercel, this stops holding and needs re-verification.
 */
export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown'
  }

  return request.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Table-backed rate limit (see 20260803130000_rate_limit_buckets.sql) —
 * durable across serverless instances, unlike a module-scope in-memory map.
 *
 * Fails open by default: if the limiter's own query errors, the request
 * proceeds rather than blocking on a degraded Supabase call the rest of
 * the route already depends on. Logged loudly so a persistent failure is
 * visible. Pass `failClosed: true` for a route that spends real money per
 * call — see the RateLimitOptions doc comment for which ones and why.
 */
export async function assertRateLimit({ key, limit, windowMs, failClosed }: RateLimitOptions) {
  const supabase = createServiceSupabaseClient()

  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  })

  if (error) {
    if (failClosed) {
      console.error(`[RateLimit] Check failed for money-spending key "${key}", failing CLOSED:`, error)
      throw new ApiError(503, 'Временно не успяваме да обработим заявката. Опитай отново след малко.', 'RATE_LIMIT_UNAVAILABLE')
    }
    console.error(`[RateLimit] Check failed for key "${key}", failing open:`, error)
    return
  }

  if (typeof data === 'number' && data > limit) {
    throw new ApiError(429, 'Too many requests', 'RATE_LIMITED')
  }
}
