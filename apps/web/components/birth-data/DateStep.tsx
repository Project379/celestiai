'use client'

import { useFormContext } from 'react-hook-form'
import type { BirthData } from '@/lib/validators/birth-data'

interface DateStepProps {
  onNext: () => void
}

export function DateStep({ onNext }: DateStepProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<BirthData>()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Дата на раждане
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Въведи дата и име за наталната си карта
        </p>
      </div>

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-300"
        >
          Име на картата
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          placeholder="Моята карта"
          className="mt-2 block w-full rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="birthDate"
          className="block text-sm font-medium text-slate-300"
        >
          Дата на раждане
        </label>
        <div className="mt-2 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-3 rounded-[calc(1rem-2px)] bg-gradient-to-r from-slate-800/95 to-slate-800/70 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
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
                  d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Избери ден
              </p>
              <input
                {...register('birthDate')}
                type="date"
                id="birthDate"
                max={new Date().toISOString().split('T')[0]}
                className="block w-full border-0 bg-transparent px-0 py-0 text-base text-slate-100 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>
        </div>
        {errors.birthDate && (
          <p className="mt-1 text-sm text-red-400">
            {errors.birthDate.message}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-4">
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
