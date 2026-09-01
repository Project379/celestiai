import { useAuth, useSignIn } from '@clerk/expo'
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
  form_identifier_not_found: 'Няма профил с този имейл',
  form_password_incorrect: 'Грешна парола',
  form_param_format_invalid: 'Невалиден имейл',
  form_param_nil: 'Попълни всички полета',
  too_many_attempts: 'Твърде много опити. Изчакай малко.',
}

function getErrorMessage(err: unknown): string {
  const mapped = resolveClerkError(err, ERROR_MESSAGES)
  if (!mapped) logError('ERR-AUTH-SIGNIN', err)
  return mapped ?? 'Нещо се обърка. Опитай отново.'
}

export default function SignInScreen() {
  const { isLoaded } = useAuth()
  const { signIn } = useSignIn()
  const { signInWithGoogle } = useGoogleSignIn()
  const { signInWithApple } = useAppleSignIn()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const [appleSubmitting, setAppleSubmitting] = useState(false)
  // Gate the Apple button on the real native check, not just Platform.OS:
  // isAvailableAsync is false in Expo Go and on iOS < 13. Android never
  // sets it true. Apple's HIG: show the button only where SIWA works.
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

  const handleSignIn = async () => {
    if (!isLoaded || submitting) return
    setError(null)
    setSubmitting(true)

    try {
      // Clerk v3 Future API multi-step flow.
      // Step 1: create sign-in attempt with identifier (email)
      const createResult = await signIn.create({ identifier: email.trim() })
      if (createResult.error) {
        setError(getErrorMessage(createResult.error))
        return
      }

      // Step 2: submit password as first factor
      const pwResult = await signIn.password({ password })
      if (pwResult.error) {
        setError(getErrorMessage(pwResult.error))
        return
      }

      // Step 3: branch on status. 2FA-enabled accounts return 'needs_second_factor'
      // and the in-progress signIn is shared via Clerk client to /two-factor.
      if (signIn.status === 'needs_second_factor') {
        router.replace('/two-factor' as never)
        return
      }

      if (signIn.status !== 'complete') {
        setError(`Неочакван статус: ${signIn.status}`)
        return
      }

      // Step 4: finalize to set active session (v3 replacement for setActive)
      const finResult = await signIn.finalize()
      if (finResult.error) {
        setError(getErrorMessage(finResult.error))
        return
      }

      router.replace('/')
    } catch (err) {
      // Defensive: catch any thrown errors (network failure, unexpected runtime issues)
      // even though the v3 Future API returns errors as values
      setError(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = isLoaded && email.length > 0 && password.length > 0 && !submitting

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
            Вход
          </Text>

          <Text className="mb-12 text-[26px] font-light leading-[1.3] text-slate-100">
            Влез в Stellaeum
          </Text>

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

          <View className="mb-8">
            <Text className="mb-2 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
              Парола
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#475569"
              autoCapitalize="none"
              autoComplete="current-password"
              secureTextEntry
              textContentType="password"
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
              handleSignIn()
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
                {submitting ? 'Влизане' : 'Влез'}
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
                {googleSubmitting ? 'Влизане' : 'Влез с Google'}
              </Text>
            </View>
          </Pressable>

          {/* Sign in with Apple — iOS only, and only where the native check
              passes. Apple's HIG governs the button's look: we set an
              approved style (WHITE — highest contrast on the near-black bg),
              type (SIGN_IN), and a 16px corner radius to match the app's
              rounded-2xl controls. No further restyling is permitted and a
              custom button would fail App Review (Guideline 4.8). The label
              text is rendered by Apple's native component in the device
              locale.
              STELLAEUM_PLACEHOLDER: SIWA-BG-LABEL — whether that native
              label renders Bulgarian or falls back to English on a
              bg-locale device is unverifiable without a device build
              (Phase A has no build). Twin button in sign-up.tsx. See
              .planning/PLACEHOLDERS.md. */}
          {Platform.OS === 'ios' && appleAuthAvailable && (
            <View className="mt-4">
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
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
            <Text className="text-[13px] text-slate-500">Нямаш профил?</Text>
            <Link href={'/sign-up' as never} asChild>
              <Pressable onPress={() => hapticSelect()} style={({ pressed }) => pressFeedback(pressed)}>
                <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-bronze">
                  Създай
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
