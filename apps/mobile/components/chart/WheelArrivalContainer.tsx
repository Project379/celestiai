import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

interface WheelArrivalContainerProps {
  wheelSize: number
  /** Re-fire the arrival on a new key (e.g. chart.id change). */
  triggerKey: string | number
  children: React.ReactNode
}

/**
 * Item 2.7 — wheel arrival animation. Mirrors web ChartView.tsx:210-243's
 * framer-motion "zoom from the stars" sequence.
 *
 * Reanimated 4 worklets drive three coordinated layers:
 *   1. Wheel wrapper — scale 0.08 → 0.45 → 1.02 → 1.0, opacity 0 → 0.55 → 1
 *      over 1.3s with cubic ease [0.22, 0.68, 0.35, 1].
 *   2. Arrival glow flash — amber+violet radial-gradient overlay, opacity
 *      0 → 0.55 → 0 + scale 0.75 → 1.08 → 1.18 over 1.1s, delay 150ms.
 *   3. Persistent halo — softer violet+amber radial-gradient underneath the
 *      wheel, opacity 0 → 0 → 0.4 over 1.6s (fades in last).
 *
 * Halt-trigger 6 ratification: Option C SVG feGaussianBlur on the wheel root
 * was the originally-ratified path. Implementation pivoted to Option A's
 * scale+opacity-only on the wheel itself combined with the SVG radial-gradient
 * overlay layers because the existing NatalWheel SVG is a production-stable
 * 449-LOC tree without a natural filter-wrap point — modifying it to thread
 * an animated stdDeviation through the SVG render path is high-risk relative
 * to the visual gain. The overlay layers preserve the visual register
 * (de-resolution feel via the flash + halo glow) without touching NatalWheel.
 * Acceptable hybrid per the ratified "fall back to A if it manifests during
 * implementation" clause.
 */
export function WheelArrivalContainer({
  wheelSize,
  triggerKey,
  children,
}: WheelArrivalContainerProps) {
  const wheelScale = useSharedValue(0.08)
  const wheelOpacity = useSharedValue(0)
  const flashOpacity = useSharedValue(0)
  const flashScale = useSharedValue(0.75)
  const haloOpacity = useSharedValue(0)

  useEffect(() => {
    const easing = Easing.bezier(0.22, 0.68, 0.35, 1)
    const totalMs = 1300

    // Wheel: scale 0.08 → 0.45 (45%) → 1.02 (85%) → 1.0 (100%)
    wheelScale.value = withSequence(
      withTiming(0.45, { duration: totalMs * 0.45, easing }),
      withTiming(1.02, { duration: totalMs * 0.4, easing }),
      withTiming(1.0,  { duration: totalMs * 0.15, easing }),
    )
    // Wheel opacity: 0 → 0.55 → 1 → 1
    wheelOpacity.value = withSequence(
      withTiming(0.55, { duration: totalMs * 0.45, easing }),
      withTiming(1.0,  { duration: totalMs * 0.55, easing }),
    )

    // Flash: opacity 0 → 0.55 → 0 over 1.1s after 150ms delay
    flashOpacity.value = withDelay(
      150,
      withSequence(
        withTiming(0.55, { duration: 550, easing: Easing.out(Easing.ease) }),
        withTiming(0,    { duration: 550, easing: Easing.out(Easing.ease) }),
      ),
    )
    flashScale.value = withDelay(
      150,
      withSequence(
        withTiming(1.08, { duration: 550, easing: Easing.out(Easing.ease) }),
        withTiming(1.18, { duration: 550, easing: Easing.out(Easing.ease) }),
      ),
    )

    // Halo: opacity stays at 0 for first half then fades to 0.4 over remaining 800ms
    haloOpacity.value = withDelay(
      800,
      withTiming(0.4, { duration: 800, easing: Easing.out(Easing.ease) }),
    )
    // triggerKey intentionally listed to re-run the sequence when chart changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey])

  const wheelStyle = useAnimatedStyle(() => ({
    opacity: wheelOpacity.value,
    transform: [{ scale: wheelScale.value }],
  }))
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
    transform: [{ scale: flashScale.value }],
  }))
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
  }))

  const overlaySize = wheelSize

  return (
    <Animated.View style={[styles.container, wheelStyle]}>
      {/* Persistent halo — underneath the wheel */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, { width: overlaySize, height: overlaySize }, haloStyle]}
      >
        <Svg width={overlaySize} height={overlaySize}>
          <Defs>
            <RadialGradient id="haloGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"  stopColor="rgba(167,139,250,1)" stopOpacity="0.07" />
              <Stop offset="45%" stopColor="rgba(251,191,36,1)"  stopOpacity="0.03" />
              <Stop offset="72%" stopColor="rgba(0,0,0,0)"        stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={overlaySize} height={overlaySize} fill="url(#haloGrad)" />
        </Svg>
      </Animated.View>

      {/* The wheel itself */}
      {children}

      {/* Arrival glow flash — on top of wheel during arrival */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlay, { width: overlaySize, height: overlaySize }, flashStyle]}
      >
        <Svg width={overlaySize} height={overlaySize}>
          <Defs>
            <RadialGradient id="flashGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"  stopColor="rgba(251,191,36,1)"  stopOpacity="0.28" />
              <Stop offset="38%" stopColor="rgba(167,139,250,1)" stopOpacity="0.18" />
              <Stop offset="62%" stopColor="rgba(99,102,241,1)"  stopOpacity="0.06" />
              <Stop offset="80%" stopColor="rgba(0,0,0,0)"        stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={overlaySize} height={overlaySize} fill="url(#flashGrad)" />
        </Svg>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
})
