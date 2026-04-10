import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'
import { NavigationTransition } from '@/components/NavigationTransition'
import { OracleButtonGlobal } from '@/components/oracle/OracleButtonGlobal'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  // Fetch chart + tier for the global Oracle button
  let chartId: string | null = null
  let subscriptionTier: 'free' | 'premium' = 'free'
  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const [chartResult, userResult] = await Promise.all([
        supabase
          .from('charts')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('users')
          .select('subscription_tier')
          .eq('clerk_id', userId)
          .single(),
      ])
      if (!chartResult.error && chartResult.data) {
        chartId = chartResult.data.id
      }
      if (!userResult.error && userResult.data?.subscription_tier === 'premium') {
        subscriptionTier = 'premium'
      }
    } catch {
      // Defaults stay null / 'free'
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated celestial background — behind everything */}
      <CelestialBackgroundLazy />

      {/* Content layer */}
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                <span className="text-sm font-bold text-white font-display">C</span>
              </div>
              <span className="font-semibold font-display text-slate-100 tracking-wide">Celestia</span>
            </Link>
            <div id="user-menu-slot" />
          </div>
        </header>

        {/* Main content with navigation transition */}
        <main className="container mx-auto px-4 py-8">
          <NavigationTransition>
            {children}
          </NavigationTransition>
        </main>
      </div>

      {/* Global floating Oracle button — fixed bottom-right on all protected pages */}
      <OracleButtonGlobal chartId={chartId} subscriptionTier={subscriptionTier} />
    </div>
  )
}
