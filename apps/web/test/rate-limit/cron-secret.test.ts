import { describe, expect, it } from 'vitest'
import { verifyCronSecret } from '@/lib/auth/cron-secret'

/**
 * Batch 5.5 finding #22: both cron routes compared CRON_SECRET with plain
 * !==, a non-constant-time comparison. Low real-world exploitability but a
 * cheap fix — this locks in the timing-safe replacement's edge cases.
 */
describe('verifyCronSecret', () => {
  it('accepts a correctly formatted matching header', () => {
    expect(verifyCronSecret('Bearer test-secret', 'test-secret')).toBe(true)
  })

  it('rejects a wrong secret of the same length', () => {
    expect(verifyCronSecret('Bearer test-secreX', 'test-secret')).toBe(false)
  })

  it('rejects a wrong secret of a different length', () => {
    expect(verifyCronSecret('Bearer wrong', 'test-secret')).toBe(false)
  })

  it('rejects when CRON_SECRET is unset server-side, even against "Bearer undefined"', () => {
    expect(verifyCronSecret('Bearer undefined', undefined)).toBe(false)
  })

  it('rejects a missing Authorization header', () => {
    expect(verifyCronSecret(null, 'test-secret')).toBe(false)
  })

  it('rejects a header missing the "Bearer " prefix', () => {
    expect(verifyCronSecret('test-secret', 'test-secret')).toBe(false)
  })
})
