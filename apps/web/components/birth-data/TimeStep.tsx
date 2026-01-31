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
      // Clear approximate range when switching to exact time
      setValue('approximateTimeRange', null)
    } else {
      // Clear exact time when switching to approximate
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
          Точният час подобрява прецизността на картата
        </p>
      </div>

      {/* Time known toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="birthTimeKnown"
          checked={birthTimeKnown === true}
          onChange={(e) => handleTimeKnownChange(e.target.checked)}
          className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
        />
        <label htmlFor="birthTimeKnown" className="text-sm text-slate-300">
          Знам точния час на раждане
        </label>
      </div>

      {/* Exact time input */}
      {birthTimeKnown && (
        <div>
          <label
            htmlFor="birthTime"
            className="block text-sm font-medium text-slate-300"
          >
            Час (HH:MM)
          </label>
          <input
            {...register('birthTime')}
            type="time"
            id="birthTime"
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 [&::-webkit-calendar-picker-indicator]:invert"
          />
          {errors.birthTime && (
            <p className="mt-1 text-sm text-red-400">
              {errors.birthTime.message}
            </p>
          )}
        </div>
      )}

      {/* Approximate time range selection */}
      {!birthTimeKnown && (
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Приблизителен период
          </label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {TIME_RANGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleRangeSelect(value)}
                className={`rounded-lg border px-4 py-3 text-sm transition-all ${
                  approximateTimeRange === value
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
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

      {/* Navigation buttons */}
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
