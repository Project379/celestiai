import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

// Premium pass, item #3 (2026-07-24) — card press-scale + lift, the
// Balatro/tarot research's "object, not rectangle" lever: containment
// (a shadow that deepens, not a flat card) + spring motion (damped
// settle, not a linear nudge) — two dimensions, one categorical, per
// the R7 calibration bar. Neutral shadow only (no colour) — a colour
// glow would spend a second R4 accent role on screens that already use
// amber elsewhere; reserved for the one proof surface
// (CrystalOfTheDayCard) where that tradeoff is deliberate.
//
// Distinct from `pressFeedback` (tokens.ts): that's the universal,
// zero-cost primitive for every Pressable in the app (item #1). This is
// reserved for the app's actual card-class components — a heavier,
// Reanimated-driven treatment, not something to apply to every button.
const SPRING_CONFIG = { damping: 14, stiffness: 260 }

export function usePressLift() {
  const progress = useSharedValue(0)

  const onPressIn = () => {
    progress.value = withSpring(1, SPRING_CONFIG)
  }
  const onPressOut = () => {
    progress.value = withSpring(0, SPRING_CONFIG)
  }

  const liftStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 0.97]) },
      { translateY: interpolate(progress.value, [0, 1], [0, -3]) },
    ],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: interpolate(progress.value, [0, 1], [4, 10]) },
    shadowOpacity: interpolate(progress.value, [0, 1], [0.18, 0.34]),
    shadowRadius: interpolate(progress.value, [0, 1], [8, 18]),
    elevation: interpolate(progress.value, [0, 1], [3, 8]),
  }))

  // Exposed for callers that need a secondary element (e.g. a glyph
  // inside the card) to animate off the same press state — the proof
  // surface's gem lift-and-rotate derives from this rather than
  // tracking its own separate press state.
  return { liftStyle, onPressIn, onPressOut, progress }
}
