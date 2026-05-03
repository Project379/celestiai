import { Pressable, Text, View } from 'react-native'

/**
 * Oracle persistent entry. Platform-specific expression per MOBILE_UX_RESEARCH §2.6:
 * Android/web = FAB, iOS = nav-bar glyph (deferred; FAB used as placeholder).
 * Wiring to the Oracle chat screen comes in Phase B.
 */
export function OracleEntry() {
  const handlePress = () => {
    // TODO Phase B: open Oracle chat with contextual pre-prompt for current tab
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
