'use client'

import { useFormContext, useWatch } from 'react-hook-form'
import type { BirthData, ApproximateTimeRange } from '@/lib/validators/birth-data'

interface ConfirmStepProps {
  onPrev: () => void
  isSubmitting: boolean
  submitError: string | null
}

const TIME_RANGE_LABELS: Record<ApproximateTimeRange, string> = {
  morning: 'Sutrin (06:00-12:00)',
  afternoon: 'Sledobed (12:00-18:00)',
  evening: 'Vecher (18:00-24:00)',
  night: 'Nosht (00:00-06:00)',
}

export function ConfirmStep({ onPrev, isSubmitting, submitError }: ConfirmStepProps) {
  const { formState: { errors } } = useFormContext<BirthData>()

  const name = useWatch<BirthData>({ name: 'name' })
  const birthDate = useWatch<BirthData>({ name: 'birthDate' })
  const birthTimeKnown = useWatch<BirthData>({ name: 'birthTimeKnown' })
  const birthTime = useWatch<BirthData>({ name: 'birthTime' })
  const approximateTimeRange = useWatch<BirthData>({ name: 'approximateTimeRange' })
  const cityName = useWatch<BirthData>({ name: 'cityName' })
  const latitude = useWatch<BirthData>({ name: 'latitude' })
  const longitude = useWatch<BirthData>({ name: 'longitude' })
  const manualCoordinates = useWatch<BirthData>({ name: 'manualCoordinates' })

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  // Get time display
  const getTimeDisplay = () => {
    if (birthTimeKnown && birthTime) {
      return birthTime
    }
    if (!birthTimeKnown && approximateTimeRange) {
      return TIME_RANGE_LABELS[approximateTimeRange as ApproximateTimeRange]
    }
    return 'Ne e posocheno'
  }

  // Check if there are validation errors
  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">
          Pregled na dannite
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Izglezhda dobre? Proverete dannite predi da zapazite.
        </p>
      </div>

      {/* Summary card */}
      <div className="space-y-4 rounded-lg border border-slate-600/50 bg-slate-800/50 p-4">
        {/* Name */}
        <div className="flex justify-between">
          <span className="text-sm text-slate-400">Ime na kartata</span>
          <span className="text-sm font-medium text-slate-100">{name || '-'}</span>
        </div>

        {/* Birth date */}
        <div className="flex justify-between">
          <span className="text-sm text-slate-400">Data na razhdane</span>
          <span className="text-sm font-medium text-slate-100">
            {formatDate(birthDate as string) || '-'}
          </span>
        </div>

        {/* Birth time */}
        <div className="flex justify-between">
          <span className="text-sm text-slate-400">Chas na razhdane</span>
          <span className="text-sm font-medium text-slate-100">
            {getTimeDisplay()}
          </span>
        </div>

        {/* Location */}
        <div className="flex justify-between">
          <span className="text-sm text-slate-400">Miasto</span>
          <span className="text-sm font-medium text-slate-100">
            {cityName || '-'}
          </span>
        </div>

        {/* Coordinates */}
        {(manualCoordinates || latitude || longitude) && (
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Koordinati</span>
            <span className="text-sm font-medium text-slate-100">
              {typeof latitude === 'number' ? latitude.toFixed(4) : '0'}, {typeof longitude === 'number' ? longitude.toFixed(4) : '0'}
            </span>
          </div>
        )}
      </div>

      {/* Validation errors */}
      {hasErrors && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">
            Molia, popalnete vsichki zadaljitelni poleta predi da zapazite.
          </p>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-400">{submitError}</p>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onPrev}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-600 px-6 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
        >
          Nazad
        </button>
        <button
          type="submit"
          disabled={isSubmitting || hasErrors}
          className="rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 px-6 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Zapazvane...
            </span>
          ) : (
            'Zapazi'
          )}
        </button>
      </div>
    </div>
  )
}
