'use client'

import { useState, useEffect } from 'react'
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
  'Детайлен транзитен анализ',
  'Приоритетни AI отговори',
]

/**
 * Client component that renders the pricing cards with toggle and checkout logic.
 * Receives tier info and price IDs from the server component parent.
 */
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
    <div className="px-4 py-16">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 0.68, 0.35, 1] }}
        >
          <h1 className="mb-3 text-4xl font-bold text-white">Избери своя план</h1>
          <p className="text-lg text-white/60">
            Отключи пълния потенциал на звездната си карта
          </p>
        </motion.div>

        {/* Cancelled payment notice */}
        {wasCancelled && (
          <motion.div
            className="mb-8 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white/60"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            Плащането не беше завършено. Опитай отново, когато си готов/а.
          </motion.div>
        )}

        {/* Error message */}
        {errorMessage && (
          <motion.div
            className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {errorMessage}
          </motion.div>
        )}

        {/* Pricing cards */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-8">

          {/* Free plan card */}
          <motion.div
            className="glass flex flex-1 flex-col rounded-2xl p-8"
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 0.68, 0.35, 1] }}
          >
            <div className="mb-6">
              <div className="mb-1 text-sm font-medium uppercase tracking-widest text-white/40">
                Безплатен
              </div>
              <div className="text-4xl font-bold text-white">€0</div>
              <div className="mt-1 text-sm text-white/50">Завинаги безплатно</div>
            </div>

            <ul className="mb-8 flex-1 space-y-3">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="mt-0.5 flex-shrink-0 text-violet-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-white/40">
              {isPremium ? 'Базов план' : 'Твоят текущ план'}
            </div>
          </motion.div>

          {/* Premium plan card */}
          <motion.div
            className="flex flex-1 flex-col rounded-2xl p-8"
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 0.68, 0.35, 1] }}
            style={{
              background: 'rgb(var(--color-surface-glass) / 0.25)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgb(139 92 246 / 0.4)',
              boxShadow: '0 0 40px rgb(139 92 246 / 0.15)',
            }}
          >
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <div className="text-sm font-medium uppercase tracking-widest text-violet-300">
                  Премиум
                </div>
                {isPremium && (
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
                    Активен план
                  </span>
                )}
              </div>

              {isAnnual ? (
                <>
                  <div className="text-4xl font-bold text-white">€59<span className="text-2xl">,99</span></div>
                  <div className="mt-1 text-sm text-white/50">€59,99/год — спестявате ~€24</div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-white">€6<span className="text-2xl">,99</span></div>
                  <div className="mt-1 text-sm text-white/50">€6,99/мес</div>
                </>
              )}
            </div>

            {/* Billing toggle */}
            {!isPremium && (
              <div className="mb-6">
                <PricingToggle
                  priceMonthly={priceMonthly}
                  priceAnnual={priceAnnual}
                  onPriceChange={handlePriceChange}
                />
              </div>
            )}

            <ul className="mb-8 flex-1 space-y-3">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-white/80">
                  <span className="mt-0.5 flex-shrink-0 text-violet-400">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {isPremium ? (
              <Link
                href="/settings"
                className="block rounded-xl bg-white/10 px-6 py-3 text-center text-sm font-semibold text-white/80 transition-all hover:bg-white/15"
              >
                Управление на абонамент
              </Link>
            ) : (
              <button
                onClick={handleUpgrade}
                disabled={isLoading || !selectedPriceId}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:from-violet-500 hover:to-pink-500 hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? 'Зареждане...' : 'Отключи Премиум'}
              </button>
            )}
          </motion.div>
        </div>

        {/* Footer note */}
        <motion.p
          className="mt-10 text-center text-xs text-white/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          Сигурно плащане чрез Stripe. Можеш да прекратиш абонамента си по всяко време.
        </motion.p>
      </div>
    </div>
  )
}
