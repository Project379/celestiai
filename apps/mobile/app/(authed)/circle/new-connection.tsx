import { useState } from 'react'
import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'

import type { RelationshipType } from '@stellaeum/core/relationships/types'
import { BackButton } from '@/components/design-system/BackButton'
import { font, pressFeedback } from '@/components/design-system/tokens'
import { hapticInvite, hapticSelect } from '@/lib/haptics'
import { ApiError } from '@/lib/api/client'
import { useCreateInvite } from '@/hooks/useCreateInvite'

const TYPE_LABELS: Record<RelationshipType, string> = {
  romantic: 'Романтична',
  friendship: 'Приятелска',
  work: 'Работна',
  family: 'Семейна',
}

const TYPE_BLURB: Record<RelationshipType, string> = {
  romantic: 'Точно двама души, само една активна романтична връзка на потребител.',
  friendship: 'Приятелски кръг, към който може да се добавят още хора.',
  work: 'Работен кръг за екипна динамика и общ ритъм.',
  family: 'Семейно пространство с общо табло и групов прочит.',
}

/**
 * /circle/new-connection — create a connection invite. Mobile port of
 * CircleHub.tsx's "Ново пространство" card. Accepts an optional
 * `relationshipType` param (the ратified §12.2 empty-state's Партньор/
 * Приятел cards pre-select romantic/friendship) and an optional
 * `existingSpaceId` param ("Покани още човек" from a space's detail).
 *
 * Web offers two post-create actions on the resulting link — "Копирай
 * линка" (Clipboard) and "Сподели" (native share). Mobile ships share
 * only, via RN's built-in Share API — same "no new dep" precedent as
 * apps/mobile/lib/diary/export.ts — rather than adding expo-clipboard for
 * a copy button. Both platforms' native share sheets already surface a
 * copy option, so this isn't a lost capability, just one fewer explicit
 * button. Flagged as a simplification, not silently assumed equivalent.
 */
export default function NewConnectionScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ relationshipType?: string; existingSpaceId?: string }>()
  const initialType = (params.relationshipType as RelationshipType) || 'romantic'
  const existingSpaceId = params.existingSpaceId || undefined

  const [relationshipType, setRelationshipType] = useState<RelationshipType>(initialType)
  const [label, setLabel] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const createMutation = useCreateInvite()

  const handleSubmit = () => {
    setServerError(null)
    createMutation.mutate(
      { label: label.trim() || undefined, relationshipType, existingSpaceId },
      {
        onSuccess: async (result) => {
          hapticInvite()
          try {
            await Share.share({ message: result.shareUrl })
          } catch {
            // User dismissed the share sheet — the link is already cached
            // locally (useCreateInvite's onSuccess) and visible in the
            // pending-invites list, so nothing is lost.
          }
          router.back()
        },
        onError: (error) => {
          const msg =
            error instanceof ApiError
              ? ((error.body as { error?: string } | null)?.error ?? 'Не успяхме да създадем поканата.')
              : 'Не успяхме да създадем поканата.'
          setServerError(msg)
        },
      },
    )
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <BackButton />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 64 }}>
        <Text style={{ fontFamily: font.bodyMedium }} className="mb-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-violet-200">
          Ново пространство
        </Text>

        {serverError && (
          <View className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3">
            <Text className="text-[13px] text-rose-100">{serverError}</Text>
          </View>
        )}

        <View className="mb-6 flex-row flex-wrap" style={{ gap: 8 }}>
          {(Object.entries(TYPE_LABELS) as [RelationshipType, string][]).map(([value, typeLabel]) => {
            const active = relationshipType === value
            return (
              <Pressable
                key={value}
                onPress={() => {
                  hapticSelect()
                  setRelationshipType(value)
                }}
                disabled={!!existingSpaceId}
                className={`rounded-full border px-4 py-2 ${
                  active ? 'border-violet-300/45 bg-violet-500/10' : 'border-white/10 bg-black/20'
                }`}
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text className={`text-[12px] ${active ? 'text-violet-100' : 'text-slate-400'}`}>{typeLabel}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text className="mb-6 text-[13px] leading-6 text-slate-400">{TYPE_BLURB[relationshipType]}</Text>

        <View className="mb-8">
          <Text style={{ fontFamily: font.bodyMedium }} className="mb-2 text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Име (по избор)
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder={
              relationshipType === 'romantic'
                ? 'Ние & ...'
                : relationshipType === 'friendship'
                  ? 'Име на приятелския кръг'
                  : relationshipType === 'work'
                    ? 'Име на екипа'
                    : 'Име на пространството'
            }
            placeholderTextColor="#475569"
            className="border-b border-white/[0.08] px-1 py-2.5 text-[16px] text-slate-100"
          />
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          className="self-start rounded-full border border-violet-300/35 bg-violet-500/10 px-5 py-2.5"
          style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: createMutation.isPending ? 0.5 : pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.3em] text-violet-100">
            {createMutation.isPending ? 'Създаване...' : 'Създай покана'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
