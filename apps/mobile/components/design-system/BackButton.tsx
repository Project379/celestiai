import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { useRouter } from 'expo-router'

import { useBreathe } from './motion'
import { color, pressFeedback } from './tokens'

/**
 * Founder correction (this batch): the Stack header itself — the whole
 * bar/box the native header renders, not just its title or shadow line —
 * is gone on every pushed screen (headerShown:false at the layout level).
 * This is what replaces its back affordance: no box, no circle, no hard
 * line, self-positioned top-left over the screen's own content via
 * useSafeAreaInsets so every call site needs nothing more than dropping
 * this in.
 *
 * "A bit of a glow, a bit of a starry feel, still obviously clickable":
 * a chevron in starlight (not bronze — this is chrome/navigation, not the
 * app speaking or an invitation, so it stays in the cool/neutral
 * starlight family the navbar's own active-state dot already uses) with
 * a soft violet-tinted radial glow behind it and the same breathing
 * animation every other "alive, tap here" mark in this system uses
 * (CtaPanel's ember, Pedestal's ember) — proportioned down for a
 * navigation affordance, not an invitation.
 */
const GLOW_SIZE = 46

export function BackButton({ onPress }: { onPress?: () => void }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const breathe = useBreathe(3400, [0.55, 0.95])
  const [pressed, setPressed] = useState(false)

  return (
    <Pressable
      // `onPress` override — Oracle's active-topic-reading state needs
      // "back" to mean "clear the open reading, return to the topic
      // grid," not a full screen pop (its beforeRemove listener already
      // intercepts hardware/swipe-back for the same reason). Every other
      // call site just wants router.back().
      onPress={onPress ?? (() => router.back())}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityLabel="Назад"
      hitSlop={14}
      style={{
        ...pressFeedback(pressed),
        position: 'absolute',
        top: insets.top + 6,
        left: 12,
        zIndex: 10,
        width: GLOW_SIZE,
        height: GLOW_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View style={[{ position: 'absolute' }, breathe]}>
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="back-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color.violet} stopOpacity={0.4} />
              <Stop offset="45%" stopColor={color.starlight} stopOpacity={0.12} />
              <Stop offset="100%" stopColor={color.starlight} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill="url(#back-glow)" />
        </Svg>
      </Animated.View>
      <View pointerEvents="none">
        <Text
          style={{
            fontSize: 21,
            color: color.starlight,
            opacity: 0.88,
            textShadowColor: 'rgba(139,92,246,0.6)',
            textShadowRadius: 8,
            textShadowOffset: { width: 0, height: 0 },
          }}
        >
          ‹
        </Text>
      </View>
    </Pressable>
  )
}
