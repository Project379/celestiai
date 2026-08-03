import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client factory for @stellaeum/core.
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
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
