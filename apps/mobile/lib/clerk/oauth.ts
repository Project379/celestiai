import { useClerk, useSSO } from '@clerk/expo'
import * as AuthSession from 'expo-auth-session'

import { logError } from '@/lib/monitoring/logError'
import { OAUTH_ERROR_MESSAGES, resolveClerkError } from './errorMessages'

// Passed explicitly rather than relying on useSSO's internal default so the
// allowlisted value (Clerk → Native Applications) is provably what's in code.
// Traced expo-auth-session → expo-linking: resolves to stellaeum://sso-callback.
const SSO_REDIRECT_URL = AuthSession.makeRedirectUri({ path: 'sso-callback' })

const CATCH_ALL = 'Нещо се обърка. Опитай отново.'

export type GoogleSignInResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }

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
