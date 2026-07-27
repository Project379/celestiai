import { useEffect } from 'react'
import { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'

import { PERF_DEBUG } from '@/lib/perfDebug'

// Phase 0 foundation — generalizes the one-shot "resolve into focus" motion
// already proven on NatalWheel's graticule, so new heroes (Guide's tablet,
// the wizard's star) don't each hand-roll a useSharedValue/withTiming pair.
export function useResolveIn(durationMs = 500) {
  // Starts already-resolved (1, not 0) when frozen — the frozen state should
  // look like "finished," not "stuck invisible."
  const progress = useSharedValue(PERF_DEBUG.freezeResolveIn ? 1 : 0)

  useEffect(() => {
    if (PERF_DEBUG.freezeResolveIn) return // frozen: stay at rest value, skip the animation entirely
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
    if (PERF_DEBUG.freezeBreathe) return // frozen: stay at range[1] (rest), skip withRepeat entirely
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
