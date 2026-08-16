import { useState } from 'react'
import { useUser } from '@clerk/expo'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'
import { useRouter } from 'expo-router'

import { BackButton } from '@/components/design-system/BackButton'
import { pressFeedback } from '@/components/design-system/tokens'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { hapticInvite, hapticSelect } from '@/lib/haptics'
import { getClerkErrorMessage } from '@/lib/clerk/errorMessages'

/**
 * REVISIT-53, part 2 of 3 — password change.
 *
 * signOutOfOtherSessions is hardcoded true, not a toggle (founder ruling,
 * 2026-08-04): a password change is usually a response to a suspected
 * compromise, and an opt-out checkbox is a way to get the unsafe outcome by
 * accident. The warning line below states this plainly before the user
 * commits, in the informal register — it is disclosure, not a choice.
 */
export default function SettingsPasswordScreen() {
  const { user } = useUser()
  const router = useRouter()
  const backVisibility = useBackButtonVisibility()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !submitting && currentPassword.length > 0 && newPassword.length >= 8

  const handleSave = async () => {
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      await user?.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      })
      router.back()
    } catch (err) {
      setError(getClerkErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, zIndex: 10 }, backVisibility.style]}
        pointerEvents={backVisibility.pointerEvents}
      >
        <BackButton />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 72, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
          onScroll={backVisibility.onScroll}
          scrollEventThrottle={100}
        >
          <Text className="mb-4 text-[26px] font-light leading-[1.3] text-slate-100">Парола</Text>

          <Text className="mb-8 text-[13px] leading-[1.7] text-slate-400">
            Смяната на паролата ще те отпише от всички други устройства, на които си влязъл — само това
            устройство остава активно.
          </Text>

          <View className="mb-6">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Текуща парола
            </Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Текуща парола"
              placeholderTextColor="#475569"
              secureTextEntry
              autoCapitalize="none"
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
            />
          </View>

          <View className="mb-8">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Нова парола
            </Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Нова парола"
              placeholderTextColor="#475569"
              secureTextEntry
              autoCapitalize="none"
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
            />
          </View>

          {error && <Text className="mb-6 text-[13px] leading-[1.6] text-rose-400">{error}</Text>}

          <Pressable
            onPress={() => {
              hapticInvite()
              handleSave()
            }}
            disabled={!canSubmit}
            className={`rounded-2xl border py-4 ${
              canSubmit ? 'border-bronze/40 bg-bronze/5' : 'border-slate-800/60 bg-slate-900/40'
            }`}
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <View className="flex-row items-center justify-center gap-3">
              {submitting && <ActivityIndicator color="#fcd34d" size="small" />}
              <Text
                className={`font-cinzel text-[12px] font-semibold uppercase tracking-[0.32em] ${
                  canSubmit ? 'text-bronze-text' : 'text-slate-600'
                }`}
              >
                {submitting ? 'Смяна' : 'Смени паролата'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              hapticSelect()
              router.back()
            }}
            disabled={submitting}
            className="mt-6"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <Text className="text-center font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-500">
              Отказ
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
