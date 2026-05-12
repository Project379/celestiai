'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ManifestEntry } from '@stellaeum/core/diary/types'

interface ManifestHistoryProps {
  entries: ManifestEntry[]
  currentDate: string
}

const BG_DATE = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function ManifestHistory({ entries, currentDate }: ManifestHistoryProps) {
  const past = entries.filter(e => e.date !== currentDate)

  if (past.length === 0) {
    return (
      <p className="font-display text-[14px] font-light leading-[1.85] text-slate-400">
        Дневникът ти още е празен. Първата страница ще изглежда точно като празния лист преди новолуние.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-slate-300/[0.06]">
      {past.map(entry => (
        <HistoryItem key={entry.id} entry={entry} />
      ))}
    </ul>
  )
}

function HistoryItem({ entry }: { entry: ManifestEntry }) {
  const [expanded, setExpanded] = useState(false)

  const formatted = BG_DATE.format(new Date(entry.date))

  return (
    <li className="relative py-5 first:pt-0">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
            {entry.phaseName}
          </p>
          <p className="mt-1 font-cinzel text-[10.5px] font-medium uppercase tracking-[0.26em] text-slate-300">
            {formatted}
          </p>
        </div>
        <span
          aria-hidden
          className={`mt-1 font-cinzel text-[11px] text-slate-400 transition-transform duration-300 ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 0.68, 0.35, 1] }}
            className="overflow-hidden"
          >
            <ol className="mt-4 space-y-3 border-t border-slate-300/[0.06] pt-4">
              {entry.intentions.map((intention, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-1 font-cinzel text-[9px] font-semibold tracking-[0.25em] text-amber-300/60"
                  >
                    {['I', 'II', 'III'][i]}
                  </span>
                  <p className="font-display text-[14.5px] font-light leading-[1.8] text-slate-200/95">
                    „{intention}"
                  </p>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
