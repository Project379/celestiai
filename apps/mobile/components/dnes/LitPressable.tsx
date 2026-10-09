import { memo, useEffect, useState } from 'react'
import { Pressable, View, type LayoutChangeEvent, type TextStyle } from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg'

import { hapticSelect } from '@/lib/haptics'
import { DNES_MAX_FONT_SCALE } from '@/lib/dnes/layout'

/**
 * A text button that LIGHTS UP while pressed: a brighter colour plus a soft halo behind the
 * letters, fading back quickly on release (like «Питай Оракула»). Reduced motion: the change
 * is instant, no fade. R7: two dimensions of difference (colour and glow). The halo is an
 * SVG ellipse, so it looks the same on Android and iOS. On web this becomes a hover style.
 */
// The halo may reach further sideways than up/down: the swipe page clips at its own edge and the
// text sits close to the bottom of the band, so a tall halo would show a hard cut-off.
const SPREAD_X = 16
const SPREAD_Y = 5
const FADE_IN_MS = 90
const FADE_OUT_MS = 220

export const LitPressable = memo(function LitPressable({
  id,
  label,
  accessibilityLabel,
  onPress,
  baseColor,
  litColor,
  haloRgb,
  textStyle,
  disabled = false,
  hitSlop,
  underline = false,
}: {
  id: string
  label: string
  accessibilityLabel: string
  onPress: () => void
  baseColor: string
  litColor: string
  haloRgb: [number, number, number]
  textStyle: TextStyle
  disabled?: boolean
  hitSlop: { top: number; bottom: number; left: number; right: number }
  /** Hairline under the word (the crystal's «Събери»). */
  underline?: boolean
}) {
  const reduce = useReducedMotion()
  const lit = useSharedValue(0)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (disabled) lit.value = 0
  }, [disabled, lit])

  const set = (to: 0 | 1) => {
    if (disabled) return
    lit.value = reduce ? to : withTiming(to, { duration: to === 1 ? FADE_IN_MS : FADE_OUT_MS })
  }

  const haloStyle = useAnimatedStyle(() => ({ opacity: lit.value }))
  const textAnim = useAnimatedStyle(() => ({
    color: interpolateColor(lit.value, [0, 1], [baseColor, litColor]),
  }))
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setBox((b) => (b && b.w === width && b.h === height ? b : { w: width, h: height }))
  }
  const [r, g, b] = haloRgb

  return (
    <Pressable
      accessibilityRole={underline ? 'button' : 'link'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => set(1)}
      onPressOut={() => set(0)}
      onPress={() => {
        hapticSelect()
        onPress()
      }}
    >
      <View onLayout={onLayout}>
        {box && !disabled && (
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', left: -SPREAD_X, top: -SPREAD_Y }, haloStyle]}
          >
            <Svg width={box.w + SPREAD_X * 2} height={box.h + SPREAD_Y * 2}>
              <Defs>
                <RadialGradient id={id} cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={`rgb(${r},${g},${b})`} stopOpacity={0.5} />
                  <Stop offset="60%" stopColor={`rgb(${r},${g},${b})`} stopOpacity={0.16} />
                  <Stop offset="100%" stopColor={`rgb(${r},${g},${b})`} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse
                cx={(box.w + SPREAD_X * 2) / 2}
                cy={(box.h + SPREAD_Y * 2) / 2}
                rx={(box.w + SPREAD_X * 2) / 2}
                ry={(box.h + SPREAD_Y * 2) / 2}
                fill={`url(#${id})`}
              />
            </Svg>
          </Animated.View>
        )}
        <Animated.Text
          maxFontSizeMultiplier={DNES_MAX_FONT_SCALE}
          style={[textStyle, disabled ? { color: baseColor } : textAnim]}
        >
          {label}
        </Animated.Text>
        {underline && !disabled && (
          <View
            pointerEvents="none"
            style={{ height: 1, marginTop: 2, backgroundColor: 'rgba(196,176,252,0.55)', borderRadius: 1 }}
          />
        )}
      </View>
    </Pressable>
  )
})
