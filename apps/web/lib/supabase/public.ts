import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for public data access (no auth required)
 * Use this for reading public reference data like cities
 */
export function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[Supabase] URL present:', !!supabaseUrl, 'Key present:', !!supabaseAnonKey)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] Missing env vars:', { supabaseUrl, supabaseAnonKey: supabaseAnonKey?.slice(0, 20) + '...' })
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}
