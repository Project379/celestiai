import { useState } from 'react'
import { Pressable, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg'

import { color, font } from '@/components/design-system/tokens'
import { hapticInvite } from '@/lib/haptics'
import { ORACLE_MIN_HEIGHT } from '@/lib/dnes/layout'
import { DNES_COPY } from '@/lib/dnes/copy'
import { GlowText } from './GlowText'
import { ClearView } from './StarClear'

// «Питай Оракула»: the screen's one lit exit. Words centred over a line; no box,
// no fill, no pill. The halo is two stacked text shadows (see GlowText); the line
// and the light rising from it are react-native-svg gradients, so Android and iOS
// render identically (no boxShadow / filter / background-gradient reliance).
const GLOW = '224,150,90'
const LINE = '217,160,106'

export function OracleExit({ onPress, bottom }: { onPress: () => void; bottom: number }) {
  const [pressed, setPressed] = useState(false)
  const [w, setW] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)
  // Pressed = brighter text AND a stronger halo (two dimensions, one categorical).
  const textColor = pressed ? color.bronzeLit : color.bronzeText
  const boost = pressed ? 1.5 : 1

  const lineW = w + 12
  return (
    <View
      style={{ position: 'absolute', left: 0, right: 0, bottom, alignItems: 'center' }}
      pointerEvents="box-none"
    >
      {/* The exit's whole tappable box is kept clear of stars. */}
      <ClearView zoneId="oracle-exit" pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={DNES_COPY.askOracle}
        onPress={() => {
          hapticInvite()
          onPress()
        }}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onLayout={onLayout}
        style={{
          minHeight: ORACLE_MIN_HEIGHT,
          paddingTop: 8,
          paddingBottom: 14,
          paddingHorizontal: 24,
          justifyContent: 'center',
        }}
      >
        <View>
          <GlowText
            id="oc-halo"
            style={{ fontFamily: font.display, fontSize: 19, lineHeight: 25, color: textColor }}
            tight={[`rgba(${GLOW},${Math.min(0.9, 0.46 * boost)})`, 5]}
            wide={[224, 150, 90, Math.min(0.6, 0.3 * boost)]}
            wideSpread={16}
          >
            {DNES_COPY.askOracle}
          </GlowText>
          {/* Chevron sits just right of the words; absolute, so the words stay centred. */}
          <View style={{ position: 'absolute', left: '100%', top: 8, marginLeft: -2, width: 16, height: 16 }} pointerEvents="none">
            {/* Android clips an SVG to its box, so the glow gets a box 40px wide, centred on the chevron. */}
            <Svg width={40} height={40} viewBox="-8 -8 40 40" style={{ position: 'absolute', left: -12, top: -12 }}>
              <Defs>
                <RadialGradient id="oc-glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={`rgb(${GLOW})`} stopOpacity={0.24 * boost} />
                  <Stop offset="100%" stopColor={`rgb(${GLOW})`} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={12} cy={12} r={14} fill="url(#oc-glow)" />
              <Path d="M9 6l6 6-6 6" fill="none" stroke={textColor} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>
        </View>

        {w > 0 && (
          <Svg
            width={lineW}
            height={16}
            style={{ position: 'absolute', left: -6, bottom: 5 }}
            pointerEvents="none"
          >
            <Defs>
              <RadialGradient id="oc-rise" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="rgb(214,150,90)" stopOpacity={0.36 * boost} />
                <Stop offset="100%" stopColor="rgb(214,150,90)" stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id="oc-line" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={`rgb(${LINE})`} stopOpacity={0} />
                <Stop offset="50%" stopColor="rgb(224,168,111)" stopOpacity={0.95} />
                <Stop offset="100%" stopColor={`rgb(${LINE})`} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {/* light rising from the centre of the line, about 14px tall */}
            <Ellipse cx={lineW / 2} cy={14.5} rx={(w * 0.72) / 2} ry={14} fill="url(#oc-rise)" />
            {/* faint 6px glow under the line, then the 1.5px line itself */}
            <Rect x={0} y={11.5} width={lineW} height={4.5} fill="url(#oc-line)" opacity={0.22 * boost} />
            <Rect x={0} y={13} width={lineW} height={1.5} fill="url(#oc-line)" />
          </Svg>
        )}
      </Pressable>
      </ClearView>
    </View>
  )
}
