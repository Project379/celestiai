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

interface ChartData {
  id: string
  name: string
  birth_date: string
  birth_time_known: boolean
  birth_time: string | null
  approximate_time_range: string | null
  city_name: string
  latitude: number
  longitude: number
  city_id: string | null
}

interface EditBirthDataDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  chart: ChartData
}

const TIME_RANGE_LABELS: Record<string, string> = {
  morning: 'Сутрин (06:00-12:00)',
  afternoon: 'Следобед (12:00-18:00)',
  evening: 'Вечер (18:00-24:00)',
  night: 'Нощ (00:00-06:00)',
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

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
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
        if (!showConfirm) {
          onClose()
        }
      }
    },
    [onClose, showConfirm]
  )

  const handleCancel = useCallback(() => {
    if (showConfirm) {
      setShowConfirm(false)
    } else {
      onClose()
    }
  }, [showConfirm, onClose])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="fixed inset-0 z-[100] m-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900/95 p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-100">
              {showConfirm ? 'Потвърдете промените' : 'Редактиране на данни'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {showConfirm
                ? 'Сигурни ли сте, че искате да запазите тези промени?'
                : 'Променете данните за раждане'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {showConfirm ? (
            <div className="mb-6 rounded-lg bg-slate-800/50 p-4">
              <p className="text-sm text-slate-300">
                Данните за раждане ще бъдат актуализирани. Това може да промени
                резултатите от астрологичните изчисления.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Име
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="birthDate"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  Дата на раждане
                </label>
                <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
                        Изберете дата
                      </p>
                      <input
                        id="birthDate"
                        type="date"
                        {...register('birthDate')}
                        className="block w-full border-0 bg-transparent px-0 py-0 text-base text-slate-100 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                      />
                    </div>
                  </div>
                </div>
                {errors.birthDate && (
                  <p className="mt-1 text-xs text-red-400">{errors.birthDate.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Знаете ли точното време?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setValue('birthTimeKnown', true)
                      setValue('approximateTimeRange', null)
                    }}
                    className={[
                      'rounded-xl border px-4 py-3 text-sm transition-all',
                      birthTimeKnown === true
                        ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600',
                    ].join(' ')}
                  >
                    Да
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('birthTimeKnown', false)
                      setValue('birthTime', null)
                    }}
                    className={[
                      'rounded-xl border px-4 py-3 text-sm transition-all',
                      birthTimeKnown === false
                        ? 'border-purple-500 bg-purple-500/20 text-purple-200'
                        : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600',
                    ].join(' ')}
                  >
                    Не
                  </button>
                </div>
              </div>

              {birthTimeKnown ? (
                <div>
                  <label
                    htmlFor="birthTime"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Час на раждане
                  </label>
                  <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
                          Изберете час
                        </p>
                        <input
                          id="birthTime"
                          type="time"
                          {...register('birthTime')}
                          className="block w-full border-0 bg-transparent px-0 py-0 text-base text-slate-100 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                        />
                      </div>
                    </div>
                  </div>
                  {errors.birthTime && (
                    <p className="mt-1 text-xs text-red-400">{errors.birthTime.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="approximateTimeRange"
                    className="mb-1.5 block text-sm font-medium text-slate-300"
                  >
                    Приблизителен период
                  </label>
                  <select
                    id="approximateTimeRange"
                    {...register('approximateTimeRange')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3 text-sm text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Изберете период</option>
                    {approximateTimeRanges.map((range) => (
                      <option key={range} value={range}>
                        {TIME_RANGE_LABELS[range]}
                      </option>
                    ))}
                  </select>
                  {errors.approximateTimeRange && (
                    <p className="mt-1 text-xs text-red-400">
                      {errors.approximateTimeRange.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Място на раждане
                </label>
                <CitySearch
                  onSelect={handleCitySelect}
                  value={watch('cityName') || ''}
                  error={errors.cityName?.message}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
            >
              {showConfirm ? 'Върни се' : 'Отказ'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Запазване...
                </span>
              ) : showConfirm ? (
                'Потвърждавам'
              ) : (
                'Запази'
              )}
            </button>
          </div>
        </form>
      </FormProvider>
    </dialog>
  )
}
