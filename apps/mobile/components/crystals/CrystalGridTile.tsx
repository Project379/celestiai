import { Pressable, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'

import { CrystalGem, type GemVariant } from './CrystalGem'
import { usePressLift } from '@/components/design-system/usePressLift'

interface CrystalGridTileProps {
  slug: string
  name: string
  tagline: string
  variant: GemVariant
  primary: string
  secondary: string
  accent?: string | null
  rarity: string
  discovered?: boolean
  highlight?: boolean
  onPress: () => void
}

const RARITY_BG: Record<string, string> = {
  common: 'Обикновен',
  uncommon: 'Рядък',
  rare: 'Ценен',
  legendary: 'Легендарен',
}

/**
 * Collection grid tile. Mobile port of web's `CrystalCard` (catalog grid
 * tile) — renamed CrystalGridTile to avoid colliding with the existing
 * mobile `CrystalCard.tsx` dashboard bento tile (unrelated component,
 * same name on web, and dead code — not imported anywhere). Undiscovered
 * gems render desaturated + silhouetted name, matching web's "Pokédex"
 * effect. Web's hover/tap scale (`whileHover={{y:-4,scale:1.015}}`) was
 * dropped per data-display discipline at parity time; premium pass item
 * #3 (2026-07-24) restores the equivalent via `usePressLift` — spring
 * scale+lift+shadow instead of the generic opacity-dim `pressFeedback`
 * primitive, since a card that's meant to read as an object shouldn't
 * fade as it's pressed, it should lift.
 */
export function CrystalGridTile({
  name,
  tagline,
  variant,
  primary,
  secondary,
  accent,
  rarity,
  discovered = true,
  highlight = false,
  onPress,
}: CrystalGridTileProps) {
  const { liftStyle, onPressIn, onPressOut } = usePressLift()

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} className="min-w-[46%] flex-1">
      <Animated.View
        className={`items-center rounded-2xl border px-4 pb-4 pt-6 ${
          highlight ? 'border-amber-300/40 bg-amber-500/[0.04]' : 'border-white/10 bg-white/[0.03]'
        }`}
        style={liftStyle}
      >
        <View style={{ opacity: discovered ? 1 : 0.25 }}>
          <CrystalGem
            variant={variant}
            primary={primary}
            secondary={secondary}
            accent={accent}
            size={80}
            seed={name}
          />
        </View>

        <Text className="mt-2 text-[14px] font-medium tracking-tight text-slate-100">
          {discovered ? name : '???'}
        </Text>
        <Text className="mt-0.5 min-h-[28px] text-center text-[11px] font-light leading-snug text-slate-400">
          {discovered ? tagline : 'Непознат камък'}
        </Text>

        <Text className="mt-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          {RARITY_BG[rarity] ?? rarity}
        </Text>
      </Animated.View>
    </Pressable>
  )
}
