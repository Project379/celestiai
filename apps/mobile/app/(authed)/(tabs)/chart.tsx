import { useState } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { useUser } from '@clerk/expo'

import { ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'
import type { PlanetPosition, PointData, ZodiacSign } from '@stellaeum/astrology/client'

import { DetailsSheet } from '@/components/chart/DetailsSheet'
import { NatalWheel } from '@/components/chart/NatalWheel'
import { NatalWheelLegend } from '@/components/chart/NatalWheelLegend'
import { Pedestal } from '@/components/chart/Pedestal'
import { PlanetDetail } from '@/components/chart/PlanetDetail'
import { Plaque } from '@/components/chart/Plaque'
import { WheelArrivalContainer } from '@/components/chart/WheelArrivalContainer'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { EmptyState, ErrorState, LoadingState } from '@/components/design-system/States'
import { color, font } from '@/components/design-system/tokens'
import { useChart } from '@/hooks/useChart'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { getDisplayName } from '@/lib/clerk/displayName'

/**
 * Карта — MOBILE-ALPHA-REDESIGN v3, live since Round A cutover (2026-07-22).
 * v2's specific failure (founder's Step 3 correction #1): the wheel was
 * buried under a tab row, a four-chip row, AND three Big Three pills
 * before it ever appeared. This version puts the wheel first — it IS the
 * answer to "what is this screen for," visible without scrolling past
 * chrome.
 *
 * Stage 2 (2026-07-27), Decision (b): rebuilt 1:1 against the ratified
 * mockup. BigThreeCards is gone — the single engraved `Plaque` line
 * replaces it. The former three-way Детайли/Аспекти/Къщи disclosure rows
 * (plus a separate Речник row) collapse into one `Pedestal` invitation
 * («Детайли») opening `DetailsSheet` (Аспекти/Къщи/Речник only — the old
 * "Детайли" flat planet list is dropped as redundant with the wheel's own
 * tap-a-planet path, not silently orphaned).
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

// mockup `.instrument{width:280px}` on a 390px phone-frame = 71.8% of
// frame width. Founder device-pass fix (2026-07-27, dead space): roughly
// 40% of the screen sat empty below Детайли while the wheel read as
// cramped at the top — enlarged the wheel (one of the two options
// offered) rather than centering the column, since a bigger hero also
// directly serves "the wheel IS the answer to what this screen is for."
// First pass (0.718 → 0.8) wasn't enough on its own device pass —
// dead space was still 35-40%. Pushed further, 0.8 → 0.88, cap 560 → 600.
// Flagged explicitly, not treated as settled: a bigger captured texture
// (once view-shot ships) makes any DPR shortfall more visible and this
// crowds the frame edges more — the founder is judging this alongside
// capture sharpness on the next device pass, may revert.
const WHEEL_FRAME_RATIO = 0.88

export default function ChartScreen() {
  const { push } = useGuardedNavigation()
  const { width } = useWindowDimensions()
  const { user } = useUser()
  const displayName = getDisplayName(user, 'Потребител')
  const firstChart = useFirstChart()
  const chart = useChart(firstChart.data?.id)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selection, setSelection] = useState<PlanetSelection | null>(null)

  const wheelSize = Math.min(width * WHEEL_FRAME_RATIO, 600)

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

  const sunPlanet = chart.data?.planets.find((p) => p.planet === 'sun')
  const moonPlanet = chart.data?.planets.find((p) => p.planet === 'moon')

  return (
    <ScreenShell temperature="cool">
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
      {chart.data && firstChart.data && sunPlanet && moonPlanet && (
        <>
          {/* mockup `.karta-label`/`.karta-name` — a real content gap, not
              a style nit: this screen previously rendered no specimen
              label at all above the wheel. Same mono/italic-serif
              treatment as Днес's date/greeting pair (see index.tsx's
              Stage 2 device-pass fix).
              Founder device-pass fix (2026-07-28): matched to Днес's
              section-caption heading size/case (SECTION_CAPTION_STYLE,
              index.tsx) — 9.5 → 12, uppercase. Color stays faint (not
              bronze) — this is a cool-temperature screen; bronze is
              reserved for the invite/pedestal fittings specifically. */}
          <Text style={{ fontFamily: font.mono, fontSize: 12, letterSpacing: 0.29, color: color.faint, textTransform: 'uppercase' }}>
            натална карта
          </Text>
          <Text style={{ fontFamily: font.displayRegular, fontSize: 13.5, color: color.muted, marginTop: 3 }}>
            {displayName}
          </Text>
          <View style={{ alignItems: 'center' }}>
            <NatalWheelLegend />
            {/* Rasterization removed (2026-07-27, item 4): confirmed dead
                on-device — shouldRasterizeIOS/renderToHardwareTextureAndroid
                were both applied (verified via instrumentation) and the
                scroll stutter persisted. Consistent with this app running
                React Native's New Architecture (app.json: newArchEnabled
                true) — these are legacy-architecture view-manager props
                with a documented history of being unsupported/inert under
                Fabric. Removed rather than left as a no-op in the tree;
                see the view-shot investigation for the next candidate
                fix (not yet built). */}
            <WheelArrivalContainer wheelSize={wheelSize} triggerKey={firstChart.data.id}>
              <NatalWheel
                chart={chart.data}
                size={wheelSize}
                onPlanetSelect={handlePlanetSelect}
                selectedPlanet={selection && 'planet' in selection.data ? selection.data.planet : null}
              />
            </WheelArrivalContainer>

            {/* Founder correction (2026-07-27, third pass): dropped
                ScreenShell's `pinnedBottom` entirely — it put this hint
                behind the tab bar with no shared coordination between the
                two, same failure as Днес's invite, plus it left a large
                empty gap under the wheel where this content actually
                belongs. mockup `.karta-foot .hint` is now normal in-flow
                content, directly under the wheel it describes, not
                viewport-pinned. */}
            {/* Founder device-pass fix (2026-07-28, legibility): 11.5 → 15,
                same "italic text bigger everywhere" pass as Днес's
                greeting/subLabel/meteor note. */}
            <Text
              style={{
                fontFamily: 'EBGaramond-Italic',
                fontStyle: 'italic',
                fontSize: 15,
                color: color.faint,
                textAlign: 'center',
                marginTop: 10,
              }}
            >
              Докосни планета за тълкуване
            </Text>

            {/* mockup `.plaque` — Decision (b): replaces BigThreeCards.
                Each row stays tappable (see Plaque.tsx header) so the
                Ascendant's PlanetDetail sheet — previously only reachable
                via BigThreeCards — doesn't become unreachable. Founder
                correction (2026-07-27, second pass): moved above Pedestal
                — reverses the mockup's own DOM order (pedestal before
                plaque there too, karta-v4.html:401-407), a deliberate
                departure, not a fidelity fix.
                Founder device-pass fix (2026-07-27, third pass): signs
                were rendering in Latin ("SCORPIO") — `.sign` is the raw
                English enum key, not display copy. Mapped through
                ZODIAC_SIGNS_BG (@stellaeum/astrology/client), the same
                localized-name source PlanetDetail.tsx already uses, not a
                hand transliteration. */}
            <Plaque
              sunSign={ZODIAC_SIGNS_BG[sunPlanet.sign.toLowerCase() as ZodiacSign] ?? sunPlanet.sign}
              moonSign={ZODIAC_SIGNS_BG[moonPlanet.sign.toLowerCase() as ZodiacSign] ?? moonPlanet.sign}
              risingSign={ZODIAC_SIGNS_BG[chart.data.ascendant.sign.toLowerCase() as ZodiacSign] ?? chart.data.ascendant.sign}
              onSelectSun={() => handleBigThreeSelect('sun')}
              onSelectMoon={() => handleBigThreeSelect('moon')}
              onSelectRising={() => handleBigThreeSelect('rising')}
            />

            {/* Pedestal — the single lit invitation on this screen
                (Decision (b)); opens DetailsSheet (Аспекти/Къщи/Речник). */}
            <Pedestal onPress={() => setDetailsOpen(true)} />
          </View>
        </>
      )}

      {chart.data && firstChart.data && (
        <DetailsSheet
          visible={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          aspects={chart.data.aspects}
          houses={chart.data.houses}
          birthTimeKnown={firstChart.data.birth_time_known}
        />
      )}

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
