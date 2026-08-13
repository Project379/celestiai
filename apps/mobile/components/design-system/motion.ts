import { useEffect } from 'react'
import { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

// Phase 0 foundation — generalizes the one-shot "resolve into focus" motion
// already proven on NatalWheel's graticule, so new heroes (Guide's tablet,
// the wizard's star) don't each hand-roll a useSharedValue/withTiming pair.
export function useResolveIn(durationMs = 500) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(1, { duration: durationMs })
  }, [progress, durationMs])

  return useAnimatedStyle(() => ({ opacity: progress.value }))
}

// Generalizes MoonGlyph's breathing glow. BUILD-VERIFICATION-GUARDS.md
// guard 3: an element that also needs translate-based centering must NOT
// consume this in isolation — it must combine the returned scale with its
// own centering translate in one style object (see LeadLine/track-point
// note in the design docs for the exact bug this prevents). This hook
// only ever returns opacity + scale, never translate, specifically so a
// consumer can't accidentally clobber its own centering transform by
// spreading this style last.
export function useBreathe(durationMs = 2600, range: [number, number] = [0.5, 1]) {
  const phase = useSharedValue(range[1])

  useEffect(() => {
    phase.value = withRepeat(
      withSequence(
        withTiming(range[0], { duration: durationMs }),
        withTiming(range[1], { duration: durationMs }),
      ),
      -1,
      true,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return useAnimatedStyle(() => ({
    opacity: phase.value,
    transform: [{ scale: 0.9 + phase.value * 0.15 }],
  }))
}

// Continuous linear rotation — ported 2026-08-13 for Oracle's loading
// glyph (spinning ring + rotating diamond, mirroring web's ReadingStream.tsx
// pre-first-token block), generalized so any future "spins forever" need
// (a loading ring, an ambient rotating accent) reuses this instead of a
// fresh useSharedValue/withRepeat pair.
export function useSpin(durationMs = 5000) {
  const angle = useSharedValue(0)

  useEffect(() => {
    angle.value = withRepeat(
      withTiming(360, { duration: durationMs, easing: Easing.linear }),
      -1,
      false,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }))
}

// One-shot-repeating "ping" — scale up + fade out, restarting from the
// base state each cycle (not a back-and-forth breathe). Ported 2026-08-13
// for Oracle's loading glyph outer halo, mirroring Tailwind's
// `animate-ping` used in web's ReadingStream.tsx.
export function usePing(durationMs = 2400) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: durationMs, easing: Easing.out(Easing.ease) }), -1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.15,
    transform: [{ scale: 1 + progress.value * 1.2 }],
  }))
}
