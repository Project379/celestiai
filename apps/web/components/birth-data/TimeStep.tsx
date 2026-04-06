'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import type { BirthData, ApproximateTimeRange } from '@/lib/validators/birth-data'

interface TimeStepProps {
  onNext: () => void
  onPrev: () => void
}

const TIME_RANGES: { value: ApproximateTimeRange; label: string }[] = [
  { value: 'morning', label: 'Сутрин (06:00-12:00)' },
  { value: 'afternoon', label: 'Следобед (12:00-18:00)' },
  { value: 'evening', label: 'Вечер (18:00-24:00)' },
  { value: 'night', label: 'Нощ (00:00-06:00)' },
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
    if (known) {
      setValue('approximateTimeRange', null)
    } else {
      setValue('birthTime', null)
    }
  }

  const handleRangeSelect = (range: ApproximateTimeRange) => {
    setValue('approximateTimeRange', range)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Час на раждане
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Колкото е по-точен часът, толкова по-прецизна е картата
        </p>
      </div>

      <button
        type="button"
        onClick={() => handleTimeKnownChange(!(birthTimeKnown === true))}
        className={[
          'flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all',
          birthTimeKnown
            ? 'border-purple-500/50 bg-purple-500/12'
            : 'border-slate-700/70 bg-slate-900/70 hover:border-slate-600/70',
        ].join(' ')}
      >
        <div>
          <p className="text-sm font-medium text-slate-200">
            Знам точния час на раждане
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Това подобрява асцендента и домовете
          </p>
        </div>
        <span
          className={[
            'relative h-6 w-11 rounded-full transition-colors',
            birthTimeKnown ? 'bg-purple-500' : 'bg-slate-700',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
              birthTimeKnown ? 'translate-x-5' : 'translate-x-0.5',
            ].join(' ')}
          />
        </span>
      </button>

      {birthTimeKnown ? (
        <div>
          <label
            htmlFor="birthTime"
            className="block text-sm font-medium text-slate-300"
          >
            Точен час
          </label>
          <div className="mt-2 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-3 rounded-[calc(1rem-2px)] bg-gradient-to-r from-slate-800/95 to-slate-800/70 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/12 text-cyan-300">
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Избери час
                </p>
                <input
                  {...register('birthTime')}
                  type="time"
                  id="birthTime"
                  className="block w-full border-0 bg-transparent px-0 py-0 text-base text-slate-100 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>
          </div>
          {errors.birthTime && (
            <p className="mt-1 text-sm text-red-400">
              {errors.birthTime.message}
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Приблизителен период
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {TIME_RANGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRangeSelect(value)}
                className={`rounded-xl border px-4 py-3 text-sm transition-all ${
                  approximateTimeRange === value
                    ? 'border-purple-500 bg-purple-500/20 text-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.16)]'
                    : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.approximateTimeRange && (
            <p className="mt-2 text-sm text-red-400">
              {errors.approximateTimeRange.message}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          Назад
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Напред
        </button>
      </div>
    </div>
  )
}
