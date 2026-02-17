'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface SuccessContentProps {
  initialTier: string
}

type State = 'activating' | 'activated' | 'timeout'

/**
 * SuccessContent — client component for the /subscription/success page.
 *
 * Polls /api/stripe/status every 2 seconds until:
 * - tier becomes 'premium' → shows celebration state
 * - 30 seconds elapse without confirmation → shows timeout fallback
 *
 * The initial render checks immediately if the webhook already fired
 * before the user's browser arrived on this page.
 */
export function SuccessContent({ initialTier }: SuccessContentProps) {
  const [uiState, setUiState] = useState<State>(
    initialTier === 'premium' ? 'activated' : 'activating'
  )

  useEffect(() => {
    // Already activated — no polling needed
    if (uiState === 'activated') return

    const POLL_INTERVAL_MS = 2000
    const TIMEOUT_MS = 30000
    const startTime = Date.now()

    const intervalId = setInterval(async () => {
      // Check 30-second timeout
      if (Date.now() - startTime >= TIMEOUT_MS) {
        clearInterval(intervalId)
        setUiState('timeout')
        return
      }

      try {
        const res = await fetch('/api/stripe/status')
        if (!res.ok) return

        const data = (await res.json()) as { tier: string }
        if (data.tier === 'premium') {
          clearInterval(intervalId)
          setUiState('activated')
        }
      } catch {
        // Network error — keep polling until timeout
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [uiState])

  if (uiState === 'activated') {
    return <ActivatedState />
  }

  if (uiState === 'timeout') {
    return <TimeoutState />
  }

  return <ActivatingState />
}

// ---------------------------------------------------------------------------
// UI States
// ---------------------------------------------------------------------------

function ActivatingState() {
  return (
    <div className="text-center max-w-md mx-auto">
      {/* Cosmic pulsing icon */}
      <div className="relative mx-auto mb-8 w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-purple-600/20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-purple-600/30 animate-ping [animation-delay:0.3s]" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg shadow-purple-900/50">
          <span className="text-4xl">✨</span>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-3">
        Активираме вашия премиум достъп...
      </h1>
      <p className="text-white/60 text-sm">
        Това обикновено отнема няколко секунди
      </p>

      {/* Subtle loading dots */}
      <div className="flex justify-center gap-1.5 mt-6">
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0s]" />
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.15s]" />
        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0.3s]" />
      </div>
    </div>
  )
}

function ActivatedState() {
  return (
    <div className="text-center max-w-md mx-auto">
      {/* Celebration icon */}
      <div className="relative mx-auto mb-8 w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-yellow-400/10 animate-pulse" />
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-900/40">
          <span className="text-4xl">⭐</span>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-2">
        Добре дошли в Celestia Премиум! ✨
      </h1>
      <p className="text-white/60 text-sm mb-6">
        Вашият премиум достъп е активен
      </p>

      {/* Unlocked features summary */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-5 mb-8 text-left space-y-2">
        {[
          'Пълни AI анализи за всички теми',
          'Неограничени персонализирани четения',
          'Дневен хороскоп с детайлни транзити',
          'Приоритетен достъп до нови функции',
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-white/80">
            <span className="text-purple-400">✦</span>
            {feature}
          </div>
        ))}
      </div>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-indigo-500 transition-all"
      >
        Към таблото
        <span aria-hidden>→</span>
      </Link>
    </div>
  )
}

function TimeoutState() {
  return (
    <div className="text-center max-w-md mx-auto">
      {/* Neutral cosmic icon */}
      <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 border border-white/10">
        <span className="text-3xl">🌌</span>
      </div>

      <h1 className="text-xl font-semibold text-white mb-3">
        Активирането продължава...
      </h1>
      <p className="text-white/60 text-sm mb-6">
        Ако активирането отнеме повече време, опреснете страницата или се
        свържете с нас.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm text-white hover:bg-white/10 transition-colors"
        >
          Опресни страницата
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:from-purple-500 hover:to-indigo-500 transition-all"
        >
          Към таблото
        </Link>
      </div>
    </div>
  )
}
