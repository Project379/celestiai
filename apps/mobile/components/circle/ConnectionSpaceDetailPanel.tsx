import { useEffect } from 'react'
import { Alert, BackHandler, Pressable, ScrollView, Text, View } from 'react-native'

import type { CompatibilityDomainKey, RelationshipType } from '@stellaeum/core/relationships/types'
import type { CircleSpaceView } from '@/lib/circle/types'
import { font, pressFeedback } from '@/components/design-system/tokens'
import { LockBadge, TierGateLoading } from '@/components/tier/PremiumLock'
import { KRUG_INVITE_LOCKED, KRUG_REPORT_LOCKED } from '@/lib/tier/locked-copy'
import { hapticSelect } from '@/lib/haptics'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/** Compact locked affordance for the button row. (tier item 5, Кръг) */
function LockedPill({ label }: { label: string }) {
  return (
    <View
      className="flex-row items-center rounded-full border border-white/15 bg-black/20 px-4 py-2"
      style={{ gap: 8 }}
      accessibilityRole="text"
    >
      <LockBadge size={12} />
      <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        {label}
      </Text>
    </View>
  )
}

const TYPE_LABELS: Record<RelationshipType, string> = {
  romantic: 'Романтична',
  friendship: 'Приятелска',
  work: 'Работна',
  family: 'Семейна',
}

const DOMAIN_LABELS: Record<CompatibilityDomainKey, string> = {
  emotional_resonance: 'Емоционален резонанс',
  communication: 'Комуникация',
  romance_attraction: 'Романтика и привличане',
  long_term_stability: 'Дългосрочна стабилност',
  conflict_friction: 'Конфликт и триене',
  growth_expansion: 'Растеж и разгръщане',
  power_dynamics: 'Сила и контрол',
  shared_values: 'Споделени ценности',
}

const WEATHER_TONE_LABELS: Record<string, string> = {
  supportive: 'мек прозорец',
  challenging: 'повече триене',
  mixed: 'смесен заряд',
  quiet: 'спокоен ритъм',
}

function Eyebrow({ children, className }: { children: string; className: string }) {
  return (
    <Text style={{ fontFamily: font.bodyMedium }} className={`text-[9px] font-semibold uppercase tracking-[0.24em] ${className}`}>
      {children}
    </Text>
  )
}

/**
 * Connection-space detail overlay. Mobile port of the "connections"
 * surface's detail view in apps/web/components/circle/CircleHub.tsx
 * (lines ~542-720) — same canonical mobile overlay pattern as
 * SavedProfileDetailPanel.tsx (Absolute View + Pressable backdrop +
 * BackHandler).
 */
export function ConnectionSpaceDetailPanel({
  view,
  isPremium,
  isGenerating,
  isArchiving,
  onGenerateReport,
  onArchive,
  onClose,
}: {
  view: CircleSpaceView | null
  /**
   * Free tier (tier item 5): report + invite actions render locked.
   * `undefined` → tier still loading, render the neutral pending pill.
   */
  isPremium: boolean | undefined
  isGenerating: boolean
  isArchiving: boolean
  onGenerateReport: () => void
  onArchive: () => void
  onClose: () => void
}) {
  const { push } = useGuardedNavigation()

  useEffect(() => {
    if (!view) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => sub.remove()
  }, [view, onClose])

  if (!view) return null

  const { space, members, latestReport, weather } = view
  const domainEntries = space.member_count >= 2
    ? (Object.entries(space.compatibility_summary.domains) as [CompatibilityDomainKey, (typeof space.compatibility_summary.domains)[CompatibilityDomainKey]][])
        .sort((a, b) => b[1].score - a[1].score)
    : []

  const confirmArchive = () => {
    hapticSelect()
    Alert.alert('Архивиране', 'Архивиране на това пространство?', [
      { text: 'Отказ', style: 'cancel' },
      { text: 'Архивирай', style: 'destructive', onPress: onArchive },
    ])
  }

  return (
    <>
      <Pressable onPress={onClose} accessibilityLabel="Затвори" className="absolute inset-0 z-40 bg-black/75" />
      <View className="absolute inset-x-0 bottom-0 top-24 z-50 overflow-hidden rounded-t-3xl border-t border-white/10 bg-bg">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48 }}>
          <View className="mb-5 flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[22px] font-light leading-tight text-slate-100">
                {space.label || TYPE_LABELS[space.relationship_type]}
              </Text>
              <Text className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                {TYPE_LABELS[space.relationship_type]} · {members.length} член{members.length === 1 ? '' : 'а'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={({ pressed }) => pressFeedback(pressed)}>
              <Text className="text-[13px] text-slate-500">Затвори</Text>
            </Pressable>
          </View>

          <View className="mb-6 flex-row items-center justify-between rounded-2xl border border-violet-300/20 bg-black/20 px-5 py-4">
            <Eyebrow className="text-violet-200/90">Headline score</Eyebrow>
            <Text className="text-[32px] font-light text-white">
              {space.member_count >= 2 ? space.compatibility_summary.headline_score : '—'}
            </Text>
          </View>

          <View className="mb-6 flex-row flex-wrap" style={{ gap: 8 }}>
            {members.map((member) => (
              <View key={member.id} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                <Text className="text-[13px] text-slate-300">{member.chart_name || 'Член'}</Text>
              </View>
            ))}
          </View>

          <View className="mb-6 flex-row flex-wrap" style={{ gap: 10 }}>
            {space.member_count >= 2 &&
              (isPremium === undefined ? (
                <TierGateLoading variant="pill" />
              ) : isPremium ? (
                <Pressable
                  disabled={isGenerating}
                  onPress={onGenerateReport}
                  className="rounded-full border border-bronze/35 px-4 py-2"
                  style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: isGenerating ? 0.5 : pressed ? 0.6 : 1 })}
                >
                  <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-bronze-text">
                    {isGenerating ? 'Генериране...' : latestReport ? 'Регенерирай доклада' : 'Генерирай доклад'}
                  </Text>
                </Pressable>
              ) : (
                <LockedPill label={KRUG_REPORT_LOCKED} />
              ))}
            {space.relationship_type !== 'romantic' &&
              (isPremium === undefined ? (
                <TierGateLoading variant="pill" />
              ) : isPremium ? (
                <Pressable
                  onPress={() => {
                    hapticSelect()
                    onClose()
                    push({ pathname: '/circle/new-connection', params: { relationshipType: space.relationship_type, existingSpaceId: space.id } })
                  }}
                  className="rounded-full border border-violet-300/30 px-4 py-2"
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-100">
                    Покани още човек
                  </Text>
                </Pressable>
              ) : (
                <LockedPill label={KRUG_INVITE_LOCKED} />
              ))}
            <Pressable
              disabled={isArchiving}
              onPress={confirmArchive}
              className="rounded-full border border-white/15 px-4 py-2"
              style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: isArchiving ? 0.5 : pressed ? 0.6 : 1 })}
            >
              <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
                Архивирай
              </Text>
            </Pressable>
          </View>

          {weather && (
            <View className="mb-6 rounded-2xl border border-white/10 bg-slate-950/35 p-5">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Eyebrow className="text-slate-300">Group weather</Eyebrow>
                  <Text className="mt-2 text-[13px] leading-6 text-slate-300">{weather.summary}</Text>
                </View>
                <View className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                  <Eyebrow className="text-slate-500">тон</Eyebrow>
                  <Text className="mt-1 text-[14px] text-white">{WEATHER_TONE_LABELS[weather.tone] ?? weather.tone}</Text>
                </View>
              </View>
              <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
                {weather.days.slice(0, 4).map((day) => (
                  <View key={day.date} className="rounded-2xl border border-white/10 bg-black/20 p-3" style={{ width: '47%' }}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[13px] text-white">{day.label}</Text>
                      <Text className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                        {WEATHER_TONE_LABELS[day.tone] ?? day.tone}
                      </Text>
                    </View>
                    <Text className="mt-2 text-[12px] leading-5 text-slate-300">{day.headline}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {domainEntries.length > 0 && (
            <View className="mb-6 flex-row flex-wrap" style={{ gap: 10 }}>
              {domainEntries.map(([key, domain]) => (
                <View key={key} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4" style={{ width: '47%' }}>
                  <Eyebrow className="text-slate-400">{DOMAIN_LABELS[key]}</Eyebrow>
                  <Text className="mt-2 text-[24px] font-light text-white">{domain.score}</Text>
                  <Text className="mt-1 text-[12px] leading-5 text-slate-300">{domain.headline}</Text>
                </View>
              ))}
            </View>
          )}

          <View className="rounded-2xl border border-white/10 bg-slate-950/30 p-5">
            <Eyebrow className="text-slate-300">Последен доклад</Eyebrow>
            {latestReport ? (
              <View className="mt-4" style={{ gap: 16 }}>
                <View className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <Text className="text-[16px] text-white">{latestReport.report_content.overview.title}</Text>
                  <Text className="mt-2 text-[13px] leading-6 text-slate-300">{latestReport.report_content.overview.summary}</Text>
                </View>
                {Object.entries(latestReport.report_content.domains)
                  .slice(0, 3)
                  .map(([key, section]) => (
                    <View key={key} className="rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                      <Eyebrow className="text-bronze-text/80">{DOMAIN_LABELS[key as CompatibilityDomainKey] ?? key}</Eyebrow>
                      <Text className="mt-2 text-[15px] text-white">{section.headline}</Text>
                      <Text className="mt-2 text-[13px] leading-6 text-slate-300">{section.core}</Text>
                    </View>
                  ))}
              </View>
            ) : (
              <Text className="mt-3 text-[13px] leading-6 text-slate-400">
                Още няма запазен доклад за това пространство.
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  )
}
