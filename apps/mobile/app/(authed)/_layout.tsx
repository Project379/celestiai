import { useEffect } from 'react'
import { useAuth } from '@clerk/expo'
import { Redirect, Stack, usePathname, useRouter } from 'expo-router'
import { View } from 'react-native'

import { AppLoadingScreen } from '@/components/design-system/AppLoadingScreen'
import { DeletionPendingBanner } from '@/components/settings/DeletionPendingBanner'
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

  // Founder correction (this batch): this used to be a bare `return null`
  // — a hard blank flash between the native splash screen handing off
  // (app/_layout.tsx already hid it once fonts loaded) and Clerk's auth
  // state resolving. Root layout's own font-loading `return null` is a
  // different gap — the native splash is still covering THAT one and the
  // custom fonts this loading screen needs aren't loaded yet either, so
  // it's left alone; this is the one place a blank frame was actually
  // visible to the user.
  if (!isLoaded) return <AppLoadingScreen />
  if (!isSignedIn) return <Redirect href="/sign-in" />

  return (
    <View style={{ flex: 1 }}>
      {/* B.0h/P.10: persistent grace-period banner, covers every authed
         screen (not just settings) since deletion is a full-access undo
         window the user must never lose sight of. */}
      <DeletionPendingBanner />
      {/* Founder correction (this batch): the native Stack header — the
          whole bar/box, not just its title text or shadow line — is gone
          on every pushed screen now, not only rhythm/journal and
          moon-detail. Each of those screens renders its own BackButton
          (design-system/BackButton.tsx: no box, no circle, starlight
          chevron + violet glow, self-positioned top-left) instead —
          either via ScreenShell's `back` prop or, for the screens not on
          ScreenShell yet, dropped directly into their own SafeAreaView. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#08060f' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="wizard" />
        <Stack.Screen name="oracle" />
        <Stack.Screen name="rhythm/journal" />
        <Stack.Screen name="moon-detail" />
        <Stack.Screen name="circle/new" />
        <Stack.Screen name="you/crystals" />
        <Stack.Screen name="you/recommendations" />
        <Stack.Screen name="you/guide" />
        <Stack.Screen name="you/premium" />
        <Stack.Screen name="you/settings" />
        <Stack.Screen name="you/settings-name" />
        <Stack.Screen name="you/settings-email" />
        <Stack.Screen name="you/settings-password" />
      </Stack>
    </View>
  )
}
