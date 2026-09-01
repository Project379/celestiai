import { useClerk, useSSO } from '@clerk/expo'
import { useSignInWithApple } from '@clerk/expo/apple'
import * as AuthSession from 'expo-auth-session'

import { logError } from '@/lib/monitoring/logError'
import { OAUTH_ERROR_MESSAGES, resolveClerkError } from './errorMessages'

// Passed explicitly rather than relying on useSSO's internal default so the
// allowlisted value (Clerk → Native Applications) is provably what's in code.
// Traced expo-auth-session → expo-linking: resolves to stellaeum://sso-callback.
const SSO_REDIRECT_URL = AuthSession.makeRedirectUri({ path: 'sso-callback' })

const CATCH_ALL = 'Нещо се обърка. Опитай отново.'

/**
 * Shared result contract for every social-sign-in hook in this module, so
 * the call site can swap providers without branching. `cancelled` is a
 * control-flow branch (user dismissed the sheet), never surfaced as an
 * error and never logged.
 */
export type OAuthSignInResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

/** @deprecated use OAuthSignInResult — kept so existing imports don't break. */
export type GoogleSignInResult = OAuthSignInResult
export type AppleSignInResult = OAuthSignInResult

export function useGoogleSignIn() {
  const { startSSOFlow } = useSSO()
  const clerk = useClerk()

  async function signInWithGoogle(): Promise<GoogleSignInResult> {
    try {
      const { createdSessionId, setActive, authSessionResult, signUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: SSO_REDIRECT_URL,
      })

      if (!createdSessionId || !setActive) {
        // Dismissing the browser sheet has no error code — it's a control-flow
        // branch (type 'cancel'/'dismiss'), not an error. Must not surface red text.
        if (authSessionResult?.type === 'cancel' || authSessionResult?.type === 'dismiss') {
          return { status: 'cancelled' }
        }
        if (signUp?.status === 'missing_requirements') {
          return { status: 'error', message: OAUTH_ERROR_MESSAGES.form_param_missing }
        }
        return { status: 'error', message: CATCH_ALL }
      }

      await setActive({ session: createdSessionId })
      // Clerk populates firstName/lastName from the external account
      // asynchronously on transfer — without this, getDisplayName can briefly
      // read an empty name and fall back to the email username right after
      // sign-in. One reload closes that window before any screen renders.
      await clerk.user?.reload()
      return { status: 'success' }
    } catch (err) {
      // Raw error + code still goes to Sentry even though the user only sees
      // the mapped Bulgarian message — otherwise we lose the only signal that
      // an unmapped code needs adding to OAUTH_ERROR_MESSAGES.
      logError('ERR-AUTH-GOOGLE-SSO', err)
      return { status: 'error', message: resolveClerkError(err, OAUTH_ERROR_MESSAGES) ?? CATCH_ALL }
    }
  }

  return { signInWithGoogle }
}

/**
 * `useAppleSignIn` — the iOS-native "Sign in with Apple" counterpart of
 * `useGoogleSignIn`, interchangeable at the call site (same
 * `OAuthSignInResult` contract, same `success` / `cancelled` / `error`
 * branches, same "log the raw error, show the mapped Bulgarian message").
 *
 * DELIBERATE API DEVIATION (2026-09-01): the brief specified
 * `AppleAuthentication.signInAsync()` → `startSSOFlow({ strategy:
 * 'oauth_apple', identityToken })`. `@clerk/expo@3.2.4`'s `startSSOFlow`
 * has no `identityToken` parameter — `StartSSOFlowParams`
 * (node_modules/@clerk/expo/dist/hooks/useSSO.d.ts:3-14) is only
 * `{ redirectUrl?, unsafeMetadata?, authSessionOptions? }` plus the
 * strategy union. This Clerk version ships the native-token handoff as
 * `useSignInWithApple` on the `@clerk/expo/apple` subpath: internally it
 * calls `AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME,
 * EMAIL], nonce })`, then `signIn.create({ strategy: 'oauth_token_apple',
 * token: identityToken })`, and manages the sign-in↔sign-up transfer
 * (node_modules/@clerk/expo/dist/hooks/useSignInWithApple.ios.js). Same
 * mechanism the brief describes — native sheet, native ID-token to Clerk,
 * NOT the browser SSO flow — via the supported entry point.
 *
 * Availability: this hook resolves to a stub on Android / non-iOS whose
 * function THROWS only when called (useSignInWithApple.js), so calling
 * the hook unconditionally is safe and keeps hook order stable. On iOS
 * `startAppleAuthenticationFlow` itself calls
 * `AppleAuthentication.isAvailableAsync()` and throws if unavailable
 * (Expo Go, iOS < 13). The screens still gate the BUTTON on
 * `Platform.OS === 'ios' && isAvailableAsync()` so the throw path is
 * unreachable in practice — see sign-in.tsx / sign-up.tsx.
 *
 * Cancel contract (must match `useGoogleSignIn`): Clerk's native Apple
 * flow catches the user-cancel (`ERR_REQUEST_CANCELED` from
 * `signInAsync`) internally and RETURNS `{ createdSessionId: null }` with
 * no throw — so `!createdSessionId` here means cancel (or Clerk not yet
 * loaded), both non-errors → `{ status: 'cancelled' }`, exactly like
 * Google's `authSessionResult.type === 'cancel' | 'dismiss'` branch.
 * Genuine failures throw and land in the catch. The catch also
 * defensively re-checks for `ERR_REQUEST_CANCELED` in case a future Clerk
 * version stops swallowing it — a dismissed sheet must never reach
 * `logError` or show red text.
 */
export function useAppleSignIn() {
  const { startAppleAuthenticationFlow } = useSignInWithApple()
  const clerk = useClerk()

  async function signInWithApple(): Promise<AppleSignInResult> {
    try {
      const { createdSessionId, setActive } = await startAppleAuthenticationFlow()

      if (!createdSessionId || !setActive) {
        return { status: 'cancelled' }
      }

      await setActive({ session: createdSessionId })
      // Mirror the Google hook: Clerk populates firstName/lastName from the
      // Apple credential asynchronously on transfer, so one reload closes
      // the window where getDisplayName could read an empty name.
      await clerk.user?.reload()
      return { status: 'success' }
    } catch (err) {
      if (isAppleCancel(err)) {
        return { status: 'cancelled' }
      }
      logError('ERR-AUTH-APPLE-SSO', err)
      return { status: 'error', message: resolveClerkError(err, OAUTH_ERROR_MESSAGES) ?? CATCH_ALL }
    }
  }

  return { signInWithApple }
}

/** `expo-apple-authentication` raises a CodedError with this code on user cancel. */
function isAppleCancel(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code?: unknown }).code === 'ERR_REQUEST_CANCELED'
  )
}
