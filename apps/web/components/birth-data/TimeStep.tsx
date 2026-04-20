'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import type { BirthData, ApproximateTimeRange } from '@/lib/validators/birth-data'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

interface TimeStepProps {
  onNext: () => void
  onPrev: () => void
}

const TIME_RANGES: { value: ApproximateTimeRange; label: string; hours: string }[] = [
  { value: 'morning',   label: 'Сутрин',   hours: '06 - 12' },
  { value: 'afternoon', label: 'Следобед', hours: '12 - 18' },
  { value: 'evening',   label: 'Вечер',    hours: '18:00–23:59' },
  { value: 'night',     label: 'Нощ',      hours: '00 - 06' },
]

export function TimeStep({ onNext, onPrev }: TimeStepProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<BirthData>()

  const birthTimeKnown = useWatch<BirthData>({ name: 'birthTimeKnown' })
  const approximateTimeRange = useWatch<BirthData>({ name: 'approximateTimeRange' })

  const handleTimeKnownChange = (known: boolean) => {
    setValue('birthTimeKnown', known)
    if (known) setValue('approximateTimeRange', null)
    else setValue('birthTime', null)
  }

  const handleRangeSelect = (range: ApproximateTimeRange) => {
    setValue('approximateTimeRange', range)
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
          II · Час
        </p>
        <h2 className="font-display text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[1.5rem]">
          Час на раждане
        </h2>
        <p className="mt-2 font-display text-[14.5px] font-light leading-relaxed text-slate-400">
          Точният час определя асцендента и домовете.
        </p>
      </div>

      {/* Known-or-not toggle - hairline row with amber diamond marker */}
      <button
        type="button"
        onClick={() => handleTimeKnownChange(!(birthTimeKnown === true))}
        className={`group flex w-full items-center justify-between border-y px-1 py-4 text-left transition-colors ${
          birthTimeKnown
            ? 'border-amber-300/25'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
      >
        <div>
          <p className="font-display text-[15px] font-medium text-slate-100">
            Знам точния час на раждане
          </p>
          <p className="mt-1 font-display text-[12.5px] text-slate-500">
            Подобрява асцендента и домовете
          </p>
        </div>
        {/* Minimal rail toggle with amber diamond */}
        <span
          className={`relative h-5 w-10 rounded-full border transition-colors ${
            birthTimeKnown ? 'border-amber-300/50 bg-amber-300/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'
          }`}
          aria-hidden
        >
          <span
            className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 transition-all duration-300 ${
              birthTimeKnown
                ? 'left-[calc(100%-14px)] bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                : 'left-[6px] bg-slate-500'
            }`}
          />
        </span>
      </button>

      {birthTimeKnown ? (
        <div>
          <label
            htmlFor="birthTime"
            className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
          >
            Точен час
          </label>
          <div className="group flex items-center gap-4 border-b border-white/[0.08] px-1 py-2.5 transition-colors focus-within:border-amber-300/60">
            <span className="text-violet-300/80 transition-colors group-focus-within:text-amber-300">
              <CelestialIcon name="moon" size={18} />
            </span>
            <input
              {...register('birthTime')}
              type="time"
              id="birthTime"
              className="block w-full border-0 bg-transparent p-0 font-display text-[16px] tabular-nums text-slate-100 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
            />
          </div>
          {errors.birthTime && (
            <p className="mt-2 font-display text-[12px] text-rose-300/90">
              {errors.birthTime.message}
            </p>
          )}
        </div>
      ) : (
        <div>
          <p className="mb-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Приблизителен период
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {TIME_RANGES.map(({ value, label, hours }) => {
              const isActive = approximateTimeRange === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRangeSelect(value)}
                  className={`group relative flex flex-col items-center gap-1 rounded-xl border px-4 py-4 transition-all ${
                    isActive
                      ? 'border-amber-300/45 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-amber-400/[0.06] shadow-[0_0_22px_rgba(167,139,250,0.14)]'
                      : 'border-white/[0.06] bg-white/[0.015] hover:border-violet-300/20 hover:bg-white/[0.03]'
                  }`}
                >
                  {isActive && (
                    <span aria-hidden className="absolute left-2.5 top-2.5 h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  )}
                  <span className={`font-display text-[14px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-slate-100'}`}>
                    {label}
                  </span>
                  <span className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.24em] tabular-nums text-amber-300/70">
                    {hours}
                  </span>
                </button>
              )
            })}
          </div>
          {errors.approximateTimeRange && (
            <p className="mt-3 font-display text-[12px] text-rose-300/90">
              {errors.approximateTimeRange.message}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-6">
        <button
          type="button"
          onClick={onPrev}
          className="group inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
        <button
          type="button"
          onClick={onNext}
          className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-violet-500/10 via-transparent to-amber-400/10 px-6 py-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200 transition-all hover:border-amber-300/70 hover:text-amber-100 hover:shadow-[0_0_24px_rgba(251,191,36,0.18)] focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
          />
          <span className="relative">Напред</span>
          <svg className="relative h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
