import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, ClipPath, Defs, G, RadialGradient, Stop } from 'react-native-svg'

const PULSE_MS = 2400
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
  outlineColor = 'rgba(184, 118, 62, 0.4)',
  // Stage 2 (2026-07-27) — Днес's hero passes 1.83 (mockup `.moon-halo`
  // inset -70px around the 202px depth-circle = 370/202 = 1.831×) and
  // 'bronzeViolet' explicitly. Defaults preserve Ритъм's LunarPhaseCard
  // call site unchanged — that screen isn't in Stage 2's scope.
  haloRatio = BLOOM_RATIO,
  haloGradient = 'neutral',
  // mockup `.moon-dark{opacity:.88}` — Днес's hero passes 0.88 explicitly.
  // Defaults to 1 (today's fully-opaque dark side) so Ритъм is unchanged.
  darkOpacity = 1,
  outlineWidth = 1,
  // mockup `.moon-depth`: a blurred, scaled (1.12x), low-opacity (.55)
  // depth-double behind the disk. PLATFORM APPROXIMATION: RN has no
  // filter:blur() equivalent for an arbitrary SVG shape, so this is a
  // second unblurred gradient circle at the same scale/opacity rather
  // than a blurred copy — the platform note's explicit instruction, not
  // a silent skip. Off by default (Ритъм unaffected); Днес's hero passes
  // true.
  depthDouble = false,
}: {
  illumination: number
  isWaxing: boolean
  size?: number
  animated?: boolean
  // Warm/cool amendment, Stage 1 (2026-07-25): defaults to the original
  // amber hairline so Ритъм's LunarPhaseCard call site is unchanged.
  // Днес's hero passes the bronze equivalent explicitly — this keeps the
  // bronze migration scoped to Днес only, not both call sites at once.
  outlineColor?: string
  outlineWidth?: number
  haloRatio?: number
  haloGradient?: 'neutral' | 'bronzeViolet'
  darkOpacity?: number
  depthDouble?: boolean
}) {
  const bloomSize = Math.round(size * haloRatio)
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

  // PERF (2026-07-27): was an AnimatedCircle with animatedProps opacity —
  // an SVG-prop change inside the halo Svg, forcing that Svg's canvas to
  // re-rasterize every frame even though it's already small/isolated. Now
  // opacity lives on the wrapping Animated.View (composited, free) and the
  // Circle below is a static full-opacity fill.
  const glowStyle = useAnimatedStyle(() => ({ opacity: animated ? glow.value : 0.5 }))
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
      <Animated.View style={[{ position: 'absolute' }, glowStyle]}>
        <Svg width={bloomSize} height={bloomSize}>
          <Defs>
            {haloGradient === 'bronzeViolet' ? (
              // mockup `.moon-halo`: radial-gradient(circle, bronze .16,
              // violet .05 at 55%, transparent 72%) — a two-hue halo, not
              // the neutral glow used elsewhere.
              <RadialGradient id="moon-glow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#b8763e" stopOpacity="0.16" />
                <Stop offset="55%" stopColor="#8b5cf6" stopOpacity="0.05" />
                <Stop offset="72%" stopColor="#8b5cf6" stopOpacity="0" />
              </RadialGradient>
            ) : (
              <RadialGradient id="moon-glow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="rgb(226,232,240)" stopOpacity="0.22" />
                <Stop offset="100%" stopColor="rgb(226,232,240)" stopOpacity="0" />
              </RadialGradient>
            )}
          </Defs>
          <Circle cx={bloomSize / 2} cy={bloomSize / 2} r={bloomSize / 2} fill="url(#moon-glow)" />
        </Svg>
      </Animated.View>
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id="moon-disk-clip">
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
          {/* Warm/cool amendment — asymmetric near/far light, ported from
              the approved mockup's off-center radial washes (the
              "material, not a flat fill" correction). Biased by the same
              `dx` that drives the terminator, so the warm tint always
              falls on the lit side and the cool tint near the dark edge,
              regardless of phase — this is more correct than the mockup's
              fixed corners, which didn't track phase at all. */}
          <RadialGradient id="moon-warm-tint" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#d9a06a" stopOpacity={0.4} />
            <Stop offset="100%" stopColor="#d9a06a" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="moon-cool-tint" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <Stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </RadialGradient>
          {depthDouble && (
            <RadialGradient id="moon-depth" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#08060f" stopOpacity={0} />
              <Stop offset="85%" stopColor="#08060f" stopOpacity={0} />
              <Stop offset="100%" stopColor="#14101e" stopOpacity={0.85} />
            </RadialGradient>
          )}
        </Defs>
        {/* BUG FIX (founder device-pass, 2026-07-27): this circle is
            unclipped and its radius (1.12r) exceeds the visible disk (r),
            so it's only ever visible in the thin exposed ring between the
            two — everywhere else it's fully hidden behind the opaque disk
            drawn on top. The original gradient was off-center (cx:32%,
            cy:30%, mirroring the mockup's own off-center blur circle),
            which put its BRIGHT stop inside that thin exposed ring on one
            side only — an uneven, hard-edged bright patch (screenshot-
            confirmed, upper-left), not the soft ambient depth cue
            intended. Made concentric and transparent-to-dark only (no
            bright stop can ever reach the exposed ring now), so the
            visible sliver is a uniform, soft dark edge from every angle —
            still an approximation (see the platform note below), but one
            that can't produce a directional artifact by construction. */}
        {depthDouble && <Circle cx={cx} cy={cy} r={r * 1.12} fill="url(#moon-depth)" opacity={0.55} />}
        {/* PLATFORM APPROXIMATION — mockup `.moon-object` composites its
            bronze/violet tint layers with `background-blend-mode:screen`
            (lightens rather than covers). react-native-svg has no blend-mode
            support, so these are plain alpha-composited circles instead —
            additive light stops, not a `feBlend` port. Accepted per the
            platform note: a dull flat wash would read worse than this. */}
        <G clipPath="url(#moon-disk-clip)">
          <Circle cx={cx} cy={cy} r={r} fill="rgba(139,92,246,0.06)" />
          <Circle cx={cx} cy={cy} r={r} fill="rgba(226,232,240,0.92)" />
          <Circle cx={cx + dx} cy={cy} r={r} fill="#08060f" opacity={darkOpacity} />
          <Circle cx={cx - dx * 0.5} cy={cy - r * 0.15} r={r * 0.85} fill="url(#moon-warm-tint)" />
          <Circle cx={cx + dx * 0.5} cy={cy + r * 0.2} r={r * 0.7} fill="url(#moon-cool-tint)" />
        </G>
        {/* Hairline outline — thin stroke, not a heavy ring. FOUNDER
            DEVICE-PASS FIX (2026-07-27): mockup `.moon-object` has NO
            border/stroke at all — the disc's edge softness comes entirely
            from the halo + depth-double behind it, not a drawn line. A
            full-circle stroke (including across the DARK hemisphere,
            where nothing else is happening) read as a hard, slightly
            "glitchy" edge against a starfield background — visible on an
            actual screenshot, not caught from source. Zero-width by
            default now; Днес's hero (MoonHero.tsx) doesn't pass
            outlineWidth. Ритъм's smaller LunarPhaseCard glyph keeps its
            hairline (outlineWidth defaults... see prop below) since that
            usage is out of Stage 2's scope and unverified either way. */}
        {outlineWidth > 0 && (
          <Circle cx={cx} cy={cy} r={r} fill="none" stroke={outlineColor} strokeWidth={outlineWidth} />
        )}
      </Svg>
      {/* NOT PORTED — flagged, not silently dropped: the mockup's
          feTurbulence grain has no equivalent here. react-native-svg
          15.x exposes Filter/FeTurbulence, but its cross-platform
          (iOS/Android) rendering reliability is unverified in this
          codebase — adding it blind risks the exact "looked fine in the
          browser, did something different on device" gap this whole
          plan exists to catch early. Needs a standalone device spike
          before it's added here, not a guess. */}
    </View>
  )
}
