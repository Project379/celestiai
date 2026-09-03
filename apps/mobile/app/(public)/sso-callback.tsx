import { ActivityIndicator, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// Safety net for stellaeum://sso-callback: expo-web-browser's
// openAuthSessionAsync listens for this redirect itself and resolves the
// promise in oauth.ts, but the OS can also fire it as a normal deep link into
// expo-router. Without a matched route that lands on an "Unmatched Route"
// screen. This just waits — (public)/_layout.tsx redirects once isSignedIn
// flips true after setActive runs in the caller.
export default function SSOCallbackScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#fcd34d" size="small" />
      </View>
    </SafeAreaView>
  )
}
