import { useCallback, useRef, useState } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

/**
 * Founder correction (this batch): BackButton should "render out when you
 * scroll down and render in at the top" — visible while the user is at
 * the top of a pushed screen (where a back affordance actually matters,
 * mirroring the native header it replaced), fading away once they've
 * scrolled into the content so it doesn't sit on top of what they're
 * reading. `pointerEvents` toggles alongside the fade (not just opacity)
 * so a hidden button doesn't still swallow scroll gestures in the corner.
 */
const HIDE_AFTER_PX = 24

export function useBackButtonVisibility() {
  const opacity = useSharedValue(1)
  const isVisibleRef = useRef(true)
  const [pointerEvents, setPointerEvents] = useState<'auto' | 'none'>('auto')

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y
    const shouldShow = y <= HIDE_AFTER_PX
    if (shouldShow === isVisibleRef.current) return
    isVisibleRef.current = shouldShow
    opacity.value = withTiming(shouldShow ? 1 : 0, { duration: 220 })
    setPointerEvents(shouldShow ? 'auto' : 'none')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return { onScroll, style, pointerEvents }
}
