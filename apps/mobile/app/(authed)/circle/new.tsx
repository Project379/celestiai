import { ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

import type { BirthData } from '@stellaeum/core/charts/schemas'
import { SavedProfileForm } from '@/components/circle/SavedProfileForm'
import { BackButton } from '@/components/design-system/BackButton'
import { font } from '@/components/design-system/tokens'
import { useCreateSavedProfile } from '@/hooks/useCreateSavedProfile'

/**
 * /circle/new — create a crush profile. Mobile port of
 * apps/web/components/circle/SavedProfileForm.tsx's mount site
 * (CircleHub.tsx's "crush" surface). A dedicated pushed screen rather than
 * inline on the Кръг tab root, matching how the wizard collects birth data
 * (dedicated screens, not an inline form on a list screen) — the form has
 * the same field count as a full wizard pass.
 */
export default function NewSavedProfileScreen() {
  const router = useRouter()
  const createMutation = useCreateSavedProfile()

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <BackButton />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 64 }}>
        <View className="mb-8">
          <Text style={{ fontFamily: font.bodyMedium }} className="mb-3 text-[10px] font-semibold uppercase tracking-[0.34em] text-rose-200">
            Crush compatibility
          </Text>
          <Text className="max-w-xl text-[16px] font-light leading-8 text-slate-300">
            Запази профил на човек, който те интересува, и виж еднопосочен прочит от твоя гледна точка.
          </Text>
        </View>

        <SavedProfileForm
          isSubmitting={createMutation.isPending}
          onSubmit={async (data: BirthData) => {
            await createMutation.mutateAsync(data)
            router.back()
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}
