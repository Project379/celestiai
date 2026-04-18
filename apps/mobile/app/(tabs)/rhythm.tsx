import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TIME_CHIPS = ['Днес', 'Седмица', 'Месец', 'Година'] as const

export default function RhythmScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        <Text className="mb-6 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Небесен ритъм
        </Text>

        <View className="mb-10 flex-row gap-2">
          {TIME_CHIPS.map((chip, i) => (
            <View
              key={chip}
              className={`rounded-full border px-4 py-2 ${
                i === 0 ? 'border-amber-300/60 bg-amber-300/5' : 'border-slate-700/60'
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

        <Text className="mb-4 text-[14px] font-light leading-[1.8] text-slate-300">
          Transits · lunar cycle · manifest diary (sub) · yearly forecast (premium).
          Timeline rendering comes in Phase B.
        </Text>
        <Text className="text-[12px] leading-[1.7] text-slate-500">
          Manifest (dream) diary surfaces here under Месец per research §2.4.
          Oracle FAB writes to diary via "Запиши в дневника" shortcut.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
