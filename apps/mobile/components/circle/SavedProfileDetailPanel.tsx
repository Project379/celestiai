import { useEffect } from 'react'
import { Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native'
import { useRouter } from 'expo-router'

import type { RelationshipType } from '@stellaeum/core/relationships/types'
import type { SavedProfileReportRow, SavedProfileRow } from '@/lib/circle/types'
import { font, pressFeedback } from '@/components/design-system/tokens'
import { hapticSelect } from '@/lib/haptics'

const TYPE_LABELS: Record<RelationshipType, string> = {
  romantic: 'Романтична',
  friendship: 'Приятелска',
  work: 'Работна',
  family: 'Семейна',
}

const DOMAIN_LABELS: Record<string, string> = {
  emotional_resonance: 'Емоционален резонанс',
  communication: 'Комуникация',
  romance_attraction: 'Романтика и привличане',
  long_term_stability: 'Дългосрочна стабилност',
  conflict_friction: 'Конфликт и триене',
  growth_expansion: 'Растеж и разгръщане',
  power_dynamics: 'Сила и контрол',
  shared_values: 'Споделени ценности',
}

function Eyebrow({ children, className }: { children: string; className: string }) {
  return (
    <Text style={{ fontFamily: font.bodyMedium }} className={`text-[9px] font-semibold uppercase tracking-[0.24em] ${className}`}>
      {children}
    </Text>
  )
}

/**
 * Crush profile detail overlay. Mobile port of the "crush" surface's
 * report display in apps/web/components/circle/CircleHub.tsx (lines
 * ~792-927), using the canonical mobile overlay pattern (Absolute View +
 * Pressable backdrop + BackHandler — see CrystalDetailPanel.tsx) rather
 * than a pushed route, matching how every other "detail from a list"
 * surface on mobile already works.
 */
export function SavedProfileDetailPanel({
  profile,
  report,
  relationshipType,
  onRelationshipTypeChange,
  isAnalyzing,
  isDeleting,
  onAnalyze,
  onDelete,
  onClose,
}: {
  profile: SavedProfileRow | null
  report: SavedProfileReportRow | null | undefined
  relationshipType: RelationshipType
  onRelationshipTypeChange: (type: RelationshipType) => void
  isAnalyzing: boolean
  isDeleting: boolean
  onAnalyze: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    if (!profile) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [profile, onClose])

  if (!profile) return null

  const content = report?.report_content
  const domainEntries = content?.mode === 'full' && content.domains ? Object.entries(content.domains) : []

  const confirmDelete = () => {
    hapticSelect()
    Alert.alert('Изтриване на профила', 'Изтриване на този crush профил?', [
      { text: 'Отказ', style: 'cancel' },
      { text: 'Изтрий', style: 'destructive', onPress: onDelete },
    ])
  }

  return (
    <>
      <Pressable onPress={onClose} accessibilityLabel="Затвори" className="absolute inset-0 z-40 bg-black/75" />
      <View className="absolute inset-x-0 bottom-0 top-24 z-50 overflow-hidden rounded-t-3xl border-t border-white/10 bg-bg">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 }}>
          <View className="mb-6 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[22px] font-light leading-tight text-slate-100">{profile.name}</Text>
              <Text className="mt-1 text-[12px] uppercase tracking-[0.2em] text-slate-500">{profile.city_name}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressFeedback(pressed)}>
              <Text className="text-[13px] text-slate-500">Затвори</Text>
            </Pressable>
          </View>

          <View className="mb-6 flex-row flex-wrap" style={{ gap: 8 }}>
            {(Object.entries(TYPE_LABELS) as [RelationshipType, string][]).map(([value, label]) => {
              const active = relationshipType === value
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    hapticSelect()
                    onRelationshipTypeChange(value)
                  }}
                  className={`rounded-full border px-4 py-2 ${
                    active ? 'border-rose-300/45 bg-rose-500/10' : 'border-white/10 bg-black/20'
                  }`}
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text className={`text-[12px] ${active ? 'text-rose-100' : 'text-slate-400'}`}>{label}</Text>
                </Pressable>
              )
            })}
          </View>

          <View className="mb-6 flex-row flex-wrap" style={{ gap: 10 }}>
            <Pressable
              disabled={isAnalyzing}
              onPress={onAnalyze}
              className="rounded-full border border-rose-300/35 px-4 py-2"
              style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: isAnalyzing ? 0.5 : pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-100">
                {isAnalyzing ? 'Анализ...' : report ? 'Обнови анализа' : 'Анализирай'}
              </Text>
            </Pressable>
            <Pressable
              disabled={isDeleting}
              onPress={confirmDelete}
              className="rounded-full border border-white/15 px-4 py-2"
              style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: isDeleting ? 0.5 : pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
                Изтрий профила
              </Text>
            </Pressable>
          </View>

          {!report || !content ? (
            <View className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <Text className="text-[14px] leading-6 text-slate-400">
                Натисни „Анализирай“, за да изчислиш първия прочит за {profile.name}.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              <View className="rounded-2xl border border-white/10 bg-slate-950/35 p-5">
                <View className="flex-row items-end justify-between">
                  <View>
                    <Eyebrow className="text-rose-200/80">Headline score</Eyebrow>
                    <View className="mt-2 flex-row items-end" style={{ gap: 8 }}>
                      <Text className="text-[40px] font-light leading-none text-white">{report.headline_score}</Text>
                      <Text className="pb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">/100</Text>
                    </View>
                  </View>
                  <View className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <Eyebrow className="text-slate-500">lens</Eyebrow>
                    <Text className="mt-1 text-[14px] text-white">{TYPE_LABELS[report.relationship_type]}</Text>
                  </View>
                </View>
                <Text className="mt-4 text-[14px] leading-6 text-slate-300">{content.overview.summary}</Text>
              </View>

              {content.snapshot && (
                <View style={{ gap: 12 }}>
                  <View className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <Eyebrow className="text-rose-200/80">Какво те дърпа</Eyebrow>
                    <Text className="mt-2 text-[14px] leading-6 text-slate-300">{content.snapshot.pull}</Text>
                  </View>
                  <View className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <Eyebrow className="text-bronze-text/80">Какво ще искаш</Eyebrow>
                    <Text className="mt-2 text-[14px] leading-6 text-slate-300">{content.snapshot.need}</Text>
                  </View>
                  <View className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                    <Eyebrow className="text-slate-300">Къде можеш да сгрешиш</Eyebrow>
                    <Text className="mt-2 text-[14px] leading-6 text-slate-300">{content.snapshot.misread}</Text>
                  </View>
                </View>
              )}

              {content.mode === 'full' && domainEntries.length > 0 && (
                <View className="flex-row flex-wrap" style={{ gap: 12 }}>
                  {domainEntries.slice(0, 4).map(([key, section]) => (
                    <View key={key} className="rounded-2xl border border-white/10 bg-slate-950/20 p-4" style={{ width: '47%' }}>
                      <Eyebrow className="text-slate-400">{DOMAIN_LABELS[key] ?? key}</Eyebrow>
                      <Text className="mt-2 text-[13px] leading-5 text-slate-300">{section.headline}</Text>
                    </View>
                  ))}
                </View>
              )}

              {content.mode === 'teaser' ? (
                <View className="rounded-2xl border border-bronze/20 bg-bronze/5 p-5">
                  <Text className="text-[15px] leading-6 text-slate-100">{content.teaser}</Text>
                  <Pressable
                    onPress={() => {
                      hapticSelect()
                      onClose()
                      router.push('/you/premium')
                    }}
                    className="mt-4 self-start rounded-full border border-bronze/35 px-4 py-2"
                    style={({ pressed }) => pressFeedback(pressed)}
                  >
                    <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bronze-text">
                      Отключи пълния прочит
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  )
}
