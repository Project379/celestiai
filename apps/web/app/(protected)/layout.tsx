import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'
import { NavigationTransition } from '@/components/NavigationTransition'
import { ProtectedNav } from '@/components/layout/ProtectedNav'
import { UserMenu } from '@/components/auth/UserMenu'
import { SessionExpiryModal } from '@/components/auth/SessionExpiryModal'
import { OraclePanelGlobal } from '@/components/oracle/OraclePanelGlobal'
import { getCachedLatestChart, getCachedUserTier } from '@/lib/supabase/queries'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  // Fetch chart + tier for the global Oracle button
  // Uses React.cache() - deduped with any page-level fetches in the same render pass
  let chartId: string | null = null
  let subscriptionTier: 'free' | 'premium' = 'free'
  if (userId) {
    try {
      const [chart, tier] = await Promise.all([
        getCachedLatestChart(userId),
        getCachedUserTier(userId),
      ])
      chartId = chart?.id ?? null
      subscriptionTier = tier
    } catch {
      // Defaults stay null / 'free'
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* TODO: background redesign - CelestialBackground still uses the legacy
         starfield + constellation overlay. Align it with the editorial system
         (ambient violet/amber, Cinzel accents, slower parallax) before ship. */}
      <CelestialBackgroundLazy />

      {/* Content layer */}
      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-slate-200/[0.05] bg-[#08060f]/50 backdrop-blur-md">
          {/* Top ivory accent hairline */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/20 to-transparent" />
          <div className="absolute left-1/2 top-0 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

          {/* Main row: logo | nav (desktop center) | profile */}
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <div className="relative flex h-7 w-7 items-center justify-center rounded-md border border-slate-200/10 bg-gradient-to-br from-violet-500/20 via-transparent to-amber-400/10">
                <span aria-hidden className="absolute inset-0 rounded-md bg-violet-500/10 blur-sm" />
                <span className="relative font-cinzel text-xs font-bold text-amber-200/90">C</span>
              </div>
              <span className="font-cinzel text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-100/90 transition-colors group-hover:text-white">
                Celestia
              </span>
            </Link>

            {/* Nav - centered horizontally and vertically, desktop only */}
            <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex md:items-center">
              <ProtectedNav hasChart={!!chartId} />
            </div>

            {/* Right - premium badge + user avatar */}
            <div className="flex shrink-0 items-center gap-4">
              {subscriptionTier === 'premium' && (
                <span className="hidden h-8 items-center gap-2 font-cinzel text-[9px] font-semibold uppercase leading-none tracking-[0.3em] text-amber-300/85 sm:inline-flex">
                  <span
                    aria-hidden
                    className="h-1 w-1 rotate-45 bg-amber-300/85 shadow-[0_0_6px_rgba(251,191,36,0.55)]"
                  />
                  Premium
                </span>
              )}
              <UserMenu />
            </div>
          </div>

          {/* Mobile nav - slim scrollable row below brand */}
          <div className="border-t border-slate-200/[0.04] md:hidden">
            <div className="container mx-auto px-4 py-1.5">
              <ProtectedNav hasChart={!!chartId} />
            </div>
          </div>
        </header>

        {/* Main content with navigation transition */}
        <main className="container mx-auto px-4 py-8">
          <NavigationTransition>
            {children}
          </NavigationTransition>
        </main>
      </div>

      {/* Global Oracle modal — triggered by ProtectedNav via oracle:open event */}
      <OraclePanelGlobal chartId={chartId} subscriptionTier={subscriptionTier} />

      {/* Global session expiry modal */}
      <SessionExpiryModal />
    </div>
  )
}
