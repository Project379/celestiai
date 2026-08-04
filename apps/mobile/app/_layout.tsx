import '../global.css'
import '@/lib/monitoring/sentry'

import { useEffect } from 'react'
import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { RevenueCatProvider } from '@/lib/purchases/RevenueCatProvider'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

SplashScreen.preventAutoHideAsync()

// Loaded via useFonts (JS-side), not the expo-font config plugin, because
// this app runs in Expo Go for prototyping — Expo Go cannot execute custom
// native config plugins, only a full dev-client/EAS build can. Production
// rollout should migrate to the config-plugin embed for build-time loading;
// tracked as a rollout item (MOBILE-ALPHA-REDESIGN deliverables).
const FONT_ASSETS = {
  'Cinzel-Regular': require('../assets/fonts/Cinzel-Regular.ttf'),
  'Cinzel-SemiBold': require('../assets/fonts/Cinzel-SemiBold.ttf'),
  'PlayfairDisplay-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
  'PlayfairDisplay-SemiBold': require('../assets/fonts/PlayfairDisplay-SemiBold.ttf'),
  'PlayfairDisplay-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
  'EBGaramond-Regular': require('../assets/fonts/EBGaramond-Regular.ttf'),
  'EBGaramond-Medium': require('../assets/fonts/EBGaramond-Medium.ttf'),
  'EBGaramond-Italic': require('../assets/fonts/EBGaramond-Italic.ttf'),
}

// Web-parity defaults: per-day content (daily horoscope, crystal-of-the-day)
// is naturally invalidated by query keys carrying the date, so we disable
// auto-revalidation. Consumers force a refetch by changing the date key.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS)

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RevenueCatProvider>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#08060f' },
              }}
            >
              <Stack.Screen name="(authed)" />
              <Stack.Screen name="(public)" />
            </Stack>
          </SafeAreaProvider>
        </QueryClientProvider>
      </RevenueCatProvider>
    </ClerkProvider>
  )
}
