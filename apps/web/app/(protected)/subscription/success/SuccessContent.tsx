'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

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
 */
export function SuccessContent({ initialTier }: SuccessContentProps) {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [uiState, setUiState] = useState<State>(
    initialTier === 'premium' ? 'activated' : 'activating'
  )

  useEffect(() => {
    if (uiState === 'activated') return

    const POLL_INTERVAL_MS = 2000
    const TIMEOUT_MS = 30000
    const startTime = Date.now()

    const intervalId = setInterval(async () => {
      if (Date.now() - startTime >= TIMEOUT_MS) {
        clearInterval(intervalId)
        setUiState('timeout')
        return
      }

      try {
        const url = sessionId
          ? `/api/stripe/status?session_id=${encodeURIComponent(sessionId)}`
          : '/api/stripe/status'
        const res = await fetch(url)
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
  }, [uiState, sessionId])

  return (
    <AnimatePresence mode="wait">
      {uiState === 'activating' && (
        <motion.div
          key="activating"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: [0.22, 0.68, 0.35, 1] }}
        >
          <ActivatingState />
        </motion.div>
      )}
      {uiState === 'activated' && (
        <motion.div
          key="activated"
          initial={{ opacity: 0, scale: 0.8, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: [0.22, 0.68, 0.35, 1] }}
        >
          <ActivatedState />
        </motion.div>
      )}
      {uiState === 'timeout' && (
        <motion.div
          key="timeout"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <TimeoutState />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// UI States
// ---------------------------------------------------------------------------

function ActivatingState() {
  return (
    <div className="text-center max-w-md mx-auto">
      {/* Cosmic pulsing icon */}
      <div className="relative mx-auto mb-8 w-24 h-24">
        <motion.div
          className="absolute inset-0 rounded-full bg-purple-600/20"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full bg-purple-600/30"
          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
        />
        <motion.div
          className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 shadow-lg shadow-purple-900/50"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-4xl">✨</span>
        </motion.div>
      </div>

      <h1 className="text-2xl font-semibold text-white mb-3">
        Активираме премиум достъпа ти...
      </h1>
      <p className="text-white/60 text-sm">
        Това обикновено отнема няколко секунди
      </p>

      {/* Animated loading dots */}
      <div className="flex justify-center gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-purple-400"
            animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function ActivatedState() {
  // Generate stable particle positions
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        x: (i * 137.5) % 360, // golden angle spread
        delay: (i * 0.08) % 1,
        size: 3 + (i % 4) * 2,
        color: ['#a78bfa', '#6366f1', '#fbbf24', '#22d3ee', '#f472b6'][i % 5],
        distance: 60 + (i % 5) * 30,
      })),
    []
  )

  return (
    <div className="text-center max-w-md mx-auto">
      {/* Celebration icon with particles */}
      <div className="relative mx-auto mb-8 w-40 h-40 flex items-center justify-center">
        {/* Burst particles */}
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              left: '50%',
              top: '50%',
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{
              x: Math.cos((p.x * Math.PI) / 180) * p.distance,
              y: Math.sin((p.x * Math.PI) / 180) * p.distance,
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 1.2,
              delay: p.delay + 0.2,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Glow ring */}
        <motion.div
          className="absolute rounded-full border-2 border-yellow-400/30"
          initial={{ width: 0, height: 0, opacity: 0 }}
          animate={{ width: 140, height: 140, opacity: [0, 0.6, 0] }}
          transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        />

        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <motion.div
            className="absolute -inset-2 rounded-full bg-yellow-400/10"
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-900/40">
            <span className="text-4xl">⭐</span>
          </div>
        </motion.div>
      </div>

      <motion.h1
        className="text-2xl font-semibold text-white mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        Добре дошли в Celestia Премиум! ✨
      </motion.h1>
      <motion.p
        className="text-white/60 text-sm mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
      >
        Премиум достъпът ти е активен
      </motion.p>

      {/* Unlocked features summary */}
      <motion.div
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-5 mb-8 text-left space-y-2"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        {[
          'Пълни AI анализи за всички теми',
          'Неограничени персонализирани четения',
          'Дневен хороскоп с детайлни транзити',
          'Приоритетен достъп до нови функции',
        ].map((feature, i) => (
          <motion.div
            key={feature}
            className="flex items-center gap-2 text-sm text-white/80"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
          >
            <span className="text-purple-400">✦</span>
            {feature}
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.4 }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-900/40 hover:from-purple-500 hover:to-indigo-500 transition-all"
        >
          Към таблото
          <span aria-hidden>→</span>
        </Link>
      </motion.div>
    </div>
  )
}

function TimeoutState() {
  return (
    <div className="text-center max-w-md mx-auto">
      {/* Neutral cosmic icon */}
      <motion.div
        className="flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 border border-white/10"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-3xl">🌌</span>
      </motion.div>

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
