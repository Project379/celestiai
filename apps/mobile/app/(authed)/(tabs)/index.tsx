import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CrystalCard } from '@/components/CrystalCard'

const TILE_CLASS =
  'flex-1 min-w-[46%] rounded-2xl border border-violet-stellaeum/25 px-4 py-5'
const TILE_LABEL_CLASS =
  'font-cinzel text-[9px] uppercase tracking-[0.32em] text-amber-300/80'
const TILE_HINT_CLASS = 'mt-2 text-[13.5px] font-light text-slate-200'

export default function DnesScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        {/* Ambient header — scan in 2s (MOBILE_UX_RESEARCH §2.1 Layer A) */}
        <View className="mb-10">
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            понеделник, 18 април
          </Text>
          <Text className="mt-2 font-cinzel text-[11px] uppercase tracking-[0.32em] text-amber-200/90">
            ☾  Растяща луна · ден 7
          </Text>
        </View>

        {/* Hero reading placeholder — Layer B */}
        <View className="mb-10">
          <Text className="mb-3 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
            Небесен ритъм
          </Text>
          <Text className="text-[16.5px] font-light leading-[1.8] text-slate-200">
            Placeholder hero reading. This will render the pre-generated (sun-sign × moon-phase)
            editorial text from the daily horoscope cache. BgGPT primary, frontier fallback.
          </Text>
        </View>

        {/* Bento launchpad — Layer C (2×2 grid). Crystal tile is data-driven
            via <CrystalCard /> (sub-round 2). Other three remain hardcoded
            until their respective endpoints land. */}
        <View className="mb-10 flex-row flex-wrap gap-3">
          <CrystalCard />
          <View className={TILE_CLASS}>
            <Text className={TILE_LABEL_CLASS}>Лунна фаза</Text>
            <Text className={TILE_HINT_CLASS}>Ден 7/29</Text>
          </View>
          <View className={TILE_CLASS}>
            <Text className={TILE_LABEL_CLASS}>Транзит</Text>
            <Text className={TILE_HINT_CLASS}>Венера △ Сатурн</Text>
          </View>
          <View className={TILE_CLASS}>
            <Text className={TILE_LABEL_CLASS}>Кръг</Text>
            <Text className={TILE_HINT_CLASS}>Добави човек</Text>
          </View>
        </View>

        {/* Streak footer — Layer D */}
        <Text className="text-center font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
          · серия 12 ·
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
