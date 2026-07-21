import { Pressable, Text, View } from 'react-native'

import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * Oracle persistent entry. Platform-specific expression per
 * MOBILE_UX_RESEARCH §2.6: Android/web = FAB, iOS = nav-bar glyph
 * (deferred; FAB used as placeholder).
 *
 * Sub-round 7.6 wires `handlePress` to a guarded push to `/oracle` and
 * hides the FAB until the user has a chart — same gating web's
 * `OracleFab` applies (`if (!hasChart) return null`). Without a chart
 * the Oracle screen has nothing to do, so showing the entry would be
 * a footgun.
 */
export function OracleEntry() {
  const { push } = useGuardedNavigation()
  const { data: firstChart } = useFirstChart()

  if (!firstChart) return null

  const handlePress = () => {
    push('/oracle')
  }

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', right: 20, bottom: 90 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Отвори Оракула"
        onPress={handlePress}
        className="h-14 w-14 items-center justify-center rounded-full border border-amber-300/40 bg-violet-stellaeum/20"
        style={{
          shadowColor: '#fbbf24',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <Text className="font-cinzel text-[14px] text-amber-200">✦</Text>
      </Pressable>
    </View>
  )
}
