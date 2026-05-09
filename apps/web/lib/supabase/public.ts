import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for public data access (no auth required)
 * Use this for reading public reference data like cities
 */
export function createPublicSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}
