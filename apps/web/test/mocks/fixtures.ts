import type { AppUser } from '@/lib/users/ensure-user'

/**
 * Shared AppUser fixture for webhook tests. Override individual fields per
 * test via spread rather than duplicating the full shape each time.
 */
export function makeAppUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 'user-row-1',
    clerk_id: 'user_test123',
    subscription_tier: 'free',
    subscription_status: 'inactive',
    subscription_provider: 'stripe',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_expires_at: null,
    trial_claimed_at: null,
    deleted_at: null,
    deletion_scheduled_at: null,
    ...overrides,
  }
}
