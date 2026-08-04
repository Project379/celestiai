import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { font, pressFeedback } from '@/components/design-system/tokens'

// Systemic navbar-clearance rule (2026-07-27, audit) — see rhythm.tsx's
// matching comment; same flat-120 gap found and fixed here.
const TAB_BAR_BASE_HEIGHT = 56
const TAB_BAR_CLEARANCE = 52

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
  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: TAB_BAR_BASE_HEIGHT + insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {/* REVISIT-42 fix (2026-07-27): font-cinzel on Cyrillic text —
            Cinzel has zero Cyrillic glyphs. Swapped to font.bodyMedium,
            same fix already applied to rhythm.tsx's matching eyebrow. */}
        <Text style={{ fontFamily: font.bodyMedium }} className="mb-6 text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
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
              <Text style={{ fontFamily: font.bodyMedium }} className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-100">
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
