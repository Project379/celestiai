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

export function getClerkErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Нещо се обърка. Опитай отново.'
  const e = err as { code?: string; message?: string; errors?: { code?: string; message?: string }[] }
  if (e.code && ERROR_MESSAGES[e.code]) return ERROR_MESSAGES[e.code]
  const nested = e.errors?.[0]
  if (nested?.code && ERROR_MESSAGES[nested.code]) return ERROR_MESSAGES[nested.code]
  // Deliberately never falls through to e.message/nested.message — those are
  // Clerk's raw English strings, the same class of leak already fixed for
  // "Неоторизиран" elsewhere. Unmapped codes get the generic Bulgarian catch-all.
  return 'Нещо се обърка. Опитай отново.'
}
