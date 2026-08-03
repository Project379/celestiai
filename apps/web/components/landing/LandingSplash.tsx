'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Precomputed dot positions - alternates violet/amber for editorial palette
const RING_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180
  const cx = +(60 + 48 * Math.cos(angle)).toFixed(2)
  const cy = +(60 + 48 * Math.sin(angle)).toFixed(2)
  const isAccent = i % 3 === 0
  return {
    cx,
    cy,
    r: isAccent ? 2.5 : 1.5,
    fill: isAccent ? '#fbbf24' : '#a78bfa',
    opacity: +(0.35 + (i % 4) * 0.18).toFixed(2),
  }
})

/**
 * Full-screen intro splash for the landing page.
 * Shows "Stellaeum" with a rotating star ring, then fades out.
 */
export function LandingSplash({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={done ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {!done && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#04030a]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Ambient violet halo */}
            <motion.div
              className="absolute"
              style={{
                width: 320,
                height: 320,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, rgba(99, 102, 241, 0.08) 40%, transparent 72%)',
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.25, 1], opacity: [0, 0.85, 0.6] }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
            />
            {/* Inner amber halo */}
            <motion.div
              className="absolute"
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(251, 191, 36, 0.12) 0%, transparent 70%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.6, 0.4] }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
            />

            {/* Rotating star ring */}
            <motion.div
              className="relative"
              style={{ width: 120, height: 120 }}
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
            >
              <svg viewBox="0 0 120 120" className="h-full w-full">
                {RING_DOTS.map((dot, i) => (
                  <circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={dot.fill} opacity={dot.opacity} />
                ))}
                <motion.path
                  d="M60 28 L63.5 50 L76 38 L66 53 L88 52 L68 58 L84 72 L64 62 L68 84 L60 64 L52 84 L56 62 L36 72 L52 58 L32 52 L54 53 L44 38 L56.5 50 Z"
                  fill="none"
                  stroke="url(#starGrad)"
                  strokeWidth={1.1}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 0.9, 0.7] }}
                  transition={{ duration: 2.4, ease: 'easeOut' }}
                  onAnimationComplete={() => setDone(true)}
                />
                <defs>
                  <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="50%" stopColor="#c4b5fd" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Editorial hairline + eyebrow */}
            <motion.div
              className="mt-10 flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              aria-hidden
            >
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/40" />
              <span className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/40" />
            </motion.div>

            {/* Logo text - gradient matches dashboard hero */}
            <motion.h1
              className="mt-4 font-display text-[2rem] font-semibold tracking-tight sm:text-[2.5rem]"
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 0.68, 0.35, 1] }}
            >
              <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.22)]">
                Stellaeum
              </span>
            </motion.h1>

            <motion.p
              className="mt-4 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.42em] text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.85 }}
            >
              Твоят астрологичен придружител
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
