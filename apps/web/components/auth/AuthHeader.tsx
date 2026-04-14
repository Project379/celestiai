'use client'

import { motion } from 'framer-motion'

export function AuthHeader() {
  return (
    <motion.div
      className="mb-8 text-center"
      initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: [0.22, 0.68, 0.35, 1] }}
    >
      {/* Brand lockup — ivory Cinzel + gold ornament */}
      <div className="mb-1 flex items-center justify-center gap-3">
        <span
          aria-hidden
          className="h-px w-8 bg-gradient-to-r from-transparent via-slate-300/30 to-slate-300/50"
        />
        <span className="text-[13px] leading-none text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">✦</span>
        <h1
          className="font-cinzel text-3xl font-bold tracking-[0.12em]"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #fde68a 80%, #fbbf24 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 20px rgba(167, 139, 250, 0.35))',
          }}
        >
          Celestia AI
        </h1>
        <span className="text-[13px] leading-none text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">✦</span>
        <span
          aria-hidden
          className="h-px w-8 bg-gradient-to-l from-transparent via-slate-300/30 to-slate-300/50"
        />
      </div>

      {/* Bulgarian tagline */}
      <motion.p
        className="mt-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.36em] text-slate-400/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        Твоят астрологичен приятел
      </motion.p>
    </motion.div>
  )
}
