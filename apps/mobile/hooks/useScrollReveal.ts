import { useCallback, useRef } from 'react'
import { Dimensions, View } from 'react-native'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

// Extracted from index.tsx's original single-target «Питай Оракула» reveal
// (device-pass history there) so the same "float and glow like a star,
// reveal itself as the user scrolls down to it" behavior can drive several
// independent fragments, not just the one invite. Each call is its own
// tracked target — own ref, own visibility flag, own shared progress value
// — so fragments reveal individually as the user scrolls to each one, not
// all at once.
//
// Visibility rule (carried over unchanged): a target counts as visible only
// once its BOTTOM edge has cleared the tab bar's top edge, never while
// partially occluded by it — the same `56 + insets.bottom` formula used
// everywhere else in this app. `check()` is a continuous toggle (not
// fire-once): every call compares current visibility against the last
// known state and animates toward whichever is currently true, so
// scrolling back up hides the fragment again instead of leaving it stuck
// visible after its first reveal.
export function useScrollReveal(
  tabBarBaseHeight: number,
  insetsBottom: number,
  options?: { revealEasing?: (value: number) => number; hideEasing?: (value: number) => number; duration?: number },
) {
  const ref = useRef<View>(null)
  const isVisibleRef = useRef(false)
  const progress = useSharedValue(0)

  const check = useCallback(() => {
    ref.current?.measureInWindow((_x, y, _width, height) => {
      const windowHeight = Dimensions.get('window').height
      const tabBarTop = windowHeight - (tabBarBaseHeight + insetsBottom)
      const shouldBeVisible = y > 0 && y + height <= tabBarTop
      if (shouldBeVisible === isVisibleRef.current) return
      isVisibleRef.current = shouldBeVisible
      const duration = options?.duration ?? 400
      const easing = shouldBeVisible ? options?.revealEasing : options?.hideEasing
      progress.value = withTiming(shouldBeVisible ? 1 : 0, easing ? { duration, easing } : { duration })
    })
  }, [tabBarBaseHeight, insetsBottom, options?.revealEasing, options?.hideEasing, options?.duration, progress])

  // Plain fade+rise — the default, used for text fragments (captions,
  // meteor note). Bespoke targets (the moon) build their own
  // useAnimatedStyle off `progress` directly instead of this one.
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 20 }],
  }))

  return { ref, progress, style, check }
}
