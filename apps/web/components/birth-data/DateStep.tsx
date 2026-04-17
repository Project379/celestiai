'use client'

import { useFormContext } from 'react-hook-form'
import type { BirthData } from '@/lib/validators/birth-data'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

interface DateStepProps {
  onNext: () => void
}

export function DateStep({ onNext }: DateStepProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext<BirthData>()

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
          I · Кога
        </p>
        <h2 className="font-display text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[1.5rem]">
          Дата на раждане
        </h2>
        <p className="mt-2 font-display text-[14.5px] font-light leading-relaxed text-slate-400">
          Въведи името на картата и точната дата.
        </p>
      </div>

      {/* Name field - hairline editorial */}
      <div>
        <label
          htmlFor="name"
          className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
        >
          Име на картата
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          placeholder="Моята карта"
          className="block w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 placeholder-slate-600 transition-colors focus:border-amber-300/60 focus:outline-none"
        />
        {errors.name && (
          <p className="mt-2 font-display text-[12px] text-rose-300/90">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Date field */}
      <div>
        <label
          htmlFor="birthDate"
          className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
        >
          Дата на раждане
        </label>
        <div className="group flex items-center gap-4 border-b border-white/[0.08] px-1 py-2.5 transition-colors focus-within:border-amber-300/60">
          <span className="text-violet-300/80 transition-colors group-focus-within:text-amber-300">
            <CelestialIcon name="sun" size={18} />
          </span>
          <input
            {...register('birthDate')}
            type="date"
            id="birthDate"
            max={new Date().toISOString().split('T')[0]}
            className="block w-full border-0 bg-transparent p-0 font-display text-[16px] text-slate-100 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
          />
        </div>
        {errors.birthDate && (
          <p className="mt-2 font-display text-[12px] text-rose-300/90">
            {errors.birthDate.message}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-6">
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
