import * as Sentry from '@sentry/nextjs'

/**
 * Third-party erasure for the 30-day hard-delete cron (PROCESSOR-ERASURE-GAPS,
 * .planning/PLACEHOLDERS.md). One function per processor, same contract as the
 * Stripe step in the cron: NEVER throws, because a processor failure must not
 * block deletion of our own data. A failure is logged and sent to Sentry; the
 * caller moves on.
 *
 * The credentials exist in Vercel Production ONLY, by design — local dev and
 * preview deployments point at the production database, and these keys delete
 * real users. Absence is therefore the normal state outside production: it
 * means "skip with a log line", never an error and never a Sentry event. Keys
 * are read at call time (not module scope) so tests and the build never see them.
 */

const TIMEOUT_MS = 5000

type ErasureResult = 'deleted' | 'not-found' | 'skipped' | 'failed'

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function reportFailure(processor: string, clerkId: string, err: unknown): ErasureResult {
  console.error(`[Cron Cleanup] Failed to delete ${processor} data for ${clerkId}:`, err)
  Sentry.captureException(err, {
    extra: { context: `GET /api/cron/cleanup-deleted-accounts: delete ${processor} data`, clerkId },
  })
  return 'failed'
}

/**
 * RevenueCat v2 customer delete. The app user ID is the Clerk ID (the mobile
 * provider calls `Purchases.logIn(clerkUserId)`). Needs the project ID in the
 * path — the v2 key is project-scoped and cannot list projects to discover it.
 * 404 = no such customer (never purchased on mobile, or a prior run already
 * deleted it): treated as success so retries are idempotent.
 */
export async function deleteRevenueCatCustomer(clerkId: string): Promise<ErasureResult> {
  const apiKey = process.env.REVENUECAT_SECRET_API_KEY?.trim()
  const projectId = process.env.REVENUECAT_PROJECT_ID?.trim()
  if (!apiKey || !projectId) {
    console.log(
      `[Cron Cleanup] RevenueCat erasure skipped for ${clerkId}: REVENUECAT_SECRET_API_KEY / REVENUECAT_PROJECT_ID not set`,
    )
    return 'skipped'
  }

  try {
    const res = await timedFetch(
      `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/customers/${encodeURIComponent(clerkId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${apiKey}` } },
    )
    if (res.status === 404) return 'not-found'
    if (!res.ok) {
      throw new Error(`RevenueCat customer delete returned HTTP ${res.status}`)
    }
    return 'deleted'
  } catch (err) {
    return reportFailure('RevenueCat', clerkId, err)
  }
}

/**
 * PostHog's ingest host (eu.i.posthog.com) does not serve the private API;
 * that lives on the same region's app host (eu.posthog.com).
 */
function posthogApiHost(): string {
  const ingest = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim()
  if (ingest) return ingest.replace('.i.posthog.com', '.posthog.com').replace(/\/$/, '')
  return 'https://eu.posthog.com'
}

/**
 * PostHog person delete. The persons API deletes by PostHog person ID, not by
 * distinct ID, so this looks the person up by distinct ID (the Clerk ID) first.
 * `delete_events=true` queues deletion of the person's captured events too —
 * deleting only the person record would leave the events behind. No person
 * found = success (never captured a person profile, or already deleted).
 */
export async function deletePostHogPerson(clerkId: string): Promise<ErasureResult> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim()
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim()
  if (!apiKey || !projectId) {
    console.log(
      `[Cron Cleanup] PostHog erasure skipped for ${clerkId}: POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID not set`,
    )
    return 'skipped'
  }

  const base = `${posthogApiHost()}/api/projects/${encodeURIComponent(projectId)}/persons`
  const headers = { Authorization: `Bearer ${apiKey}` }

  try {
    const lookup = await timedFetch(`${base}/?distinct_id=${encodeURIComponent(clerkId)}`, { headers })
    if (!lookup.ok) {
      throw new Error(`PostHog person lookup returned HTTP ${lookup.status}`)
    }
    const body = (await lookup.json()) as { results?: Array<{ id?: string | number }> }
    const personId = body.results?.[0]?.id
    if (personId === undefined || personId === null) return 'not-found'

    const del = await timedFetch(
      `${base}/${encodeURIComponent(String(personId))}/?delete_events=true`,
      { method: 'DELETE', headers },
    )
    if (del.status === 404) return 'not-found'
    if (!del.ok) {
      throw new Error(`PostHog person delete returned HTTP ${del.status}`)
    }
    return 'deleted'
  } catch (err) {
    return reportFailure('PostHog', clerkId, err)
  }
}
