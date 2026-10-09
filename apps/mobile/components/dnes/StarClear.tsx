import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import {
  Text,
  View,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
  type TextProps,
  type ViewProps,
} from 'react-native'

import { setClearZones } from '@/lib/starClear'

/**
 * A window position depends on every ancestor, and an ancestor can move after this element's own
 * layout (safe-area insets arriving, the screen settling), which fires no onLayout here. So measure
 * now and again shortly after, once the screen has settled.
 */
const SETTLE_MS = [0, 350, 1200]
function measureSettled(measure: () => void) {
  SETTLE_MS.forEach((ms) => (ms === 0 ? measure() : setTimeout(measure, ms)))
}

/**
 * Text that reports where each of its LINES is painted, so the starfield can keep 14px clear of
 * the words themselves (not of the whole stretched text box). Drop-in for <Text>.
 */
export function ClearText({ zoneId, onLayout, onTextLayout, ...rest }: TextProps & { zoneId: string }) {
  const ref = useRef<Text>(null)
  const lines = useRef<TextLayoutEventData['lines']>([])
  const origin = useRef<{ x: number; y: number } | null>(null)

  const publish = useCallback(() => {
    const o = origin.current
    if (!o || lines.current.length === 0) return
    setClearZones(
      zoneId,
      lines.current.map((l) => ({ x: o.x + l.x, y: o.y + l.y, w: l.width, h: l.height })),
    )
  }, [zoneId])

  useEffect(() => () => setClearZones(zoneId, null), [zoneId])

  return (
    <Text
      ref={ref}
      {...rest}
      onLayout={(e: LayoutChangeEvent) => {
        measureSettled(() =>
          ref.current?.measureInWindow((x, y) => {
            origin.current = { x, y }
            publish()
          }),
        )
        onLayout?.(e)
      }}
      onTextLayout={(e: NativeSyntheticEvent<TextLayoutEventData>) => {
        lines.current = e.nativeEvent.lines
        publish()
        onTextLayout?.(e)
      }}
    />
  )
}

/** A block (a tappable control, a swipe band) whose whole box is kept clear of stars. */
export function ClearView({ zoneId, onLayout, children, ...rest }: ViewProps & { zoneId: string; children?: ReactNode }) {
  const ref = useRef<View>(null)
  useEffect(() => () => setClearZones(zoneId, null), [zoneId])
  return (
    <View
      ref={ref}
      collapsable={false}
      {...rest}
      onLayout={(e: LayoutChangeEvent) => {
        measureSettled(() => ref.current?.measureInWindow((x, y, w, h) => setClearZones(zoneId, [{ x, y, w, h }])))
        onLayout?.(e)
      }}
    >
      {children}
    </View>
  )
}
