'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

// Precomputed dot positions (shared with LandingSplash)
const RING_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * 30 * Math.PI) / 180
  return {
    cx: +(60 + 48 * Math.cos(angle)).toFixed(2),
    cy: +(60 + 48 * Math.sin(angle)).toFixed(2),
    r: i % 3 === 0 ? 2.5 : 1.5,
    fill: i % 3 === 0 ? '#a78bfa' : '#6366f1',
    opacity: +(0.3 + (i % 4) * 0.18).toFixed(2),
  }
})

/**
 * Shows a brief star-ring transition overlay when the route changes.
 * Renders children immediately — the overlay sits on top then fades out.
 */
export function NavigationTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setTransitioning(true)
      const timer = setTimeout(() => setTransitioning(false), 600)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <>
      {children}

      <AnimatePresence>
        {transitioning && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#060a18]/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Glow */}
            <div
              className="absolute"
              style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
              }}
            />

            {/* Spinning star ring */}
            <motion.div
              style={{ width: 64, height: 64 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
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
                <path
                  d="M60 28 L63.5 50 L76 38 L66 53 L88 52 L68 58 L84 72 L64 62 L68 84 L60 64 L52 84 L56 62 L36 72 L52 58 L32 52 L54 53 L44 38 L56.5 50 Z"
                  fill="none"
                  stroke="url(#navTransGrad)"
                  strokeWidth={1}
                  opacity={0.5}
                />
                <defs>
                  <linearGradient id="navTransGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
