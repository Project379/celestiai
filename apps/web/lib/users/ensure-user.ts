import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export type SubscriptionTier = 'free' | 'premium'
export type SubscriptionStatus =
  | 'active'
  | 'inactive'
  | 'cancelled'
  | 'past_due'
  | 'trialing'
export type SubscriptionProvider = 'stripe' | 'revenuecat'

export interface AppUser {
  id: string
  clerk_id: string
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  subscription_provider: SubscriptionProvider
  created_at: string | null
  updated_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_expires_at: string | null
  trial_claimed_at: string | null
  deleted_at: string | null
  deletion_scheduled_at: string | null
}

const APP_USER_SELECT = `
  id,
  clerk_id,
  subscription_tier,
  subscription_status,
  subscription_provider,
  created_at,
  updated_at,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_expires_at,
  trial_claimed_at,
  deleted_at,
  deletion_scheduled_at
`

function toAppUser(row: unknown): AppUser {
  const data = row as AppUser
  return {
    ...data,
    subscription_tier: data.subscription_tier === 'premium' ? 'premium' : 'free',
    subscription_status: data.subscription_status ?? 'inactive',
  }
}

export async function ensureUserRecord(clerkUserId: string): Promise<AppUser> {
  const supabase = createServiceSupabaseClient()

  const { data: existingUser, error: selectError } = await supabase
    .from('users')
    .select(APP_USER_SELECT)
    .eq('clerk_id', clerkUserId)
    .maybeSingle()

  if (selectError) {
    throw new Error(
      `[Users] Failed to load app user ${clerkUserId}: ${selectError.message}`
    )
  }

  if (existingUser) {
    return toAppUser(existingUser)
  }

  const { data: createdUser, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkUserId,
      subscription_tier: 'free',
      subscription_status: 'inactive',
    })
    .select(APP_USER_SELECT)
    .single()

  if (!insertError && createdUser) {
    console.log(`[Users] Created app user row for ${clerkUserId}`)
    return toAppUser(createdUser)
  }

  if (insertError?.code === '23505') {
    const { data: racedUser, error: racedSelectError } = await supabase
      .from('users')
      .select(APP_USER_SELECT)
      .eq('clerk_id', clerkUserId)
      .single()

    if (!racedSelectError && racedUser) {
      return toAppUser(racedUser)
    }

    throw new Error(
      `[Users] Failed to load app user after insert conflict ${clerkUserId}: ${
        racedSelectError?.message ?? 'missing row'
      }`
    )
  }

  throw new Error(
    `[Users] Failed to create app user ${clerkUserId}: ${
      insertError?.message ?? 'unknown error'
    }`
  )
}

export async function getCurrentAppUser(): Promise<{
  clerkUserId: string
  user: AppUser
}> {
  const { userId } = await auth()
  if (!userId) {
    throw new Error('[Users] Authenticated user required')
  }

  return {
    clerkUserId: userId,
    user: await ensureUserRecord(userId),
  }
}

export function isDeletionPending(user: AppUser): boolean {
  return Boolean(user.deleted_at || user.deletion_scheduled_at)
}
