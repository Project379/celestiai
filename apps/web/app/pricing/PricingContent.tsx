'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PricingToggle } from '@/components/upgrade/PricingToggle'

interface PricingContentProps {
  currentTier: string
  priceMonthly: string
  priceAnnual: string
}

const FREE_FEATURES = [
  'Личностно четене (характеристики)',
  'Базова натална карта',
  'Преглед на дневния хороскоп',
]

const PREMIUM_FEATURES = [
  'Всичко от Безплатния план',
  'Любовно четене',
  'Кариерно четене',
  'Здравно четене',
  'Приоритетни AI отговори',
]

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.62, delay: i * 0.08, ease: [0.22, 0.68, 0.35, 1] as const },
  }),
}

export function PricingContent({ currentTier, priceMonthly, priceAnnual }: PricingContentProps) {
  const searchParams = useSearchParams()
  const [selectedPriceId, setSelectedPriceId] = useState(priceMonthly)
  const [isAnnual, setIsAnnual] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const wasCancelled = searchParams.get('cancelled') === 'true'
  const isPremium = currentTier === 'premium'

  function handlePriceChange(priceId: string, annual: boolean) {
    setSelectedPriceId(priceId)
    setIsAnnual(annual)
  }

  async function handleUpgrade() {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: selectedPriceId }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrorMessage(data.error ?? 'Грешка при пренасочването. Опитайте отново.')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setErrorMessage('Грешка при свързването. Проверете интернет връзката.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-32 -z-10 h-[480px] w-[480px] rounded-full bg-violet-500/[0.09] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-40 -z-10 h-[320px] w-[320px] rounded-full bg-amber-500/[0.06] blur-[100px]"
      />

      {/* ─── Hero ─────────────────────────────────────── */}
      <motion.header
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-14 text-center"
      >
        <div className="mb-5 flex items-center justify-center gap-3" aria-hidden>
          <span className="h-px w-14 bg-gradient-to-r from-transparent to-amber-300/50" />
          <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="h-px w-14 bg-gradient-to-l from-transparent to-amber-300/50" />
        </div>
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
          Цени
        </p>
        <h1 className="font-display text-[2.125rem] leading-[1.12] tracking-tight sm:text-[2.75rem]">
          <span className="font-light text-slate-400">Избери </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.18)]">
            своя план.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl font-display text-[16px] font-light leading-relaxed text-slate-400">
          Отключи пълния потенциал на звездната си карта.
        </p>
      </motion.header>

      {wasCancelled && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mx-auto mb-8 max-w-xl border-l border-amber-300/40 bg-gradient-to-r from-amber-300/[0.04] via-transparent to-violet-400/[0.04] px-5 py-3"
        >
          <p className="font-display text-[13px] leading-relaxed text-slate-300/90">
            Плащането не беше завършено. Опитай отново, когато си готов/а.
          </p>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
          className="mx-auto mb-8 max-w-xl border-l border-rose-300/50 bg-rose-500/[0.04] px-5 py-3"
        >
          <p className="font-display text-[13px] text-rose-300/90">{errorMessage}</p>
        </motion.div>
      )}

      {/* ─── Plan cards ──────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        {/* Free plan */}
        <motion.article
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015] px-7 py-8 backdrop-blur-sm transition-colors hover:border-violet-300/25 hover:bg-white/[0.03]"
        >
          <header className="mb-7 text-center">
            <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
              I · Безплатен
            </p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-display text-[3rem] font-light leading-none tracking-tight sm:text-[3.5rem]">
                <span className="bg-gradient-to-br from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  €0
                </span>
              </span>
            </div>
            <p className="mt-3 font-display text-[13px] text-slate-400">
              Завинаги безплатно
            </p>
          </header>

          <ul className="mb-8 flex-grow space-y-3 border-y border-white/[0.05] py-5">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-amber-300/80 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
                <span className="font-display text-[14px] leading-relaxed text-slate-300/90">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-center border-t border-white/[0.05] pt-5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            {isPremium ? 'Базов план' : 'Твоят текущ план'}
          </div>
        </motion.article>

        {/* Premium plan */}
        <motion.article
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={3}
          className="relative flex flex-col overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-amber-400/[0.06] px-7 py-8 shadow-[0_0_42px_rgba(167,139,250,0.14)] backdrop-blur-sm"
        >
          {/* Highlight badge */}
          <div className="absolute -top-[1px] left-1/2 flex -translate-x-1/2 items-center gap-2 border-x border-b border-amber-300/40 bg-gradient-to-r from-violet-500/15 via-[#08060f] to-amber-400/15 px-4 py-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.34em] text-amber-200">
            <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            Препоръчан
            <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          </div>

          <header className="mb-7 mt-4 text-center">
            <div className="mb-3 flex items-center justify-center gap-3">
              <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
                II · Премиум
              </p>
              {isPremium && (
                <span className="inline-flex items-center gap-1.5 font-cinzel text-[8.5px] font-semibold uppercase tracking-[0.26em] text-amber-300/80">
                  <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_6px_rgba(251,191,36,0.55)]" />
                  Активен
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-center gap-2">
              <span className="font-display text-[3rem] font-light leading-none tracking-tight sm:text-[3.5rem]">
                <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.15)]">
                  {isAnnual ? '€59,99' : '€6,99'}
                </span>
              </span>
              <span className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                /{isAnnual ? 'год' : 'мес'}
              </span>
            </div>
            <p className="mt-3 font-display text-[13px] text-slate-400">
              {isAnnual ? 'Спестяваш ~€24 за година' : 'Или €59,99/год - спестяваш ~28%'}
            </p>
          </header>

          {!isPremium && priceAnnual && (
            <div className="mb-6">
              <PricingToggle
                priceMonthly={priceMonthly}
                priceAnnual={priceAnnual}
                onPriceChange={handlePriceChange}
              />
            </div>
          )}

          <ul className="mb-8 flex-grow space-y-3 border-y border-white/[0.05] py-5">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rotate-45 bg-amber-300/90 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                <span className="font-display text-[14px] leading-relaxed text-slate-200/95">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {isPremium ? (
            <Link
              href="/dashboard"
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-white/[0.10] px-6 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-300 transition-all hover:border-violet-300/40 hover:text-slate-100"
            >
              <span className="relative">Обратно към таблото</span>
            </Link>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={isLoading || !selectedPriceId}
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-amber-300/60 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-6 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-100 transition-all hover:border-amber-300/90 hover:text-white hover:shadow-[0_0_28px_rgba(251,191,36,0.22)] disabled:pointer-events-none disabled:opacity-50"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
              <span className="relative">{isLoading ? 'Зареждане…' : 'Отключи Премиум'}</span>
              <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            </button>
          )}
        </motion.article>
      </div>

      {/* Footer note */}
      <motion.p
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={4}
        className="mt-14 text-center font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-600"
      >
        Сигурно плащане чрез Stripe · Прекрати по всяко време
      </motion.p>
    </div>
  )
}
