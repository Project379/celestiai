import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Generic Supabase client factory
 * Takes an accessToken function that returns the Clerk JWT token
 * This enables RLS policies to work with Clerk authentication
 */
export function createSupabaseClient(
  accessToken: () => Promise<string | null>
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
    )
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken,
  })
}
