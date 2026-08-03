import { cache } from 'react'
import { createServiceSupabaseClient } from './service'

/**
 * React.cache() wrappers for common Supabase queries.
 * Deduplicate identical fetches within a single server render pass
 * (e.g. layout + page both reading subscription_tier for the same userId).
 */

export const getCachedUserTier = cache(async (userId: string) => {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('clerk_id', userId)
    .single()
  if (error) return 'free' as const
  return (data?.subscription_tier === 'premium' ? 'premium' : 'free') as 'free' | 'premium'
})

export const getCachedLatestChart = cache(async (userId: string) => {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase
    .from('charts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error || !data) return null
  return data
})
