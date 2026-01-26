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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Miasto na razhdane
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Izberete miasto ili vavedete koordinati rachno
        </p>
      </div>

      {/* Manual coordinates toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="manualCoordinates"
          checked={manualCoordinates === true}
          onChange={(e) => handleManualToggle(e.target.checked)}
          className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
        />
        <label htmlFor="manualCoordinates" className="text-sm text-slate-300">
          Rachni koordinati (za chuzhdestranno razhdane)
        </label>
      </div>

      {/* City search */}
      {!manualCoordinates && (
        <div>
          <label className="block text-sm font-medium text-slate-300">
            Tarsene na grad
          </label>
          <CitySearch
            onSelect={handleCitySelect}
            value={typeof cityName === 'string' ? cityName : ''}
            error={errors.cityName?.message}
          />
          {errors.cityName && !cityName && (
            <p className="mt-1 text-sm text-red-400">
              {errors.cityName.message}
            </p>
          )}
        </div>
      )}

      {/* Manual coordinate inputs */}
      {manualCoordinates && (
        <>
          <div>
            <label
              htmlFor="manualCityName"
              className="block text-sm font-medium text-slate-300"
            >
              Ime na mistoto
            </label>
            <input
              {...register('cityName')}
              type="text"
              id="manualCityName"
              placeholder="New York, USA"
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            {errors.cityName && (
              <p className="mt-1 text-sm text-red-400">
                {errors.cityName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="latitude"
                className="block text-sm font-medium text-slate-300"
              >
                Shirina (lat)
              </label>
              <input
                {...register('latitude', { valueAsNumber: true })}
                type="number"
                id="latitude"
                step="any"
                placeholder="42.6977"
                className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {errors.latitude && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.latitude.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="longitude"
                className="block text-sm font-medium text-slate-300"
              >
                Dalzhina (lon)
              </label>
              <input
                {...register('longitude', { valueAsNumber: true })}
                type="number"
                id="longitude"
                step="any"
                placeholder="23.3219"
                className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              {errors.longitude && (
                <p className="mt-1 text-sm text-red-400">
                  {errors.longitude.message}
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-lg border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500"
        >
          Nazad
        </button>
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
