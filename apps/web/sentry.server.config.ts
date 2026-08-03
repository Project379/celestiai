import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  includeLocalVariables: false,
  enableLogs: false,
})
