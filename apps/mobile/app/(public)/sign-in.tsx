import { useAuth, useSignIn } from '@clerk/expo'
import { Link, useRouter } from 'expo-router'
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
  form_identifier_not_found: 'Няма профил с този имейл',
  form_password_incorrect: 'Грешна парола',
  form_param_format_invalid: 'Невалиден имейл',
  form_param_nil: 'Попълни всички полета',
  too_many_attempts: 'Твърде много опити. Изчакай малко.',
}

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Нещо се обърка. Опитай отново.'
  const e = err as { code?: string; message?: string; errors?: { code?: string; message?: string }[] }
  // Future API: { code, message } directly on the error
  if (e.code && ERROR_MESSAGES[e.code]) return ERROR_MESSAGES[e.code]
  // Thrown errors may have nested errors[] array (legacy Clerk pattern)
  const nested = e.errors?.[0]
  if (nested?.code && ERROR_MESSAGES[nested.code]) return ERROR_MESSAGES[nested.code]
  return e.message || nested?.message || 'Нещо се обърка. Опитай отново.'
}

export default function SignInScreen() {
  const { isLoaded } = useAuth()
  const { signIn } = useSignIn()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
                {submitting ? 'Влизане' : 'Влез'}
              </Text>
            </View>
          </Pressable>

          <View className="mt-10 flex-row items-center justify-center gap-2">
            <Text className="text-[13px] text-slate-500">Нямаш профил?</Text>
            <Link href={'/sign-up' as never} asChild>
              <Pressable onPress={() => hapticSelect()} style={({ pressed }) => pressFeedback(pressed)}>
                <Text className="font-cinzel text-[10px] uppercase tracking-[0.32em] text-amber-300">
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
