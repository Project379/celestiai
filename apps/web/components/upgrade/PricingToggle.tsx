'use client'

import { useState } from 'react'

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
      <div className="flex items-center gap-3 rounded-full bg-white/10 p-1">
        <button
          onClick={() => handleToggle(false)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            !isAnnual
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Месечен
        </button>
        <button
          onClick={() => handleToggle(true)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            isAnnual
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Годишен
        </button>
      </div>

      {isAnnual && (
        <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-medium text-emerald-300">
          ~17% спестявате
        </span>
      )}
    </div>
  )
}
