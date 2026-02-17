'use client'

import { useState } from 'react'
import Link from 'next/link'

type UpgradeContext = 'dashboard' | 'horoscope' | 'oracle'

interface UpgradePromptProps {
  context: UpgradeContext
  priceMonthly: string
  className?: string
}

const COPY: Record<UpgradeContext, string> = {
  dashboard: 'Отключете пълната картина на вашето космическо пътешествие',
  horoscope: 'Отключете подробен транзитен анализ и планетарни влияния',
  oracle: 'Отключете всички теми на Оракула',
}

/**
 * UpgradePrompt — reusable inline upgrade CTA for free users.
 *
 * Renders as a compact teaser that expands in-place to show pricing
 * and an upgrade button. Uses inline expansion — not a modal or redirect.
 *
 * Props:
 *  context     — determines copy ('dashboard' | 'horoscope' | 'oracle')
 *  priceMonthly — Stripe Price ID for monthly plan (from server env)
 *  className   — optional additional Tailwind classes
 */
export function UpgradePrompt({ context, priceMonthly, className = '' }: UpgradePromptProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: priceMonthly }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('[UpgradePrompt] No checkout URL returned:', data.error)
        setLoading(false)
      }
    } catch (err) {
      console.error('[UpgradePrompt] Checkout error:', err)
      setLoading(false)
    }
  }

  return (
    <div
      className={[
        'rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-violet-900/10 backdrop-blur transition-all duration-300',
        expanded ? 'p-5' : 'p-4',
        className,
      ].join(' ')}
    >
      {/* Collapsed state */}
      {!expanded && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Sparkle icon */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15">
              <svg
                className="h-4 w-4 text-purple-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
            </div>
            <p className="text-sm text-white/70">{COPY[context]}</p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="shrink-0 rounded-lg border border-purple-500/30 bg-purple-600/20 px-3 py-1.5 text-xs font-medium text-purple-300 transition-all hover:bg-purple-600/30 hover:text-purple-200"
          >
            Научи повече
          </button>
        </div>
      )}

      {/* Expanded state */}
      {expanded && (
        <div>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/90">{COPY[context]}</p>
              <p className="mt-1 text-xs text-white/50">
                Отключете целия потенциал на Celestia с Премиум достъп.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="shrink-0 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Скрий
            </button>
          </div>

          {/* Pricing */}
          <div className="mb-4 rounded-lg border border-white/5 bg-white/5 px-4 py-3">
            <p className="text-base font-semibold text-white">€9,99<span className="text-sm font-normal text-white/50">/мес</span></p>
            <p className="text-xs text-white/40">или €99,99/год — спестете 2 месеца</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {loading ? 'Зареждане...' : 'Отключи Премиум'}
            </button>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-white/60 transition-all hover:bg-white/5 hover:text-white/80"
            >
              Виж всички предимства
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
