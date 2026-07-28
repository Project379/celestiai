import { useEffect } from 'react'
import { Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import Svg, { Circle, Defs, G, Line, RadialGradient, Stop } from 'react-native-svg'

import { AmbientBackground } from './AmbientBackground'
import { color, font } from './tokens'
import { PERF_DEBUG } from '@/lib/perfDebug'

/**
 * Founder correction (this batch): «Повече детайли» was the trigger, but
 * the actual ask was the app's own loading moment — apps/mobile/app/
 * (authed)/_layout.tsx rendered a bare `return null` (a hard blank flash)
 * while Clerk's auth state resolves, after the native splash screen has
 * already handed off. Root layout's own `return null` (app/_layout.tsx,
 * fonts still loading) is a DIFFERENT gap — the native splash is still
 * covering that one and the custom fonts this screen needs aren't loaded
 * yet either, so it's left alone.
 *
 * A slowly-rotating instrument ring (Карта's own cool/bezel/etch-tick
 * language, decorative here — no real chart data exists yet at this
 * point in the app's lifecycle) plus the STELLAEUM wordmark, lit with a
 * violet glow built the same way every other glow in this system is (a
 * real Svg radial-gradient blob behind the text, not textShadow alone —
 * textShadow's blur reads too weak on its own, per CtaPanel.tsx's own
 * documented lesson from the same investigation).
 */
const WHEEL_SIZE = 132
const WHEEL_STAGE = WHEEL_SIZE + 64
const TICK_COUNT = 24
const SPIN_MS = 14000

export function AppLoadingScreen() {
  const rotation = useSharedValue(0)

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1, false)
  }, [rotation])

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => i)

  return (
    <View style={{ flex: 1, backgroundColor: color.base, alignItems: 'center', justifyContent: 'center' }}>
      {PERF_DEBUG.ambientStarfield && <AmbientBackground />}

      <View style={{ width: WHEEL_STAGE, height: WHEEL_STAGE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={WHEEL_STAGE} height={WHEEL_STAGE} style={{ position: 'absolute' }} pointerEvents="none">
          <Defs>
            <RadialGradient id="loading-wheel-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color.violet} stopOpacity={0.22} />
              <Stop offset="60%" stopColor={color.violet} stopOpacity={0.06} />
              <Stop offset="100%" stopColor={color.violet} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={WHEEL_STAGE / 2} cy={WHEEL_STAGE / 2} r={WHEEL_STAGE / 2} fill="url(#loading-wheel-glow)" />
        </Svg>

        <Animated.View style={wheelStyle}>
          <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
            <Circle
              cx={WHEEL_SIZE / 2}
              cy={WHEEL_SIZE / 2}
              r={WHEEL_SIZE / 2 - 2}
              stroke="rgba(150,180,220,0.32)"
              strokeWidth={1}
              fill="none"
            />
            <Circle
              cx={WHEEL_SIZE / 2}
              cy={WHEEL_SIZE / 2}
              r={WHEEL_SIZE / 2 - 16}
              stroke="rgba(150,180,220,0.18)"
              strokeWidth={1}
              fill="none"
            />
            <G>
              {ticks.map((i) => {
                const angle = (i / TICK_COUNT) * 2 * Math.PI
                const major = i % 6 === 0
                const rOuter = WHEEL_SIZE / 2 - 2
                const rInner = major ? rOuter - 11 : rOuter - 6
                const cx = WHEEL_SIZE / 2
                const cy = WHEEL_SIZE / 2
                return (
                  <Line
                    key={i}
                    x1={cx + rOuter * Math.cos(angle)}
                    y1={cy + rOuter * Math.sin(angle)}
                    x2={cx + rInner * Math.cos(angle)}
                    y2={cy + rInner * Math.sin(angle)}
                    stroke={major ? 'rgba(203,222,245,0.55)' : 'rgba(150,180,220,0.26)'}
                    strokeWidth={major ? 1.2 : 1}
                  />
                )
              })}
            </G>
            <Circle cx={WHEEL_SIZE / 2} cy={WHEEL_SIZE / 2} r={2.5} fill={color.cool} opacity={0.85} />
          </Svg>
        </Animated.View>
      </View>

      <View style={{ marginTop: 30, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={240} height={80} style={{ position: 'absolute' }} pointerEvents="none">
          <Defs>
            <RadialGradient id="loading-wordmark-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color.violet} stopOpacity={0.45} />
              <Stop offset="100%" stopColor={color.violet} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={120} cy={40} r={80} fill="url(#loading-wordmark-glow)" />
        </Svg>
        <Text
          style={{
            fontFamily: font.displaySemibold,
            fontSize: 22,
            letterSpacing: 6,
            color: color.starlight,
            textShadowColor: 'rgba(139,92,246,0.85)',
            textShadowRadius: 16,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          STELLAEUM
        </Text>
      </View>
    </View>
  )
}
