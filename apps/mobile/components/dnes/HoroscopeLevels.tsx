import { memo, useEffect, useState } from 'react'
import {
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

import { color, font } from '@/components/design-system/tokens'
import { AI_GENERATED_DISCLOSURE_BG } from '@/lib/legal/compliance-copy'
import { DNES_COPY } from '@/lib/dnes/copy'
import { DISCLOSURE_BLEED, DNES_MAX_FONT_SCALE, LEVEL_LABEL_HEIGHT, LEVEL_LINE_HEIGHT, LEVEL_TEXT_INSET, type DnesMetrics } from '@/lib/dnes/layout'
import type { HoroscopeParts } from '@/lib/dnes/format'

export type LevelsState = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; parts: HoroscopeParts }

const LEVELS = [
  { key: 'sky', label: DNES_COPY.levelSky, labelColor: color.violetText, bodyColor: color.readSoft, body: font.body },
  { key: 'feel', label: DNES_COPY.levelFeel, labelColor: color.lilac, bodyColor: color.readMid, body: font.body },
  { key: 'advice', label: DNES_COPY.levelAdvice, labelColor: color.roseSoft, bodyColor: color.readLit, body: font.bodyMedium },
] as const

const FADE_H = 34

/** Short vertical thread joining two levels; fades in and out. No bullet, no dot. */
const Connector = memo(function Connector({ height, from, to, id }: { height: number; from: string; to: string; id: string }) {
  return (
    <View style={{ width: 1, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={1} height={height}>
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={from} stopOpacity={0} />
            <Stop offset="50%" stopColor={from} stopOpacity={0.6} />
            <Stop offset="100%" stopColor={to} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={1} height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  )
})

/**
 * The horoscope: heading, three levels, and the AI disclosure. It fills the slot between
 * the horizon line and the Oracle exit. A part is NEVER cut (no ellipsis anywhere): in the
 * normal case all three levels fit and nothing scrolls. If a part is longer than the server
 * should ever allow, or the system font is large, the levels scroll inside the slot with a
 * soft fade at the bottom, and the heading and the disclosure stay put. The slot sits above
 * the Oracle exit, so the exit is never pushed under the nav.
 */
export const HoroscopeLevels = memo(function HoroscopeLevels({ state, m }: { state: LevelsState; m: DnesMetrics }) {
  const reduce = useReducedMotion()
  const arrive = useSharedValue(reduce ? 1 : 0)
  const ready = state.kind === 'ready'
  useEffect(() => {
    // Once, when the reading arrives: opacity only. Reduced motion shows it at once.
    arrive.value = ready ? (reduce ? 1 : withTiming(1, { duration: 420 })) : 0
  }, [ready, reduce, arrive])
  const arriveStyle = useAnimatedStyle(() => ({ opacity: arrive.value }))

  const [viewH, setViewH] = useState(0)
  const [contentH, setContentH] = useState(0)
  const [atEnd, setAtEnd] = useState(false)
  const overflowing = contentH > viewH + 1
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    const end = contentOffset.y + layoutMeasurement.height >= contentSize.height - 2
    setAtEnd((prev) => (prev === end ? prev : end))
  }

  const text = (size: number, lineHeight: number, c: string, family: string = font.body) => ({
    fontFamily: family,
    fontSize: size,
    lineHeight,
    color: c,
    textAlign: 'center' as const,
  })

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
        style={{ marginTop: m.headingMargin, ...text(15, 21, color.text, font.display) }}
      >
        {DNES_COPY.horoscopeHeading}
      </Text>

      <View style={{ flex: 1, alignSelf: 'stretch' }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEnabled={overflowing}
          onLayout={(e: LayoutChangeEvent) => setViewH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, h) => setContentH(h)}
          onScroll={onScroll}
          scrollEventThrottle={64}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: overflowing ? FADE_H : 0 }}
        >
          {state.kind === 'ready' ? (
            <Animated.View style={[{ alignItems: 'center', alignSelf: 'stretch' }, arriveStyle]}>
              {LEVELS.map((lv, i) => (
                <View key={lv.key} style={{ alignItems: 'center', alignSelf: 'stretch' }}>
                  {i === 0 ? (
                    <View style={{ height: m.firstLevelGap }} />
                  ) : (
                    <>
                      <View style={{ height: m.connectorGapBefore }} />
                      <Connector
                        id={`lv-conn-${i}`}
                        height={m.connectorH}
                        from={LEVELS[i - 1]!.labelColor}
                        to={lv.labelColor}
                      />
                      <View style={{ height: m.connectorGapAfter }} />
                    </>
                  )}
                  <Text
                    maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
                    style={text(13, LEVEL_LABEL_HEIGHT, lv.labelColor, font.display)}
                  >
                    {lv.label}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
                    style={{ marginTop: 6, paddingHorizontal: LEVEL_TEXT_INSET, ...text(16, LEVEL_LINE_HEIGHT, lv.bodyColor, lv.body) }}
                  >
                    {state.parts[lv.key]}
                  </Text>
                </View>
              ))}
            </Animated.View>
          ) : (
            <View style={{ marginTop: m.firstLevelGap, minHeight: LEVEL_LINE_HEIGHT * 2, justifyContent: 'center' }}>
              <Text maxFontSizeMultiplier={DNES_MAX_FONT_SCALE} style={text(16, LEVEL_LINE_HEIGHT, color.muted)}>
                {state.kind === 'loading' ? DNES_COPY.loading : DNES_COPY.unavailable}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Soft fade at the bottom while there is more to read; gone once scrolled to the end. */}
        {overflowing && !atEnd && (
          <Svg
            width="100%"
            height={FADE_H}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          >
            <Defs>
              <LinearGradient id="lv-fade" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={color.base} stopOpacity={0} />
                <Stop offset="100%" stopColor={color.base} stopOpacity={0.95} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height={FADE_H} fill="url(#lv-fade)" />
          </Svg>
        )}
      </View>

      {/* EU AI Act Art. 50 disclosure. Quiet but present; never removed, never inside the scroll. */}
      <Text
        maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
        // Wider than the column by DISCLOSURE_BLEED each side so the sentence stays on one line at 360.
        style={{ marginTop: 6, marginHorizontal: -DISCLOSURE_BLEED, ...text(12, 17, color.disclosure), opacity: ready ? 1 : 0 }}
      >
        {AI_GENERATED_DISCLOSURE_BG}
      </Text>
    </View>
  )
})
