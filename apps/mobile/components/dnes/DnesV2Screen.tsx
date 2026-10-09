import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { View, useWindowDimensions, type LayoutChangeEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@clerk/expo'
import type { ZodiacSign } from '@stellaeum/astrology/client'
import { ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'
import { getLunarPhase } from '@stellaeum/core/moon-phase'
import { getSunSign, greetingFor } from '@stellaeum/core/welcome'

import { EmptyState } from '@/components/design-system/States'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { color, font } from '@/components/design-system/tokens'
import type { GemVariant } from '@/components/crystals/CrystalGem'
import { useCollectDailyCrystal } from '@/hooks/useCollectDailyCrystal'
import { useChart } from '@/hooks/useChart'
import { useCrystalOfTheDay } from '@/hooks/useCrystalOfTheDay'
import { useDailyHoroscope } from '@/hooks/useDailyHoroscope'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { useHoroscopeUpgrade } from '@/hooks/useHoroscopeUpgrade'
import { useMonthlySignText } from '@/hooks/useMonthlySignText'
import { DNES_COPY } from '@/lib/dnes/copy'
import {
  firstNameOf,
  formatDnesDate,
  greetingLine,
  monthNameBg,
  moonHeadline,
  nextMajorLine,
  sofiaYearMonth,
  splitHoroscope,
} from '@/lib/dnes/format'
import {
  dnesMetrics,
  DNES_MAX_FONT_SCALE,
  ORACLE_GAP_ABOVE_NAV,
  ORACLE_MIN_HEIGHT,
  PAGE_PADDING_X,
  TAB_BAR_BASE_HEIGHT,
  topStackHeight,
} from '@/lib/dnes/layout'
import { setClearZones, setClearZonesEnabled } from '@/lib/starClear'
import { ClearText } from './StarClear'
import { HoroscopeLevels, type LevelsState } from './HoroscopeLevels'
import { HorizonLine } from './HorizonLine'
import { OracleExit } from './OracleExit'
import { SummaryPager, type SummaryPageData } from './SummaryPager'

/**
 * Днес v2 (behind EXPO_PUBLIC_FF_DNES_V2). One fixed screen: masthead, a four-page swipe, the
 * horizon line, the horoscope in three levels, and «Питай Оракула» in a slot just above the
 * tab bar. The tab bar is the existing one and is not touched here.
 *
 * Layout: the stack above the horoscope has fixed heights; the horoscope fills the rest, down
 * to a reserved band for the Oracle exit. So the exit can never be pushed under the nav, and
 * text is never cut: if it does not fit, the levels scroll inside their slot.
 *
 * Spec: .planning/design/dnes/01..04-*.html (web mock-ups at 384x832, a visual spec, not
 * ported literally). Vertical budget: lib/dnes/layout.ts.
 */

const REVERSE_SIGN: Record<string, ZodiacSign> = Object.fromEntries(
  (Object.entries(ZODIAC_SIGNS_BG) as [ZodiacSign, string][]).map(([k, v]) => [v, k]),
)

const bg = (sign: string | null | undefined): string | null =>
  sign && sign in ZODIAC_SIGNS_BG ? ZODIAC_SIGNS_BG[sign as ZodiacSign] : null

export function DnesV2Screen() {
  const { push } = useGuardedNavigation()
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  const { width: winW, height: winH } = useWindowDimensions()

  const chartQ = useFirstChart()
  const chart = chartQ.data
  const chartData = useChart(chart?.id).data
  const horoscope = useDailyHoroscope(chart?.id)
  const crystalQ = useCrystalOfTheDay({ collect: false })
  const { upgrading } = useHoroscopeUpgrade(chart?.id, horoscope.data?.content)

  // Frozen for the session, like the old screen (a re-render must not re-roll the greeting).
  const now = useMemo(() => new Date(), [])
  const lunar = useMemo(() => getLunarPhase(now), [now])

  const greeting = useMemo(
    () => greetingLine(greetingFor(now.getHours()), firstNameOf(user?.firstName)),
    [now, user?.firstName],
  )
  const dateText = useMemo(() => formatDnesDate(now), [now])

  // Signs. The Sun sign is known from the birth date alone; Moon and Ascendant need the chart.
  const sunBg = chart?.birth_date ? getSunSign(chart.birth_date) : null
  const sunKey =
    (chartData?.planets.find((p) => p.planet === 'sun')?.sign as ZodiacSign | undefined) ??
    (sunBg ? REVERSE_SIGN[sunBg] : undefined) ??
    null
  const moonKey = (chartData?.planets.find((p) => p.planet === 'moon')?.sign as ZodiacSign | undefined) ?? null
  // Unknown birth time: the Ascendant is not knowable, so its slot stays «—».
  const ascKnown = chartData ? chartData.birthTimeKnown : false
  const ascKey = ascKnown ? ((chartData?.ascendant.sign as ZodiacSign | undefined) ?? null) : null
  // Unknown birth time AND the Moon changes sign during the birth day: label it «Луна · прибл.».
  const moonApprox = chartData?.moonSignUncertain === true && chartData.birthTimeKnown === false

  const monthText = useMonthlySignText(sunKey, sofiaYearMonth(now)).data ?? null
  const { collect, pending } = useCollectDailyCrystal(crystalQ.refetch)
  const goMoon = useCallback(() => push('/moon-detail'), [push])

  const pages = useMemo<SummaryPageData[]>(() => {
    const out: SummaryPageData[] = []
    if (sunKey) {
      out.push({
        kind: 'signs',
        names: { sun: ZODIAC_SIGNS_BG[sunKey], moon: bg(moonKey), asc: bg(ascKey) },
        signs: { sun: sunKey, moon: moonKey, asc: ascKey },
        moonApprox,
      })
    }
    out.push({
      kind: 'moon',
      illumination: lunar.illumination,
      isWaxing: lunar.isWaxing,
      headline: moonHeadline(lunar.isWaxing, lunar.illumination),
      nextLine: nextMajorLine(lunar.nextMajor.name, lunar.nextMajor.daysAway, now),
      onMore: goMoon,
    })
    if (sunKey && monthText) {
      out.push({ kind: 'month', title: `${ZODIAC_SIGNS_BG[sunKey]} · ${monthNameBg(now)}`, sign: sunKey, text: monthText })
    }
    const c = crystalQ.data
    if (c) {
      out.push({
        kind: 'crystal',
        name: c.crystal.name_bg ?? c.crystal.name_en,
        meaning: c.crystal.tagline_bg?.trim() || null,
        variant: c.crystal.svg_variant as GemVariant,
        primary: c.crystal.color_primary,
        secondary: c.crystal.color_secondary,
        accent: c.crystal.color_accent,
        seed: c.crystal.slug,
        collected: c.collectedToday,
        pending,
        onCollect: collect,
      })
    }
    return out
  }, [sunKey, moonKey, ascKey, moonApprox, lunar, now, monthText, crystalQ.data, pending, collect, goMoon])

  // Horoscope in three levels. An old-format row being upgraded shows the loading line.
  const content = horoscope.data?.content
  const levels = useMemo<LevelsState>(() => {
    const split = content ? splitHoroscope(content) : null
    if (upgrading) return { kind: 'loading' }
    if (split) return { kind: 'ready', parts: split.parts }
    if (horoscope.isLoading || (!horoscope.data && !horoscope.isError)) return { kind: 'loading' }
    return { kind: 'error' }
  }, [content, upgrading, horoscope.data, horoscope.isLoading, horoscope.isError])

  // Vertical budget. screenH = usable height below the status bar.
  const screenH = winH - insets.top
  const contentW = winW - PAGE_PADDING_X * 2
  const { metrics: m } = dnesMetrics(screenH, insets.bottom, contentW)
  // The band under the horoscope slot: the Oracle exit and its gap above the nav, plus the nav.
  const navH = TAB_BAR_BASE_HEIGHT + insets.bottom
  // Starfield: keep 14px clear of every word and tappable element (lib/starClear.ts). Zones count
  // only while Днес is on show. The status bar and the tab bar are text too, so they are zones.
  useFocusEffect(
    useCallback(() => {
      setClearZonesEnabled(true)
      return () => setClearZonesEnabled(false)
    }, []),
  )
  useEffect(() => {
    setClearZones('system-bars', [
      // measureInWindow counts from just below the status bar, so the status bar is above y = 0.
      { x: 0, y: -insets.top, w: winW, h: insets.top },
      { x: 0, y: winH - navH, w: winW, h: navH },
    ])
    return () => setClearZones('system-bars', null)
  }, [winW, winH, insets.top, navH])
  const oracleBottom = navH + ORACLE_GAP_ABOVE_NAV
  const reserved = oracleBottom + ORACLE_MIN_HEIGHT
  // Measured height of everything above the horoscope slot (it can differ a little from the
  // budget with font scale or a long name). The slot is given an EXPLICIT height from it, so it
  // always ends above the Oracle exit, whatever the content does.
  const [topH, setTopH] = useState<number | null>(null)
  const topStack = topH ?? topStackHeight(m)
  const slotH = Math.max(0, screenH - topStack - reserved)

  // Dev-only probe: where the horoscope slot ends against the Oracle exit and the nav, read from
  // logcat (DNES_FIT) on the emulators. Logged only when the numbers change.
  const lastProbe = useRef('')
  const onSlotLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!__DEV__) return
      const { y, height } = e.nativeEvent.layout
      const line =
        'DNES_FIT ' +
        JSON.stringify({
          screenH,
          tier: m.tier,
          slotTop: Math.round(y),
          slotBottom: Math.round(y + height),
          oracleTop: screenH - reserved,
          navTop: screenH - navH,
          ok: y + height <= screenH - reserved + 1,
        })
      if (line !== lastProbe.current) {
        lastProbe.current = line
        console.log(line)
      }
    },
    [screenH, m.tier, reserved, navH],
  )

  return (
    <ScreenShell temperature="warm" fixed>
      <View style={{ flex: 1, paddingHorizontal: PAGE_PADDING_X, paddingTop: m.topPad }}>
        <View onLayout={(e: LayoutChangeEvent) => setTopH(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
        {/* Masthead: greeting left, date right, one baseline */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <ClearText
            zoneId="masthead-greeting"
            maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
            style={{ fontFamily: font.bodyMedium, fontSize: 20, lineHeight: 26, color: color.text, flexShrink: 1 }}
          >
            {greeting}
          </ClearText>
          <ClearText
            zoneId="masthead-date"
            maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
            style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted, marginLeft: 8 }}
          >
            {dateText}
          </ClearText>
        </View>

        {chart === null ? (
          <View style={{ marginTop: 40 }}>
            <EmptyState body={DNES_COPY.noChartBody} ctaLabel={DNES_COPY.noChartCta} onPressCta={() => push('/wizard/date')} />
          </View>
        ) : (
          <>
            <View style={{ marginTop: m.mastheadGap }}>
              <SummaryPager pages={pages} m={m} width={contentW} />
            </View>
            <HorizonLine marginTop={m.horizonMargin} />
          </>
        )}
        </View>
        {chart !== null && (
          // The horoscope fills the rest, down to the band reserved for the exit.
          <View style={{ height: slotH }} onLayout={onSlotLayout}>
            <HoroscopeLevels state={levels} m={m} />
          </View>
        )}
      </View>

      {chart !== null && <OracleExit onPress={() => push('/oracle')} bottom={oracleBottom} />}
    </ScreenShell>
  )
}
