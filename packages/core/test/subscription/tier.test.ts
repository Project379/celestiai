import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockSupabase {
  from: ReturnType<typeof vi.fn>
}

let mockSupabase: MockSupabase
let maybeSingleResult: { data: { subscription_tier: string } | null; error: { message: string } | null }

function createMockSupabase(): MockSupabase {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve(maybeSingleResult)),
        })),
      })),
    })),
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

const { getSubscriptionTier } = await import('../../src/subscription/tier')

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  maybeSingleResult = { data: null, error: null }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

describe('getSubscriptionTier', () => {
  it('returns "premium" when the user row has subscription_tier = premium', async () => {
    maybeSingleResult = { data: { subscription_tier: 'premium' }, error: null }
    await expect(getSubscriptionTier('user_1')).resolves.toBe('premium')
  })

  it('returns "free" when the user row has subscription_tier = free', async () => {
    maybeSingleResult = { data: { subscription_tier: 'free' }, error: null }
    await expect(getSubscriptionTier('user_1')).resolves.toBe('free')
  })

  it('returns "free" for any subscription_tier value other than the literal "premium"', async () => {
    // Defends the ternary in tier.ts (`=== 'premium' ? 'premium' : 'free'`)
    // against a corrupted/unexpected DB value being trusted as premium.
    maybeSingleResult = { data: { subscription_tier: 'PREMIUM' }, error: null }
    await expect(getSubscriptionTier('user_1')).resolves.toBe('free')
  })

  it('returns "free" when no user row exists', async () => {
    maybeSingleResult = { data: null, error: null }
    await expect(getSubscriptionTier('missing_user')).resolves.toBe('free')
  })

  it('returns "free" and does not throw when the DB query errors', async () => {
    maybeSingleResult = { data: null, error: { message: 'connection reset' } }
    await expect(getSubscriptionTier('user_1')).resolves.toBe('free')
  })
})
