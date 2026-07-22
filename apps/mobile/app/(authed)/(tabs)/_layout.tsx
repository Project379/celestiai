import { Tabs } from 'expo-router'
import { Platform, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { OracleEntry } from '@/components/OracleEntry'
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
function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: font.bodyMedium,
        fontSize: 10.5,
        color: focused ? color.amber : color.faint,
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
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 0,
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(8,6,15,0.92)',
            height: 56 + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom || 8,
            elevation: 0,
          },
          tabBarBackground:
            Platform.OS === 'ios'
              ? () => (
                  <BlurView
                    intensity={40}
                    tint="dark"
                    style={{ flex: 1, backgroundColor: 'rgba(8,6,15,0.72)' }}
                  />
                )
              : undefined,
          tabBarActiveTintColor: color.amber,
          tabBarInactiveTintColor: color.faint,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Днес',
            tabBarIcon: ({ color: c }) => <SunTabIcon color={c} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Днес" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chart"
          options={{
            title: 'Карта',
            tabBarIcon: ({ color: c }) => <WheelTabIcon color={c} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Карта" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="circle"
          options={{
            title: 'Кръг',
            tabBarIcon: ({ color: c }) => <CircleTabIcon color={c} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Кръг" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rhythm"
          options={{
            title: 'Ритъм',
            tabBarIcon: ({ color: c }) => <PulseTabIcon color={c} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Ритъм" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'Ти',
            tabBarIcon: ({ color: c }) => <PersonTabIcon color={c} />,
            tabBarLabel: ({ focused }) => <TabLabel label="Ти" focused={focused} />,
          }}
        />
      </Tabs>

      <OracleEntry />
    </View>
  )
}
