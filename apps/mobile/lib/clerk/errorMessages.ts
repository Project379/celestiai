// Shared Bulgarian error mapping for Clerk custom-flow calls in the /you/settings
// profile-edit routes (REVISIT-53). Same shape and register as (public)/verify.tsx's
// own ERROR_MESSAGES map (informal ти, never a raw Clerk string surfaced to the
// user) — kept as a separate module rather than importing from verify.tsx since
// that screen is pre-auth (sign-up) and covers a different code set.
const ERROR_MESSAGES: Record<string, string> = {
  form_code_incorrect: 'Грешен код',
  form_code_expired: 'Кодът изтече. Изпрати нов.',
  verification_expired: 'Кодът изтече. Изпрати нов.',
  verification_already_verified: 'Вече е потвърден',
  too_many_requests: 'Твърде много опити. Изчакай малко.',
  form_identifier_exists: 'Този имейл вече се използва от друг акаунт.',
  form_password_incorrect: 'Грешна текуща парола.',
  form_password_pwned: 'Тази парола е компрометирана в изтичане на данни другаде. Избери друга.',
  form_password_not_strong_enough: 'Паролата не е достатъчно силна. Добави повече символи.',
  form_password_length_too_short: 'Паролата е твърде къса.',
  form_param_format_invalid: 'Невалиден формат.',
}

const CATCH_ALL = 'Нещо се обърка. Опитай отново.'

/**
 * Generic Clerk error-code lookup shared across every screen's own key→string
 * map (Future-API value errors carry {code,message} directly; legacy thrown
 * errors nest it under errors[0]). Returns undefined on no match so callers
 * choose their own catch-all — never falls through to e.message/nested.message,
 * which are Clerk's raw English strings (same leak class already fixed for
 * "Неоторизиран" elsewhere).
 */
export function resolveClerkError(err: unknown, messages: Record<string, string>): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as { code?: string; message?: string; errors?: { code?: string; message?: string }[] }
  if (e.code && messages[e.code]) return messages[e.code]
  const nested = e.errors?.[0]
  if (nested?.code && messages[nested.code]) return messages[nested.code]
  return undefined
}

/**
 * Social-SSO error codes on top of a screen's own map. Shared by
 * useGoogleSignIn and useAppleSignIn (lib/clerk/oauth.ts) — resolveClerkError
 * keys purely on the code string, so a code that both providers can emit
 * gets one message.
 *
 * form_param_missing is the no-name edge: the provider returned no
 * firstName/lastName and the transfer signUp.create failed required-field
 * validation (Clerk Dashboard "Require first and last name" is ON) — give the
 * user something to DO, not a dead end. This is common for Apple: Apple only
 * returns fullName on the FIRST authorization for a given Apple ID, so every
 * reinstall / re-sign-in hits it. NOTE: form_param_missing, oauth_access_denied
 * and external_account_exists fire for BOTH providers but their wording still
 * says "Google" — de-Googling that copy is a founder copy call, left untouched
 * here to keep this change scoped to Apple-specific codes.
 *
 * Apple error codes were reviewed for a bespoke entry and none needs one:
 *   - ERR_REQUEST_CANCELED (expo-apple-authentication) — never reaches here.
 *     useAppleSignIn intercepts it as { status: 'cancelled' } before
 *     resolveClerkError runs, mirroring the Google hook's authSessionResult
 *     'cancel'/'dismiss' branch. A dismissed sheet is control flow.
 *   - ERR_REQUEST_FAILED / ERR_REQUEST_NOT_HANDLED / ERR_REQUEST_NOT_INTERACTIVE
 *     / ERR_REQUEST_UNKNOWN — internal native failures. "Retry" is the only
 *     user action, which the CATCH_ALL fallback already says; a dedicated
 *     string would only add a Bulgarian literal (bg-lint-baseline pressure)
 *     for no UX gain.
 *   - Clerk *server-side* oauth_token_apple codes (token exchange /
 *     account-linking) — cannot be enumerated without a real device sign-in
 *     (Phase B, blocked on Apple enrolment). useAppleSignIn's
 *     logError('ERR-AUTH-APPLE-SSO', err) sends the raw code to Sentry;
 *     revisit trigger: add the real ones once Phase B produces them.
 *     STELLAEUM_PLACEHOLDER: APPLE-ERROR-CODES — see .planning/PLACEHOLDERS.md.
 *
 * STELLAEUM_PLACEHOLDER: OAUTH-COPY-GOOGLE — form_param_missing,
 * oauth_access_denied and external_account_exists fire for Apple too
 * (resolveClerkError keys only on the code) but the strings below still say
 * "Google". De-Googling that copy is a founder call, left untouched.
 * See .planning/PLACEHOLDERS.md.
 */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  form_param_missing: 'Google не сподели име с нас. Регистрирай се с имейл и парола вместо това.',
  oauth_access_denied: 'Достъпът през Google беше отказан.',
  oauth_email_domain_reserved_by_saml: 'Този имейл изисква друг начин за вход.',
  external_account_exists: 'Вече има профил, свързан с този Google имейл.',
}

export function getClerkErrorMessage(err: unknown): string {
  return resolveClerkError(err, ERROR_MESSAGES) ?? CATCH_ALL
}
