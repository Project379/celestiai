import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { PLAQUE_ROW_GAP } from '@/components/chart/Plaque'
import { useBreathe } from '@/components/design-system/motion'
import { color, font, pressFeedback } from '@/components/design-system/tokens'

/**
 * Карта's «Детайли» invitation — mockup `.pedestal` (_source-v4.html
 * §КАРТА), the pedestal the instrument rests on. Decision (b): the single
 * lit invitation on this screen, opening DetailsSheet (Аспекти/Къщи/
 * Речник). Bronze appears exactly here and on the rim's trim line per the
 * mockup's own note — both fittings, never the reading itself.
 *
 * Founder device-pass fix (2026-07-28 — the same function-style Pressable
 * bug fixed in CtaPanel.tsx/Plaque.tsx the same day, never caught here):
 * `style` was a FUNCTION (`({pressed}) => ({...})`), Pressable's
 * pressed-state API, which device instrumentation proved silently drops
 * whatever properties are returned from it rather than applying them.
 * This file's own `alignItems:'center'` centering the text/glow was
 * exposed to the exact same risk and was never verified independently —
 * fixed the same way: static style object, pressed state tracked via
 * onPressIn/onPressOut.
 *
 * Founder device-pass fix (2026-07-28, ember instead of thread): the
 * small accent line beneath the text is gone, replaced with the same
 * ember treatment as Днес's «Питай Оракула» (EmberGlow + breathing dot),
 * to the LEFT of the text and aligned with it — same primitive, same
 * position convention, both invitations now read as the same language.
 *
 * Founder device-pass fix (2026-07-28, font match): «Детайли» now uses
 * the exact same family as «Питай Оракула» (font.displaySemibold, no
 * textTransform, CtaPanel's lighter letterSpacing) instead of its own
 * uppercase tracked-caps treatment — both invitations render in the same
 * typeface, first-letter-uppercase only, per instruction.
 */
const PEDESTAL_TOP_GAP = PLAQUE_ROW_GAP * 3

export function Pedestal({ onPress }: { onPress: () => void }) {
  const breathe = useBreathe(2600, [0.5, 1])
  const [pressed, setPressed] = useState(false)
  // Founder device-pass fix (2026-07-28): same fix as CtaPanel's matching
  // note — 'baseline' on a non-Text ember view doesn't reliably line up
  // with the text's visual center. Switched to 'center'.
  const pressableStyle = {
    ...pressFeedback(pressed),
    marginTop: PEDESTAL_TOP_GAP,
    paddingVertical: 28,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 9,
    position: 'relative' as const,
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      style={pressableStyle}
    >
      <View
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
        pointerEvents="none"
      >
        <Svg width={200} height={84}>
          <Defs>
            <RadialGradient id="pedestal-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color.bronze} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={color.bronze} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#pedestal-glow)" />
        </Svg>
      </View>
      <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={20} height={20} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
          <Defs>
            <RadialGradient id="pedestal-ember-glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color.bronze} stopOpacity={0.9} />
              <Stop offset="35%" stopColor={color.bronze} stopOpacity={0.45} />
              <Stop offset="100%" stopColor={color.bronze} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={10} cy={10} r={10} fill="url(#pedestal-ember-glow)" />
        </Svg>
        <Animated.View
          style={[
            {
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: color.bronze,
              shadowColor: color.bronze,
              shadowOpacity: 0.9,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            },
            breathe,
          ]}
        />
      </View>
      <Text
        style={{
          fontFamily: font.displaySemibold,
          fontSize: 19,
          letterSpacing: 0.2,
          color: color.bronzeText,
          textShadowColor: 'rgba(184,118,62,0.5)',
          textShadowRadius: 10,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        Детайли
      </Text>
    </Pressable>
  )
}
