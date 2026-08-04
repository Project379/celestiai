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

  try {
    Sentry.captureException(err, {
      tags: { errorId: code },
      ...(extra ? { extra } : {}),
    })
  } catch (sentryErr) {
    console.error('[logError] Sentry.captureException failed:', sentryErr)
  }
}
