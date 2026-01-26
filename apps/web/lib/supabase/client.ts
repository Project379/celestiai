'use client'

import { useSession } from '@clerk/nextjs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

/**
 * Hook to create a Supabase client for client-side use
 * Automatically injects Clerk session token for RLS authentication
 *
 * Usage in Client Components:
 * ```tsx
 * function MyComponent() {
 *   const supabase = useSupabaseClient()
 *   // Use supabase client for queries
 * }
 * ```
 */
export function useSupabaseClient(): SupabaseClient {
  const { session } = useSession()

  return useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
      )
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      async accessToken() {
        return session?.getToken() ?? null
      },
    })
  }, [session])
}
