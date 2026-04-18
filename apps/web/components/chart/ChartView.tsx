'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChart } from '@/hooks/useChart'
import dynamic from 'next/dynamic'
import { NatalWheelLegend } from './NatalWheelLegend'
import { BigThreeCards } from './BigThreeCards'
import { PlanetDetail } from './PlanetDetail'
import { ChartSectionChips } from './ChartSectionChips'
import { PlanetsList } from './PlanetsList'
import { AspectsList } from './AspectsList'
import { HousesList } from './HousesList'
import type { ChartSection } from './chart-sections'
import type { PlanetPosition, PointData } from '@celestia/astrology/client'

const NatalWheel = dynamic(
  () => import('./NatalWheel').then((m) => ({ default: m.NatalWheel })),
  { ssr: false }
)

const AstrologyReference = dynamic(
  () => import('./AstrologyReference').then((m) => ({ default: m.AstrologyReference })),
  { ssr: false }
)
import { UNKNOWN_TIME_DISCLAIMER_BG } from '@celestia/astrology/client'

interface ChartViewProps {
  chartId: string
  subscriptionTier?: 'free' | 'premium'
}

function ChartError({ message }: { message: string }) {
  return (
    <div className="max-w-xl border-l border-rose-300/50 bg-rose-500/[0.04] px-6 py-5">
      <p className="mb-2 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-rose-300/80">
        <span aria-hidden className="h-1 w-1 rotate-45 bg-rose-300/90 shadow-[0_0_6px_rgba(253,164,175,0.55)]" />
        Грешка
      </p>
      <h3 className="mb-2 font-display text-[1.375rem] font-semibold leading-tight tracking-tight text-slate-100">
        Неуспешно зареждане
      </h3>
      <p className="font-display text-[14px] leading-relaxed text-rose-300/90">
        {message}
      </p>
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
  const [activeView, setActiveView] = useState<'chart' | 'reference'>('chart')
  const [activeSection, setActiveSection] = useState<ChartSection>('essence')
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
      {/* Editorial tab switch - Cinzel underline slider */}
      <div className="mb-10 flex items-center gap-8">
        {[
          { id: 'chart' as const,     label: 'Карта'  },
          { id: 'reference' as const, label: 'Речник' },
        ].map((tab) => {
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className="group relative pb-2"
            >
              <span
                className={`font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.38em] transition-colors duration-200 ${
                  isActive ? 'text-amber-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId="chart-tab-underline"
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/75 to-transparent shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                  transition={{ duration: 0.4, ease: [0.22, 0.68, 0.35, 1] }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Reference view */}
      <AnimatePresence mode="wait">
        {activeView === 'reference' && (
          <motion.div
            key="reference"
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.5, ease: [0.22, 0.68, 0.35, 1] }}
          >
            <AstrologyReference />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart view */}
      {activeView === 'chart' && (
        <>
      {!chart.birthTimeKnown && (
        <div className="mb-6 max-w-2xl border-l border-amber-300/40 bg-gradient-to-r from-amber-300/[0.05] via-transparent to-violet-400/[0.04] px-5 py-3">
          <p className="mb-1 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
            Забележка
          </p>
          <p className="font-display text-[13px] font-light leading-relaxed text-amber-100/85">
            {UNKNOWN_TIME_DISCLAIMER_BG}
          </p>
        </div>
      )}

      <div className="lg:flex lg:items-start lg:gap-8 relative z-[30]">
        {/* Ambient atmosphere surrounding the wheel */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/[0.10] blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/[0.05] blur-[100px]"
        />

        {/* Natal wheel - zoom from the stars */}
        <motion.div
          className="relative flex-1 z-[30]"
          initial={{ scale: 0.08, opacity: 0, filter: 'blur(18px)' }}
          animate={{
            scale: [0.08, 0.45, 1.02, 1],
            opacity: [0, 0.55, 1, 1],
            filter: ['blur(18px)', 'blur(8px)', 'blur(1px)', 'blur(0px)'],
          }}
          transition={{ duration: 1.3, ease: [0.22, 0.68, 0.35, 1], times: [0, 0.45, 0.85, 1] }}
        >
          {/* Arrival glow flash - restrained amber+violet */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(167,139,250,0.18) 38%, rgba(99,102,241,0.06) 62%, transparent 80%)',
              filter: 'blur(10px)',
            }}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: [0, 0.55, 0], scale: [0.75, 1.08, 1.18] }}
            transition={{ duration: 1.1, delay: 0.15, times: [0, 0.5, 1], ease: 'easeOut' }}
          />
          {/* Persistent soft glow - subtle halo after arrival */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-[15] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(167,139,250,0.07) 0%, rgba(251,191,36,0.03) 45%, transparent 72%)',
              filter: 'blur(36px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0.4] }}
            transition={{ duration: 1.6, times: [0, 0.5, 1], ease: 'easeOut' }}
          />
          <NatalWheelLegend />
          <NatalWheel
            chart={chart}
            onPlanetSelect={handlePlanetSelect}
            selectedPlanet={selectedPlanet}
          />
        </motion.div>

        {/* Right column (desktop) / below-wheel (mobile) — scroll-chip
             section switcher per MOBILE_UX_RESEARCH §2.2. Chips choose
             between Същност / Детайли / Аспекти / Къщи, the swappable
             content lives below. */}
        <motion.div
          className="mt-8 w-full lg:mt-0 lg:w-80"
          initial={{ scale: 0.1, opacity: 0, filter: 'blur(14px)' }}
          animate={{
            scale: [0.1, 0.5, 1.02, 1],
            opacity: [0, 0.55, 1, 1],
            filter: ['blur(14px)', 'blur(6px)', 'blur(1px)', 'blur(0px)'],
          }}
          transition={{ duration: 1.1, delay: 0.22, ease: [0.22, 0.68, 0.35, 1], times: [0, 0.45, 0.85, 1] }}
        >
          <ChartSectionChips active={activeSection} onChange={setActiveSection} />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.35, ease: [0.22, 0.68, 0.35, 1] }}
            >
              {activeSection === 'essence' && (
                <BigThreeCards
                  sun={sun}
                  moon={moon}
                  ascendant={chart.ascendant}
                  birthTimeKnown={chart.birthTimeKnown}
                  onSelect={handleBigThreeSelect}
                  selected={selectedBigThree}
                />
              )}
              {activeSection === 'details' && (
                <PlanetsList
                  planets={chart.planets}
                  onSelect={handlePlanetSelect}
                  selectedPlanet={selectedPlanet}
                />
              )}
              {activeSection === 'aspects' && (
                <AspectsList aspects={chart.aspects} />
              )}
              {activeSection === 'houses' && (
                <HousesList
                  houses={chart.houses}
                  birthTimeKnown={chart.birthTimeKnown}
                />
              )}
            </motion.div>
          </AnimatePresence>
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
        </>
      )}

    </div>
  )
}
