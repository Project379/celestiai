import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import type { Metadata } from 'next'
import { DataAccountPage } from '@/components/auth/DataAccountPage'

export const metadata: Metadata = {
  title: 'Изтриване на акаунта',
  description: 'Заяви изтриване на своя Stellaeum акаунт — работи и без вход, и без инсталирано приложение',
}

/**
 * Standalone, linkable deletion URL for the Play Console data-safety form
 * (and any future App Store equivalent) — Google requires a web path
 * reachable without the app installed, "prominently featured and easily
 * discoverable" (support.google.com/googleplay/android-developer/answer/13327111).
 * The prior only web-side deletion surface was DataAccountPage rendered
 * inside UserMenu.tsx's Clerk popover — reachable for a signed-in user who
 * already knows to open the account menu, but no direct URL. This route is
 * public (not under app/(protected)/, not in middleware.ts's protected
 * matcher) so it renders for a signed-out visitor too, and reuses
 * DataAccountPage — the same GDPR delete path (POST /api/gdpr/delete-account)
 * — rather than building a second one.
 */
export default async function AccountDeletePage() {
  const { userId } = await auth()

  return (
    <div className="relative min-h-screen bg-[#04030a] px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-violet-500/[0.08] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[45%] h-[360px] w-[360px] rounded-full bg-amber-500/[0.05] blur-[100px]"
      />

      <div className="relative mx-auto max-w-2xl">
        <Link
          href="/"
          className="group mb-12 inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Начало
        </Link>

        {userId ? (
          <div className="rounded-2xl border border-slate-200/10 bg-white/[0.02]">
            <DataAccountPage />
          </div>
        ) : (
          <>
            <h1 className="mb-6 font-display text-[2rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[2.5rem]">
              Изтриване на акаунта в Stellaeum
            </h1>
            <p className="mb-4 max-w-xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              За да изтриеш акаунта си, първо влез в него. След това ще видиш опцията за изтриване на този екран.
            </p>
            <p className="mb-4 max-w-xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              <span className="font-semibold text-slate-100">Какво се случва при изтриване:</span>{' '}
              достъпът ти до Премиум функциите спира веднага. Данните ти — натална карта, запазени профили в Кръг, четения от Оракула, хороскопи и записи в дневника — се пазят 30 дни, през които можеш да отмениш заявката. След това акаунтът и всички свързани с него данни се изтриват безвъзвратно.
            </p>
            <p className="mb-8 max-w-xl font-display text-[15px] leading-[1.85] text-slate-300/90">
              <span className="font-semibold text-slate-100">Ако имаш активен абонамент през Google Play или App Store,</span>{' '}
              изтриването на акаунта не го прекратява — откажи го отделно през съответния магазин.
            </p>
            <Link
              href="/sign-in?redirect_url=/account/delete"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-6 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-100 transition-all hover:border-amber-300/80 hover:text-white hover:shadow-[0_0_28px_rgba(251,191,36,0.22)]"
            >
              Влез, за да продължиш
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
