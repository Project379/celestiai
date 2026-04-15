import Link from 'next/link'
import { LandingNav } from '@/components/landing/LandingNav'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { AboutSection } from '@/components/landing/AboutSection'
import { CelestialBackgroundLazy } from '@/components/CelestialBackgroundLazy'
import { LandingSplash } from '@/components/landing/LandingSplash'

export function LandingPage() {
  return (
    <LandingSplash>
      <div className="relative min-h-screen">
        <CelestialBackgroundLazy />

        <div className="relative z-10">
          <LandingNav />

          {/* ─── Hero ─────────────────────────────────────── */}
          <section className="relative overflow-hidden">
            {/* Ambient atmosphere */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-20 -z-10 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-violet-500/[0.09] blur-[140px]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-[10%] top-[45%] -z-10 h-[300px] w-[300px] rounded-full bg-amber-500/[0.07] blur-[100px]"
            />

            <div className="container relative mx-auto max-w-3xl px-4 py-32 text-center md:py-44">
              {/* Editorial eyebrow */}
              <div className="mb-6 flex items-center justify-center gap-3" aria-hidden>
                <span className="h-px w-14 bg-gradient-to-r from-transparent to-amber-300/50" />
                <span className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                <span className="h-px w-14 bg-gradient-to-l from-transparent to-amber-300/50" />
              </div>
              <p className="mb-7 font-cinzel text-[11px] font-semibold uppercase tracking-[0.48em] text-slate-500">
                Celestia AI
              </p>

              <h1 className="font-display text-[2.5rem] leading-[1.1] tracking-tight sm:text-[3.25rem] md:text-[4rem]">
                <span className="block font-light italic text-slate-400">Звездите имат</span>
                <span className="block bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_36px_rgba(251,191,36,0.20)]">
                  какво да ти кажат.
                </span>
              </h1>

              <p className="mx-auto mt-8 max-w-xl font-display text-[17px] font-light italic leading-[1.85] text-slate-400 sm:text-[18px]">
                Твоят личен астрологичен придружител - точна натална карта, дневни транзити и AI прозрения, написани на български.
              </p>

              <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
                <Link
                  href="/sign-up"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-8 py-3.5 font-cinzel text-[11px] font-semibold uppercase tracking-[0.38em] text-amber-100 transition-all hover:border-amber-300/80 hover:text-white hover:shadow-[0_0_36px_rgba(251,191,36,0.24)]"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                  <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  <span className="relative">Открий звездите си</span>
                  <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                </Link>

                <Link
                  href="/sign-in"
                  className="group inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
                >
                  Вече имаш акаунт?
                  <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </section>

          <FeaturesSection />

          {/* ─── Mid CTA ──────────────────────────────────── */}
          <section className="relative py-20">
            <div className="container mx-auto max-w-3xl px-4 text-center">
              <div className="mb-6 flex items-center justify-center gap-3" aria-hidden>
                <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/40" />
                <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/40" />
              </div>
              <p className="mx-auto max-w-xl font-display text-[20px] font-light italic leading-[1.7] text-slate-300/90 sm:text-[22px]">
                Любопитно ти е какво казват звездите за теб?
              </p>
              <div className="mt-8">
                <Link
                  href="/sign-up"
                  className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-violet-500/10 via-transparent to-amber-400/10 px-7 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.34em] text-amber-200 transition-all hover:border-amber-300/70 hover:text-amber-100 hover:shadow-[0_0_28px_rgba(251,191,36,0.20)]"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                  />
                  <span className="relative">Започни безплатно</span>
                </Link>
              </div>
            </div>
          </section>

          <PricingSection />
          <AboutSection />

          {/* ─── Footer ───────────────────────────────────── */}
          <footer className="border-t border-white/[0.05]">
            <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-10 md:flex-row md:justify-between">
              <p className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] text-slate-600">
                &copy; 2026 Celestia AI
              </p>
              <div className="flex items-center gap-3" aria-hidden>
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-amber-300/30" />
                <span className="h-1 w-1 rotate-45 bg-amber-300/60" />
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-amber-300/30" />
              </div>
              <Link
                href="/privacy"
                className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] text-slate-600 transition-colors hover:text-amber-300"
              >
                Политика за поверителност
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </LandingSplash>
  )
}
