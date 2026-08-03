import '../global.css'

import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

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
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
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
    </ClerkProvider>
  )
}
