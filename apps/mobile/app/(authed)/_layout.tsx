import { useAuth } from '@clerk/expo'
import { Redirect, Stack } from 'expo-router'

/**
 * Authed-side stack layout.
 *
 * Converted from <Slot /> to <Stack /> in sub-round 7.6 so the new
 * Oracle screen can push with native iOS animation + a header bar.
 * `(tabs)` and `wizard` keep their own internal layouts (Tabs, Stack
 * respectively); they render header-less here so the wrapping Stack
 * just acts as a router for the three top-level destinations.
 */
export default function AuthedLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return null
  if (!isSignedIn) return <Redirect href="/sign-in" />

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#08060f' },
        headerTitleStyle: { color: '#e2e8f0', fontSize: 14 },
        headerTintColor: '#fcd34d',
        headerBackTitle: '',
        contentStyle: { backgroundColor: '#08060f' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="wizard" options={{ headerShown: false }} />
      <Stack.Screen
        name="oracle"
        options={{
          title: 'Оракул',
          headerBackTitle: 'Назад',
          headerLeftContainerStyle: { paddingLeft: 16 },
        }}
      />
    </Stack>
  )
}
