import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with service role key
 * ONLY use this for server-side operations where you manually handle user filtering
 * This bypasses RLS - always filter by user_id manually!
 */
export function createServiceSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('[Service Client] URL:', !!supabaseUrl, 'Key:', !!supabaseServiceKey)

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Service Client] Missing env vars!')
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
