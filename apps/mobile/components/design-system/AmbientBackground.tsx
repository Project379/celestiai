import { useEffect, useMemo } from 'react'
import { StyleSheet, useWindowDimensions } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

import { color } from './tokens'

// Proof surface for the starfield-port pass — borrows the RECIPE from web's
// CelestialCanvas.tsx (star temperature spread, centerFade falloff, corner
// nebula wash), not the code: that component is a 953-line DOM <canvas> +
// rAF loop, and RN has neither DOM canvas nor (per the build constraint) Skia
// available here. This is a from-scratch react-native-svg + Reanimated
// component sized for the mobile continuity layer.
//
// Paints NO background of its own — it sits behind bg-bg (#08060f) as a
// transparent overlay so the two don't need reconciling. Star count and
// animated-value count are deliberately decoupled: ~48 stars for visual
// density, but only 4 shared values total (one twinkle phase per group) to
// stay inside a real mobile animation budget — 48 independent Reanimated
// values would be the wrong kind of "40-60 animated elements."
//
// PERF (2026-07-27): each group used to be an AnimatedG with animatedProps
// opacity, nested inside ONE shared full-viewport Svg alongside the other 3
// groups and the wash Rects. react-native-svg re-rasterizes the entire Svg
// subtree on any child prop change, so that one opacity change repainted
// the whole viewport at 60Hz — confirmed via perfDebug.freezeStarTwinkle
// (UI FPS 10-15 -> 60 with everything else unchanged). Each group is now
// its OWN transparent full-viewport Svg with STATIC circles (no animated
// props inside), wrapped in a plain Animated.View that carries the opacity.
// That moves the twinkle from an SVG-internal redraw to a composited View
// opacity — free on the UI thread. Trade: 1 Svg became 4 static Svgs plus
// the wash Svg (4 full-viewport composite passes instead of 1). Overdraw
// was already measured as nearly free in this investigation (screenShellWash
// + ambientStarfield + tab bar backdrop stacked cost ~nothing) — but that
// was 3 layers, not 5, so re-verify UI FPS on device rather than assuming
// this generalizes for free.

const STAR_COUNT = 48
const GROUP_COUNT = 4
const TWINKLE_MS = 2600

interface Star {
  x: number
  y: number
  r: number
  opacity: number
  group: number
}

// Same shape as CelestialCanvas's centerFade: full brightness at the edges,
// dimmed across the content zone so stars don't fight the hero glyph or
// reading text. Zone matches the web version's proportions (78% width /
// 70% height, center-weighted).
function centerFadeFactor(nx: number, ny: number): number {
  const dx = Math.abs(nx - 0.5) / 0.39
  const dy = Math.abs(ny - 0.42) / 0.35
  const d = Math.max(dx, dy)
  return 0.15 + 0.85 * Math.min(1, d)
}

function useStarfield(width: number, height: number): Star[] {
  return useMemo(() => {
    const stars: Star[] = []
    for (let i = 0; i < STAR_COUNT; i++) {
      const nx = Math.random()
      const ny = Math.random()
      const fade = centerFadeFactor(nx, ny)
      stars.push({
        x: nx * width,
        y: ny * height,
        r: 0.6 + Math.random() * 1.3,
        opacity: (0.25 + Math.random() * 0.55) * fade,
        group: i % GROUP_COUNT,
      })
    }
    return stars
    // Regenerated only when the layout size actually changes (rotation,
    // foldable), not per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])
}

// Own transparent full-viewport Svg per group (static circles, no animated
// SVG props) wrapped in an Animated.View — see the PERF note above.
function TwinkleGroup({ stars, phaseMs, width, height }: { stars: Star[]; phaseMs: number; width: number; height: number }) {
  const twinkle = useSharedValue(1)

  useEffect(() => {
    twinkle.value = withDelay(
      phaseMs,
      withRepeat(withSequence(withTiming(0.5, { duration: TWINKLE_MS }), withTiming(1, { duration: TWINKLE_MS })), -1, true),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: twinkle.value }))

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={width} height={height}>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={color.text} opacity={s.opacity} />
        ))}
      </Svg>
    </Animated.View>
  )
}

export function AmbientBackground() {
  const { width, height } = useWindowDimensions()
  const stars = useStarfield(width, height)
  const groups = useMemo(
    () => Array.from({ length: GROUP_COUNT }, (_, g) => stars.filter((s) => s.group === g)),
    [stars],
  )

  return (
    <>
      <Svg
        width={width}
        height={height}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <Defs>
          {/* Violet/bronze corner wash — R4-neutral per the ratified reading:
              this is atmosphere, same category as ScreenShell's existing
              violet glow, not a functional accent spend. */}
          <RadialGradient id="ambient-violet" cx="8%" cy="4%" r="55%">
            <Stop offset="0%" stopColor={color.violet} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={color.violet} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="ambient-bronze" cx="95%" cy="88%" r="45%">
            <Stop offset="0%" stopColor={color.bronze} stopOpacity={0.05} />
            <Stop offset="100%" stopColor={color.bronze} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#ambient-violet)" />
        <Rect width="100%" height="100%" fill="url(#ambient-bronze)" />
      </Svg>
      {groups.map((g, i) => (
        <TwinkleGroup key={i} stars={g} phaseMs={i * (TWINKLE_MS / GROUP_COUNT)} width={width} height={height} />
      ))}
    </>
  )
}
