import { useEffect, useState } from 'react'
import { Alert, Pressable, Share, ScrollView, Text, View } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import type { RelationshipType } from '@stellaeum/core/relationships/types'
import { ConnectionSpaceDetailPanel } from '@/components/circle/ConnectionSpaceDetailPanel'
import { SavedProfileDetailPanel } from '@/components/circle/SavedProfileDetailPanel'
import { font, pressFeedback } from '@/components/design-system/tokens'
import { ApiError } from '@/lib/api/client'
import { hapticSelect } from '@/lib/haptics'
import { useAnalyzeSavedProfile } from '@/hooks/useAnalyzeSavedProfile'
import { useArchiveSpace } from '@/hooks/useArchiveSpace'
import { useCachedInviteLinks } from '@/hooks/useCachedInviteLinks'
import { useCancelInvite } from '@/hooks/useCancelInvite'
import { useConnectionSpaces } from '@/hooks/useConnectionSpaces'
import { useDeleteSavedProfile } from '@/hooks/useDeleteSavedProfile'
import { useFirstChart } from '@/hooks/useFirstChart'
import { useGenerateConnectionReport } from '@/hooks/useGenerateConnectionReport'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { usePendingInvites } from '@/hooks/usePendingInvites'
import { useSavedProfileReport } from '@/hooks/useSavedProfileReport'
import { useSavedProfiles } from '@/hooks/useSavedProfiles'

// Systemic navbar-clearance rule (2026-07-27, audit) — see rhythm.tsx's
// matching comment; same flat-120 gap found and fixed here.
const TAB_BAR_BASE_HEIGHT = 56
const TAB_BAR_CLEARANCE = 52

/**
 * Кръг tab root — Batch 4 sub-batch B close (Connections/invites, on top
 * of sub-batch A's Crush surface). Chart-gate and the ratified §12.2
 * empty state are both kept from the pre-port screen; all three cards
 * are wired now — Партньор/Приятел pre-select romantic/friendship and
 * open the invite-creation screen, Crush unchanged from sub-batch A.
 *
 * Surface toggle (Connections/Crush) added now that Connections has real
 * content behind it — sub-batch A deliberately omitted this chrome while
 * Connections was empty; see COMPLETION-TRACKER.md's Batch 4 note.
 *
 * Invite ACCEPTANCE has no native screen — the shared link
 * (`${appUrl}/connect/${token}`) opens web's existing, already-auth-gated
 * `/connect/[token]` page in the recipient's browser. Building a native
 * accept flow duplicates already-working infrastructure; flagged as a
 * decision, not assumed permanent — deep-linking `/connect/*` straight
 * into the app is a reasonable future improvement, not built here.
 */

type RelationKind = { key: string; label: string; tint: string; border: string; relationshipType?: RelationshipType }

const KINDS: RelationKind[] = [
  { key: 'partner', label: 'Партньор', tint: 'bg-violet-stellaeum/10', border: 'border-violet-stellaeum/40', relationshipType: 'romantic' },
  { key: 'friend', label: 'Приятел', tint: 'bg-amber-300/5', border: 'border-amber-300/40', relationshipType: 'friendship' },
  { key: 'crush', label: 'Crush', tint: 'bg-rose-500/5', border: 'border-rose-400/30' },
]

const TYPE_LABELS: Record<RelationshipType, string> = {
  romantic: 'Романтична',
  friendship: 'Приятелска',
  work: 'Работна',
  family: 'Семейна',
}

type Surface = 'connections' | 'crush'

export default function CircleScreen() {
  const insets = useSafeAreaInsets()
  const { push } = useGuardedNavigation()
  const { data: firstChart } = useFirstChart()

  const { data: profiles } = useSavedProfiles()
  const deleteProfileMutation = useDeleteSavedProfile()
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

  const { data: spaces } = useConnectionSpaces()
  const { data: invites } = usePendingInvites()
  const { data: cachedLinks } = useCachedInviteLinks()
  const generateReportMutation = useGenerateConnectionReport()
  const archiveMutation = useArchiveSpace()
  const cancelInviteMutation = useCancelInvite()
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
  const selectedSpaceView = spaces?.find((v) => v.space.id === selectedSpaceId) ?? null

  const [surface, setSurface] = useState<Surface>('connections')

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

  const handleDeleteProfile = () => {
    if (!selectedProfileId) return
    const id = selectedProfileId
    setSelectedProfileId(null)
    deleteProfileMutation.mutate(id, {
      onError: (error) => {
        const msg =
          error instanceof ApiError
            ? ((error.body as { error?: string } | null)?.error ?? 'Не успяхме да изтрием профила.')
            : 'Не успяхме да изтрием профила.'
        Alert.alert('Нещо се обърка', msg)
      },
    })
  }

  const handleGenerateReport = () => {
    if (!selectedSpaceId || !selectedSpaceView) return
    generateReportMutation.mutate(
      { spaceId: selectedSpaceId, relationshipType: selectedSpaceView.space.relationship_type },
      {
        onError: (error) => {
          const msg =
            error instanceof ApiError
              ? ((error.body as { error?: string } | null)?.error ?? 'Не успяхме да генерираме доклада.')
              : 'Не успяхме да генерираме доклада.'
          Alert.alert('Нещо се обърка', msg)
        },
      },
    )
  }

  const handleArchive = () => {
    if (!selectedSpaceId) return
    const id = selectedSpaceId
    setSelectedSpaceId(null)
    archiveMutation.mutate(id, {
      onError: (error) => {
        const msg =
          error instanceof ApiError
            ? ((error.body as { error?: string } | null)?.error ?? 'Не успяхме да архивираме пространството.')
            : 'Не успяхме да архивираме пространството.'
        Alert.alert('Нещо се обърка', msg)
      },
    })
  }

  const openCreateFlow = (kind: RelationKind) => {
    if (kind.relationshipType) {
      push({ pathname: '/circle/new-connection', params: { relationshipType: kind.relationshipType } })
    } else {
      push('/circle/new')
    }
  }

  const hasAnyData = (spaces && spaces.length > 0) || (invites && invites.length > 0) || (profiles && profiles.length > 0)
  const dataResolved = spaces !== undefined && invites !== undefined && profiles !== undefined

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
        <View className="mb-6 flex-row items-center justify-between">
          <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Твоят кръг
          </Text>
          {hasAnyData && (
            <View className="flex-row rounded-full border border-white/10 bg-black/20 p-1">
              {(['connections', 'crush'] as const).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => {
                    hapticSelect()
                    setSurface(value)
                  }}
                  className={`rounded-full px-3 py-1.5 ${surface === value ? 'bg-violet-500/15' : ''}`}
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text
                    style={{ fontFamily: font.bodyMedium }}
                    className={`text-[9px] font-semibold uppercase tracking-[0.24em] ${
                      surface === value ? 'text-violet-100' : 'text-slate-400'
                    }`}
                  >
                    {value === 'connections' ? 'Connections' : 'Crush'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {firstChart === undefined || !dataResolved ? null : firstChart === null ? (
          <ChartGate />
        ) : !hasAnyData ? (
          <EmptyState onSelect={openCreateFlow} />
        ) : surface === 'crush' ? (
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

            {profiles && profiles.length === 0 && (
              <Text className="text-[13px] leading-6 text-slate-500">Все още няма запазен crush профил.</Text>
            )}

            {profiles?.map((profile) => (
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
        ) : (
          <View style={{ gap: 24 }}>
            <View style={{ gap: 12 }}>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[22px] font-light leading-[1.3] text-slate-100">Твоите пространства</Text>
                <Pressable
                  onPress={() => push({ pathname: '/circle/new-connection', params: { relationshipType: 'friendship' } })}
                  className="rounded-full border border-violet-300/35 px-4 py-2"
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-100">
                    + Нова връзка
                  </Text>
                </Pressable>
              </View>

              {spaces && spaces.length === 0 && (
                <Text className="text-[13px] leading-6 text-slate-500">Още нямаш connection space.</Text>
              )}

              {spaces?.map(({ space, members }) => (
                <Pressable
                  key={space.id}
                  onPress={() => setSelectedSpaceId(space.id)}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <View className="flex-row items-start justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-[16px] text-slate-100">{space.label || TYPE_LABELS[space.relationship_type]}</Text>
                      <Text className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {TYPE_LABELS[space.relationship_type]} · {members.length} член{members.length === 1 ? '' : 'а'}
                      </Text>
                    </View>
                    <Text className="text-[20px] font-light text-white">
                      {space.member_count >= 2 ? space.compatibility_summary.headline_score : '—'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {invites && invites.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Активни покани
                </Text>
                {invites.map((invite) => {
                  const cached = cachedLinks?.[invite.id]
                  return (
                    <View key={invite.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <Text className="text-[15px] text-slate-100">
                        {invite.invite_label || TYPE_LABELS[invite.relationship_type]}
                      </Text>
                      <Text className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                        {TYPE_LABELS[invite.relationship_type]}
                      </Text>
                      <View className="mt-3 flex-row flex-wrap" style={{ gap: 10 }}>
                        {cached?.shareUrl && (
                          <Pressable
                            onPress={() => {
                              hapticSelect()
                              Share.share({ message: cached.shareUrl }).catch(() => {})
                            }}
                            className="rounded-full border border-violet-300/30 px-4 py-1.5"
                            style={({ pressed }) => pressFeedback(pressed)}
                          >
                            <Text style={{ fontFamily: font.bodyMedium }} className="text-[9px] font-semibold uppercase tracking-[0.24em] text-violet-100">
                              Сподели
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          disabled={cancelInviteMutation.isPending}
                          onPress={() => {
                            hapticSelect()
                            cancelInviteMutation.mutate(invite.id, {
                              onError: () => Alert.alert('Нещо се обърка', 'Не успяхме да отменим поканата.'),
                            })
                          }}
                          className="rounded-full border border-white/15 px-4 py-1.5"
                          style={({ pressed }) => pressFeedback(pressed)}
                        >
                          <Text style={{ fontFamily: font.bodyMedium }} className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                            Отмени
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <SavedProfileDetailPanel
        profile={selectedProfile}
        report={report}
        relationshipType={relationshipType}
        onRelationshipTypeChange={setRelationshipType}
        isAnalyzing={analyzeMutation.isPending}
        isDeleting={deleteProfileMutation.isPending}
        onAnalyze={handleAnalyze}
        onDelete={handleDeleteProfile}
        onClose={() => setSelectedProfileId(null)}
      />

      <ConnectionSpaceDetailPanel
        view={selectedSpaceView}
        isGenerating={generateReportMutation.isPending}
        isArchiving={archiveMutation.isPending}
        onGenerateReport={handleGenerateReport}
        onArchive={handleArchive}
        onClose={() => setSelectedSpaceId(null)}
      />
    </SafeAreaView>
  )
}

/** Mirrors CircleHub.tsx's data.chartId === null gate, ported verbatim
 * now that both Connections and Crush exist (Batch 4 sub-batch A's
 * trimmed version — "connection spaces или" removed — is stale now that
 * Connections is built; restored to match web exactly). CTA reuses
 * rhythm.tsx's EmptyTransitsState copy (already existing, not new)
 * rather than web's slightly different "Въведи данните" for one-CTA-
 * phrase consistency across the app. */
function ChartGate() {
  const { push } = useGuardedNavigation()
  return (
    <View>
      <Text className="mb-5 text-[22px] font-light leading-[1.3] text-slate-100">
        Връзките започват от твоята карта.
      </Text>
      <Text style={{ fontFamily: font.body }} className="mb-6 text-[15px] font-light leading-[1.8] text-slate-400">
        Преди connection spaces или crush compatibility, Stellaeum трябва да има твоята натална карта като база.
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
 * Single emotional prompt + three relationship-type cards. All three are
 * wired now — Партньор/Приятел pre-select a relationship type for the
 * invite-creation screen, Crush opens the saved-profile form.
 */
function EmptyState({ onSelect }: { onSelect: (kind: RelationKind) => void }) {
  return (
    <>
      <Text className="mb-10 text-[22px] font-light leading-[1.3] text-slate-100">
        Кого мислиш в момента?
      </Text>

      <View className="mb-8 gap-3">
        {KINDS.map((kind) => (
          <Pressable
            key={kind.key}
            onPress={() => onSelect(kind)}
            className={`rounded-2xl border ${kind.border} ${kind.tint} px-5 py-6`}
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text style={{ fontFamily: font.bodyMedium }} className="text-[12px] font-semibold uppercase tracking-[0.3em] text-slate-100">
              {kind.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => onSelect(KINDS[2])}>
        <Text className="text-[13px] font-light leading-[1.7] text-slate-500">
          Или добави някого, когото искаш да разбереш по-добре.
        </Text>
      </Pressable>
    </>
  )
}
