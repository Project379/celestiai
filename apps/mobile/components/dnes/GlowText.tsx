import { memo, useState, type ReactNode } from 'react'
import { Text, View, type LayoutChangeEvent, type TextStyle } from 'react-native'
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg'

/**
 * Text with a soft halo AROUND the letters: ONE Text carrying the tight halo as its single
 * native text-shadow, plus a wide halo drawn in react-native-svg behind it.
 *
 * Why not two stacked Texts (the first attempt): a second Text layer sits a pixel or two
 * off the real one on Android (font metrics), so a ghost copy of a glyph showed, and the
 * shadow was clipped into a faint rounded box. One Text plus an SVG ellipse has neither
 * problem, renders the same on iOS, and costs one text view instead of three.
 */
const PAD = 8

export const GlowText = memo(function GlowText({
  id,
  children,
  style,
  tight,
  wide,
  wideSpread = 18,
}: {
  /** Unique per instance: SVG gradient ids are global. */
  id: string
  children: ReactNode
  style: TextStyle
  /** Tight halo, the text's own single shadow: [color, radius] */
  tight: [string, number]
  /** Wide halo, the SVG ellipse: [r, g, b, alpha] */
  wide: [number, number, number, number]
  /** How far (px) the wide halo reaches past the letters. */
  wideSpread?: number
}) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setBox((b) => (b && b.w === width && b.h === height ? b : { w: width, h: height }))
  }
  const [r, g, b, a] = wide
  return (
    <View>
      {box && (
        <Svg
          width={box.w + wideSpread * 2}
          height={box.h + wideSpread * 2}
          style={{ position: 'absolute', left: -wideSpread, top: -wideSpread }}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={`rgb(${r},${g},${b})`} stopOpacity={a} />
              <Stop offset="60%" stopColor={`rgb(${r},${g},${b})`} stopOpacity={a * 0.35} />
              <Stop offset="100%" stopColor={`rgb(${r},${g},${b})`} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx={(box.w + wideSpread * 2) / 2}
            cy={(box.h + wideSpread * 2) / 2}
            rx={(box.w + wideSpread * 2) / 2}
            ry={(box.h + wideSpread * 2) / 2}
            fill={`url(#${id})`}
          />
        </Svg>
      )}
      <Text
        onLayout={onLayout}
        style={{
          ...style,
          // Padding keeps Android from clipping the shadow to the text's own bounds.
          paddingHorizontal: PAD,
          paddingVertical: PAD / 2,
          textShadowColor: tight[0],
          textShadowRadius: tight[1],
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {children}
      </Text>
    </View>
  )
})
