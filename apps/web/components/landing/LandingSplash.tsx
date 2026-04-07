'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Precomputed dot positions to avoid hydration mismatch from floating-point Math.sin/cos
const RING_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180
  const cx = +(60 + 48 * Math.cos(angle)).toFixed(2)
  const cy = +(60 + 48 * Math.sin(angle)).toFixed(2)
  return {
    cx,
    cy,
    r: i % 3 === 0 ? 2.5 : 1.5,
    fill: i % 3 === 0 ? '#a78bfa' : '#6366f1',
    opacity: +(0.3 + (i % 4) * 0.18).toFixed(2),
  }
})

/**
 * Full-screen intro splash for the landing page.
 *
 * Shows "Celestia AI" with a mystical rotating star ring,
 * then fades out to reveal the page content beneath.
 */
export function LandingSplash({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false)

  return (
    <>
      {/* Page content underneath — hidden until splash exits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={done ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {children}
      </motion.div>

      {/* Splash overlay */}
      <AnimatePresence>
        {!done && (
          <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060a18]"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Ambient glow behind the ring */}
            <motion.div
              className="absolute"
              style={{
                width: 280,
                height: 280,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.08) 40%, transparent 70%)',
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], opacity: [0, 0.8, 0.6] }}
              transition={{ duration: 1.8, ease: 'easeOut' }}
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
                  <circle
                    key={i}
                    cx={dot.cx}
                    cy={dot.cy}
                    r={dot.r}
                    fill={dot.fill}
                    opacity={dot.opacity}
                  />
                ))}
                {/* Central star shape — triggers splash exit on completion */}
                <motion.path
                  d="M60 28 L63.5 50 L76 38 L66 53 L88 52 L68 58 L84 72 L64 62 L68 84 L60 64 L52 84 L56 62 L36 72 L52 58 L32 52 L54 53 L44 38 L56.5 50 Z"
                  fill="none"
                  stroke="url(#starGrad)"
                  strokeWidth={1}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 0.9, 0.7] }}
                  transition={{ duration: 2.4, ease: 'easeOut' }}
                  onAnimationComplete={() => setDone(true)}
                />
                <defs>
                  <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>

            {/* Logo text */}
            <motion.h1
              className="mt-8 text-3xl font-bold tracking-tight md:text-4xl"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #6366F1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
              initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 0.68, 0.35, 1] }}
            >
              Celestia AI
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="mt-3 text-sm text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Твоят астрологичен приятел
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
