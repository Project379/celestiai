import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, ClipPath, Defs, G, RadialGradient, Stop } from 'react-native-svg'

const PULSE_MS = 2400
const AnimatedCircle = Animated.createAnimatedComponent(Circle)
// Bloom halo is 150px around a 92px disk at hero scale — preserved as a
// ratio so smaller instances (e.g. Ритъм's card usage) keep the same
// proportional glow instead of drifting per call site.
const BLOOM_RATIO = 150 / 92

// Two-circle mask technique: a light disk and a dark disk of the same
// radius, the dark one offset horizontally by `dx`, both clipped to the
// moon's circular silhouette so the outline never changes — only the
// terminator curve does. `isWaxing` flips which side the light grows from.
//
// BUG FIX: `dx` used to be set linearly (`2R * illuminationFraction`), on
// the assumption that offsetting two circles by a fraction of their max
// separation reveals that same fraction of area. It doesn't — the
// intersection area of two equal circles is a highly non-linear function
// of their center distance (front-loaded: two circles overlap by nearly
// their full area until the offset gets close to the fully-separated
// 2R). Verified numerically: at 22% illumination the linear version
// rendered ~28% visible light, and the gap widens toward mid-phase (50%
// illumination rendered as ~61% light, 70% as ~81%) — an increasingly
// "too full" moon exactly where a first-quarter/last-quarter reading
// would need a real half-moon. `darkAreaFraction` is the closed-form lens
// (circular segment) area for two equal circles offset by `d`;
// `solveOffsetForIllumination` inverts it via bisection so the RENDERED
// light area, not the offset distance, is linear in illumination — the
// property the UI actually promises ("22% осветена" should show 22%
// visible light). Bisection runs once per illumination/size change inside
// useMemo, not per frame.
function darkAreaFraction(d: number, r: number): number {
  if (d <= 0) return 1
  if (d >= 2 * r) return 0
  const term = 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d)
  return term / (Math.PI * r * r)
}

function solveOffsetForIllumination(fraction: number, r: number): number {
  let lo = 0
  let hi = 2 * r
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const light = 1 - darkAreaFraction(mid, r)
    if (light < fraction) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/**
 * Canonical moon glyph — real curved terminator via the two-circle mask
 * above, not a straight-edged fill bar (a rect clipped to a percentage
 * width inside a circle reads as a battery/progress indicator, not a
 * moon). This is an approximation (a real terminator is an ellipse arc,
 * not a circle arc) but is the standard technique used by most moon-phase
 * icon sets and reads unambiguously as a moon.
 *
 * Single implementation for both Днес's hero (size=92, animated glow) and
 * Ритъм's LunarPhaseCard (smaller, static glow) — was two divergent SVGs
 * (this lens-area/bisection math vs. a plain cosine-ellipse approximation
 * with no illumination-linearity correction) until Round C2 unification.
 */
export function MoonGlyph({
  illumination,
  isWaxing,
  size = 92,
  animated = true,
}: {
  illumination: number
  isWaxing: boolean
  size?: number
  animated?: boolean
}) {
  const bloomSize = Math.round(size * BLOOM_RATIO)
  const glow = useSharedValue(0.5)

  useEffect(() => {
    if (!animated) return
    glow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    return () => cancelAnimation(glow)
  }, [glow, animated])

  const glowProps = useAnimatedProps(() => ({ opacity: animated ? glow.value : 0.5 }))
  const fraction = Math.max(0.03, Math.min(0.97, illumination / 100))
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 1
  const offset = useMemo(() => solveOffsetForIllumination(fraction, r), [fraction, r])
  // Direction, checked against this app's own copy, not assumed: the dark
  // disk is drawn on TOP of the light disk, offset by `dx`, so the
  // uncovered (visibly light) sliver ends up on the side OPPOSITE the dark
  // disk's shift — shifting the dark disk right leaves light on the left,
  // and vice versa. packages/core/src/lib/moon-phase.ts's own
  // `physicalAppearance` text says waxing crescent lights up "от дясната
  // страна" (from the right) and waning crescent "от лявата страна" (from
  // the left). To land the light crescent on the right for waxing, the
  // dark disk must shift LEFT — i.e. `isWaxing` needs a negative dx.
  const dx = (isWaxing ? -1 : 1) * offset

  return (
    <View style={{ width: bloomSize, height: bloomSize, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={bloomSize} height={bloomSize} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="moon-glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgb(226,232,240)" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="rgb(226,232,240)" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <AnimatedCircle
          cx={bloomSize / 2}
          cy={bloomSize / 2}
          r={bloomSize / 2}
          fill="url(#moon-glow)"
          animatedProps={glowProps}
        />
      </Svg>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id="moon-disk-clip">
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#moon-disk-clip)">
          <Circle cx={cx} cy={cy} r={r} fill="rgba(139,92,246,0.06)" />
          <Circle cx={cx} cy={cy} r={r} fill="rgba(226,232,240,0.92)" />
          <Circle cx={cx + dx} cy={cy} r={r} fill="#08060f" />
        </G>
        {/* Hairline gold outline — thin stroke, not a heavy ring */}
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth={1} />
      </Svg>
    </View>
  )
}
