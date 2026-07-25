import type { ReactNode } from 'react'
import { View } from 'react-native'

import { color, rhythm } from './tokens'

// Phase 0 foundation — extracts Днес's fixed spine/payoff pattern into a
// shared primitive so the geometric bounding (BUILD_VERIFICATION_GUARDS.md
// guard 1) is enforced by the component's own structure, not something
// every future screen has to independently remember. The spine is bounded
// to `children` only; `payoff` is a separate slot rendered entirely
// outside the spine's wrapper, in normal flow — there is no coordinate
// range where the two can occupy the same space, on any content length.
export function LeadLine({
  children,
  payoff,
  accentColor = color.bronze,
}: {
  children: ReactNode
  payoff?: ReactNode
  accentColor?: string
}) {
  return (
    <View>
      <View style={{ position: 'relative' }}>
        <View
          style={{
            position: 'absolute',
            left: 3,
            top: 2,
            bottom: 8,
            width: 1,
            backgroundColor: `${accentColor}80`,
          }}
        />
        <View style={{ paddingLeft: 18 }}>{children}</View>
      </View>
      {payoff && <View style={{ marginTop: rhythm.tight }}>{payoff}</View>}
    </View>
  )
}
