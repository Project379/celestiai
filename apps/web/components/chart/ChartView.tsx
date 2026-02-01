'use client'

import { useState } from 'react'
import { useChart } from '@/hooks/useChart'
import { NatalWheel } from './NatalWheel'
import { BigThreeCards } from './BigThreeCards'
import type { PlanetPosition } from '@celestia/astrology'
import { UNKNOWN_TIME_DISCLAIMER_BG } from '@celestia/astrology'

interface ChartViewProps {
  /** Chart ID to fetch and display */
  chartId: string
}

/**
 * Loading skeleton for chart view
 */
function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Big Three cards skeleton - mobile */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:hidden">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-slate-700/50 bg-slate-800/30"
          />
        ))}
      </div>

      <div className="lg:flex lg:gap-8">
        {/* Wheel skeleton */}
        <div className="flex-1">
          <div className="mx-auto aspect-square max-w-[500px] rounded-full border border-slate-700/50 bg-slate-800/20" />
        </div>

        {/* Big Three cards skeleton - desktop */}
        <div className="hidden w-64 space-y-4 lg:block">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-slate-700/50 bg-slate-800/30"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Error display component
 */
function ChartError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
      <svg
        className="mx-auto mb-3 h-10 w-10 text-red-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className="mb-2 text-lg font-semibold text-red-300">
        Грешка при зареждане
      </h3>
      <p className="text-sm text-red-400">{message}</p>
    </div>
  )
}

/**
 * Combined chart view with natal wheel and Big Three cards
 *
 * Layout:
 * - Desktop (lg+): Big Three cards on right, wheel on left
 * - Mobile: Big Three cards above, wheel below
 */
export function ChartView({ chartId }: ChartViewProps) {
  const { chart, isLoading, error } = useChart(chartId)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [selectedBigThree, setSelectedBigThree] = useState<'sun' | 'moon' | 'rising' | null>(null)

  // Handle planet selection from wheel
  const handlePlanetSelect = (planet: PlanetPosition) => {
    setSelectedPlanet((prev) => (prev === planet.planet ? null : planet.planet))
    setSelectedBigThree(null)
    console.log('Selected planet:', planet)
  }

  // Handle Big Three card selection
  const handleBigThreeSelect = (type: 'sun' | 'moon' | 'rising') => {
    setSelectedBigThree((prev) => (prev === type ? null : type))
    if (type === 'sun') {
      setSelectedPlanet('sun')
    } else if (type === 'moon') {
      setSelectedPlanet('moon')
    } else {
      setSelectedPlanet(null)
    }
  }

  if (isLoading) {
    return <ChartSkeleton />
  }

  if (error) {
    return <ChartError message={error} />
  }

  if (!chart) {
    return <ChartError message="Картата не е намерена" />
  }

  // Find Sun and Moon from planets array
  const sun = chart.planets.find((p) => p.planet === 'sun')
  const moon = chart.planets.find((p) => p.planet === 'moon')

  if (!sun || !moon) {
    return <ChartError message="Липсват данни за планетите" />
  }

  return (
    <div>
      {/* Unknown birth time disclaimer */}
      {!chart.birthTimeKnown && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-300">
            {UNKNOWN_TIME_DISCLAIMER_BG}
          </p>
        </div>
      )}

      {/* Big Three cards - mobile (above wheel) */}
      <div className="mb-6 lg:hidden">
        <BigThreeCards
          sun={sun}
          moon={moon}
          ascendant={chart.ascendant}
          birthTimeKnown={chart.birthTimeKnown}
          onSelect={handleBigThreeSelect}
          selected={selectedBigThree}
        />
      </div>

      <div className="lg:flex lg:items-start lg:gap-8">
        {/* Natal wheel */}
        <div className="flex-1">
          <NatalWheel
            chart={chart}
            onPlanetSelect={handlePlanetSelect}
            selectedPlanet={selectedPlanet}
            size={500}
          />
        </div>

        {/* Big Three cards - desktop (beside wheel) */}
        <div className="hidden w-64 lg:block">
          <BigThreeCards
            sun={sun}
            moon={moon}
            ascendant={chart.ascendant}
            birthTimeKnown={chart.birthTimeKnown}
            onSelect={handleBigThreeSelect}
            selected={selectedBigThree}
          />
        </div>
      </div>

      {/* Planet interpretation placeholder */}
      {selectedPlanet && (
        <div className="mt-6 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
          <h3 className="mb-2 font-semibold text-purple-300">
            {chart.planets.find((p) => p.planet === selectedPlanet)?.planet &&
              `${selectedPlanet.charAt(0).toUpperCase()}${selectedPlanet.slice(1)}`}
          </h3>
          <p className="text-sm text-slate-400">
            Пълна интерпретация скоро...
          </p>
        </div>
      )}
    </div>
  )
}
