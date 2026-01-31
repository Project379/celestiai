import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for server-side use
 * Automatically injects Clerk JWT token for RLS authentication
 *
 * Usage in API routes or Server Components:
 * ```ts
 * const supabase = await createServerSupabaseClient()
 * const { data } = await supabase.from('charts').select('*')
 * ```
 */
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required'
    )
  }

  // Get the Clerk session
  const session = await auth()
  const userId = session.userId

  console.log('[Supabase Server] User ID:', userId)

  if (!userId) {
    throw new Error('User not authenticated')
  }

  // Try to get the Supabase JWT token from Clerk
  // This requires a JWT template named "supabase" in Clerk Dashboard
  let token: string | null = null
  try {
    token = await session.getToken({ template: 'supabase' })
    console.log('[Supabase Server] Got Supabase token:', !!token)
  } catch (e) {
    console.log('[Supabase Server] No Supabase JWT template, using default token')
    token = await session.getToken()
  }

  if (!token) {
    console.log('[Supabase Server] No token available, using anon client with userId header')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? {
        Authorization: `Bearer ${token}`,
      } : {},
    },
  })
}
