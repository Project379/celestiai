'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { BIRTH_DATA_ENTRY_LABEL } from '@stellaeum/core/i18n/strings/birth-data'
import { EditBirthDataDialog } from '@/components/birth-data/EditBirthDataDialog'
import { SavedMessage } from '@/components/birth-data/SavedMessage'
import { useInvalidateChartDerived } from '@/components/birth-data/ChartVersion'
import type { ChartRow } from '@/lib/types/chart'

const BASE_SECTIONS = [
  { label: 'Кристали',    hint: 'месечни прозорци + дневна серия', href: '/you/crystals'        },
  { label: 'Дневник',     hint: 'лунен дневник — по три реда',     href: '/rhythm/journal'      },
  { label: 'Ръководство', hint: 'планети, знаци, къщи, аспекти',    href: '/you/guide'           },
] as const

const RECOMMENDATIONS_SECTION = {
  label: 'Препоръки', hint: 'месечни книги и филми', href: '/you/recommendations',
} as const

const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.62,
      delay: i * 0.06,
      ease: [0.22, 0.68, 0.35, 1] as const,
    },
  }),
}

const BG_SHORT_DATE = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

export function YouHub({
  showRecommendations,
  chart,
}: {
  showRecommendations: boolean
  chart: ChartRow | null
}) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const invalidateChartDerived = useInvalidateChartDerived()
  const dismissSaved = useCallback(() => setShowSaved(false), [])

  // Insert Recommendations back into its original position (2nd), not
  // appended — RECOMMENDATION-CONTENT-LICENSING (.planning/PLACEHOLDERS.md)
  // is a licensing gate on the feature, not a demotion in the hub's order.
  const sections = showRecommendations
    ? [BASE_SECTIONS[0], RECOMMENDATIONS_SECTION, BASE_SECTIONS[1], BASE_SECTIONS[2]]
    : BASE_SECTIONS

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-12"
      >
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Ти
        </p>
        <h1 className="font-display text-[2.125rem] font-light leading-[1.2] tracking-tight text-slate-100 sm:text-[2.75rem]">
          Твоите неща.
        </h1>
      </motion.div>

      {showSaved && <SavedMessage onDismiss={dismissSaved} />}

      <motion.ul
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="divide-y divide-slate-800/60"
      >
        {chart && (
          <li>
            {/* Entry to the existing edit dialog. Same row language as the links below;
                it is a button (it opens a dialog), not a link. min-h keeps the target >= 48px. */}
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              aria-haspopup="dialog"
              className="group flex min-h-[48px] w-full items-baseline justify-between py-6 text-left transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
            >
              <span className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-200 group-hover:text-amber-200">
                {BIRTH_DATA_ENTRY_LABEL}
              </span>
              <span className="font-display text-[13px] font-light text-slate-500 group-hover:text-slate-300">
                {BG_SHORT_DATE.format(new Date(chart.birth_date))} · {chart.city_name}
              </span>
            </button>
          </li>
        )}
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="group flex items-baseline justify-between py-6 transition-colors duration-200"
            >
              <span className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-200 group-hover:text-amber-200">
                {section.label}
              </span>
              <span className="font-display text-[13px] font-light text-slate-500 group-hover:text-slate-300">
                {section.hint}
              </span>
            </Link>
          </li>
        ))}
      </motion.ul>

      <p className="mt-12 font-display text-[12.5px] font-light leading-[1.7] text-slate-600">
        Премиум, настройки и акаунт — в менюто горе вдясно.
      </p>

      {chart && (
        <EditBirthDataDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSuccess={() => {
            setIsEditOpen(false)
            setShowSaved(true)
            // Drop caches derived from the old chart and re-render with the new
            // birth_data_edited_at marker (moves every chart-derived cache key).
            invalidateChartDerived()
          }}
          chart={chart}
        />
      )}
    </div>
  )
}
