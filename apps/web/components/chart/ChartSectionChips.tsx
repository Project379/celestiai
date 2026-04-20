'use client'

import { useEffect, useRef, useState } from 'react'
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 1)
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative mb-8">
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Раздели на картата"
        className="nav-scroll flex items-center gap-2 overflow-x-auto pb-1"
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
                className={`font-cinzel text-[11px] font-semibold tracking-[0.04em] ${
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
      {/* Edge fades — soft scroll affordance when content overflows the
          container. Conditional on actual overflow state (scrollLeft /
          scrollWidth) so a chip row that fits the viewport renders flat
          with no edges. Lower max opacity + wider gradient so the fade
          reads as atmospheric softening rather than a painted bar. */}
      {canScrollLeft && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#04030a]/60 via-[#04030a]/20 to-transparent transition-opacity duration-200"
        />
      )}
      {canScrollRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#04030a]/60 via-[#04030a]/20 to-transparent transition-opacity duration-200"
        />
      )}
    </div>
  )
}
