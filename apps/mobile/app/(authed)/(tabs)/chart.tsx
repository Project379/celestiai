import { useState } from 'react'
import { Dimensions, View } from 'react-native'

import type { PlanetPosition, PointData } from '@stellaeum/astrology/client'

import { AspectsList } from '@/components/chart/AspectsList'
import { AstrologyReference } from '@/components/chart/AstrologyReference'
import { BigThreeCards } from '@/components/chart/BigThreeCards'
import { HousesList } from '@/components/chart/HousesList'
import { NatalWheel } from '@/components/chart/NatalWheel'
import { NatalWheelLegend } from '@/components/chart/NatalWheelLegend'
import { PlanetDetail } from '@/components/chart/PlanetDetail'
import { PlanetsList } from '@/components/chart/PlanetsList'
import { WheelArrivalContainer } from '@/components/chart/WheelArrivalContainer'
import { DisclosureRow } from '@/components/design-system/NavRow'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { EmptyState, ErrorState, LoadingState } from '@/components/design-system/States'
import { rhythm } from '@/components/design-system/tokens'
import { useChart } from '@/hooks/useChart'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * Карта — MOBILE-ALPHA-REDESIGN v3, live since Round A cutover (2026-07-22).
 * v2's specific failure (founder's Step 3 correction #1): the wheel was
 * buried under a tab row, a four-chip row, AND three Big Three pills
 * before it ever appeared. This version puts the wheel first — it IS the
 * answer to "what is this screen for," visible without scrolling past
 * chrome. Everything else (Big Three, the Details/Aspects/Houses
 * breakdown, the Reference/dictionary view) sits below it or behind a
 * tap, per the ratified prose in .planning/research/MOBILE_ALPHA_REDESIGN.md
 * §0.2 (see §14 for the cutover record).
 *
 * Tap-a-planet already works (components/chart/NatalWheel.tsx — SR 6
 * decision 6) and was reworked in this pass to fix a real hit-region
 * problem: independent per-planet Pressables were undersized (31.5px vs.
 * the 44pt HIG minimum) AND would have overlapped by ~64% of their
 * diameter at stellium separations if simply floored to 44px. Fixed with
 * a single nearest-planet tap surface plus a disambiguation list for
 * genuinely ambiguous taps — see NatalWheel.tsx's HIT_RADIUS_MIN comment.
 */

interface PlanetSelection {
  data: PlanetPosition | PointData
  type: 'sun' | 'moon' | 'rising' | null
  house?: number
}

const SCREEN_PADDING_X = 20
const WHEEL_MARGIN = SCREEN_PADDING_X * 2

export default function ChartScreen() {
  const { push } = useGuardedNavigation()
  const firstChart = useFirstChart()
  const chart = useChart(firstChart.data?.id)
  const [openRow, setOpenRow] = useState<'details' | 'aspects' | 'houses' | 'reference' | null>(null)
  const [selection, setSelection] = useState<PlanetSelection | null>(null)

  const toggleRow = (row: 'details' | 'aspects' | 'houses' | 'reference') =>
    setOpenRow((prev) => (prev === row ? null : row))

  const wheelSize = Math.min(Dimensions.get('window').width - WHEEL_MARGIN, 520)

  const handlePlanetSelect = (planet: PlanetPosition) => {
    setSelection((prev) => {
      if (prev && 'planet' in prev.data && prev.data.planet === planet.planet) return null
      const type = planet.planet === 'sun' || planet.planet === 'moon' ? planet.planet : null
      return { data: planet, type, house: planet.house }
    })
  }

  const handleBigThreeSelect = (kind: 'sun' | 'moon' | 'rising') => {
    if (!chart.data) return
    setSelection((prev) => {
      if (prev?.type === kind) return null
      if (kind === 'rising') return { data: chart.data.ascendant, type: 'rising' }
      const planet = chart.data.planets.find((p) => p.planet === kind)
      if (!planet) return null
      return { data: planet, type: kind, house: planet.house }
    })
  }

  return (
    <ScreenShell>
      {(firstChart.isLoading || (firstChart.data && chart.isLoading && !chart.data)) && (
        <LoadingState status="изчисляваме картата" />
      )}

      {firstChart.data === null && (
        <EmptyState
          body="Картата ти още не е настроена. Въведи рождените си данни, за да видиш наталната си карта."
          ctaLabel="Въведи рождени данни"
          onPressCta={() => push('/wizard/date')}
        />
      )}

      {chart.isError && firstChart.data && <ErrorState message="Грешка при зареждане на картата." />}

      {/* HERO — the wheel, first, nothing above it. This is the whole
          promise of the tab; everything else is detail a curious user
          drills into. */}
      {chart.data && firstChart.data && (
        <>
          <View style={{ alignItems: 'center' }}>
            <NatalWheelLegend />
            <WheelArrivalContainer wheelSize={wheelSize} triggerKey={firstChart.data.id}>
              <NatalWheel
                chart={chart.data}
                size={wheelSize}
                onPlanetSelect={handlePlanetSelect}
                selectedPlanet={selection && 'planet' in selection.data ? selection.data.planet : null}
              />
            </WheelArrivalContainer>
          </View>

          {/* Quiet supporting summary — below the wheel, not gatekeeping
              it. Same interaction (tap → PlanetDetail sheet) as the wheel
              itself, for consistency. */}
          <View style={{ marginTop: rhythm.group }}>
            <BigThreeCards
              sun={chart.data.planets.find((p) => p.planet === 'sun')!}
              moon={chart.data.planets.find((p) => p.planet === 'moon')!}
              ascendant={chart.data.ascendant}
              birthTimeKnown={firstChart.data.birth_time_known}
              selected={selection?.type ?? null}
              onSelect={handleBigThreeSelect}
            />
          </View>

          {/* Breakdown — collapsed by default (on-interaction, per the
              ratified prose). Independent disclosure rows, not a
              segmented control: a segmented control's pill/track chrome
              visually promises "always exactly one selected," which
              doesn't match "collapsed by default, zero or one open" —
              caught in advisor review before this reached the founder. */}
          <View style={{ marginTop: rhythm.group, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)' }}>
            <DisclosureRow label="Детайли" expanded={openRow === 'details'} onToggle={() => toggleRow('details')}>
              <PlanetsList
                planets={chart.data.planets}
                onSelect={handlePlanetSelect}
                selectedPlanet={selection && 'planet' in selection.data ? selection.data.planet : null}
              />
            </DisclosureRow>
            <DisclosureRow label="Аспекти" expanded={openRow === 'aspects'} onToggle={() => toggleRow('aspects')}>
              <AspectsList aspects={chart.data.aspects} />
            </DisclosureRow>
            <DisclosureRow label="Къщи" expanded={openRow === 'houses'} onToggle={() => toggleRow('houses')}>
              <HousesList houses={chart.data.houses} birthTimeKnown={firstChart.data.birth_time_known} />
            </DisclosureRow>
          </View>
        </>
      )}

      {/* Reference/dictionary — same disclosure convention, deprioritized
          below the wheel rather than v2's persistent top tab competing
          with it for the first half-second. */}
      <View style={{ marginTop: rhythm.tight, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)' }}>
        <DisclosureRow label="Речник" expanded={openRow === 'reference'} onToggle={() => toggleRow('reference')}>
          <AstrologyReference />
        </DisclosureRow>
      </View>

      <PlanetDetail
        visible={selection !== null}
        planet={selection?.data ?? null}
        type={selection?.type ?? null}
        house={selection?.house}
        aspects={
          selection && 'planet' in (selection.data as object) && chart.data
            ? chart.data.aspects.filter(
                (a) =>
                  a.planet1 === (selection.data as PlanetPosition).planet ||
                  a.planet2 === (selection.data as PlanetPosition).planet,
              )
            : []
        }
        birthTimeKnown={firstChart.data?.birth_time_known ?? true}
        onClose={() => setSelection(null)}
      />
    </ScreenShell>
  )
}
