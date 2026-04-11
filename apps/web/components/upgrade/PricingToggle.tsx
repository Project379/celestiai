'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PricingToggleProps {
  priceMonthly: string
  priceAnnual: string
  onPriceChange: (priceId: string, isAnnual: boolean) => void
}

/**
 * Monthly/Annual billing toggle for the pricing page.
 * Shows savings badge when annual is selected.
 */
export function PricingToggle({ priceMonthly, priceAnnual, onPriceChange }: PricingToggleProps) {
  const [isAnnual, setIsAnnual] = useState(false)

  function handleToggle(annual: boolean) {
    setIsAnnual(annual)
    onPriceChange(annual ? priceAnnual : priceMonthly, annual)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-center gap-3 rounded-full bg-white/10 p-1">
        {/* Sliding highlight */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-full bg-white/20 shadow-sm"
          animate={{
            left: isAnnual ? '50%' : '4px',
            right: isAnnual ? '4px' : '50%',
          }}
          transition={{ duration: 0.3, ease: [0.22, 0.68, 0.35, 1] }}
        />
        <button
          onClick={() => handleToggle(false)}
          className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
            !isAnnual
              ? 'text-white'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Месечен
        </button>
        <button
          onClick={() => handleToggle(true)}
          className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
            isAnnual
              ? 'text-white'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Годишен
        </button>
      </div>

      <AnimatePresence>
        {isAnnual && (
          <motion.span
            className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-medium text-emerald-300"
            initial={{ opacity: 0, y: -8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            ~28% спестявате
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
