'use client'

import { motion } from 'framer-motion'

interface OracleFabProps {
  hasChart: boolean
}

/**
 * Оракул floating action button — persistent contextual entry per
 * MOBILE_UX_RESEARCH §2.6. Web matches the Android FAB pattern
 * (bottom-right). iOS native gets a nav-bar glyph (future Expo work).
 *
 * Dispatches `oracle:open` — the same signal OraclePanelGlobal already
 * listens for. No panel state is lifted here; we just emit.
 *
 * Hidden entirely until the user has a chart; the panel refuses to mount
 * without one anyway, so showing a button that does nothing is a footgun.
 */
export function OracleFab({ hasChart }: OracleFabProps) {
  if (!hasChart) return null

  const handlePress = () => {
    window.dispatchEvent(new CustomEvent('oracle:open'))
  }

  return (
    <motion.button
      type="button"
      aria-label="Отвори Оракула"
      onClick={handlePress}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 0.68, 0.35, 1] }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-amber-300/40 bg-[#08060f]/80 backdrop-blur-md transition-colors hover:border-amber-300/70 sm:bottom-8 sm:right-8"
      style={{
        boxShadow:
          '0 0 28px -4px rgba(251, 191, 36, 0.35), 0 0 64px -10px rgba(139, 92, 246, 0.25)',
      }}
    >
      {/* Breathing glow behind the glyph */}
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/10 via-transparent to-violet-500/10"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <span className="relative font-cinzel text-[18px] leading-none text-amber-200 transition-colors group-hover:text-amber-100">
        ✦
      </span>
    </motion.button>
  )
}
