'use client'

import { useState } from 'react'
import { EditBirthDataDialog } from './EditBirthDataDialog'
import { CelestialIcon } from '@/components/icons/CelestialIcons'
import type { ChartRow } from '@/lib/types/chart'

interface BirthDataCardProps {
  chart: ChartRow
  onUpdate: () => void
}

const TIME_RANGE_LABELS: Record<string, string> = {
  morning: 'Сутрин',
  afternoon: 'Следобед',
  evening: 'Вечер',
  night: 'Нощ',
}

const BG_LONG_DATE = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

export function BirthDataCard({ chart, onUpdate }: BirthDataCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  const formattedDate = BG_LONG_DATE.format(new Date(chart.birth_date))

  const getTimeDisplay = () => {
    if (chart.birth_time_known && chart.birth_time) return chart.birth_time
    if (!chart.birth_time_known && chart.approximate_time_range) {
      return TIME_RANGE_LABELS[chart.approximate_time_range] || chart.approximate_time_range
    }
    return '-'
  }

  return (
    <>
      <div className="mystic-panel mystic-corners px-7 pb-7 pt-8 sm:px-9 sm:pb-8 sm:pt-9">
        {/* ── Header ────────────────────────────────────── */}
        <div className="relative mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Rising-sign sigil - violet outer halo, ivory ring, gold core */}
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-violet-500/20 blur-md"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-amber-400/10 blur-sm"
              />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/20 bg-gradient-to-br from-violet-500/[0.14] via-amber-400/[0.06] to-transparent shadow-[inset_0_0_14px_rgba(167,139,250,0.08)]">
                <CelestialIcon
                  name="rising"
                  size={20}
                  className="text-amber-100 drop-shadow-[0_0_8px_rgba(251,191,36,0.55)]"
                />
              </span>
            </div>

            <div className="min-w-0">
              <p className="flex items-center gap-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] text-slate-300/85">
                <span
                  aria-hidden
                  className="h-1 w-1 rotate-45 bg-amber-300/70 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                />
                Natalis
              </p>
              <h3 className="mt-1 truncate font-display text-[17px] font-semibold tracking-tight text-white">
                {chart.name}
              </h3>
            </div>
          </div>

          {/* Ghost edit button - ivory base, violet hover */}
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/15 bg-white/[0.03] px-3.5 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300/85 transition-all duration-300 hover:border-violet-300/40 hover:bg-violet-500/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            aria-label="Редактирай рождени данни"
          >
            <svg
              className="h-3 w-3 transition-transform duration-300 group-hover:rotate-[-8deg]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Редактирай
          </button>
        </div>

        {/* ── Decorative celestial divider - ivory rule, gold focal ─── */}
        <div className="relative mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/15 to-slate-300/25" />
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="text-[8px] leading-none text-slate-400/50">✦</span>
            <CelestialIcon name="northNode" size={12} className="text-amber-300/70 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]" />
            <span className="text-[8px] leading-none text-slate-400/50">✦</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300/15 to-slate-300/25" />
        </div>

        {/* ── Detail rows - editorial spec sheet ─────────── */}
        <dl className="relative space-y-0">
          <DetailRow label="Ден" value={formattedDate} />
          <DetailRow label="Час" value={getTimeDisplay()} />
          <DetailRow label="Място" value={chart.city_name} last />
        </dl>
      </div>

      <EditBirthDataDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false)
          onUpdate()
        }}
        chart={chart}
      />
    </>
  )
}

function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <>
      <div className="group flex items-baseline justify-between gap-6 py-3">
        <dt className="flex shrink-0 items-center gap-2 font-display text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400/75">
          <span
            aria-hidden
            className="h-px w-3 bg-gradient-to-r from-transparent to-violet-300/50"
          />
          {label}
        </dt>
        <dd className="min-w-0 truncate text-right font-display text-[14.5px] font-medium text-slate-50">
          {value}
        </dd>
      </div>
      {!last && (
        <div
          aria-hidden
          className="h-px bg-gradient-to-r from-transparent via-slate-300/[0.07] to-transparent"
        />
      )}
    </>
  )
}
