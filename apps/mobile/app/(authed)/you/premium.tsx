import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'

import { BackButton } from '@/components/design-system/BackButton'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'

/**
 * /you/premium — P.5 stub destination. Replaced by P.11 (DUAL pricing:
 * inline MobilePaywall + Премиум destination, ~300 LOC per HANDOFF table
 * line 159) for free users, and by P.9 (subscription management UI,
 * ~300 LOC line 157) for premium users.
 *
 * D13 architecture (ratified P.5 close 2026-05-12): /you/premium hosts
 * conditional content by subscription state — pricing surface for free,
 * status + cancel/reactivate UI for premium. Subscription UI does NOT
 * land in /you/settings; D5 keeps settings focused on Clerk UserProfile
 * + custom app section.
 */
export default function PremiumStubScreen() {
  const backVisibility = useBackButtonVisibility()

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, zIndex: 10 }, backVisibility.style]}
        pointerEvents={backVisibility.pointerEvents}
      >
        <BackButton />
      </Animated.View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
        onScroll={backVisibility.onScroll}
        scrollEventThrottle={100}
      >
        <View className="items-center py-12">
          <Text className="text-[16px] font-light leading-[1.7] text-slate-300">
            Премиум идва скоро.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
