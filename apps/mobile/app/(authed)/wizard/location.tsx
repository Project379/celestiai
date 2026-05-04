import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import { StepIndicator } from '@/components/wizard/StepIndicator'

export default function WizardLocationScreen() {
  const router = useRouter()

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 64 }}
      >
        <StepIndicator currentStep={3} />

        <View className="mb-8">
          <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/75">
            III · Място
          </Text>
          <Text className="mt-2 text-[22px] font-semibold leading-tight text-slate-100">
            Място на раждане
          </Text>
          <Text className="mt-3 text-[14.5px] font-light leading-relaxed text-slate-400">
            Въведи населеното място — необходимо е за правилния часови пояс.
          </Text>
        </View>

        <View className="mb-12 rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-6">
          <Text className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
            Placeholder · 4.5
          </Text>
          <Text className="mt-2 text-[13px] font-light leading-relaxed text-slate-400">
            City autocomplete (/api/cities/search) и manual-coords toggle
            landват в подкръг 4.5.
          </Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} className="px-2 py-2">
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Назад
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/wizard/confirm')}
            className="rounded-full border border-amber-300/40 px-6 py-2.5"
          >
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200">
              Напред
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
