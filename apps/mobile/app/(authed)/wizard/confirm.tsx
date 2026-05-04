import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

export default function WizardConfirmScreen() {
  const router = useRouter()

  const handleSubmit = () => {
    Alert.alert(
      'Подкръг 4.6',
      'Изпращането към /api/birth-data landва в подкръг 4.6. Тук-там засега е placeholder.',
    )
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 64 }}
      >
        <View className="mb-8">
          <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
            IV · Преглед
          </Text>
          <Text className="mt-2 text-[22px] font-semibold leading-tight text-slate-100">
            Преглед и потвърждение
          </Text>
          <Text className="mt-3 text-[14.5px] font-light leading-relaxed text-slate-400">
            Провери въведените данни преди да изчислим картата.
          </Text>
        </View>

        <View className="mb-12 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-6">
          <Text className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
            Placeholder · 4.6
          </Text>
          <Text className="mt-2 text-[13px] font-light leading-relaxed text-slate-400">
            Резюме на въведените данни и POST /api/birth-data landват в
            подкръг 4.6.
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="px-2 py-2">
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Назад
            </Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            className="rounded-full border border-amber-300/50 bg-amber-300/[0.04] px-7 py-3"
          >
            <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-100">
              Изчисли картата
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
