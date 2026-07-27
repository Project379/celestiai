import { Tabs } from 'expo-router'
import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { OracleEntry } from '@/components/OracleEntry'
import { PERF_DEBUG } from '@/lib/perfDebug'
import { AmbientBackground } from '@/components/design-system/AmbientBackground'
import { NavIcon } from '@/components/design-system/NavIcon'
import { color, font } from '@/components/design-system/tokens'
import {
  CircleTabIcon,
  PersonTabIcon,
  PulseTabIcon,
  SunTabIcon,
  WheelTabIcon,
} from '@/components/design-system/TabIcons'

// MOBILE-ALPHA-REDESIGN v3 — tab bar fix (Round A follow-up, fired
// standalone ahead of Round B). Persistent chrome renders on all five
// tabs simultaneously, so its own R3 budget isn't "0-1 like any other
// screen" — it's the floor every tab screen's count starts from. Five
// findings fixed here:
//   1. Bottom inset was hardcoded (height: 72, paddingBottom: 18) — no
//      useSafeAreaInsets() anywhere, unlike every other screen (mirrors
//      the top-inset treatment in commit 6025f58).
//   2. tabBarActiveTintColor was '#fcd34d', a different amber than
//      tokens.ts's color.amber ('#fbbf24') — drift, not the shared token.
//   3. Labels used font-cinzel on Cyrillic text — REVISIT-42's exact bug
//      (Cinzel has zero Cyrillic glyphs, silent fallback) in a surface
//      that fix never reached.
//   4. Labels were tracked-caps uppercase — 5 rendered instances, R3
//      violation on every screen this chrome sits under.
//   5. No icons at all (tabBarIcon: () => null on every tab) — diverges
//      from the doc's own Instagram research (§0.1) naming icon+label as
//      the stable, familiar 5-tab shape.
//
// Warm/cool amendment, Phase 0 (2026-07-25): recolored from amber to
// starlight/violet — this chrome is temperature-neutral connective
// tissue shared by warm and cool screens alike, so it can carry neither
// accent (see WARM_COOL_AMENDMENT.md's R4 re-amendment). Active state is
// now a small violet dot (NavIcon) beneath the glyph, not a tint color.
//
// Founder correction (2026-07-27, device pass): the tab bar carried a
// real fill/panel on both platforms — `BlurView` + `rgba(8,6,15,.72)` on
// iOS, a flat `rgba(8,6,15,.92)` on Android — directly contradicting the
// ratified spec ("no fill, no panel") independent of the perf question.
// BlurView was also the single most expensive thing in the perf
// bisection's suspect list. Both removed; replaced with the mockup's
// actual `.nav-fade` — a soft upward gradient fade, sheer, no solid
// backdrop anywhere — via `NavFade` below.
//
// Founder correction (2026-07-27, second pass — systemic rule): the
// mockup's own ceiling (rgba(8,6,15,.6)) never lets scrolled content
// fully dissolve — up to 40% of the underlying color always shows
// through, so text stayed legible under the bar instead of reading as
// "revealed," not "clipped." A static mockup screenshot never exercised
// this against live scrolled text, so its own value was never tested
// against the case it exists to solve. Raised to .92 (near-opaque, still
// a gradient, not a flat panel — the "no fill" spec survives) ramping to
// transparent over 85% of the band. Deliberate departure, logged in
// MOBILE_ALPHA_REDESIGN.md same as the other departures today. Same
// numbers reused for ScreenShell's pinned-block fade (design-system/
// ScreenShell.tsx) — one systemic rule, one recipe, everywhere content
// scrolls toward persistent chrome.
function NavFade() {
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute' }} pointerEvents="none">
      <Defs>
        <LinearGradient id="nav-fade" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#08060f" stopOpacity={0.92} />
          <Stop offset="85%" stopColor="#08060f" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#nav-fade)" />
    </Svg>
  )
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: font.bodyMedium,
        fontSize: 10.5,
        color: focused ? color.starlight : color.faint,
      }}
    >
      {label}
    </Text>
  )
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-bg">
      {PERF_DEBUG.ambientStarfield && <AmbientBackground />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          sceneStyle: { backgroundColor: 'transparent' },
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 1,
            borderTopColor: color.violetBorder,
            backgroundColor: 'transparent',
            height: 56 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom || 8,
            elevation: 0,
          },
          tabBarBackground: () => <NavFade />,
          tabBarActiveTintColor: color.starlight,
          tabBarInactiveTintColor: color.faint,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Днес',
            tabBarIcon: ({ color: c, focused }) => (
              <NavIcon focused={focused}>
                <SunTabIcon color={c} />
              </NavIcon>
            ),
            tabBarLabel: ({ focused }) => <TabLabel label="Днес" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chart"
          options={{
            title: 'Карта',
            tabBarIcon: ({ color: c, focused }) => (
              <NavIcon focused={focused}>
                <WheelTabIcon color={c} />
              </NavIcon>
            ),
            tabBarLabel: ({ focused }) => <TabLabel label="Карта" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="circle"
          options={{
            title: 'Кръг',
            tabBarIcon: ({ color: c, focused }) => (
              <NavIcon focused={focused}>
                <CircleTabIcon color={c} />
              </NavIcon>
            ),
            tabBarLabel: ({ focused }) => <TabLabel label="Кръг" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rhythm"
          options={{
            title: 'Ритъм',
            tabBarIcon: ({ color: c, focused }) => (
              <NavIcon focused={focused}>
                <PulseTabIcon color={c} />
              </NavIcon>
            ),
            tabBarLabel: ({ focused }) => <TabLabel label="Ритъм" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'Ти',
            tabBarIcon: ({ color: c, focused }) => (
              <NavIcon focused={focused}>
                <PersonTabIcon color={c} />
              </NavIcon>
            ),
            tabBarLabel: ({ focused }) => <TabLabel label="Ти" focused={focused} />,
          }}
        />
      </Tabs>

      <OracleEntry />
    </View>
  )
}
