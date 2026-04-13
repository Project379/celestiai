import { ApiError } from '@/lib/auth/guards'

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

const buckets = new Map<string, RateLimitEntry>()

function cleanup(now: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown'
  }

  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function assertRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now()
  cleanup(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (existing.count >= limit) {
    throw new ApiError(429, 'Too many requests', 'RATE_LIMITED')
  }

  existing.count += 1
}
