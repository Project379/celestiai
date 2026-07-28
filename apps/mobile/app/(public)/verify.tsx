import { useAuth, useSignUp } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useState } from 'react'
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

import { pressFeedback } from '@/components/design-system/tokens'
import { hapticInvite, hapticSelect } from '@/lib/haptics'

// Bulgarian error mapping — first-pass draft, calibrated in commit 1.4d via bulgarian-skill
const ERROR_MESSAGES: Record<string, string> = {
  form_code_incorrect: 'Грешен код',
  form_code_expired: 'Кодът изтече. Изпрати нов.',
  verification_already_verified: 'Вече е потвърден',
  verification_expired: 'Кодът изтече. Изпрати нов.',
  verification_failed: 'Потвърждението не успя. Опитай отново.',
  too_many_attempts: 'Твърде много опити. Изчакай малко.',
}

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Нещо се обърка. Опитай отново.'
  const e = err as { code?: string; message?: string; errors?: { code?: string; message?: string }[] }
  if (e.code && ERROR_MESSAGES[e.code]) return ERROR_MESSAGES[e.code]
  const nested = e.errors?.[0]
  if (nested?.code && ERROR_MESSAGES[nested.code]) return ERROR_MESSAGES[nested.code]
  return e.message || nested?.message || 'Нещо се обърка. Опитай отново.'
}

export default function VerifyScreen() {
  const { isLoaded } = useAuth()
  const { signUp } = useSignUp()
  const router = useRouter()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentNotice, setResentNotice] = useState(false)

  const handleVerify = async () => {
    if (!isLoaded || submitting || code.length !== 6) return
    setError(null)
    setSubmitting(true)

    try {
      const verifyResult = await signUp.verifications.verifyEmailCode({ code })
      if (verifyResult.error) {
        setError(getErrorMessage(verifyResult.error))
        return
      }

      if (signUp.status !== 'complete') {
        setError(`Неочакван статус: ${signUp.status}`)
        return
      }

      const finResult = await signUp.finalize()
      if (finResult.error) {
        setError(getErrorMessage(finResult.error))
        return
      }

      // B.0g-3 forced-wizard: route new signups directly to the wizard instead
      // of landing on Днес's empty-state. (authed)/_layout.tsx's chart-existence
      // useEffect also fires the same redirect for non-signup launches; this
      // direct route avoids a Днес-flicker for the fresh-signup path.
      router.replace('/wizard/date')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!isLoaded || resending) return
    setError(null)
    setResentNotice(false)
    setResending(true)

    try {
      const result = await signUp.verifications.sendEmailCode()
      if (result.error) {
        setError(getErrorMessage(result.error))
        return
      }
      setResentNotice(true)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setResending(false)
    }
  }

  const canSubmit = isLoaded && code.length === 6 && !submitting

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-6 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Потвърждение
          </Text>

          <Text className="mb-4 text-[26px] font-light leading-[1.3] text-slate-100">
            Потвърди имейла
          </Text>

          <Text className="mb-10 text-[14px] font-light leading-[1.7] text-slate-400">
            Изпратихме 6-цифрен код на имейла ти. Въведи го по-долу.
          </Text>

          <View className="mb-8">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Код
            </Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              placeholderTextColor="#475569"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={6}
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-center text-[22px] tracking-[0.4em] text-slate-100"
            />
          </View>

          {error && (
            <Text className="mb-6 text-[13px] leading-[1.6] text-rose-400">
              {error}
            </Text>
          )}

          {resentNotice && (
            <Text className="mb-6 text-[13px] leading-[1.6] text-amber-300">
              Изпратихме нов код
            </Text>
          )}

          <Pressable
            onPress={() => {
              hapticInvite()
              handleVerify()
            }}
            disabled={!canSubmit}
            className={`rounded-2xl border py-4 ${
              canSubmit
                ? 'border-amber-300/40 bg-amber-300/5'
                : 'border-slate-800/60 bg-slate-900/40'
            }`}
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <View className="flex-row items-center justify-center gap-3">
              {submitting && <ActivityIndicator color="#fcd34d" size="small" />}
              <Text
                className={`font-cinzel text-[12px] font-semibold uppercase tracking-[0.32em] ${
                  canSubmit ? 'text-amber-200' : 'text-slate-600'
                }`}
              >
                {submitting ? 'Потвърждаване' : 'Потвърди'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              hapticSelect()
              handleResend()
            }}
            disabled={resending || submitting}
            className="mt-8"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <View className="flex-row items-center justify-center gap-3">
              {resending && <ActivityIndicator color="#94a3b8" size="small" />}
              <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-400">
                {resending ? 'Изпращане' : 'Изпрати нов код'}
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
