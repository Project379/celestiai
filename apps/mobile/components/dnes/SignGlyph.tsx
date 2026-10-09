import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg'
import type { ZodiacSign } from '@stellaeum/astrology/client'
import { ZODIAC_GLYPH_PATHS } from '@stellaeum/core/charts/glyphs'

import { color } from '@/components/design-system/tokens'

/** A zodiac line-art glyph in a soft violet halo. `strong` = the Sun sign. */
export function SignGlyph({
  sign,
  halo,
  glyph,
  strong = false,
  idSuffix,
}: {
  sign: ZodiacSign
  halo: number
  glyph: number
  strong?: boolean
  idSuffix: string
}) {
  const id = `sg-${idSuffix}`
  const scale = glyph / 24
  const off = (halo - glyph) / 2
  return (
    <Svg width={halo} height={halo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="rgb(165,140,245)" stopOpacity={strong ? 0.42 : 0.24} />
          <Stop offset="45%" stopColor="rgb(150,128,236)" stopOpacity={strong ? 0.14 : 0.1} />
          <Stop offset="70%" stopColor="rgb(150,128,236)" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill={`url(#${id})`} />
      <G transform={`translate(${off} ${off}) scale(${scale})`}>
        {ZODIAC_GLYPH_PATHS[sign].map((d, i) => (
          <Path
            key={i}
            d={d}
            fill="none"
            stroke={strong ? color.glyphLilacHi : color.glyphLilac}
            strokeWidth={strong ? 1.2 : 1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </G>
    </Svg>
  )
}
