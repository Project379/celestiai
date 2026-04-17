'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  updateBirthDataSchema,
  type UpdateBirthData,
  approximateTimeRanges,
} from '@/lib/validators/birth-data'
import { CitySearch } from './CitySearch'
import { CelestialIcon } from '@/components/icons/CelestialIcons'
import type { ChartRow } from '@/lib/types/chart'

interface EditBirthDataDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  chart: ChartRow
}

const TIME_RANGE_LABELS: Record<string, string> = {
  morning: 'Сутрин (06:00–12:00)',
  afternoon: 'Следобед (12:00–18:00)',
  evening: 'Вечер (18:00–24:00)',
  night: 'Нощ (00:00–06:00)',
}

export function EditBirthDataDialog({
  isOpen,
  onClose,
  onSuccess,
  chart,
}: EditBirthDataDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  const methods = useForm<UpdateBirthData>({
    resolver: zodResolver(updateBirthDataSchema),
    mode: 'onBlur',
    defaultValues: {
      name: chart.name,
      birthDate: chart.birth_date,
      birthTimeKnown: chart.birth_time_known,
      birthTime: chart.birth_time,
      approximateTimeRange:
        chart.approximate_time_range as UpdateBirthData['approximateTimeRange'],
      cityId: chart.city_id,
      cityName: chart.city_name,
      latitude: chart.latitude,
      longitude: chart.longitude,
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = methods

  const birthTimeKnown = watch('birthTimeKnown')

  useEffect(() => {
    if (isOpen) {
      methods.reset({
        name: chart.name,
        birthDate: chart.birth_date,
        birthTimeKnown: chart.birth_time_known,
        birthTime: chart.birth_time,
        approximateTimeRange:
          chart.approximate_time_range as UpdateBirthData['approximateTimeRange'],
        cityId: chart.city_id,
        cityName: chart.city_name,
        latitude: chart.latitude,
        longitude: chart.longitude,
      })
      setError(null)
      setShowConfirm(false)
    }
  }, [isOpen, chart, methods])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) dialog.showModal()
    else dialog.close()
  }, [isOpen])

  const handleCitySelect = useCallback(
    (city: { id: string; name: string; latitude: number; longitude: number }) => {
      setValue('cityId', city.id)
      setValue('cityName', city.name)
      setValue('latitude', city.latitude)
      setValue('longitude', city.longitude)
    },
    [setValue]
  )

  const onSubmit = async (data: UpdateBirthData) => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/birth-data/${chart.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Грешка при запазване')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестна грешка')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      const rect = dialogRef.current?.getBoundingClientRect()
      if (
        rect &&
        (e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom)
      ) {
        if (!showConfirm) onClose()
      }
    },
    [onClose, showConfirm]
  )

  const handleCancel = useCallback(() => {
    if (showConfirm) setShowConfirm(false)
    else onClose()
  }, [showConfirm, onClose])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="mystic-panel fixed inset-0 z-[100] m-auto max-h-[90vh] w-full max-w-xl overflow-y-auto p-0 backdrop:bg-[#04030a]/80 backdrop:backdrop-blur-md"
    >
      {/* Ambient inside panel */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 -z-0 h-[320px] w-[320px] rounded-full bg-violet-500/[0.10] blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-10 -z-0 h-[240px] w-[240px] rounded-full bg-amber-500/[0.06] blur-[90px]"
      />

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="relative px-8 py-8">
          {/* Header */}
          <div className="mb-7">
            <p className="mb-2 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
              <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              {showConfirm ? 'Потвърждение' : 'Редакция'}
            </p>
            <h2 className="font-display text-[1.5rem] font-semibold leading-[1.15] tracking-tight text-slate-100">
              {showConfirm ? 'Потвърди промените' : 'Редактиране на данни'}
            </h2>
            <p className="mt-2 font-display text-[14px] font-light leading-relaxed text-slate-400">
              {showConfirm
                ? 'Наталната карта ще бъде преизчислена.'
                : 'Промени каквото е нужно - резултатите се обновяват веднага.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 border-l border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
              <p className="font-display text-[13px] text-rose-300/90">{error}</p>
            </div>
          )}

          {showConfirm ? (
            <div className="mb-7 border-l border-amber-300/40 bg-gradient-to-r from-amber-300/[0.04] via-transparent to-violet-400/[0.04] px-5 py-4">
              <p className="font-display text-[14px] leading-relaxed text-slate-300/90">
                Рождените данни ще бъдат актуализирани. Наталната карта, домовете и аспектите ще бъдат преизчислени.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
                >
                  Име
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="block w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[16px] text-slate-100 placeholder-slate-600 transition-colors focus:border-amber-300/60 focus:outline-none"
                />
                {errors.name && (
                  <p className="mt-2 font-display text-[12px] text-rose-300/90">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Date */}
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
                    id="birthDate"
                    type="date"
                    {...register('birthDate')}
                    className="block w-full border-0 bg-transparent p-0 font-display text-[16px] text-slate-100 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                  />
                </div>
                {errors.birthDate && (
                  <p className="mt-2 font-display text-[12px] text-rose-300/90">
                    {errors.birthDate.message}
                  </p>
                )}
              </div>

              {/* Knows-time Да/Не */}
              <div>
                <p className="mb-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Знаеш ли точното време?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Да', value: true },
                    { label: 'Не', value: false },
                  ].map((opt) => {
                    const isActive = birthTimeKnown === opt.value
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setValue('birthTimeKnown', opt.value)
                          if (opt.value) setValue('approximateTimeRange', null)
                          else setValue('birthTime', null)
                        }}
                        className={`group relative flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-display text-[14px] font-medium transition-all ${
                          isActive
                            ? 'border-amber-300/45 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-amber-400/[0.06] text-white shadow-[0_0_22px_rgba(167,139,250,0.14)]'
                            : 'border-white/[0.06] bg-white/[0.015] text-slate-300 hover:border-violet-300/20 hover:bg-white/[0.03]'
                        }`}
                      >
                        {isActive && (
                          <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                        )}
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time OR range */}
              {birthTimeKnown ? (
                <div>
                  <label
                    htmlFor="birthTime"
                    className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
                  >
                    Час на раждане
                  </label>
                  <div className="group flex items-center gap-4 border-b border-white/[0.08] px-1 py-2.5 transition-colors focus-within:border-amber-300/60">
                    <span className="text-violet-300/80 transition-colors group-focus-within:text-amber-300">
                      <CelestialIcon name="moon" size={18} />
                    </span>
                    <input
                      id="birthTime"
                      type="time"
                      {...register('birthTime')}
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
                  <label
                    htmlFor="approximateTimeRange"
                    className="mb-2 block font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500"
                  >
                    Приблизителен период
                  </label>
                  <select
                    id="approximateTimeRange"
                    {...register('approximateTimeRange')}
                    className="block w-full border-0 border-b border-white/[0.08] bg-transparent px-1 py-2.5 font-display text-[15px] text-slate-100 transition-colors focus:border-amber-300/60 focus:outline-none [&>option]:bg-[#0c0918] [&>option]:text-slate-200"
                  >
                    <option value="">Избери период</option>
                    {approximateTimeRanges.map((range) => (
                      <option key={range} value={range}>
                        {TIME_RANGE_LABELS[range]}
                      </option>
                    ))}
                  </select>
                  {errors.approximateTimeRange && (
                    <p className="mt-2 font-display text-[12px] text-rose-300/90">
                      {errors.approximateTimeRange.message}
                    </p>
                  )}
                </div>
              )}

              {/* City */}
              <div>
                <p className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                  Място на раждане
                </p>
                <CitySearch
                  onSelect={handleCitySelect}
                  value={watch('cityName') || ''}
                  error={errors.cityName?.message}
                />
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="group inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300 disabled:pointer-events-none disabled:opacity-40"
            >
              <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {showConfirm ? 'Върни се' : 'Отказ'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-6 py-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-100 transition-all hover:border-amber-300/80 hover:text-white hover:shadow-[0_0_28px_rgba(251,191,36,0.20)] focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60 disabled:pointer-events-none disabled:opacity-45"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/15 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              {isLoading ? (
                <span className="relative flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Запазване…
                </span>
              ) : showConfirm ? (
                <>
                  <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  <span className="relative">Потвърждавам</span>
                  <span aria-hidden className="relative h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                </>
              ) : (
                <span className="relative">Запази</span>
              )}
            </button>
          </div>
        </form>
      </FormProvider>
    </dialog>
  )
}
