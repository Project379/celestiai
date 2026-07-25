import type { ReactNode } from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { color, space } from './tokens'

type Temperature = 'warm' | 'cool' | 'neutral'

// Phase 0 foundation — the per-screen temperature wash. AmbientBackground
// stays mounted once at the tab-root shell as a temperature-neutral base
// (see AmbientBackground.tsx) rather than being made route-aware — that
// would need lifting tab-selection state into a context, a bigger change
// than Phase 0 scoped. Each screen's own corner wash (bronze/cool) is
// layered here instead, which delivers the same "this screen reads warm/
// cool" result without touching the shared background's contract.
// `temperature` defaults to 'neutral' (today's plain violet-only glow) so
// existing/undecided screens are unaffected until they opt in.
const WASH_COLOR: Record<Temperature, string | null> = {
  warm: color.bronze,
  cool: color.cool,
  neutral: null,
}

// Same safe-area discipline as Part 0's hotfix. Ambient glow is the one
// piece of continuity-layer ornament that stays — ambient gradients are
// listed as unchanged in the brief. Everything else about the shell is
// deliberately plain: a standard scrollable screen, nothing novel.
export function ScreenShell({
  children,
  temperature = 'neutral',
}: {
  children: ReactNode
  temperature?: Temperature
}) {
  const washColor = WASH_COLOR[temperature]

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
          {washColor && (
            <RadialGradient id="shell-temp" cx="90%" cy="100%" r="65%">
              <Stop offset="0%" stopColor={washColor} stopOpacity={0.1} />
              <Stop offset="100%" stopColor={washColor} stopOpacity={0} />
            </RadialGradient>
          )}
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shell-violet)" />
        {washColor && <Rect width="100%" height="100%" fill="url(#shell-temp)" />}
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
