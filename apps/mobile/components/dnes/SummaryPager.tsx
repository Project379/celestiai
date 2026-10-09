import { memo, useCallback, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import type { ZodiacSign } from '@stellaeum/astrology/client'

import { MoonGlyph } from '@/components/dashboard/MoonGlyph'
import { CrystalGem, type GemVariant } from '@/components/crystals/CrystalGem'
import { color, font } from '@/components/design-system/tokens'
import { DNES_COPY } from '@/lib/dnes/copy'
import { DNES_MAX_FONT_SCALE, type DnesMetrics } from '@/lib/dnes/layout'
import { hapticSelect } from '@/lib/haptics'
import { LitPressable } from './LitPressable'
import { SignGlyph } from './SignGlyph'

export interface SignsPage {
  kind: 'signs'
  names: { sun: string; moon: string | null; asc: string | null }
  signs: { sun: ZodiacSign; moon: ZodiacSign | null; asc: ZodiacSign | null }
  /** Birth time unknown and the Moon changes sign that day: label it «Луна · прибл.». */
  moonApprox: boolean
}
export interface MoonPage {
  kind: 'moon'
  illumination: number
  isWaxing: boolean
  headline: string
  nextLine: string
  onMore: () => void
}
export interface MonthPage {
  kind: 'month'
  title: string
  sign: ZodiacSign
  text: string
}
export interface CrystalPage {
  kind: 'crystal'
  name: string
  /** Short meaning (tagline_bg). null = show the name alone; never a cut-off line. */
  meaning: string | null
  variant: GemVariant
  primary: string
  secondary: string
  accent: string | null
  seed: string
  collected: boolean
  pending: boolean
  onCollect: () => void
}
export type SummaryPageData = SignsPage | MoonPage | MonthPage | CrystalPage

const PAGE_LABEL: Record<SummaryPageData['kind'], string> = {
  signs: DNES_COPY.pageSigns,
  moon: DNES_COPY.pageMoon,
  month: DNES_COPY.pageMonth,
  crystal: DNES_COPY.pageCrystal,
}

const Title = ({ children }: { children: ReactNode }) => (
  <Text
    maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
    style={{ fontFamily: font.display, fontSize: 14, lineHeight: 20, color: color.text, textAlign: 'center' }}
  >
    {children}
  </Text>
)

/** Scale factor for the shrunk swipe bands (see lib/dnes/layout.ts tiers). */
const kOf = (m: DnesMetrics) => (m.swipeH >= 156 ? 1 : m.swipeH >= 136 ? 0.84 : 0.76)

const SignsView = memo(function SignsView({ p, m }: { p: SignsPage; m: DnesMetrics }) {
  const k = kOf(m)
  const small = Math.round(44 * k)
  const big = Math.round(72 * k)
  const col = (
    sign: ZodiacSign | null,
    name: string | null,
    label: string,
    strong: boolean,
    id: string,
  ) => (
    <View style={{ flex: strong ? 1.3 : 1, alignItems: 'center' }}>
      {sign ? (
        <SignGlyph sign={sign} halo={strong ? big : small} glyph={Math.round((strong ? 38 : 23) * k)} strong={strong} idSuffix={id} />
      ) : (
        <View style={{ width: small, height: small }} />
      )}
      <Text
        maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
        numberOfLines={1}
        // Shrinks the type a little if a long name would not fit; never an ellipsis.
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{
          marginTop: 4,
          fontFamily: strong ? font.display : font.bodyMedium,
          fontSize: strong ? 20 : 15,
          lineHeight: strong ? 26 : 20,
          color: sign ? (strong ? color.starlight : color.text) : color.faint,
        }}
      >
        {name ?? DNES_COPY.signUnknown}
      </Text>
      <Text
        maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.85}
        style={{ fontFamily: font.body, fontSize: 12, lineHeight: 16, color: strong ? color.glyphLilac : color.muted }}
      >
        {label}
      </Text>
    </View>
  )
  return (
    <>
      <Title>{DNES_COPY.pageSigns}</Title>
      <View style={{ alignSelf: 'stretch', marginTop: Math.round(12 * k), flexDirection: 'row', alignItems: 'flex-end' }}>
        {col(p.signs.moon, p.names.moon, p.moonApprox ? DNES_COPY.moonColumnApprox : DNES_COPY.moonColumn, false, 'moon')}
        {col(p.signs.sun, p.names.sun, DNES_COPY.sunColumn, true, 'sun')}
        {col(p.signs.asc, p.names.asc, DNES_COPY.ascendantColumn, false, 'asc')}
      </View>
    </>
  )
})

const MoonView = memo(function MoonView({ p, m, active }: { p: MoonPage; m: DnesMetrics; active: boolean }) {
  const k = kOf(m)
  return (
    <>
      <Title>{DNES_COPY.pageMoon}</Title>
      {/* MoonGlyph paints a halo larger than `size`; a fixed-height box keeps that overflow
          out of the layout so the page height stays what the budget says. Its breathing
          animation only runs while this page is the one on screen. */}
      <View style={{ marginTop: Math.round(8 * k), height: Math.round(72 * k), alignItems: 'center', justifyContent: 'center' }}>
        <MoonGlyph
          illumination={p.illumination}
          isWaxing={p.isWaxing}
          size={Math.round(72 * k)}
          haloRatio={1.25}
          animated={active}
        />
      </View>
      <Text
        maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
        style={{ marginTop: Math.round(8 * k), fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: color.text }}
      >
        {p.headline}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
          style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}
        >
          {p.nextLine} ·{' '}
        </Text>
        <LitPressable
          id="lit-more"
          label={DNES_COPY.moreLink}
          accessibilityLabel={DNES_COPY.moreLink}
          onPress={p.onMore}
          baseColor={color.muted}
          litColor={color.starlight}
          haloRgb={[203, 210, 222]}
          hitSlop={{ top: 13, bottom: 13, left: 16, right: 16 }}
          textStyle={{ fontFamily: font.body, fontSize: 13, lineHeight: 18 }}
          underline
        />
      </View>
    </>
  )
})

const MonthView = memo(function MonthView({ p, m }: { p: MonthPage; m: DnesMetrics }) {
  const k = kOf(m)
  return (
    <>
      <Title>{p.title}</Title>
      <View style={{ marginTop: Math.round(6 * k) }}>
        <SignGlyph sign={p.sign} halo={Math.round(56 * k)} glyph={Math.round(30 * k)} strong idSuffix="month" />
      </View>
      {/* Two lines at most by the server's fit check, so it is never cut. */}
      <Text
        maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
        style={{
          marginTop: Math.round(6 * k),
          fontFamily: font.body,
          fontSize: 15,
          lineHeight: 22,
          color: color.readSoft,
          textAlign: 'center',
        }}
      >
        {p.text}
      </Text>
    </>
  )
})

const CrystalView = memo(function CrystalView({ p, m }: { p: CrystalPage; m: DnesMetrics }) {
  const k = kOf(m)
  const [fitsOneLine, setFitsOneLine] = useState(true)
  const showMeaning = !!p.meaning && fitsOneLine
  const gem = Math.round(62 * k)
  return (
    <>
      <Title>{DNES_COPY.pageCrystal}</Title>
      <View style={{ marginTop: Math.round(8 * k), height: gem, justifyContent: 'center' }}>
        <CrystalGem
          variant={p.variant}
          primary={p.primary}
          secondary={p.secondary}
          accent={p.accent}
          size={gem}
          seed={p.seed}
        />
      </View>
      <Text
        maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
        onTextLayout={(e) => {
          // The meaning is shown whole or not at all: if it would wrap, drop it.
          if (p.meaning && e.nativeEvent.lines.length > 1) setFitsOneLine(false)
        }}
        style={{ marginTop: Math.round(6 * k), fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: color.text, textAlign: 'center' }}
      >
        {p.name}
        {showMeaning ? <Text style={{ fontFamily: font.body, color: color.muted }}> · {p.meaning}</Text> : null}
      </Text>
      <View style={{ marginTop: 4, paddingHorizontal: 18 }}>
        <LitPressable
          id="lit-collect"
          label={p.collected ? DNES_COPY.collected : DNES_COPY.collect}
          accessibilityLabel={p.collected ? DNES_COPY.collected : DNES_COPY.collect}
          onPress={p.onCollect}
          disabled={p.collected || p.pending}
          baseColor={p.collected ? color.faint : color.glyphLilac}
          litColor={color.glyphLilacHi}
          haloRgb={[167, 139, 250]}
          hitSlop={{ top: 12, bottom: 12, left: 20, right: 20 }}
          textStyle={{ fontFamily: font.display, fontSize: 15, lineHeight: 20, textAlign: 'center' }}
          underline={!p.collected}
        />
      </View>
    </>
  )
})

const Dot = memo(function Dot({ active }: { active: boolean }) {
  return (
    <View style={{ width: 19, height: 19, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Svg width={19} height={19} style={{ position: 'absolute' }} pointerEvents="none">
          <Defs>
            <RadialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="rgb(224,168,111)" stopOpacity={0.6} />
              <Stop offset="100%" stopColor="rgb(224,168,111)" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={9.5} cy={9.5} r={9.5} fill="url(#dot-glow)" />
        </Svg>
      )}
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: active ? color.bronzeText : 'rgba(148,163,184,0.35)',
        }}
      />
    </View>
  )
})

/**
 * Four-page swipe, fixed height so the screen never jumps. A page with nothing to show (no
 * monthly text yet, no crystal) is left out, and the dots follow. For speed only the page on
 * screen and its two neighbours are rendered; the rest are empty boxes of the same size.
 */
export const SummaryPager = memo(function SummaryPager({
  pages,
  m,
  width,
}: {
  pages: SummaryPageData[]
  m: DnesMetrics
  width: number
}) {
  const scroller = useRef<ScrollView>(null)
  const [index, setIndex] = useState(0)

  const onEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return
      const next = Math.max(0, Math.min(pages.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)))
      setIndex((prev) => (prev === next ? prev : next))
    },
    [pages.length, width],
  )

  const goTo = (i: number) => {
    hapticSelect()
    scroller.current?.scrollTo({ x: i * width, animated: true })
    setIndex(i)
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ height: m.swipeH, width }}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onEnd}
          style={{ height: m.swipeH }}
          contentContainerStyle={{ height: m.swipeH }}
        >
          {pages.map((p, i) => (
            <View
              key={p.kind}
              style={{ width, height: m.swipeH, alignItems: 'center', justifyContent: 'center' }}
              accessibilityLabel={PAGE_LABEL[p.kind]}
            >
              {Math.abs(i - index) <= 1 && (
                <>
                  {p.kind === 'signs' && <SignsView p={p} m={m} />}
                  {p.kind === 'moon' && <MoonView p={p} m={m} active={i === index} />}
                  {p.kind === 'month' && <MonthView p={p} m={m} />}
                  {p.kind === 'crystal' && <CrystalView p={p} m={m} />}
                </>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
      <View style={{ marginTop: 2, flexDirection: 'row', gap: 3 }}>
        {pages.map((p, i) => (
          <Pressable
            key={p.kind}
            accessibilityRole="button"
            accessibilityLabel={PAGE_LABEL[p.kind]}
            accessibilityState={{ selected: i === index }}
            hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
            onPress={() => goTo(i)}
          >
            <Dot active={i === index} />
          </Pressable>
        ))}
      </View>
    </View>
  )
})
