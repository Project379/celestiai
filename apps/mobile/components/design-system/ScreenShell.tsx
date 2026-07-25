import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { color, space } from './tokens'

// Same safe-area discipline as Part 0's hotfix. Ambient glow is the one
// piece of continuity-layer ornament that stays — ambient gradients are
// listed as unchanged in the brief. Everything else about the shell is
// deliberately plain: a standard scrollable screen, nothing novel.
export function ScreenShell({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Svg
        width="100%"
        height={220}
        style={{ position: 'absolute', top: 0, left: 0 }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="shell-violet" cx="10%" cy="0%" r="60%">
            <Stop offset="0%" stopColor={color.violet} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={color.violet} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shell-violet)" />
      </Svg>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingTop: space.xl,
          paddingBottom: 100,
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}
