import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  includeLocalVariables: false,
  enableLogs: false,
  // Drop events that originated from the post-deploy smoke probe
  // (SMOKE-TEST). The smoke script tags every request `x-stellaeum-probe:
  // smoke` and the probe-capable routes set a `probe` scope tag; a probe
  // that trips an error must fail the smoke run's exit code, NOT page like
  // a real outage. See VERIFICATION-SURFACE-GAPS.md #11 — this filter is a
  // hard requirement of the smoke test's design, not an add-on.
  beforeSend(event) {
    if (
      event.tags?.probe === 'smoke' ||
      event.request?.headers?.['x-stellaeum-probe'] === 'smoke'
    ) {
      return null
    }
    return event
  },
})
