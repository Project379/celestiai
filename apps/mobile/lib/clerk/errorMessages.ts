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
 * Google-SSO-specific codes on top of a screen's own map. form_param_missing
 * is the no-name edge: Google returned no firstName/lastName and the transfer
 * signUp.create failed required-field validation — give the user something to
 * DO, not just a dead end, since they're mid-flow with no form to fall back to.
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
