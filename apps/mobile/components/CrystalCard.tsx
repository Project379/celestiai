import { Text, View } from 'react-native'

import { useCrystalOfTheDay } from '@/hooks/useCrystalOfTheDay'

const TILE_CLASS =
  'flex-1 min-w-[46%] rounded-2xl border border-violet-celestia/25 px-4 py-5'
const LABEL_CLASS =
  'font-cinzel text-[9px] uppercase tracking-[0.32em] text-amber-300/80'
const PRIMARY_CLASS = 'mt-2 text-[13.5px] font-light text-slate-200'
const SECONDARY_CLASS = 'mt-1 text-[11px] font-light text-slate-500'

export function CrystalCard() {
  const { data, isLoading, error } = useCrystalOfTheDay()

  if (!data && isLoading) {
    return (
      <View className={TILE_CLASS}>
        <Text className={LABEL_CLASS}>Кристал за днес</Text>
        <Text className={PRIMARY_CLASS}>Зареждане</Text>
      </View>
    )
  }

  if (!data && error) {
    return (
      <View className={TILE_CLASS}>
        <Text className={LABEL_CLASS}>Кристал за днес</Text>
        <Text className={PRIMARY_CLASS}>Не се получи</Text>
      </View>
    )
  }

  if (!data) {
    return (
      <View className={TILE_CLASS}>
        <Text className={LABEL_CLASS}>Кристал за днес</Text>
        <Text className={PRIMARY_CLASS}>—</Text>
      </View>
    )
  }

  const { crystal } = data
  const name = crystal.name_bg ?? crystal.name_en
  const tagline = crystal.tagline_bg ?? crystal.tagline_en

  return (
    <View className={TILE_CLASS}>
      <Text className={LABEL_CLASS}>Кристал за днес</Text>
      <Text className={PRIMARY_CLASS}>{name}</Text>
      <Text className={SECONDARY_CLASS}>
        {tagline}
        {error ? <Text className="text-rose-400"> ·</Text> : null}
      </Text>
    </View>
  )
}
