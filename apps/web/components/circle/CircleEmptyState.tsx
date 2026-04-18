'use client'

import { motion } from 'framer-motion'

/**
 * Empty state per MOBILE_UX_RESEARCH §12.2:
 * - Single emotional prompt ("Кого мислиш в момента?")
 * - Three visual cards (Партньор / Приятел / Crush)
 * - No "+ Add" button, no feature list, no pricing
 * - Paywall is downstream (after entering the person and seeing the teaser)
 */

type Kind = {
  key: 'partner' | 'friend' | 'crush'
  label: string
  subtitle: string
  accent: string
  border: string
  glow: string
}

const KINDS: readonly Kind[] = [
  {
    key: 'partner',
    label: 'Партньор',
    subtitle: 'дълбока връзка',
    accent: 'text-violet-200',
    border: 'border-violet-400/40 hover:border-violet-300/70',
    glow: 'shadow-[0_0_40px_-10px_rgba(139,92,246,0.35)]',
  },
  {
    key: 'friend',
    label: 'Приятел',
    subtitle: 'близък кръг',
    accent: 'text-amber-200',
    border: 'border-amber-300/40 hover:border-amber-200/70',
    glow: 'shadow-[0_0_40px_-10px_rgba(251,191,36,0.35)]',
  },
  {
    key: 'crush',
    label: 'Crush',
    subtitle: 'тих радар',
    accent: 'text-rose-200',
    border: 'border-rose-400/30 hover:border-rose-300/60',
    glow: 'shadow-[0_0_40px_-10px_rgba(244,114,182,0.30)]',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.62,
      delay: i * 0.08,
      ease: [0.22, 0.68, 0.35, 1] as const,
    },
  }),
}

export function CircleEmptyState() {
  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-12"
      >
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Твоят кръг
        </p>
        <h1 className="font-display text-[2.125rem] font-light leading-[1.2] tracking-tight text-slate-100 sm:text-[2.75rem]">
          Кого мислиш в момента?
        </h1>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="mb-10 grid gap-4 sm:grid-cols-3"
      >
        {KINDS.map((kind) => (
          <button
            key={kind.key}
            type="button"
            className={`group rounded-2xl border bg-transparent p-6 text-left transition-all duration-300 ${kind.border} hover:${kind.glow}`}
          >
            <p className={`font-cinzel text-[11px] font-semibold uppercase tracking-[0.34em] ${kind.accent}`}>
              {kind.label}
            </p>
            <p className="mt-3 font-display text-[14px] font-light text-slate-400 group-hover:text-slate-200">
              {kind.subtitle}
            </p>
          </button>
        ))}
      </motion.div>

      <motion.p
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={2}
        className="font-display text-[14px] font-light leading-[1.7] text-slate-500"
      >
        Или добави някого, когото искаш да разбереш по-добре.
      </motion.p>
    </div>
  )
}
