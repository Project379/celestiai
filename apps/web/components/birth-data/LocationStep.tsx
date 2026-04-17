'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import type { BirthData } from '@/lib/validators/birth-data'
import { CitySearch } from './CitySearch'

interface LocationStepProps {
  onNext: () => void
  onPrev: () => void
}

interface City {
  id: string
  name: string
  oblast: string
  type: string
  latitude: number
  longitude: number
}

export function LocationStep({ onNext, onPrev }: LocationStepProps) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<BirthData>()

  const manualCoordinates = useWatch<BirthData>({ name: 'manualCoordinates' })
  const cityName = useWatch<BirthData>({ name: 'cityName' })

  const handleCitySelect = (city: City) => {
    setValue('cityId', city.id)
    setValue('cityName', city.name)
    setValue('latitude', city.latitude)
    setValue('longitude', city.longitude)
    setValue('manualCoordinates', false)
  }

  const handleManualToggle = (checked: boolean) => {
    setValue('manualCoordinates', checked)
    if (checked) {
      setValue('cityId', null)
      setValue('cityName', '')
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
          III · Място
        </p>
        <h2 className="font-display text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[1.5rem]">
          Място на раждане
        </h2>
        <p className="mt-2 font-display text-[14.5px] font-light leading-relaxed text-slate-400">
          Мястото определя домовете и асцендента.
        </p>
      </div>

      {/* Manual-coordinates toggle - minimal hairline row */}
      <label
        htmlFor="manualCoordinates"
        className="flex cursor-pointer items-center justify-between gap-4 border-y border-white/[0.06] px-1 py-3 transition-colors hover:border-white/[0.12]"
      >
        <div>
          <p className="font-display text-[14.5px] font-medium text-slate-200">
            Ръчни координати
          </p>
          <p className="mt-0.5 font-display text-[12px] text-slate-500">
            За раждане извън България
          </p>
        </div>
        <input
          type="checkbox"
          id="manualCoordinates"
          checked={manualCoordinates === true}
          onChange={(e) => handleManualToggle(e.target.checked)}
          className="sr-only peer"
        />
        <span
          className="relative h-5 w-10 shrink-0 rounded-full border border-white/[0.08] bg-white/[0.02] transition-colors peer-checked:border-amber-300/50 peer-checked:bg-amber-300/[0.08]"
          aria-hidden
        >
          <span
            className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 transition-all duration-300 ${
              manualCoordinates
                ? 'left-[calc(100%-14px)] bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                : 'left-[6px] bg-slate-500'
            }`}
          />
        </span>
      </label>

      {!manualCoordinates && (
        <div>
          <p className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Търсене на град
          </p>
          <CitySearch
            onSelect={handleCitySelect}
            value={typeof cityName === 'string' ? cityName : ''}
            error={errors.cityName?.message}
          />
          {errors.cityName && !cityName && (
            <p className="mt-2 font-display text-[12px] text-rose-300/90">
              {errors.cityName.message}
            </p>
          )}
        </div>
      )}

      {manualCoordinates && (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="manualCityName"
              className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
            >
              Име на мястото
            </label>
            <input
              {...register('cityName')}
              type="text"
              id="manualCityName"
              placeholder="Лондон, Великобритания"
              className="block w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 placeholder-slate-600 transition-colors focus:border-amber-300/60 focus:outline-none"
            />
            {errors.cityName && (
              <p className="mt-2 font-display text-[12px] text-rose-300/90">
                {errors.cityName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="latitude"
                className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
              >
                Ширина
              </label>
              <input
                {...register('latitude', { valueAsNumber: true })}
                type="number"
                id="latitude"
                step="any"
                placeholder="42.6977"
                className="block w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] tabular-nums text-slate-100 placeholder-slate-600 transition-colors focus:border-amber-300/60 focus:outline-none"
              />
              {errors.latitude && (
                <p className="mt-2 font-display text-[12px] text-rose-300/90">
                  {errors.latitude.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="longitude"
                className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
              >
                Дължина
              </label>
              <input
                {...register('longitude', { valueAsNumber: true })}
                type="number"
                id="longitude"
                step="any"
                placeholder="23.3219"
                className="block w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] tabular-nums text-slate-100 placeholder-slate-600 transition-colors focus:border-amber-300/60 focus:outline-none"
              />
              {errors.longitude && (
                <p className="mt-2 font-display text-[12px] text-rose-300/90">
                  {errors.longitude.message}
                </p>
              )}
            </div>
          </div>
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
