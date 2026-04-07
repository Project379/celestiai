'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useChart } from '@/hooks/useChart'
import { NatalWheel } from './NatalWheel'
import { NatalWheelLegend } from './NatalWheelLegend'
import { BigThreeCards } from './BigThreeCards'
import { PlanetDetail } from './PlanetDetail'
import { OracleButton } from '../oracle/OracleButton'
import type { PlanetPosition, PointData } from '@celestia/astrology/client'
import { UNKNOWN_TIME_DISCLAIMER_BG } from '@celestia/astrology/client'

interface ChartViewProps {
  chartId: string
  subscriptionTier?: 'free' | 'premium'
}

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
 * Combined chart view with natal wheel, Big Three cards, and floating Oracle button.
 *
 * Layout:
 * - Desktop (lg+): wheel (flex-1) | right column (w-80): BigThree cards
 * - Mobile: BigThree above wheel
 * - Oracle: floating button (bottom-right) opens modal
 */
export function ChartView({
  chartId,
  subscriptionTier = 'free',
}: ChartViewProps) {
  const { chart, isLoading, error } = useChart(chartId)
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null)
  const [selectedBigThree, setSelectedBigThree] = useState<'sun' | 'moon' | 'rising' | null>(null)
  const [selectedPlanetData, setSelectedPlanetData] = useState<PlanetPosition | PointData | null>(null)

  const handlePlanetSelect = useCallback((planet: PlanetPosition) => {
    setSelectedPlanet((prev) => {
      if (prev === planet.planet) {
        setSelectedPlanetData(null)
        setSelectedBigThree(null)
        return null
      }
      setSelectedPlanetData(planet)
      if (planet.planet === 'sun' || planet.planet === 'moon') {
        setSelectedBigThree(planet.planet as 'sun' | 'moon')
      } else {
        setSelectedBigThree(null)
      }
      return planet.planet
    })
  }, [])

  const handleBigThreeSelect = useCallback((type: 'sun' | 'moon' | 'rising') => {
    setSelectedBigThree((prev) => {
      if (prev === type) {
        setSelectedPlanet(null)
        setSelectedPlanetData(null)
        return null
      }
      if (type === 'sun' && chart) {
        const sun = chart.planets.find((p) => p.planet === 'sun')
        setSelectedPlanet('sun')
        setSelectedPlanetData(sun || null)
      } else if (type === 'moon' && chart) {
        const moon = chart.planets.find((p) => p.planet === 'moon')
        setSelectedPlanet('moon')
        setSelectedPlanetData(moon || null)
      } else if (type === 'rising' && chart) {
        setSelectedPlanet(null)
        setSelectedPlanetData(chart.ascendant)
      }
      return type
    })
  }, [chart])

  const handleCloseDetail = useCallback(() => {
    setSelectedPlanet(null)
    setSelectedBigThree(null)
    setSelectedPlanetData(null)
  }, [])

  const handleOraclePlanetHighlight = useCallback(
    (planetKey: string) => {
      if (!chart) return
      const planet = chart.planets.find((p) => p.planet === planetKey)
      if (planet) {
        setSelectedPlanet(planet.planet)
        setSelectedPlanetData(planet)
        if (planet.planet === 'sun' || planet.planet === 'moon') {
          setSelectedBigThree(planet.planet as 'sun' | 'moon')
        } else {
          setSelectedBigThree(null)
        }
      }
    },
    [chart]
  )

  if (isLoading) return null
  if (error) return <ChartError message={error} />
  if (!chart) return <ChartError message="Картата не е намерена" />

  let sun: PlanetPosition | undefined
  let moon: PlanetPosition | undefined
  for (const p of chart.planets) {
    if (p.planet === 'sun') sun = p
    else if (p.planet === 'moon') moon = p
    if (sun && moon) break
  }

  if (!sun || !moon) {
    return <ChartError message="Липсват данни за планетите" />
  }

  return (
    <div>
      {!chart.birthTimeKnown && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-300">
            {UNKNOWN_TIME_DISCLAIMER_BG}
          </p>
        </div>
      )}

      {/* Big Three cards - mobile (above wheel) — zoom from stars */}
      <motion.div
        className="mb-6 lg:hidden"
        initial={{ scale: 0.02, opacity: 0, filter: 'blur(20px)' }}
        animate={{
          scale: [0.02, 0.06, 0.25, 0.7, 1.03, 1],
          opacity: [0, 0.15, 0.4, 0.75, 1, 1],
          filter: ['blur(20px)', 'blur(16px)', 'blur(10px)', 'blur(4px)', 'blur(1px)', 'blur(0px)'],
        }}
        transition={{ duration: 2.8, delay: 1.0, ease: [0.22, 0.68, 0.35, 1], times: [0, 0.15, 0.4, 0.7, 0.9, 1] }}
      >
        <BigThreeCards
          sun={sun}
          moon={moon}
          ascendant={chart.ascendant}
          birthTimeKnown={chart.birthTimeKnown}
          onSelect={handleBigThreeSelect}
          selected={selectedBigThree}
        />
      </motion.div>

      <div className="lg:flex lg:items-start lg:gap-8">
        {/* Natal wheel — zoom from the stars */}
        <motion.div
          className="relative flex-1"
          initial={{ scale: 0.01, opacity: 0, filter: 'blur(24px)' }}
          animate={{
            scale: [0.01, 0.04, 0.18, 0.6, 1.02, 1],
            opacity: [0, 0.1, 0.35, 0.7, 1, 1],
            filter: ['blur(24px)', 'blur(20px)', 'blur(12px)', 'blur(5px)', 'blur(1px)', 'blur(0px)'],
          }}
          transition={{ duration: 3.2, ease: [0.22, 0.68, 0.35, 1], times: [0, 0.12, 0.35, 0.65, 0.88, 1] }}
        >
          {/* Arrival glow flash */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3), rgba(99, 102, 241, 0.15) 40%, transparent 70%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.6, 0] }}
            transition={{ duration: 3.2, times: [0, 0.6, 0.85, 1], ease: 'easeOut' }}
          />
          <NatalWheelLegend />
          <NatalWheel
            chart={chart}
            onPlanetSelect={handlePlanetSelect}
            selectedPlanet={selectedPlanet}
            size={500}
          />
        </motion.div>

        {/* Right column - desktop: BigThree cards — zoom from stars with stagger */}
        <motion.div
          className="hidden w-80 lg:flex lg:flex-col lg:gap-4"
          initial={{ scale: 0.02, opacity: 0, filter: 'blur(20px)' }}
          animate={{
            scale: [0.02, 0.06, 0.25, 0.7, 1.03, 1],
            opacity: [0, 0.15, 0.4, 0.75, 1, 1],
            filter: ['blur(20px)', 'blur(16px)', 'blur(10px)', 'blur(4px)', 'blur(1px)', 'blur(0px)'],
          }}
          transition={{ duration: 2.8, delay: 0.8, ease: [0.22, 0.68, 0.35, 1], times: [0, 0.15, 0.4, 0.7, 0.9, 1] }}
        >
          <BigThreeCards
            sun={sun}
            moon={moon}
            ascendant={chart.ascendant}
            birthTimeKnown={chart.birthTimeKnown}
            onSelect={handleBigThreeSelect}
            selected={selectedBigThree}
          />
        </motion.div>
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

      {/* Floating Oracle Button */}
      <OracleButton
        chartId={chartId}
        subscriptionTier={subscriptionTier}
        onPlanetHighlight={handleOraclePlanetHighlight}
      />
    </div>
  )
}
