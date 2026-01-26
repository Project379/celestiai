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
          Data na razhdane
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Vavedete datata i ime za kartata
        </p>
      </div>

      {/* Name field */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-slate-300"
        >
          Ime na kartata
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          placeholder="Moiata karta"
          className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Birth date field */}
      <div>
        <label
          htmlFor="birthDate"
          className="block text-sm font-medium text-slate-300"
        >
          Data na razhdane
        </label>
        <input
          {...register('birthDate')}
          type="date"
          id="birthDate"
          max={new Date().toISOString().split('T')[0]}
          className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 [&::-webkit-calendar-picker-indicator]:invert"
        />
        {errors.birthDate && (
          <p className="mt-1 text-sm text-red-400">
            {errors.birthDate.message}
          </p>
        )}
      </div>

      {/* Next button */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          Napred
        </button>
      </div>
    </div>
  )
}
