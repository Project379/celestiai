import { useEffect } from 'react'
import { useAuth } from '@clerk/expo'
import { Redirect, Stack, usePathname, useRouter } from 'expo-router'

import { useFirstChart } from '@/hooks/useFirstChart'
import { isWizardDismissedThisLaunch } from '@/lib/onboarding/dismissState'

/**
 * Authed-side stack layout.
 *
 * Converted from <Slot /> to <Stack /> in sub-round 7.6 so the new
 * Oracle screen can push with native iOS animation + a header bar.
 * `(tabs)` and `wizard` keep their own internal layouts (Tabs, Stack
 * respectively); they render header-less here so the wrapping Stack
 * just acts as a router for the three top-level destinations.
 *
 * B.0g-3: forced birth-data wizard. Once auth resolves and the first-chart
 * query returns null, auto-navigate to /wizard/date — unless the user has
 * already dismissed via «Пропусни засега» this launch (per-launch in-memory
 * flag in lib/onboarding/dismissState.ts; clears on app re-launch so chart-
 * less users see the forced wizard again every fresh session). Skipped when
 * already inside /wizard to avoid bouncing the user out of their own flow.
 */
export default function AuthedLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const firstChart = useFirstChart()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    if (firstChart.isLoading) return
    if (firstChart.data !== null) return
    if (isWizardDismissedThisLaunch()) return
    if (pathname.startsWith('/wizard')) return
    router.replace('/wizard/date')
  }, [isLoaded, isSignedIn, firstChart.isLoading, firstChart.data, pathname, router])

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
        }}
      />
    </Stack>
  )
}
