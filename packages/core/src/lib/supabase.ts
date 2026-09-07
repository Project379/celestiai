import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Secret-key Supabase client factory for @stellaeum/core (the secret key is
 * the new-format replacement for the legacy service_role key — same
 * privilege level).
 *
 * Env-only. No Clerk. No React. No Next.js. This mirrors the pattern in
 * `apps/web/lib/supabase/service.ts` but lives in the shared package so
 * core functions can construct their own client without reaching across
 * workspace boundaries.
 *
 * Bypasses RLS — core functions are expected to filter by user_id explicitly
 * using the userId argument the caller passes in.
 */
export function createCoreSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required',
    )
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
