import * as Sentry from '@sentry/react-native'

/**
 * Logs a mobile-side error to console (for Metro visibility) and Sentry
 * (for production triage), tagging the Sentry event with an ERR-* code
 * so dashboard filters can split by domain.
 *
 * Single helper — mobile has no server-vs-client split, so web's
 * logServerError + logClientError pair collapses to one. Signature
 * mirrors web's logServerError for consistency: code is a free-form
 * string today; if mobile accumulates 5+ tagged emit sites, lift to a
 * strict union per web's ServerErrorCode pattern.
 *
 * Never throws — defensive try/catch around Sentry.captureException
 * mirrors web's pattern: monitoring failures should not crash the call
 * site.
 */
export function logError(
  code: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void {
  console.error(`[${code}]`, err)

  // Sentry.captureException on a non-Error (a plain rejection object, a
  // string, whatever a native module or RevenueCat throws) cannot be
  // grouped and carries no stack trace — found 2026-08-29 when a
  // RevenueCat rejection object reached this path as "Object captured as
  // exception with keys: code, info, message", 4 events, unreadable. Wrap
  // it in a real Error so Sentry gets a stack and a message; keep the
  // original value as extra so nothing is lost.
  const toCapture =
    err instanceof Error
      ? err
      : new Error(typeof err === 'string' ? err : `Non-Error value thrown: ${safeStringify(err)}`)

  try {
    Sentry.captureException(toCapture, {
      tags: { errorId: code },
      extra: {
        ...(extra ?? {}),
        ...(err instanceof Error ? {} : { originalValue: err }),
      },
    })
  } catch (sentryErr) {
    console.error('[logError] Sentry.captureException failed:', sentryErr)
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
