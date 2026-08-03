import * as Sentry from '@sentry/nextjs'

/**
 * Strict union of server-side ERR-* codes currently emitted by API routes.
 * Excludes client-only codes (ERR-DI-001 removed §8.5, ERR-DI-002 client
 * defensive only, ERR-DI-008 fetch-rejection class). Adding a new server
 * code requires extending this union explicitly so TypeScript catches drift.
 *
 * See PRE_LAUNCH_PREREQS.md item 2 for the monitoring rationale; the
 * `errorId` tag is what makes Sentry triage greppable by code.
 */
export type ServerErrorCode =
  // Birth data domain (§7)
  | 'ERR-BD-001'
  | 'ERR-BD-002'
  | 'ERR-BD-003'
  | 'ERR-BD-004'
  | 'ERR-BD-005'
  // Diary domain (§8) — server-side emit paths only
  | 'ERR-DI-003'
  | 'ERR-DI-004'
  | 'ERR-DI-005'
  | 'ERR-DI-006'
  | 'ERR-DI-007'

/**
 * Logs a server-side error to both stdout (for local dev visibility) and
 * Sentry (for production triage), tagging the Sentry event with the ERR-*
 * code so dashboard filters can split by domain.
 *
 * Never throws — defensive try/catch around Sentry's call mirrors the
 * `lib/audit.ts` precedent: monitoring failures should not crash the
 * request handler.
 */
export function logServerError(
  code: ServerErrorCode,
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
    console.error('[logServerError] Sentry.captureException failed:', sentryErr)
  }
}
