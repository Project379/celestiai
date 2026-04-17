'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface SuccessContentProps {
  initialTier: string
}

type State = 'activating' | 'activated' | 'timeout'

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
        // Keep polling until timeout
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [uiState, sessionId])

  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.10] blur-[130px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.08] blur-[100px]"
      />

      <AnimatePresence mode="wait">
        {uiState === 'activating' && (
          <motion.div
            key="activating"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: [0.22, 0.68, 0.35, 1] }}
          >
            <ActivatingState />
          </motion.div>
        )}
        {uiState === 'activated' && (
          <motion.div
            key="activated"
            initial={{ opacity: 0, scale: 0.85, filter: 'blur(12px)' }}
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
    </div>
  )
}

/* ─── Activating ─────────────────────────────────────── */
function ActivatingState() {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="relative mx-auto mb-10 flex h-24 w-24 items-center justify-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-violet-500/15"
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-2 rounded-full bg-amber-500/15"
          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
        />
        <motion.span
          aria-hidden
          className="relative block h-5 w-5 rotate-45 bg-amber-300/90 shadow-[0_0_22px_rgba(251,191,36,0.75)]"
          animate={{ rotate: 405 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
        Активация
      </p>
      <h1 className="mb-4 font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[2rem]">
        <span className="font-light text-slate-400">Отключваме </span>
        <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent drop-shadow-[0_0_22px_rgba(251,191,36,0.18)]">
          Премиум.
        </span>
      </h1>
      <p className="font-display text-[14px] font-light text-slate-400">
        Това обикновено отнема няколко секунди.
      </p>

      {/* Pulsing amber diamond trio */}
      <div className="mt-8 flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1 w-1 rotate-45 bg-amber-300/80"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.3, 0.85] }}
            transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Activated ──────────────────────────────────────── */
function ActivatedState() {
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        angle: (i * 137.5) % 360,
        delay: (i * 0.08) % 1,
        size: 3 + (i % 4) * 2,
        color: ['#c4b5fd', '#a78bfa', '#fbbf24', '#fde68a', '#e0e7ff'][i % 5],
        distance: 60 + (i % 5) * 30,
      })),
    []
  )

  return (
    <div className="mx-auto max-w-lg text-center">
      {/* Burst */}
      <div className="relative mx-auto mb-10 flex h-44 w-44 items-center justify-center">
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
              x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
              y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
              opacity: [0, 1, 0],
              scale: [0, 1.6, 0],
            }}
            transition={{ duration: 1.3, delay: p.delay + 0.2, ease: 'easeOut' }}
          />
        ))}

        {/* Ring burst */}
        <motion.div
          className="absolute rounded-full border border-amber-300/50"
          initial={{ width: 0, height: 0, opacity: 0 }}
          animate={{ width: 160, height: 160, opacity: [0, 0.7, 0] }}
          transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
          style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
        />

        {/* Central amber diamond */}
        <motion.div
          className="relative"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <span
            aria-hidden
            className="absolute inset-0 -m-6 rounded-full bg-violet-500/[0.15] blur-2xl"
          />
          <span
            aria-hidden
            className="relative block h-5 w-5 rotate-45 bg-amber-300/95 shadow-[0_0_34px_rgba(251,191,36,0.8)]"
          />
        </motion.div>
      </div>

      <motion.p
        className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Premium · активен
      </motion.p>
      <motion.h1
        className="mb-4 font-display text-[2rem] leading-[1.15] tracking-tight sm:text-[2.375rem]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.55 }}
      >
        <span className="font-light text-slate-400">Добре дошъл в </span>
        <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.22)]">
          Celestia.
        </span>
      </motion.h1>
      <motion.p
        className="font-display text-[15px] font-light leading-relaxed text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.45 }}
      >
        Звездите вече разкриват цялата история.
      </motion.p>

      {/* Unlocked features */}
      <motion.ul
        className="mx-auto mt-10 max-w-sm space-y-3 border-y border-white/[0.06] py-6 text-left"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.75, duration: 0.55 }}
      >
        {[
          'Пълни AI анализи за всички теми',
          'Неограничени персонализирани четения',
          'Детайлни транзити и прогресии',
          'Приоритетен достъп до нови функции',
        ].map((feature, i) => (
          <motion.li
            key={feature}
            className="flex items-start gap-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.85 + i * 0.09, duration: 0.32 }}
          >
            <span
              aria-hidden
              className="mt-[9px] h-1 w-1 shrink-0 rotate-45 bg-amber-300/85 shadow-[0_0_6px_rgba(251,191,36,0.55)]"
            />
            <span className="font-display text-[14px] leading-relaxed text-slate-300/90">
              {feature}
            </span>
          </motion.li>
        ))}
      </motion.ul>

      <motion.div
        className="mt-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3, duration: 0.4 }}
      >
        <Link
          href="/dashboard"
          className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-7 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-100 transition-all hover:border-amber-300/80 hover:text-white hover:shadow-[0_0_32px_rgba(251,191,36,0.24)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          <span className="relative">Към таблото</span>
          <svg className="relative h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </motion.div>
    </div>
  )
}

/* ─── Timeout ─────────────────────────────────────────── */
function TimeoutState() {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mb-6 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
          <span
            aria-hidden
            className="h-3 w-3 rotate-45 bg-amber-300/70 shadow-[0_0_14px_rgba(251,191,36,0.55)]"
          />
        </div>
      </div>

      <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
        Изчакване
      </p>
      <h1 className="mb-4 font-display text-[1.625rem] font-semibold leading-tight tracking-tight text-slate-100">
        Активирането продължава…
      </h1>
      <p className="mb-8 font-display text-[14px] font-light leading-relaxed text-slate-400">
        Ако отнема повече време, опресни страницата или се свържи с нас.
      </p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          onClick={() => window.location.reload()}
          className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          Опресни
        </button>
        <Link
          href="/dashboard"
          className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-violet-500/10 via-transparent to-amber-400/10 px-6 py-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200 transition-all hover:border-amber-300/70 hover:text-amber-100 hover:shadow-[0_0_24px_rgba(251,191,36,0.18)]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          <span className="relative">Към таблото</span>
        </Link>
      </div>
    </div>
  )
}
