import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError } from '@/lib/auth/guards'

interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
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
 * Fails open: if the limiter's own query errors, the request proceeds
 * rather than blocking on a degraded Supabase call the rest of the route
 * already depends on. Logged loudly so a persistent failure is visible.
 */
export async function assertRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const supabase = createServiceSupabaseClient()

  const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  })

  if (error) {
    console.error(`[RateLimit] Check failed for key "${key}", failing open:`, error)
    return
  }

  if (typeof data === 'number' && data > limit) {
    throw new ApiError(429, 'Too many requests', 'RATE_LIMITED')
  }
}
