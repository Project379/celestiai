import { View } from 'react-native'
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg'

import { PAGE_PADDING_X } from '@/lib/dnes/layout'

// The 1px bronze line that fades out to both ends, with a faint warm light rising
// from its centre. Separates the summary from the horoscope. Full-bleed: it
// cancels the page's side padding.
export function HorizonLine({ marginTop }: { marginTop: number }) {
  return (
    <View
      style={{ height: 20, marginTop, marginHorizontal: -PAGE_PADDING_X }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height={20}>
        <Defs>
          <RadialGradient id="hz-rise" cx="50%" cy="100%" r="70%" fx="50%" fy="100%">
            <Stop offset="0%" stopColor="rgb(214,150,90)" stopOpacity={0.24} />
            <Stop offset="100%" stopColor="rgb(214,150,90)" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="hz-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgb(217,160,106)" stopOpacity={0} />
            <Stop offset="50%" stopColor="rgb(217,160,106)" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="rgb(217,160,106)" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="12%" y={0} width="76%" height={20} fill="url(#hz-rise)" />
        <Rect x="0%" y={19} width="100%" height={1} fill="url(#hz-line)" />
      </Svg>
    </View>
  )
}
