import { useSession } from '@clerk/expo'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

/**
 * React hook returning a Supabase client authenticated with the current Clerk
 * session. The client signs every request with a Clerk-issued JWT via the
 * `accessToken` callback. Mobile-specific config disables Supabase's own session
 * machinery (no localStorage on React Native; Clerk owns auth state). Memoized
 * on the session reference so the client re-creates only on auth-state change.
 */
export function useSupabaseClient(): SupabaseClient {
  const { session } = useSession()

  return useMemo(() => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase env vars: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required',
      )
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      async accessToken() {
        if (!session) return null
        try {
          return await session.getToken({ template: 'supabase' })
        } catch {
          return await session.getToken()
        }
      },
    })
  }, [session])
}
