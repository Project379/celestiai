import { useRef, useState } from 'react'
import { useReverification, useUser } from '@clerk/expo'
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
 * REVISIT-53, part 3 of 3 — email change.
 *
 * One user-facing operation, not two (founder ruling, 2026-08-04): the risk
 * isn't the abandoned unverified address, it's a user who enters the code,
 * sees "verified," and believes their login email changed when it hasn't.
 * `handleVerify` below calls attemptVerification AND the primaryEmailAddressId
 * promotion in the same handler, and only flips to the success screen once
 * BOTH have landed. A promotion failure after a successful verification
 * surfaces its own message — it is never reported as success.
 *
 * `pendingEmailRef` tracks the EmailAddressResource this flow itself created,
 * so a user who backs out of the code step and resubmits a different address
 * doesn't accumulate unverified rows on their account — the previous attempt
 * is destroyed before the new one is created. This does NOT touch any other
 * unverified email that might exist on the account for unrelated reasons.
 *
 * primaryEmailAddressId promotion is wrapped in useReverification per
 * Clerk's documented pattern: if this Clerk instance requires session
 * step-up for the promotion, onNeedsReverification fires. No custom
 * reverification UI is built here (would be its own sign-in-shaped feature);
 * instead the user sees an explicit Bulgarian message and is pointed at
 * sign-out/sign-in, rather than the call failing silently or reporting
 * false success.
 */
// Derived from useUser()'s own return type rather than importing
// EmailAddressResource from @clerk/types directly — that package isn't a
// direct dependency of apps/mobile and isn't reliably resolvable through
// pnpm's isolated node_modules from here.
type EmailAddressLike = NonNullable<ReturnType<typeof useUser>['user']>['emailAddresses'][number]

export default function SettingsEmailScreen() {
  const { user } = useUser()
  const router = useRouter()
  const backVisibility = useBackButtonVisibility()

  const [step, setStep] = useState<'enter' | 'verify' | 'success'>('enter')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [needsReverification, setNeedsReverification] = useState(false)

  const pendingEmailRef = useRef<EmailAddressLike | null>(null)
  // cancel() rejects the wrapped promise (Clerk's documented behavior) — this
  // ref lets the catch block in handleVerify tell "user declined step-up" apart
  // from a real failure, so it doesn't stomp the needsReverification message
  // below with a second, generic error line.
  const reverificationCancelledRef = useRef(false)

  const promotePrimary = useReverification(
    (emailAddressId: string) => user?.update({ primaryEmailAddressId: emailAddressId }),
    {
      onNeedsReverification: ({ cancel }) => {
        // No custom step-up UI (see header comment) — decline and surface a
        // real explanation rather than leaving the promise hanging.
        reverificationCancelledRef.current = true
        cancel()
        setNeedsReverification(true)
      },
    },
  )

  const canSubmitEmail = !submitting && /\S+@\S+\.\S+/.test(email.trim())
  const canSubmitCode = !submitting && code.length === 6

  const handleSubmitEmail = async () => {
    if (!canSubmitEmail) return
    setError(null)
    setSubmitting(true)
    try {
      // Clean up a previous attempt from THIS flow before creating a new one,
      // so retries don't accumulate unverified rows on the account.
      if (pendingEmailRef.current) {
        await pendingEmailRef.current.destroy().catch(() => {})
        pendingEmailRef.current = null
      }

      const created = await user?.createEmailAddress({ email: email.trim() })
      await user?.reload()
      const emailObj = user?.emailAddresses.find((a) => a.id === created?.id)
      if (!emailObj) throw new Error('missing-email-object')

      pendingEmailRef.current = emailObj
      await emailObj.prepareVerification({ strategy: 'email_code' })
      setCode('')
      setStep('verify')
    } catch (err) {
      setError(getClerkErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async () => {
    if (!canSubmitCode || !pendingEmailRef.current) return
    setError(null)
    setNeedsReverification(false)
    reverificationCancelledRef.current = false
    setSubmitting(true)
    try {
      const attempt = await pendingEmailRef.current.attemptVerification({ code })
      if (attempt.verification.status !== 'verified') {
        setError('Грешен код')
        return
      }

      // Same operation, same handler — promotion must land before this
      // reads as success to the user.
      const promoted = await promotePrimary(attempt.id)
      if (!promoted) {
        setError('Смяната не се завърши. Опитай отново.')
        return
      }

      pendingEmailRef.current = null
      setStep('success')
    } catch (err) {
      // cancel() inside onNeedsReverification rejects this promise by
      // design — that path already set needsReverification's own message
      // above the button, so it's deliberately skipped here rather than
      // also showing a second, generic error line under it.
      if (!reverificationCancelledRef.current) setError(getClerkErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (submitting || !pendingEmailRef.current) return
    setError(null)
    setSubmitting(true)
    try {
      await pendingEmailRef.current.prepareVerification({ strategy: 'email_code' })
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
          {step === 'enter' && (
            <>
              <Text className="mb-4 text-[26px] font-light leading-[1.3] text-slate-100">Имейл</Text>
              <Text className="mb-8 text-[13px] leading-[1.7] text-slate-400">
                Текущ имейл: {user?.primaryEmailAddress?.emailAddress ?? '—'}
              </Text>

              <View className="mb-8">
                <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
                  Нов имейл
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="ime@primer.bg"
                  placeholderTextColor="#475569"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
                />
              </View>

              {error && <Text className="mb-6 text-[13px] leading-[1.6] text-rose-400">{error}</Text>}

              <Pressable
                onPress={() => {
                  hapticInvite()
                  handleSubmitEmail()
                }}
                disabled={!canSubmitEmail}
                className={`rounded-2xl border py-4 ${
                  canSubmitEmail ? 'border-bronze/40 bg-bronze/5' : 'border-slate-800/60 bg-slate-900/40'
                }`}
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <View className="flex-row items-center justify-center gap-3">
                  {submitting && <ActivityIndicator color="#fcd34d" size="small" />}
                  <Text
                    className={`font-cinzel text-[12px] font-semibold uppercase tracking-[0.32em] ${
                      canSubmitEmail ? 'text-bronze-text' : 'text-slate-600'
                    }`}
                  >
                    {submitting ? 'Изпращане' : 'Изпрати код'}
                  </Text>
                </View>
              </Pressable>
            </>
          )}

          {step === 'verify' && (
            <>
              <Text className="mb-4 text-[26px] font-light leading-[1.3] text-slate-100">
                Потвърди новия имейл
              </Text>
              <Text className="mb-10 text-[14px] font-light leading-[1.7] text-slate-400">
                Изпратихме 6-цифрен код на {email.trim()}. Въведи го по-долу — смяната ще стане, щом
                кодът бъде потвърден.
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

              {error && <Text className="mb-6 text-[13px] leading-[1.6] text-rose-400">{error}</Text>}

              {needsReverification && (
                <Text className="mb-6 text-[13px] leading-[1.6] text-bronze">
                  За тази промяна е нужно да потвърдиш самоличността си наново. Излез от акаунта и влез
                  отново, после опитай пак.
                </Text>
              )}

              <Pressable
                onPress={() => {
                  hapticInvite()
                  handleVerify()
                }}
                disabled={!canSubmitCode}
                className={`rounded-2xl border py-4 ${
                  canSubmitCode ? 'border-bronze/40 bg-bronze/5' : 'border-slate-800/60 bg-slate-900/40'
                }`}
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <View className="flex-row items-center justify-center gap-3">
                  {submitting && <ActivityIndicator color="#fcd34d" size="small" />}
                  <Text
                    className={`font-cinzel text-[12px] font-semibold uppercase tracking-[0.32em] ${
                      canSubmitCode ? 'text-bronze-text' : 'text-slate-600'
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
                disabled={submitting}
                className="mt-8"
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text className="text-center font-cinzel text-[10px] uppercase tracking-[0.32em] text-slate-400">
                  Изпрати нов код
                </Text>
              </Pressable>
            </>
          )}

          {step === 'success' && (
            <>
              <Text className="mb-4 text-[26px] font-light leading-[1.3] text-slate-100">Готово</Text>
              <Text className="mb-10 text-[14px] font-light leading-[1.7] text-slate-400">
                Имейлът ти беше сменен на {email.trim()}.
              </Text>
              <Pressable
                onPress={() => {
                  hapticSelect()
                  router.back()
                }}
                className="rounded-2xl border border-bronze/40 bg-bronze/5 py-4"
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text className="text-center font-cinzel text-[12px] font-semibold uppercase tracking-[0.32em] text-bronze-text">
                  Назад
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
