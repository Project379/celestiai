'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormProvider, useForm, useFormContext, useWatch } from 'react-hook-form'
import {
  createBirthDataSchema,
  type BirthData,
  type ApproximateTimeRange,
} from '@stellaeum/core/charts/schemas'
import { CitySearch } from '@/components/birth-data/CitySearch'

const TIME_RANGES: { value: ApproximateTimeRange; label: string; hours: string }[] = [
  { value: 'morning', label: 'Сутрин', hours: '06 - 12' },
  { value: 'afternoon', label: 'Следобед', hours: '12 - 18' },
  { value: 'evening', label: 'Вечер', hours: '18 - 24' },
  { value: 'night', label: 'Нощ', hours: '00 - 06' },
]

interface City {
  id: string
  name: string
  oblast: string
  type: 'city' | 'town' | 'village'
  latitude: number
  longitude: number
}

function InnerSavedProfileForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (data: BirthData) => Promise<void> | void
  isSubmitting: boolean
}) {
  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useFormContext<BirthData>()

  const birthTimeKnown = useWatch<BirthData>({ name: 'birthTimeKnown' })
  const approximateTimeRange = useWatch<BirthData>({ name: 'approximateTimeRange' })
  const manualCoordinates = useWatch<BirthData>({ name: 'manualCoordinates' })
  const cityName = useWatch<BirthData>({ name: 'cityName' })

  const selectCity = (city: City) => {
    setValue('cityId', city.id)
    setValue('cityName', city.name)
    setValue('latitude', city.latitude)
    setValue('longitude', city.longitude)
    setValue('manualCoordinates', false)
  }

  const toggleTimeKnown = (known: boolean) => {
    setValue('birthTimeKnown', known)
    if (known) setValue('approximateTimeRange', null)
    else setValue('birthTime', null)
  }

  const toggleManual = (checked: boolean) => {
    setValue('manualCoordinates', checked)
    if (checked) {
      setValue('cityId', null)
      setValue('cityName', '')
    }
  }

  return (
    <form onSubmit={handleSubmit((data) => onSubmit(data))} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
            Име
          </label>
          <input
            {...register('name')}
            placeholder="Име или инициали"
            className="w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 placeholder:text-slate-600 focus:border-amber-300/60 focus:outline-none"
          />
          {errors.name && <p className="mt-2 text-xs text-rose-300/90">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-2 block font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
            Дата на раждане
          </label>
          <input
            {...register('birthDate')}
            type="date"
            max={new Date().toISOString().split('T')[0]}
            className="w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 focus:border-amber-300/60 focus:outline-none"
          />
          {errors.birthDate && <p className="mt-2 text-xs text-rose-300/90">{errors.birthDate.message}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-[15px] text-slate-100">Знаеш ли точния час?</p>
            <p className="mt-1 text-xs text-slate-500">Ако не, избери приблизителен период.</p>
          </div>
          <button
            type="button"
            onClick={() => toggleTimeKnown(!(birthTimeKnown === true))}
            className={`relative h-5 w-10 rounded-full border ${birthTimeKnown ? 'border-amber-300/50 bg-amber-300/[0.08]' : 'border-white/[0.08] bg-white/[0.02]'}`}
          >
            <span
              className={`absolute top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 transition-all duration-300 ${
                birthTimeKnown
                  ? 'left-[calc(100%-14px)] bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                  : 'left-[6px] bg-slate-500'
              }`}
            />
          </button>
        </div>

        {birthTimeKnown ? (
          <div className="mt-4">
            <input
              {...register('birthTime')}
              type="time"
              className="w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 focus:border-amber-300/60 focus:outline-none"
            />
            {errors.birthTime && <p className="mt-2 text-xs text-rose-300/90">{errors.birthTime.message}</p>}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {TIME_RANGES.map((range) => {
              const active = approximateTimeRange === range.value
              return (
                <button
                  key={range.value}
                  type="button"
                  onClick={() => setValue('approximateTimeRange', range.value)}
                  className={`rounded-xl border px-4 py-3 text-left ${
                    active
                      ? 'border-amber-300/45 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-amber-400/[0.06]'
                      : 'border-white/[0.06] bg-white/[0.015]'
                  }`}
                >
                  <p className="font-display text-[14px] text-slate-100">{range.label}</p>
                  <p className="mt-1 font-cinzel text-[9px] uppercase tracking-[0.22em] text-amber-300/70">{range.hours}</p>
                </button>
              )
            })}
            {errors.approximateTimeRange && (
              <p className="col-span-2 mt-1 text-xs text-rose-300/90">{errors.approximateTimeRange.message}</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-[15px] text-slate-100">Място на раждане</p>
            <p className="mt-1 text-xs text-slate-500">Използвай търсене за България или ръчни координати.</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={manualCoordinates === true}
              onChange={(event) => toggleManual(event.target.checked)}
            />
            Ръчно
          </label>
        </div>

        {!manualCoordinates ? (
          <div className="mt-4">
            <CitySearch onSelect={selectCity} value={typeof cityName === 'string' ? cityName : ''} error={errors.cityName?.message} />
            {errors.cityName && !cityName && (
              <p className="mt-2 text-xs text-rose-300/90">{errors.cityName.message}</p>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <input
              {...register('cityName')}
              placeholder="Град или място"
              className="w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 placeholder:text-slate-600 focus:border-amber-300/60 focus:outline-none"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <input
                  {...register('latitude', { valueAsNumber: true })}
                  type="number"
                  step="any"
                  placeholder="Ширина"
                  className="w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 placeholder:text-slate-600 focus:border-amber-300/60 focus:outline-none"
                />
                {errors.latitude && <p className="mt-2 text-xs text-rose-300/90">{errors.latitude.message}</p>}
              </div>
              <div>
                <input
                  {...register('longitude', { valueAsNumber: true })}
                  type="number"
                  step="any"
                  placeholder="Дължина"
                  className="w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 placeholder:text-slate-600 focus:border-amber-300/60 focus:outline-none"
                />
                {errors.longitude && <p className="mt-2 text-xs text-rose-300/90">{errors.longitude.message}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full border border-rose-300/35 bg-rose-500/10 px-5 py-2.5 font-cinzel text-[10px] uppercase tracking-[0.3em] text-rose-100 disabled:opacity-50"
      >
        {isSubmitting ? 'Запазване...' : 'Запази crush профил'}
      </button>
    </form>
  )
}

export function SavedProfileForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (data: BirthData) => Promise<void> | void
  isSubmitting: boolean
}) {
  const [serverError, setServerError] = useState<string | null>(null)
  const methods = useForm<BirthData>({
    resolver: zodResolver(createBirthDataSchema),
    defaultValues: {
      name: '',
      birthDate: '',
      birthTimeKnown: true,
      birthTime: '',
      approximateTimeRange: null,
      cityId: null,
      cityName: '',
      latitude: undefined,
      longitude: undefined,
      manualCoordinates: false,
    },
  })

  return (
    <FormProvider {...methods}>
      {serverError && (
        <div className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {serverError}
        </div>
      )}
      <InnerSavedProfileForm
        isSubmitting={isSubmitting}
        onSubmit={async (data) => {
          setServerError(null)
          try {
            await onSubmit(data)
            methods.reset({
              name: '',
              birthDate: '',
              birthTimeKnown: true,
              birthTime: '',
              approximateTimeRange: null,
              cityId: null,
              cityName: '',
              latitude: undefined,
              longitude: undefined,
              manualCoordinates: false,
            })
          } catch (error) {
            setServerError(error instanceof Error ? error.message : 'Не успяхме да запазим профила.')
          }
        }}
      />
    </FormProvider>
  )
}
