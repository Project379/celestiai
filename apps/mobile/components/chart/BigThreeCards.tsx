import { Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import {
  PLANETS_BG,
  PLANET_GLYPHS,
  ZODIAC_SIGNS_BG,
} from '@stellaeum/astrology/client'
import type {
  PlanetPosition,
  PointData,
  ZodiacSign,
} from '@stellaeum/astrology/client'
import { ZODIAC_GLYPH_PATHS } from '@stellaeum/core/charts/glyphs'

/**
 * Mobile port of apps/web/components/chart/BigThreeCards.tsx. Same
 * three-row layout, same Bulgarian sign-trait labels, same Слънце ·
 * Луна · Асцендент framing. Sign glyphs use the shared custom SVG
 * line-art from @stellaeum/core/charts/glyphs (the same paths that
 * NatalWheel renders on the outer ring); the eyebrow planet glyphs
 * remain Unicode per SR 6 ratification.
 */

const SIGN_ICON_SIZE = 22
const SIGN_ICON_STROKE = '#e2e8f0'

interface BigThreeCardsProps {
  sun: PlanetPosition
  moon: PlanetPosition
  ascendant: PointData
  birthTimeKnown: boolean
  onSelect?: (kind: 'sun' | 'moon' | 'rising') => void
  selected?: 'sun' | 'moon' | 'rising' | null
}

const SIGN_TRAITS: Record<ZodiacSign, string> = {
  aries: 'лидер',
  taurus: 'стабилен',
  gemini: 'комуникативен',
  cancer: 'грижовен',
  leo: 'харизматичен',
  virgo: 'аналитичен',
  libra: 'дипломатичен',
  scorpio: 'интензивен',
  sagittarius: 'оптимистичен',
  capricorn: 'амбициозен',
  aquarius: 'оригинален',
  pisces: 'интуитивен',
}

const KIND_DOT_CLASS: Record<'sun' | 'moon' | 'rising', string> = {
  sun: 'bg-amber-300/90',
  moon: 'bg-slate-200/90',
  rising: 'bg-cyan-300/90',
}

const KIND_SELECTED_TEXT: Record<'sun' | 'moon' | 'rising', string> = {
  sun: 'text-amber-200',
  moon: 'text-slate-100',
  rising: 'text-cyan-200',
}

interface RowProps {
  kind: 'sun' | 'moon' | 'rising'
  glyph: string
  title: string
  sign: string
  degree: number
  trait: string
  isApproximate?: boolean
  isSelected?: boolean
  onPress?: () => void
  hairline: boolean
}

function BigThreeRow({
  kind,
  glyph,
  title,
  sign,
  degree,
  trait,
  isApproximate,
  isSelected,
  onPress,
  hairline,
}: RowProps) {
  const signKey = sign.toLowerCase() as ZodiacSign
  const signLabel = ZODIAC_SIGNS_BG[signKey] ?? sign
  const signGlyphPaths = ZODIAC_GLYPH_PATHS[signKey]
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={`relative py-5 ${hairline ? 'border-t border-slate-300/[0.06]' : ''}`}
    >
      <View className="mb-3 flex-row items-center" style={{ gap: 10 }}>
        <View
          className={`h-1 w-1 ${KIND_DOT_CLASS[kind]}`}
          style={{
            transform: [{ rotate: '45deg' }],
            opacity: isSelected ? 1 : 0.6,
          }}
        />
        <Text
          className={`font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] ${
            isSelected ? KIND_SELECTED_TEXT[kind] : 'text-slate-400'
          }`}
        >
          <Text>{glyph}  </Text>
          {isApproximate ? '~' : ''}
          {title}
        </Text>
        {isApproximate && (
          <Text className="font-cinzel text-[9px] text-slate-600">≈</Text>
        )}
        <View style={{ flex: 1 }} />
        <Text className="font-cinzel text-[11px] font-semibold tabular-nums text-amber-300/85">
          {Math.floor(degree)}°
        </Text>
      </View>

      <View className="mb-1.5 flex-row items-center" style={{ gap: 12 }}>
        {signGlyphPaths && (
          <Svg
            width={SIGN_ICON_SIZE}
            height={SIGN_ICON_SIZE}
            viewBox="0 0 24 24"
          >
            {signGlyphPaths.map((d, i) => (
              <Path
                key={i}
                d={d}
                fill="none"
                stroke={SIGN_ICON_STROKE}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </Svg>
        )}
        <Text className="text-[24px] font-semibold tracking-tight text-slate-100">
          {signLabel}
        </Text>
      </View>

      <Text
        className={`text-[13.5px] font-light leading-relaxed ${
          isSelected ? 'text-slate-300' : 'text-slate-400'
        }`}
      >
        {trait}
      </Text>

      {isSelected && (
        <View
          className="absolute inset-x-0 bottom-0 h-px bg-amber-300/50"
          style={{ left: 0, right: 0 }}
        />
      )}
    </Pressable>
  )
}

export function BigThreeCards({
  sun,
  moon,
  ascendant,
  birthTimeKnown,
  onSelect,
  selected,
}: BigThreeCardsProps) {
  return (
    <View>
      <View className="mb-3">
        <View className="mb-2 flex-row items-center" style={{ gap: 12 }}>
          <View
            className="h-1 w-1 bg-amber-300/90"
            style={{
              transform: [{ rotate: '45deg' }],
              shadowColor: 'rgb(251, 191, 36)',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 8,
              elevation: 4,
            }}
          />
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
            Големите три
          </Text>
          <View
            className="h-px flex-1 bg-amber-300/30"
            style={{ marginLeft: 4 }}
          />
        </View>
        <Text className="text-[18px] font-semibold tracking-tight text-slate-100">
          Слънце · Луна · Асцендент
        </Text>
        <Text className="mt-1.5 text-[12.5px] font-light text-slate-400">
          Трите основни оси на твоята карта.
        </Text>
      </View>

      <BigThreeRow
        kind="sun"
        glyph={PLANET_GLYPHS.sun}
        title={PLANETS_BG.sun}
        sign={sun.sign}
        degree={sun.signDegree}
        trait={SIGN_TRAITS[sun.sign as ZodiacSign] ?? ''}
        isSelected={selected === 'sun'}
        onPress={() => onSelect?.('sun')}
        hairline={false}
      />
      <BigThreeRow
        kind="moon"
        glyph={PLANET_GLYPHS.moon}
        title={PLANETS_BG.moon}
        sign={moon.sign}
        degree={moon.signDegree}
        trait={SIGN_TRAITS[moon.sign as ZodiacSign] ?? ''}
        isSelected={selected === 'moon'}
        onPress={() => onSelect?.('moon')}
        hairline
      />
      <BigThreeRow
        kind="rising"
        glyph="↑"
        title="Асцендент"
        sign={ascendant.sign}
        degree={ascendant.degree}
        trait={SIGN_TRAITS[ascendant.sign as ZodiacSign] ?? ''}
        isApproximate={!birthTimeKnown}
        isSelected={selected === 'rising'}
        onPress={() => onSelect?.('rising')}
        hairline
      />
    </View>
  )
}
