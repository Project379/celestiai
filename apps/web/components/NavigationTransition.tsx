'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingAnimation } from './LoadingAnimation'

/**
 * Shows a brief loading overlay when the route changes client-side.
 * Uses the canonical <LoadingAnimation /> so transition + Suspense
 * loading share one visual language.
 */
export function NavigationTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const prevPath = useRef(pathname)
  const [transitioning, setTransitioning] = useState(false)

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      setTransitioning(true)
      const timer = setTimeout(() => setTransitioning(false), 700)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return (
    <>
      {children}

      <AnimatePresence>
        {transitioning && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-[#04030a]/88 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            {/* Ambient halos - matches protected loading.tsx */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: 520,
                height: 520,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.05) 38%, transparent 72%)',
                filter: 'blur(40px)',
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: 280,
                height: 280,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)',
                filter: 'blur(50px)',
              }}
            />

            <LoadingAnimation />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
