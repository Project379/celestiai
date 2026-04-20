'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import type { BirthData, ApproximateTimeRange } from '@/lib/validators/birth-data'

interface ConfirmStepProps {
  onPrev: () => void
  isSubmitting: boolean
  submitError: string | null
}

const TIME_RANGE_LABELS: Record<ApproximateTimeRange, string> = {
  morning: 'Сутрин (06:00–12:00)',
  afternoon: 'Следобед (12:00–18:00)',
  evening: 'Вечер (18:00–23:59)',
  night: 'Нощ (00:00–06:00)',
}

export function ConfirmStep({ onPrev, isSubmitting, submitError }: ConfirmStepProps) {
  const { formState: { errors } } = useFormContext<BirthData>()

  const name = useWatch<BirthData>({ name: 'name' })
  const birthDate = useWatch<BirthData>({ name: 'birthDate' })
  const birthTimeKnown = useWatch<BirthData>({ name: 'birthTimeKnown' })
  const birthTime = useWatch<BirthData>({ name: 'birthTime' })
  const approximateTimeRange = useWatch<BirthData>({ name: 'approximateTimeRange' })
  const cityName = useWatch<BirthData>({ name: 'cityName' })
  const latitude = useWatch<BirthData>({ name: 'latitude' })
  const longitude = useWatch<BirthData>({ name: 'longitude' })
  const manualCoordinates = useWatch<BirthData>({ name: 'manualCoordinates' })

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getTimeDisplay = () => {
    if (birthTimeKnown && birthTime) return birthTime as string
    if (!birthTimeKnown && approximateTimeRange) {
      return TIME_RANGE_LABELS[approximateTimeRange as ApproximateTimeRange]
    }
    return 'Не е посочено'
  }

  const hasErrors = Object.keys(errors).length > 0

  const rows: { label: string; value: string }[] = [
    { label: 'Име на картата',  value: (name as string) || '-' },
    { label: 'Дата на раждане', value: formatDate(birthDate as string) || '-' },
    { label: 'Час на раждане',  value: getTimeDisplay() },
    { label: 'Място',            value: (cityName as string) || '-' },
  ]

  if (manualCoordinates || latitude || longitude) {
    rows.push({
      label: 'Координати',
      value: `${typeof latitude === 'number' ? latitude.toFixed(4) : '0'}, ${
        typeof longitude === 'number' ? longitude.toFixed(4) : '0'
      }`,
    })
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
          IV · Преглед
        </p>
        <h2 className="font-display text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[1.5rem]">
          Подготвяме картата
        </h2>
        <p className="mt-2 font-display text-[14.5px] font-light leading-relaxed text-slate-400">
          Провери данните преди да изчислим позициите на планетите.
        </p>
      </div>

      {/* Editorial summary list - hairlines, no card */}
      <dl className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-4">
            <dt className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {row.label}
            </dt>
            <dd className="text-right font-display text-[15px] font-medium tabular-nums text-slate-100">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      {hasErrors && (
        <div className="border-l border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
          <p className="font-display text-[13px] text-rose-300/90">
            Моля, попълни всички задължителни полета преди да запазиш.
          </p>
        </div>
      )}

      {submitError && (
        <div className="border-l border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
          <p className="font-display text-[13px] text-rose-300/90">{submitError}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="group inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300 disabled:pointer-events-none disabled:opacity-40"
        >
          <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <button
          type="submit"
          disabled={isSubmitting || hasErrors}
          className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-7 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-100 transition-all hover:border-amber-300/80 hover:text-white hover:shadow-[0_0_32px_rgba(251,191,36,0.24)] focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60 disabled:pointer-events-none disabled:opacity-45"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          {isSubmitting ? (
            <span className="relative flex items-center gap-3">
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Запазване…
            </span>
          ) : (
            <>
              <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
              <span className="relative">Изчисли картата</span>
              <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
