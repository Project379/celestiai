'use client'

import { motion } from 'framer-motion'
import type { ChartSection } from './chart-sections'

interface ChartSectionChipsProps {
  active: ChartSection
  onChange: (section: ChartSection) => void
}

const CHIPS: readonly { id: ChartSection; label: string }[] = [
  { id: 'essence',  label: 'Същност'  },
  { id: 'details',  label: 'Детайли'  },
  { id: 'aspects',  label: 'Аспекти'  },
  { id: 'houses',   label: 'Къщи'     },
] as const

/**
 * Карта scroll-chips per MOBILE_UX_RESEARCH.md §2.2 — pill-shaped
 * section switcher inside the chart view. Reuses the Cinzel uppercase
 * tracked eyebrow language already established in ProtectedNav.
 */
export function ChartSectionChips({ active, onChange }: ChartSectionChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="Раздели на картата"
      className="nav-scroll mb-8 flex items-center gap-2 overflow-x-auto pb-1"
    >
      {CHIPS.map((chip) => {
        const isActive = active === chip.id
        return (
          <button
            key={chip.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(chip.id)}
            className={`relative shrink-0 rounded-full border px-4 py-2 transition-colors duration-200 ${
              isActive
                ? 'border-amber-300/60 bg-amber-300/[0.04]'
                : 'border-slate-700/60 hover:border-slate-500/80'
            }`}
          >
            <span
              className={`font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] ${
                isActive ? 'text-amber-200' : 'text-slate-400'
              }`}
            >
              {chip.label}
            </span>

            {isActive && (
              <motion.span
                layoutId="chart-section-chip-glow"
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_18px_-4px_rgba(251,191,36,0.45)]"
                transition={{ duration: 0.35, ease: [0.22, 0.68, 0.35, 1] }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
