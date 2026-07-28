import { useClerk } from '@clerk/expo'
import Constants from 'expo-constants'
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'

import { BackButton } from '@/components/design-system/BackButton'
import { pressFeedback } from '@/components/design-system/tokens'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { useAccountDeletion } from '@/hooks/useAccountDeletion'
import { useApiClient } from '@/lib/api/client'
import { shareAccountExport } from '@/lib/gdpr/export'
import { hapticSelect } from '@/lib/haptics'

const PRIVACY_URL = 'https://stellaeum.com/privacy'

/**
 * /you/settings — P.10 close. Replaces the P.5 stub. D5 amended
 * (2026-07-21): Clerk RN <UserProfile> is a native TurboModule, unloadable
 * in the current Expo Go runtime and unstyleable even under Dev Client —
 * ruled out. This ships the custom app-specific section only; profile-
 * field editing (name/email/password) is deferred to REVISIT-53.
 *
 * P.10-a: sign-out (relocated from you.tsx, now confirmed via Alert.alert
 * — it previously had none) + legal link + app version.
 * P.10-b (this commit): data export + account deletion, both destructive-
 * action-adjacent and both wired to B.0h's previously-unwired GDPR routes.
 * Deletion confirm states the concrete computed date, not a vague "30
 * days" (matches web's DataAccountPage.tsx dialog). The persistent
 * pending-deletion banner (mounted in (authed)/_layout.tsx, not here)
 * owns cancellation — this screen only requests deletion.
 */
export default function SettingsScreen() {
  const { signOut } = useClerk()
  const { apiFetch } = useApiClient()
  const { status, requestDeletion } = useAccountDeletion()

  const handleSignOut = () => {
    Alert.alert(
      'Излизане от профила',
      'Наистина ли искаш да излезеш от профила си?',
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Излез',
          style: 'destructive',
          onPress: () => {
            void signOut().catch((err) => {
              if (__DEV__) console.warn('[SettingsScreen] signOut failed:', err)
            })
          },
        },
      ],
    )
  }

  const handleExport = () => {
    shareAccountExport(apiFetch).catch((err) => {
      if (__DEV__) console.warn('[SettingsScreen] export failed:', err)
      Alert.alert('Нещо се обърка', 'Не успяхме да подготвим данните ти. Опитай отново.')
    })
  }

  const handleDeleteAccount = () => {
    const scheduledDate = new Intl.DateTimeFormat('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Europe/Sofia',
    }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

    Alert.alert(
      'Изтриване на акаунта',
      `Акаунтът и всички твои данни ще бъдат изтрити на ${scheduledDate}. До тогава можеш да откажеш по всяко време. След тази дата данните не могат да бъдат възстановени.`,
      [
        { text: 'Отказ', style: 'cancel' },
        {
          text: 'Изтрий акаунта',
          style: 'destructive',
          onPress: () => requestDeletion.mutate(),
        },
      ],
    )
  }

  const deletionPending = Boolean(status.data?.deletionScheduledAt)
  const appVersion = Constants.expoConfig?.version ?? '—'

  const backVisibility = useBackButtonVisibility()

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, zIndex: 10 }, backVisibility.style]}
        pointerEvents={backVisibility.pointerEvents}
      >
        <BackButton />
      </Animated.View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
        onScroll={backVisibility.onScroll}
        scrollEventThrottle={100}
      >
        <View className="mb-10">
          <Text className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Данни и акаунт
          </Text>
          <Pressable
            onPress={() => {
              hapticSelect()
              handleExport()
            }}
            className="flex-row items-center justify-between border-b border-slate-800/60 py-4"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text className="text-[14px] text-slate-200">Изтегли данните си</Text>
            <Text className="text-[14px] text-slate-500">›</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapticSelect()
              handleDeleteAccount()
            }}
            disabled={deletionPending}
            className="flex-row items-center justify-between py-4"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text className={`text-[14px] ${deletionPending ? 'text-slate-600' : 'text-rose-300/90'}`}>
              {deletionPending ? 'Изтриването е заявено' : 'Изтрий акаунта'}
            </Text>
            {!deletionPending && <Text className="text-[14px] text-rose-300/60">›</Text>}
          </Pressable>
        </View>

        <View>
          <Text className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Правно
          </Text>
          <Pressable
            onPress={() => {
              hapticSelect()
              Linking.openURL(PRIVACY_URL)
            }}
            className="flex-row items-center justify-between border-b border-slate-800/60 py-4"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text className="text-[14px] text-slate-200">Политика за поверителност</Text>
            <Text className="text-[14px] text-slate-500">›</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            hapticSelect()
            handleSignOut()
          }}
          accessibilityRole="button"
          accessibilityLabel="Излез"
          className="mt-16 self-center rounded-2xl border border-slate-700/60 px-8 py-3"
          style={({ pressed }) => pressFeedback(pressed)}
        >
          <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-200">
            Излез
          </Text>
        </Pressable>

        <Text className="mt-8 text-center font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-600">
          Stellaeum · v{appVersion}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
