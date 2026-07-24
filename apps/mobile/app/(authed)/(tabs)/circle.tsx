import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { pressFeedback } from '@/components/design-system/tokens'

/**
 * Кръг empty state (MOBILE_UX_RESEARCH §12.2 — highest-leverage screen).
 * Single emotional prompt + three relationship-type cards.
 * No "+ Add" button, no feature list, no pricing — paywall is downstream.
 */

type RelationKind = { key: string; label: string; tint: string; border: string }

const KINDS: RelationKind[] = [
  { key: 'partner', label: 'Партньор', tint: 'bg-violet-stellaeum/10', border: 'border-violet-stellaeum/40' },
  { key: 'friend',  label: 'Приятел',  tint: 'bg-amber-300/5',       border: 'border-amber-300/40' },
  { key: 'crush',   label: 'Crush',    tint: 'bg-rose-500/5',        border: 'border-rose-400/30' },
]

export default function CircleScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
      >
        <Text className="mb-6 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Твоят кръг
        </Text>

        {/* Single emotional prompt */}
        <Text className="mb-10 text-[22px] font-light leading-[1.3] text-slate-100">
          Кого мислиш в момента?
        </Text>

        {/* Three relationship-type cards */}
        <View className="mb-8 gap-3">
          {KINDS.map((kind) => (
            <Pressable
              key={kind.key}
              className={`rounded-2xl border ${kind.border} ${kind.tint} px-5 py-6`}
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <Text className="font-cinzel text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-100">
                {kind.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="text-[13px] font-light leading-[1.7] text-slate-500">
          Или добави някого, когото искаш да разбереш по-добре.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
