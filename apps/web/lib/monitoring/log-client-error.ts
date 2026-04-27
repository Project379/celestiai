import * as Sentry from '@sentry/nextjs'

/**
 * Strict union of client-side ERR-* codes that should fire client-side
 * Sentry events. Scoped to **client-only** failures: codes that already
 * fire from a server route via logServerError MUST NOT be re-tagged here
 * (with `tracesSampleRate: 0` there's no trace context to link client +
 * server events, so double-tagging produces disconnected duplicate
 * Sentry events for one logical error).
 *
 * Current members:
 *   - ERR-DI-002: localStorage read corruption — defensive registry,
 *     no current emit path (retained per §8.5 close).
 *   - ERR-DI-008: network-class failure (fetch reject; offline / DNS /
 *     TLS) — fires before the request reaches the server, no server-side
 *     counterpart.
 *
 * NOT included (server-mapped emits — server already calls logServerError):
 *   - ERR-DI-003 (POST upsert non-ok), ERR-DI-004 (GET list non-ok),
 *     ERR-DI-007 (DELETE non-ok). Their client-side console.error calls
 *     in `useManifestEntries.ts` stay as-is for browser-DevTools
 *     visibility during local dev; Sentry tagging is the server's job.
 *
 * See PRE_LAUNCH_PREREQS.md item 2 + drift tracker #16 for the
 * no-double-tagging architecture rationale.
 */
export type ClientErrorCode = 'ERR-DI-002' | 'ERR-DI-008'

/**
 * Logs a client-side error to both browser console (for local-dev
 * visibility) and Sentry (for production triage), tagging the Sentry
 * event with the ERR-* code so dashboard filters can split by domain.
 *
 * Never throws — defensive try/catch around Sentry's call mirrors the
 * `logServerError` precedent: monitoring failures should not crash the
 * caller.
 */
export function logClientError(
  code: ClientErrorCode,
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
    console.error('[logClientError] Sentry.captureException failed:', sentryErr)
  }
}
