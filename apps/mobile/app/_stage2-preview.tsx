import type { ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import type { ChartData } from '@stellaeum/astrology/client'
import { composeWelcome } from '@stellaeum/core/welcome'
import type { LunarPhase } from '@stellaeum/core/moon-phase'

import { ReadingParagraphs } from '@/app/(authed)/(tabs)/index'
import { MoonHero } from '@/components/dashboard/MoonHero'
import { NatalWheel } from '@/components/chart/NatalWheel'
import { NatalWheelLegend } from '@/components/chart/NatalWheelLegend'
import { Pedestal } from '@/components/chart/Pedestal'
import { Plaque } from '@/components/chart/Plaque'
import { AmbientBackground } from '@/components/design-system/AmbientBackground'
import { CtaPanel } from '@/components/design-system/CtaPanel'
import { NavIcon } from '@/components/design-system/NavIcon'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { color, font } from '@/components/design-system/tokens'
import { CircleTabIcon, PersonTabIcon, PulseTabIcon, SunTabIcon, WheelTabIcon } from '@/components/design-system/TabIcons'

// Real navbar reproduction for this preview only — the actual navbar lives
// in app/(authed)/(tabs)/_layout.tsx (expo-router Tabs, needs full router
// context this isolated harness doesn't have), so it doesn't render here
// by default. Reuses the SAME icon/NavIcon components the real tab bar
// uses, styled per mockup `.navbar`/`.nav-row` (soft fade + violet
// horizon hairline, not a filled bar), so the comparison isn't missing a
// whole piece of chrome. Not a claim that _layout.tsx itself was changed.
function PreviewNavbar({ active }: { active: 'Днес' | 'Карта' | 'Кръг' | 'Ритъм' | 'Ти' }) {
  const items: { key: typeof active; icon: (c: string) => ReactNode }[] = [
    { key: 'Днес', icon: (c) => <SunTabIcon color={c} size={20} /> },
    { key: 'Карта', icon: (c) => <WheelTabIcon color={c} size={20} /> },
    { key: 'Кръг', icon: (c) => <CircleTabIcon color={c} size={20} /> },
    { key: 'Ритъм', icon: (c) => <PulseTabIcon color={c} size={20} /> },
    { key: 'Ти', icon: (c) => <PersonTabIcon color={c} size={20} /> },
  ]
  return (
    <View style={{ height: 72 }}>
      <Svg width="100%" height={72} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="nav-fade" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#08060f" stopOpacity={0} />
            <Stop offset="100%" stopColor="#08060f" stopOpacity={0.6} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#nav-fade)" />
      </Svg>
      <View style={{ position: 'absolute', left: 16, right: 16, top: 0, height: 1, backgroundColor: 'rgba(139,92,246,0.4)' }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: '100%', paddingBottom: 16 }}>
        {items.map((item) => {
          const focused = item.key === active
          const c = focused ? color.starlight : color.faint
          return (
            <View key={item.key} style={{ alignItems: 'center', gap: 5 }}>
              <NavIcon focused={focused}>{item.icon(c)}</NavIcon>
              <Text style={{ fontFamily: font.mono, fontSize: 7.5, letterSpacing: 0.4, color: c, opacity: focused ? 1 : 0.75 }}>
                {item.key.toUpperCase()}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

/**
 * TEMPORARY, uncommitted dev-only route — Stage 2 verification harness.
 * Renders the real Днес/Карта components with static mock data, bypassing
 * Clerk auth and the live API (both unreachable in this environment), so
 * the actual rendered output can be screenshotted at 390px instead of
 * reported from source inspection alone. Not part of the app's real
 * navigation graph — outside (authed)/(public), not linked from any tab.
 * Delete before merge; this file exists only to produce the verification
 * screenshots for the Stage 2 deliverable table.
 */

const MOCK_CHART: ChartData = {
  planets: [
    { planet: 'sun', longitude: 228.4, latitude: 0, speed: 1, sign: 'scorpio', signDegree: 18.4, house: 4 },
    { planet: 'moon', longitude: 340.1, latitude: 0, speed: 13, sign: 'pisces', signDegree: 10.1, house: 8 },
    { planet: 'mercury', longitude: 210.2, latitude: 0, speed: 1.2, sign: 'scorpio', signDegree: 0.2, house: 4 },
    { planet: 'venus', longitude: 255.7, latitude: 0, speed: 1.1, sign: 'sagittarius', signDegree: 15.7, house: 5 },
    { planet: 'mars', longitude: 12.3, latitude: 0, speed: 0.6, sign: 'aries', signDegree: 12.3, house: 9 },
    { planet: 'jupiter', longitude: 95.6, latitude: 0, speed: 0.2, sign: 'cancer', signDegree: 5.6, house: 12 },
    { planet: 'saturn', longitude: 145.9, latitude: 0, speed: -0.1, sign: 'leo', signDegree: 25.9, house: 1 },
    { planet: 'uranus', longitude: 30.5, latitude: 0, speed: 0.05, sign: 'taurus', signDegree: 0.5, house: 10 },
    { planet: 'neptune', longitude: 355.2, latitude: 0, speed: 0.02, sign: 'pisces', signDegree: 25.2, house: 8 },
    { planet: 'pluto', longitude: 280.8, latitude: 0, speed: -0.01, sign: 'capricorn', signDegree: 10.8, house: 6 },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    cuspLongitude: (i * 30 + 45) % 360,
    sign: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'][i],
    signDegree: 15,
  })),
  aspects: [
    { planet1: 'sun', planet2: 'moon', aspect: 'square', angle: 90, orb: 2.1, applying: true },
    { planet1: 'venus', planet2: 'mars', aspect: 'trine', angle: 120, orb: 1.4, applying: false },
  ],
  ascendant: { longitude: 195.5, sign: 'libra', degree: 15.5 },
  mc: { longitude: 95.2, sign: 'cancer', degree: 5.2 },
  birthTimeKnown: true,
}

// Founder correction (2026-07-27): the reading block was entirely missing
// from this preview — item 1 was checked visually against a screen that
// had no content between the sub-line and the invite, so collision safety
// was never actually tested. Fixed by calling the REAL composeWelcome()
// (packages/core/src/welcome/compose.ts) with the worst real case its own
// tables contain, through the REAL ReadingParagraphs component (exported
// from index.tsx for this purpose) — not invented prose. Longest opener
// (waning_gibbous) + a real water-element tail + a real active meteor
// note, all verbatim strings already shipped in compose.ts/meteor-
// showers.ts.
const WORST_CASE_LUNAR_PHASE = {
  id: 'waning_gibbous',
  name: 'Намаляваща луна',
  illumination: 87,
  isWaxing: false,
} as unknown as LunarPhase

const worstCaseWelcome = composeWelcome({
  firstName: 'Николай',
  sunSign: 'Скорпион',
  lunarPhase: WORST_CASE_LUNAR_PHASE,
  meteorShower: {
    id: 'perseids',
    name: 'Персеиди',
    latin: 'Perseids',
    peakMonth: 8,
    peakDay: 12,
    startMonth: 7,
    startDay: 17,
    endMonth: 8,
    endDay: 24,
    zhr: 100,
    parentBody: '109P/Swift-Tuttle',
    radiant: 'Персей',
    description: '',
  },
  hour: 21,
})

export default function Stage2Preview() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#08060f' }}>
      <Text style={{ color: '#fff', padding: 12, fontSize: 12 }}>ДНЕС</Text>
      {/* 780 total, split 708/72 — the real app's Tabs navigator reserves
          its own 72px-tall strip below the screen content (non-
          overlapping); ScreenShell's pinnedBottom sits just above THAT
          boundary, not underneath the navbar itself. A flat 780 height
          with the navbar absolutely overlaid on top (the first version of
          this preview) collided the invite with the tab icons — a preview
          harness bug, not a real one, but worth fixing so the comparison
          is honest. */}
      <View style={{ height: 780, backgroundColor: '#08060f', overflow: 'hidden' }}>
        <View style={{ height: 708, position: 'relative' }}>
          {/* AmbientBackground is normally mounted once at the tab-root
              layout (app/(authed)/(tabs)/_layout.tsx), outside ScreenShell
              — this preview bypasses that layout entirely, so it's
              mounted here per-section instead, to render what the real
              app actually shows (starfield + ScreenShell's temperature
              wash together). */}
          <AmbientBackground />
          {/* ScreenShell.pinnedBottom reinstated 2026-07-27 (third pass) —
              CtaPanel is pinned again, kept in sync manually — same
              caveat as the rest of this preview. */}
          <ScreenShell temperature="warm" pinnedBottom={<CtaPanel label="Питай Оракула" onPress={() => {}} />}>
            {/* Reproduces index.tsx's actual latest device-pass fix (mono
                date label +24 top clearance, italic greeting, both ~8%
                bigger) — kept in sync manually since this preview doesn't
                import the real route (that route needs Clerk/API context
                this harness doesn't have). */}
            <Text style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: 0.29, color: color.faint, marginTop: 24 }}>
              четвъртък, 25 юли
            </Text>
            <Text style={{ fontFamily: font.bodyItalic, fontStyle: 'italic', fontSize: 14, color: color.muted, marginTop: 3 }}>
              Добър вечер, Николай.
            </Text>
            <MoonHero
              illumination={62}
              isWaxing
              phaseName="Растяща луна"
              subLabel="62% осветена от Слънцето, скрито под хоризонта"
            />
            <View style={{ marginTop: 40 }}>
              <ReadingParagraphs text={worstCaseWelcome.summary} />
            </View>
          </ScreenShell>
        </View>
        <PreviewNavbar active="Днес" />
      </View>

      <Text style={{ color: '#fff', padding: 12, fontSize: 12 }}>КАРТА</Text>
      <View style={{ height: 780, backgroundColor: '#08060f', overflow: 'hidden' }}>
        <View style={{ height: 708, position: 'relative' }}>
          <AmbientBackground />
          <ScreenShell temperature="cool">
            {/* Reproduces chart.tsx's karta-label/karta-name — same
                manual-sync note as Днес above. */}
            <Text style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: 0.29, color: color.faint }}>
              натална карта
            </Text>
            <Text style={{ fontFamily: font.displayRegular, fontSize: 13.5, color: color.muted, marginTop: 3 }}>
              Николай Тонев
            </Text>
            <View style={{ alignItems: 'center' }}>
              <NatalWheelLegend />
              <NatalWheel chart={MOCK_CHART} size={280} onPlanetSelect={() => {}} selectedPlanet={null} />
              {/* Order reversed 2026-07-27: tap hint (in-flow now, was
                  pinned), then Plaque, then Pedestal — matches chart.tsx. */}
              <Text style={{ fontFamily: 'EBGaramond-Italic', fontStyle: 'italic', fontSize: 11.5, color: color.faint, textAlign: 'center', marginTop: 10 }}>
                докосни планета за тълкуване
              </Text>
              <Plaque
                sunSign="Скорпион"
                moonSign="Риби"
                risingSign="Везни"
                onSelectSun={() => {}}
                onSelectMoon={() => {}}
                onSelectRising={() => {}}
              />
              <Pedestal onPress={() => {}} />
            </View>
          </ScreenShell>
        </View>
        <PreviewNavbar active="Карта" />
      </View>
    </ScrollView>
  )
}
