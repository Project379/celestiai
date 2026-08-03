import { useAuth, useSignIn } from '@clerk/expo'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
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

// Bulgarian error mapping — first-pass draft, calibrated in commit 1.4d via bulgarian-skill
const ERROR_MESSAGES: Record<string, string> = {
  form_code_incorrect: 'Грешен код',
  form_code_expired: 'Кодът изтече. Изпрати нов.',
  form_param_format_invalid: 'Невалиден код',
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

type Strategy = 'totp' | 'phone_code' | 'backup_code'

export default function TwoFactorScreen() {
  const { isLoaded } = useAuth()
  const { signIn } = useSignIn()
  const router = useRouter()

  // Pick preferred strategy from supportedSecondFactors. Order: TOTP > SMS > backup.
  // If only backup is available, it becomes primary.
  const supported = useMemo(() => {
    const factors = signIn?.supportedSecondFactors ?? []
    return new Set(factors.map((f) => f.strategy))
  }, [signIn])

  const initialStrategy: Strategy = useMemo(() => {
    if (supported.has('totp')) return 'totp'
    if (supported.has('phone_code')) return 'phone_code'
    return 'backup_code'
  }, [supported])

  const [strategy, setStrategy] = useState<Strategy>(initialStrategy)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resentNotice, setResentNotice] = useState(false)

  // SMS challenge: send a code automatically on mount or when user switches to SMS.
  // TOTP and backup code don't need a server-side prepare step.
  useEffect(() => {
    if (!isLoaded || !signIn) return
    if (strategy !== 'phone_code') return

    let cancelled = false
    const send = async () => {
      try {
        const result = await signIn.mfa.sendPhoneCode()
        if (cancelled) return
        if (result.error) setError(getErrorMessage(result.error))
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      }
    }
    send()
    return () => {
      cancelled = true
    }
  }, [isLoaded, signIn, strategy])

  const handleVerify = async () => {
    if (!isLoaded || !signIn || submitting) return

    const expectedLength = strategy === 'backup_code' ? 8 : 6
    if (code.length < expectedLength) return

    setError(null)
    setSubmitting(true)

    try {
      let verifyResult: { error: { code?: string; message?: string } | null }
      if (strategy === 'totp') {
        verifyResult = await signIn.mfa.verifyTOTP({ code })
      } else if (strategy === 'phone_code') {
        verifyResult = await signIn.mfa.verifyPhoneCode({ code })
      } else {
        verifyResult = await signIn.mfa.verifyBackupCode({ code })
      }

      if (verifyResult.error) {
        setError(getErrorMessage(verifyResult.error))
        return
      }

      if (signIn.status !== 'complete') {
        setError(`Неочакван статус: ${signIn.status}`)
        return
      }

      const finResult = await signIn.finalize()
      if (finResult.error) {
        setError(getErrorMessage(finResult.error))
        return
      }

      router.replace('/')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!isLoaded || !signIn || resending || strategy !== 'phone_code') return
    setError(null)
    setResentNotice(false)
    setResending(true)
    try {
      const result = await signIn.mfa.sendPhoneCode()
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

  const switchStrategy = (next: Strategy) => {
    if (next === strategy) return
    setError(null)
    setResentNotice(false)
    setCode('')
    setStrategy(next)
  }

  const isBackup = strategy === 'backup_code'
  const canSubmit =
    isLoaded && !submitting && code.length === (isBackup ? 8 : 6)

  const bodyText =
    strategy === 'totp'
      ? 'Въведи 6-цифрения код от приложението за удостоверяване.'
      : strategy === 'phone_code'
        ? 'Изпратихме 6-цифрен код на телефона ти. Въведи го по-долу.'
        : 'Въведи един от резервните си кодове.'

  const fieldLabel = isBackup ? 'Резервен код' : 'Код'
  const placeholder = isBackup ? 'xxxxxxxx' : '000000'

  // Switch affordances: only show alternates the user has actually enrolled.
  const showBackupSwitch = !isBackup && supported.has('backup_code')
  const showSmsSwitch = isBackup && supported.has('phone_code')
  const showTotpSwitch = isBackup && supported.has('totp')

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
            Втора стъпка
          </Text>

          <Text className="mb-4 text-[26px] font-light leading-[1.3] text-slate-100">
            Потвърди самоличността си
          </Text>

          <Text className="mb-10 text-[14px] font-light leading-[1.7] text-slate-400">
            {bodyText}
          </Text>

          <View className="mb-8">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              {fieldLabel}
            </Text>
            <TextInput
              value={code}
              onChangeText={(t) => {
                if (isBackup) {
                  setCode(t.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))
                } else {
                  setCode(t.replace(/\D/g, '').slice(0, 6))
                }
              }}
              placeholder={placeholder}
              placeholderTextColor="#475569"
              keyboardType={isBackup ? 'default' : 'number-pad'}
              autoCapitalize="none"
              textContentType="oneTimeCode"
              maxLength={isBackup ? 8 : 6}
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
            onPress={handleVerify}
            disabled={!canSubmit}
            className={`rounded-2xl border py-4 ${
              canSubmit
                ? 'border-amber-300/40 bg-amber-300/5'
                : 'border-slate-800/60 bg-slate-900/40'
            }`}
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

          {strategy === 'phone_code' && (
            <Pressable
              onPress={handleResend}
              disabled={resending || submitting}
              className="mt-8"
            >
              <View className="flex-row items-center justify-center gap-3">
                {resending && <ActivityIndicator color="#94a3b8" size="small" />}
                <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-400">
                  {resending ? 'Изпращане' : 'Изпрати нов код'}
                </Text>
              </View>
            </Pressable>
          )}

          {showBackupSwitch && (
            <Pressable
              onPress={() => switchStrategy('backup_code')}
              disabled={submitting}
              className="mt-8"
            >
              <Text className="text-center font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-400">
                Използвай резервен код
              </Text>
            </Pressable>
          )}

          {showTotpSwitch && (
            <Pressable
              onPress={() => switchStrategy('totp')}
              disabled={submitting}
              className="mt-8"
            >
              <Text className="text-center font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-400">
                Използвай код от приложение
              </Text>
            </Pressable>
          )}

          {showSmsSwitch && (
            <Pressable
              onPress={() => switchStrategy('phone_code')}
              disabled={submitting}
              className="mt-8"
            >
              <Text className="text-center font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-400">
                Използвай SMS код
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
