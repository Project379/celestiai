'use client'

import { useState, useCallback } from 'react'
import { useChart } from '@/hooks/useChart'
import { NatalWheel } from './NatalWheel'
import { NatalWheelLegend } from './NatalWheelLegend'
import { BigThreeCards } from './BigThreeCards'
import { PlanetDetail } from './PlanetDetail'
import { OraclePanel } from '../oracle/OraclePanel'
import type { PlanetPosition, PointData } from '@celestia/astrology/client'
import { UNKNOWN_TIME_DISCLAIMER_BG } from '@celestia/astrology/client'

interface ChartViewProps {
  /** Chart ID to fetch and display */
  chartId: string
  /** User's subscription tier for Oracle gating */
  subscriptionTier?: 'free' | 'premium'
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

        {/* Right column skeleton - desktop */}
        <div className="hidden w-96 space-y-4 lg:block">
          {[1, 2, 3, 4].map((i) => (
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
 * Combined chart view with natal wheel, Big Three cards, and Oracle panel.
 *
 * Layout:
 * - Desktop (lg+): wheel (flex-1) | right column (w-96): BigThree + OraclePanel
 * - Mobile: BigThree above wheel, OraclePanel below wheel
 */
export function ChartView({
  chartId,
  subscriptionTier = 'free',
}: ChartViewProps) {
  const { chart, isLoading, error } = useChart(chartId)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [selectedBigThree, setSelectedBigThree] = useState<'sun' | 'moon' | 'rising' | null>(null)
  const [selectedPlanetData, setSelectedPlanetData] = useState<PlanetPosition | PointData | null>(null)

  // Handle planet selection from wheel
  const handlePlanetSelect = useCallback((planet: PlanetPosition) => {
    if (selectedPlanet === planet.planet) {
      // Deselect if clicking same planet
      setSelectedPlanet(null)
      setSelectedPlanetData(null)
      setSelectedBigThree(null)
    } else {
      setSelectedPlanet(planet.planet)
      setSelectedPlanetData(planet)
      // Clear Big Three selection if selecting a different planet
      if (planet.planet !== 'sun' && planet.planet !== 'moon') {
        setSelectedBigThree(null)
      } else {
        setSelectedBigThree(planet.planet as 'sun' | 'moon')
      }
    }
  }, [selectedPlanet])

  // Handle Big Three card selection
  const handleBigThreeSelect = useCallback((type: 'sun' | 'moon' | 'rising') => {
    if (selectedBigThree === type) {
      // Deselect if clicking same card
      setSelectedBigThree(null)
      setSelectedPlanet(null)
      setSelectedPlanetData(null)
    } else {
      setSelectedBigThree(type)
      if (type === 'sun' && chart) {
        const sun = chart.planets.find((p) => p.planet === 'sun')
        setSelectedPlanet('sun')
        setSelectedPlanetData(sun || null)
      } else if (type === 'moon' && chart) {
        const moon = chart.planets.find((p) => p.planet === 'moon')
        setSelectedPlanet('moon')
        setSelectedPlanetData(moon || null)
      } else if (type === 'rising' && chart) {
        // Rising uses ascendant data
        setSelectedPlanet(null)
        setSelectedPlanetData(chart.ascendant)
      }
    }
  }, [selectedBigThree, chart])

  // Handle closing the detail panel
  const handleCloseDetail = useCallback(() => {
    setSelectedPlanet(null)
    setSelectedBigThree(null)
    setSelectedPlanetData(null)
  }, [])

  /**
   * Bridge Oracle planet cross-highlighting to NatalWheel selection state.
   * Maps a planet key (e.g. 'mars') to the matching PlanetPosition in chart.planets
   * and calls the same setSelectedPlanet/setSelectedPlanetData flow used by wheel clicks.
   */
  const handleOraclePlanetHighlight = useCallback(
    (planetKey: string) => {
      if (!chart) return

      const planet = chart.planets.find((p) => p.planet === planetKey)
      if (planet) {
        setSelectedPlanet(planet.planet)
        setSelectedPlanetData(planet)
        // Sync Big Three if applicable
        if (planet.planet === 'sun' || planet.planet === 'moon') {
          setSelectedBigThree(planet.planet as 'sun' | 'moon')
        } else {
          setSelectedBigThree(null)
        }
      }
    },
    [chart]
  )

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
        <div className="relative flex-1">
          <NatalWheelLegend />
          <NatalWheel
            chart={chart}
            onPlanetSelect={handlePlanetSelect}
            selectedPlanet={selectedPlanet}
            size={500}
          />
        </div>

        {/* Right column - desktop: BigThree cards + Oracle panel stacked vertically */}
        <div className="hidden w-96 lg:flex lg:flex-col lg:gap-4">
          <BigThreeCards
            sun={sun}
            moon={moon}
            ascendant={chart.ascendant}
            birthTimeKnown={chart.birthTimeKnown}
            onSelect={handleBigThreeSelect}
            selected={selectedBigThree}
          />
          <OraclePanel
            chartId={chartId}
            subscriptionTier={subscriptionTier}
            onPlanetHighlight={handleOraclePlanetHighlight}
          />
        </div>
      </div>

      {/* Oracle panel - mobile (below wheel, full width) */}
      <div className="mt-6 lg:hidden">
        <OraclePanel
          chartId={chartId}
          subscriptionTier={subscriptionTier}
          onPlanetHighlight={handleOraclePlanetHighlight}
        />
      </div>

      {/* Planet interpretation panel */}
      <PlanetDetail
        planet={selectedPlanetData}
        onClose={handleCloseDetail}
        type={selectedBigThree}
        birthTimeKnown={chart.birthTimeKnown}
        aspects={
          selectedPlanetData && 'planet' in selectedPlanetData
            ? chart.aspects.filter(
                (aspect) =>
                  aspect.planet1 === selectedPlanetData.planet ||
                  aspect.planet2 === selectedPlanetData.planet
              )
            : []
        }
        house={
          selectedPlanetData && 'planet' in selectedPlanetData
            ? chart.planets.find((p) => p.planet === (selectedPlanetData as PlanetPosition).planet)?.house
            : undefined
        }
      />
    </div>
  )
}
