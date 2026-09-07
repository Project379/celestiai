import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with the secret key (the new-format replacement
 * for the legacy service_role key — same privilege level).
 * ONLY use this for server-side operations where you manually handle user filtering
 * This bypasses RLS - always filter by user_id manually!
 */
export function createServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required'
    )
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
