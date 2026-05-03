import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const CHIPS = ['Същност', 'Детайли', 'Аспекти', 'Къщи'] as const

export default function ChartScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        <Text className="mb-6 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Твоята карта
        </Text>

        {/* Scroll-chips (MOBILE_UX_RESEARCH §2.2) */}
        <View className="mb-8 flex-row gap-2">
          {CHIPS.map((chip, i) => (
            <View
              key={chip}
              className={`rounded-full border px-4 py-2 ${
                i === 0
                  ? 'border-amber-300/60 bg-amber-300/5'
                  : 'border-slate-700/60'
              }`}
            >
              <Text
                className={`font-cinzel text-[9.5px] uppercase tracking-[0.32em] ${
                  i === 0 ? 'text-amber-200' : 'text-slate-400'
                }`}
              >
                {chip}
              </Text>
            </View>
          ))}
        </View>

        {/* Natal wheel placeholder */}
        <View className="mb-10 aspect-square items-center justify-center rounded-full border border-violet-stellaeum/20">
          <Text className="font-cinzel text-[11px] uppercase tracking-[0.38em] text-slate-500">
            натална карта
          </Text>
          <Text className="mt-2 text-[12px] text-slate-600">Skia render · Phase B</Text>
        </View>

        <Text className="text-[14px] font-light leading-[1.8] text-slate-300">
          Placeholder for Big Three editorial rows. Correct-science surface per research §8 —
          exposes real degrees, orbs, house system, retrograde, aspect patterns.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
