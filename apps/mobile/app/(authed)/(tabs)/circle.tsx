import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import type { RelationshipType } from '@stellaeum/core/relationships/types'
import { SavedProfileDetailPanel } from '@/components/circle/SavedProfileDetailPanel'
import { font, pressFeedback } from '@/components/design-system/tokens'
import { ApiError } from '@/lib/api/client'
import { useAnalyzeSavedProfile } from '@/hooks/useAnalyzeSavedProfile'
import { useDeleteSavedProfile } from '@/hooks/useDeleteSavedProfile'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { useSavedProfileReport } from '@/hooks/useSavedProfileReport'
import { useSavedProfiles } from '@/hooks/useSavedProfiles'

// Systemic navbar-clearance rule (2026-07-27, audit) — see rhythm.tsx's
// matching comment; same flat-120 gap found and fixed here.
const TAB_BAR_BASE_HEIGHT = 56
const TAB_BAR_CLEARANCE = 52

/**
 * Кръг tab root — Batch 4 sub-batch A (hub + saved-profiles/Crush).
 *
 * Chart-gate and the ratified §12.2 empty state are both kept from the
 * pre-port screen; only the Crush card and "Или добави" line are wired now
 * — Партньор/Приятел stay inert (as they already were) because those route
 * to Connections-space invite flows, scoped to sub-batch B, not built yet.
 * A populated state (list + add button + detail overlay) replaces the
 * empty state once the user has at least one saved profile.
 *
 * No Connections/Crush tab switcher (unlike web's CircleHub) — building
 * that chrome now would show a Connections tab with nothing behind it
 * until sub-batch B ships invites. Flagged for founder review, not
 * unilaterally assumed correct.
 */

type RelationKind = { key: string; label: string; tint: string; border: string; wired: boolean }

const KINDS: RelationKind[] = [
  { key: 'partner', label: 'Партньор', tint: 'bg-violet-stellaeum/10', border: 'border-violet-stellaeum/40', wired: false },
  { key: 'friend', label: 'Приятел', tint: 'bg-amber-300/5', border: 'border-amber-300/40', wired: false },
  { key: 'crush', label: 'Crush', tint: 'bg-rose-500/5', border: 'border-rose-400/30', wired: true },
]

export default function CircleScreen() {
  const insets = useSafeAreaInsets()
  const { push } = useGuardedNavigation()
  const { data: firstChart } = useFirstChart()
  const { data: profiles } = useSavedProfiles()
  const deleteMutation = useDeleteSavedProfile()
  const analyzeMutation = useAnalyzeSavedProfile()

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('romantic')

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId) ?? null
  const { data: report } = useSavedProfileReport(selectedProfileId)

  useEffect(() => {
    if (!report) {
      setRelationshipType('romantic')
      return
    }
    setRelationshipType(report.relationship_type)
  }, [report])

  const handleAnalyze = () => {
    if (!selectedProfileId) return
    analyzeMutation.mutate(
      { profileId: selectedProfileId, relationshipType },
      {
        onError: (error) => {
          const msg =
            error instanceof ApiError
              ? ((error.body as { error?: string } | null)?.error ?? 'Не успяхме да анализираме профила.')
              : 'Не успяхме да анализираме профила.'
          Alert.alert('Нещо се обърка', msg)
        },
      },
    )
  }

  const handleDelete = () => {
    if (!selectedProfileId) return
    const id = selectedProfileId
    setSelectedProfileId(null)
    deleteMutation.mutate(id, {
      onError: (error) => {
        const msg =
          error instanceof ApiError
            ? ((error.body as { error?: string } | null)?.error ?? 'Не успяхме да изтрием профила.')
            : 'Не успяхме да изтрием профила.'
        Alert.alert('Нещо се обърка', msg)
      },
    })
  }

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
        <Text style={{ fontFamily: font.bodyMedium }} className="mb-6 text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
          Твоят кръг
        </Text>

        {firstChart === undefined || profiles === undefined ? null : firstChart === null ? (
          <ChartGate />
        ) : profiles.length === 0 ? (
          <EmptyState onSelectCrush={() => push('/circle/new')} />
        ) : (
          <View style={{ gap: 12 }}>
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-[22px] font-light leading-[1.3] text-slate-100">Запазени профили</Text>
              <Pressable
                onPress={() => push('/circle/new')}
                className="rounded-full border border-rose-300/35 px-4 py-2"
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-100">
                  + Нов профил
                </Text>
              </Pressable>
            </View>

            {profiles.map((profile) => (
              <Pressable
                key={profile.id}
                onPress={() => setSelectedProfileId(profile.id)}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text className="text-[16px] text-slate-100">{profile.name}</Text>
                <Text className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">{profile.city_name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <SavedProfileDetailPanel
        profile={selectedProfile}
        report={report}
        relationshipType={relationshipType}
        onRelationshipTypeChange={setRelationshipType}
        isAnalyzing={analyzeMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onAnalyze={handleAnalyze}
        onDelete={handleDelete}
        onClose={() => setSelectedProfileId(null)}
      />
    </SafeAreaView>
  )
}

/** Mirrors CircleHub.tsx's data.chartId === null gate. Headline ported
 * verbatim; the paragraph is web's own sentence with "connection spaces
 * или" trimmed out (that clause names Batch 4 sub-batch B's Connections
 * surface, not built yet) — an edit, not a verbatim port, flagged for
 * review. CTA reuses rhythm.tsx's EmptyTransitsState copy (already
 * existing, not new) rather than web's slightly different "Въведи
 * данните" for one-CTA-phrase consistency across the app. */
function ChartGate() {
  const { push } = useGuardedNavigation()
  return (
    <View>
      <Text className="mb-5 text-[22px] font-light leading-[1.3] text-slate-100">
        Връзките започват от твоята карта.
      </Text>
      <Text style={{ fontFamily: font.body }} className="mb-6 text-[15px] font-light leading-[1.8] text-slate-400">
        Преди crush профили Stellaeum трябва да има твоята натална карта като база.
      </Text>
      <Pressable
        onPress={() => push('/wizard/date')}
        className="self-start flex-row items-center rounded-full border border-amber-300/40 px-5 py-2.5"
        style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 10 })}
      >
        <Text style={{ fontFamily: font.bodyMedium }} className="text-[15px] font-medium text-amber-200">
          Въведи рождени данни
        </Text>
        <Text style={{ fontFamily: font.body }} className="text-[15px] text-amber-300">›</Text>
      </Pressable>
    </View>
  )
}

/**
 * Кръг empty state (MOBILE_UX_RESEARCH §12.2 — highest-leverage screen).
 * Single emotional prompt + three relationship-type cards. Only Crush is
 * wired this batch — see file header note.
 */
function EmptyState({ onSelectCrush }: { onSelectCrush: () => void }) {
  return (
    <>
      <Text className="mb-10 text-[22px] font-light leading-[1.3] text-slate-100">
        Кого мислиш в момента?
      </Text>

      <View className="mb-8 gap-3">
        {KINDS.map((kind) => (
          <Pressable
            key={kind.key}
            onPress={kind.wired ? onSelectCrush : undefined}
            className={`rounded-2xl border ${kind.border} ${kind.tint} px-5 py-6`}
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text style={{ fontFamily: font.bodyMedium }} className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-100">
              {kind.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={onSelectCrush}>
        <Text className="text-[13px] font-light leading-[1.7] text-slate-500">
          Или добави някого, когото искаш да разбереш по-добре.
        </Text>
      </Pressable>
    </>
  )
}
