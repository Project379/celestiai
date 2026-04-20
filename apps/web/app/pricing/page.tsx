import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { PricingContent } from './PricingContent'

export const metadata: Metadata = {
  title: 'Цени',
  description: 'Избери план, който ти подхожда - без скрити такси',
}

/**
 * /pricing - Subscription plan comparison page.
 *
 * Public marketing page. Reachable anonymously — anon visitors see
 * current-tier="free" and the upgrade CTA redirects them into sign-in
 * before Stripe Checkout. Lives outside (protected)/ so the route-
 * group layout redirect doesn't gate access (it used to, which meant
 * anon visitors never saw the plan comparison — 2026-04-20 audit).
 *
 * Server component: fetches current user tier if signed in and passes
 * price IDs to the client component.
 */
export default async function PricingPage() {
  const { userId } = await auth()

  let currentTier = 'free'
  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('clerk_id', userId)
        .single()
      if (user?.subscription_tier) {
        currentTier = user.subscription_tier
      }
    } catch {
      // Default to free tier if lookup fails
    }
  }

  const priceMonthly = process.env.STRIPE_PRICE_MONTHLY ?? ''
  const priceAnnual = process.env.STRIPE_PRICE_ANNUAL ?? ''

  return (
    <div className="relative min-h-screen">
      <CelestialBackgroundLazy />

      <div className="relative z-10">
        <header className="sticky top-0 z-50 border-b border-slate-200/[0.05] bg-[#08060f]/50 backdrop-blur-md">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/20 to-transparent" />
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <Link
              href="/"
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

            <div className="flex shrink-0 items-center gap-4">
              {userId ? (
                <Link
                  href="/dashboard"
                  className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-300 transition-colors hover:text-amber-300"
                >
                  Към таблото
                </Link>
              ) : (
                <Link
                  href="/sign-in"
                  className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-300 transition-colors hover:text-amber-300"
                >
                  Вход
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <Suspense fallback={<div className="px-4 py-16 text-center text-white/40">Зареждане...</div>}>
            <PricingContent
              currentTier={currentTier}
              priceMonthly={priceMonthly}
              priceAnnual={priceAnnual}
            />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
