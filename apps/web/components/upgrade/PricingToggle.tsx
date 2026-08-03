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
 * Editorial hairline style - no glossy pill, just track + sliding amber diamond.
 */
export function PricingToggle({ priceMonthly, priceAnnual, onPriceChange }: PricingToggleProps) {
  const [isAnnual, setIsAnnual] = useState(false)

  function handleToggle(annual: boolean) {
    setIsAnnual(annual)
    onPriceChange(annual ? priceAnnual : priceMonthly, annual)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 backdrop-blur-sm">
        {/* Sliding highlight */}
        <motion.span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-full border border-amber-300/40 bg-gradient-to-r from-violet-500/10 via-transparent to-amber-400/10 shadow-[0_0_18px_rgba(251,191,36,0.14)]"
          animate={{
            left: isAnnual ? '50%' : '4px',
            right: isAnnual ? '4px' : '50%',
          }}
          transition={{ duration: 0.32, ease: [0.22, 0.68, 0.35, 1] }}
        />
        <button
          onClick={() => handleToggle(false)}
          className={`relative z-10 rounded-full px-5 py-1.5 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] transition-colors duration-200 ${
            !isAnnual ? 'text-amber-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Месечен
        </button>
        <button
          onClick={() => handleToggle(true)}
          className={`relative z-10 rounded-full px-5 py-1.5 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] transition-colors duration-200 ${
            isAnnual ? 'text-amber-100' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Годишен
        </button>
      </div>

      <AnimatePresence>
        {isAnnual && (
          <motion.p
            className="inline-flex items-center gap-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/80"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
            Спестяваш ~28%
            <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
