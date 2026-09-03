import { useAuth, useSignUp } from '@clerk/expo'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Link, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
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
import { resolveClerkError } from '@/lib/clerk/errorMessages'
import { useAppleSignIn, useGoogleSignIn } from '@/lib/clerk/oauth'
import { hapticInvite, hapticSelect } from '@/lib/haptics'
import { logError } from '@/lib/monitoring/logError'

// Bulgarian error mapping — first-pass draft, calibrated in commit 1.4d via bulgarian-skill
const ERROR_MESSAGES: Record<string, string> = {
  form_identifier_exists: 'Вече има профил с този имейл',
  form_param_format_invalid: 'Невалиден имейл',
  form_password_pwned: 'Тази парола е твърде често срещана. Избери по-силна.',
  form_password_length_too_short: 'Паролата е твърде кратка (мин. 8 символа)',
  form_password_size_in_bytes_exceeded: 'Паролата е твърде дълга',
  form_param_nil: 'Попълни всички полета',
  too_many_attempts: 'Твърде много опити. Изчакай малко.',
}

function getErrorMessage(err: unknown): string {
  const mapped = resolveClerkError(err, ERROR_MESSAGES)
  if (!mapped) logError('ERR-AUTH-SIGNUP', err)
  return mapped ?? 'Нещо се обърка. Опитай отново.'
}

export default function SignUpScreen() {
  const { isLoaded } = useAuth()
  const { signUp } = useSignUp()
  const { signInWithGoogle } = useGoogleSignIn()
  const { signInWithApple } = useAppleSignIn()
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [appleSubmitting, setAppleSubmitting] = useState(false)
  // See sign-in.tsx: gate on the native availability check, not Platform.OS
  // alone (Expo Go / iOS < 13 return false).
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'ios') return
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAuthAvailable)
      .catch(() => setAppleAuthAvailable(false))
  }, [])

  const handleGoogleSignIn = async () => {
    if (googleSubmitting) return
    setError(null)
    setGoogleSubmitting(true)
    try {
      const result = await signInWithGoogle()
      if (result.status === 'error') {
        setError(result.message)
      } else if (result.status === 'success') {
        router.replace('/')
      }
      // 'cancelled': user dismissed the sheet — no error, nothing to do
    } finally {
      setGoogleSubmitting(false)
    }
  }

  const handleAppleSignIn = async () => {
    if (appleSubmitting) return
    setError(null)
    setAppleSubmitting(true)
    try {
      const result = await signInWithApple()
      if (result.status === 'error') {
        setError(result.message)
      } else if (result.status === 'success') {
        router.replace('/')
      }
      // 'cancelled': user dismissed the sheet — no error, nothing to do
    } finally {
      setAppleSubmitting(false)
    }
  }

  const handleSignUp = async () => {
    if (!isLoaded || submitting) return
    setError(null)

    if (password !== confirmPassword) {
      setError('Паролите не съвпадат')
      return
    }

    setSubmitting(true)

    try {
      // Step 1: create sign-up with name + email + password (one-shot — all fields
      // known). firstName + lastName required since Clerk Dashboard "Require first
      // and last name" was toggled ON 2026-05-12 (REVISIT-16 closure prep).
      const createResult = await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password,
      })
      if (createResult.error) {
        setError(getErrorMessage(createResult.error))
        return
      }

      // Step 2: send 6-digit code to the email address
      const sendResult = await signUp.verifications.sendEmailCode()
      if (sendResult.error) {
        setError(getErrorMessage(sendResult.error))
        return
      }

      // Navigate to verify screen — signUp resource is shared via Clerk client,
      // so verify.tsx accesses the same in-progress sign-up via useSignUp()
      router.replace('/verify' as never)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    isLoaded &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.length > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    !submitting

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
            Регистрация
          </Text>

          <Text className="mb-12 text-[26px] font-light leading-[1.3] text-slate-100">
            Създай профил
          </Text>

          {/* Име + Фамилия — labels mirror Clerk bgBG formFieldLabel__firstName /
              formFieldLabel__lastName (D2 mirror discipline, no net-new strings).
              Required since Clerk Dashboard "Require first and last name" toggled
              ON 2026-05-12; mobile must collect both before signUp.create. */}
          <View className="mb-5">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Име
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder=""
              placeholderTextColor="#475569"
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
            />
          </View>

          <View className="mb-5">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Фамилия
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder=""
              placeholderTextColor="#475569"
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
            />
          </View>

          <View className="mb-5">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Имейл
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ime@primer.bg"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
            />
          </View>

          <View className="mb-3">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Парола
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              textContentType="newPassword"
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
            />
          </View>
          <Text className="mb-5 text-[12px] leading-[1.5] text-slate-500">
            Минимум 8 символа
          </Text>

          <View className="mb-8">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Потвърди парола
            </Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              textContentType="newPassword"
              editable={!submitting}
              className="rounded-2xl border border-slate-700/60 px-4 py-4 text-[16px] text-slate-100"
            />
          </View>

          {error && (
            <Text className="mb-6 text-[13px] leading-[1.6] text-rose-400">
              {error}
            </Text>
          )}

          <Pressable
            onPress={() => {
              hapticInvite()
              handleSignUp()
            }}
            disabled={!canSubmit}
            className={`rounded-2xl border py-4 ${
              canSubmit
                ? 'border-bronze/40 bg-bronze/5'
                : 'border-slate-800/60 bg-slate-900/40'
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
                {submitting ? 'Създаване' : 'Създай'}
              </Text>
            </View>
          </Pressable>

          <View className="my-8 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-slate-800/60" />
            <Text className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-600">
              или
            </Text>
            <View className="h-px flex-1 bg-slate-800/60" />
          </View>

          <Pressable
            onPress={() => {
              hapticSelect()
              handleGoogleSignIn()
            }}
            disabled={!isLoaded || googleSubmitting}
            className="rounded-2xl border border-slate-700/60 bg-slate-900/40 py-4"
            style={({ pressed }) => pressFeedback(pressed)}
          >
            <View className="flex-row items-center justify-center gap-3">
              {googleSubmitting && <ActivityIndicator color="#e2e8f0" size="small" />}
              <Text className="font-cinzel text-[12px] font-semibold uppercase tracking-[0.32em] text-slate-200">
                {googleSubmitting ? 'Влизане' : 'Продължи с Google'}
              </Text>
            </View>
          </Pressable>

          {/* Sign in with Apple — iOS only. See sign-in.tsx for the HIG
              rationale (WHITE style, SIGN_UP type here, 16px corner radius,
              no restyling, native-localised label). */}
          {Platform.OS === 'ios' && appleAuthAvailable && (
            <View className="mt-4">
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                }
                cornerRadius={16}
                style={{ width: '100%', height: 52 }}
                onPress={() => {
                  hapticSelect()
                  handleAppleSignIn()
                }}
              />
            </View>
          )}

          <View className="mt-10 flex-row items-center justify-center gap-2">
            <Text className="text-[13px] text-slate-500">Имаш профил?</Text>
            <Link href={'/sign-in' as never} asChild>
              <Pressable onPress={() => hapticSelect()} style={({ pressed }) => pressFeedback(pressed)}>
                <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-bronze">
                  Влез
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
