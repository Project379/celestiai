import { Pressable, Text, View } from 'react-native'

import { CrystalGem, type GemVariant } from './CrystalGem'

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
 * same name on web). Undiscovered gems render desaturated + silhouetted
 * name, matching web's "Pokédex" effect. Hover/tap scale animation
 * dropped per data-display discipline.
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
  return (
    <Pressable
      onPress={onPress}
      className={`min-w-[46%] flex-1 items-center rounded-2xl border px-4 pb-4 pt-6 ${
        highlight ? 'border-amber-300/40 bg-amber-500/[0.04]' : 'border-white/10 bg-white/[0.03]'
      }`}
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
    </Pressable>
  )
}
