import { Tabs } from 'expo-router'
import { Platform, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'

import { OracleEntry } from '@/components/OracleEntry'

const TAB_LABEL_CLASS =
  'font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.28em]'

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      className={`${TAB_LABEL_CLASS} ${
        focused ? 'text-amber-300' : 'text-slate-500'
      }`}
    >
      {label}
    </Text>
  )
}

export default function TabsLayout() {
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
            height: 72,
            paddingTop: 10,
            paddingBottom: 18,
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
          tabBarActiveTintColor: '#fcd34d',
          tabBarInactiveTintColor: '#64748b',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Днес',
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => <TabLabel label="Днес" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="chart"
          options={{
            title: 'Карта',
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => <TabLabel label="Карта" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="circle"
          options={{
            title: 'Кръг',
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => <TabLabel label="Кръг" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rhythm"
          options={{
            title: 'Ритъм',
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => <TabLabel label="Ритъм" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'Ти',
            tabBarIcon: () => null,
            tabBarLabel: ({ focused }) => <TabLabel label="Ти" focused={focused} />,
          }}
        />
      </Tabs>

      <OracleEntry />
    </View>
  )
}
