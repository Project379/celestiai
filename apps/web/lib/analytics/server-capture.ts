/**
 * Server-side PostHog capture — for events with no reliable client-side
 * signal. Originally built for "signup completed" alone: `afterSignUpUrl=
 * /birth-data` is not exactly-once (a returning user with no chart also
 * lands there), and there's no client moment that fires only for a
 * genuinely new user. Also used by "subscription started" (both
 * webhooks, see apps/web/lib/stripe/subscription.ts's `handleInvoicePaid`
 * and apps/web/lib/revenuecat/webhook-events.ts's `INITIAL_PURCHASE`
 * case) — moved server-side because both client-side call sites had a
 * real gap: web fired on the Stripe checkout redirect regardless of
 * whether the webhook ever activated the subscription, and mobile fired
 * on the client observing the server flip, so closing the app mid-
 * activation silently dropped a real subscription. Firing at the exact
 * DB write, inside a handler with its own idempotency table, is
 * exactly-once for a real reason, not by convention.
 *
 * A plain POST to the HTTP capture API, not the posthog-node SDK —
 * deliberately: posthog-node batches events in memory and needs an
 * explicit `flush()`/`shutdown()` before a serverless function returns
 * or a queued event is dropped when the sandbox freezes. This function
 * `await`s the `fetch()` directly, so the request has already completed
 * (or failed) by the time this function — and therefore its caller,
 * inside the webhook handler's own request path, never behind `after()`
 * — returns. No SDK, no batching, no separate flush step to forget.
 *
 * Also:
 *   - carries no browser properties ($current_url, $browser, …) at all,
 *     since there is no browser on this side of the request
 *   - the source IP PostHog receives is Vercel's, not the end user's —
 *     this call cannot leak the signing-up/subscribing user's IP
 *
 * Covers both platforms for "signup completed": mobile reaches the same
 * Next.js API routes through apps/mobile/lib/api/client.ts, so mobile
 * signups flow through this same server-side call — no separate mobile
 * call site needed. "subscription started" is genuinely two call sites
 * (Stripe vs RevenueCat are different webhooks) — pass `platform` in
 * `properties` to tell them apart in analysis.
 *
 * Never throws — a PostHog outage must not break account creation or
 * webhook processing. Two of this function's three call sites (as of
 * this writing) are inside Stripe/RevenueCat webhook handlers, where
 * both providers enforce their own delivery timeout and mark the
 * webhook failed (triggering their retry logic) if the response takes
 * too long — a hanging PostHog request must not hold that response
 * open. `TIMEOUT_MS` bounds the fetch with an AbortController so a slow
 * or dead PostHog can cost at most ~2.5s, not "however long the
 * platform's default socket timeout is." The abort rejects the fetch
 * promise, which the existing try/catch already swallows — no separate
 * handling needed for the timeout case.
 *
 * Callers that write to `users.subscription_tier` (or any other
 * business-critical row) MUST call this AFTER that write has resolved,
 * never before — analytics is optional, the write is not. Both current
 * webhook call sites (apps/web/lib/stripe/subscription.ts's
 * handleInvoicePaid, apps/web/lib/revenuecat/webhook-events.ts's
 * INITIAL_PURCHASE case) follow this; keep it that way for any new one.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST
const TIMEOUT_MS = 2500

export async function captureServerEvent(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!POSTHOG_KEY || !POSTHOG_HOST) {
    console.error(
      '[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST — server capture skipped.',
    )
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: { $process_person_profile: true, ...properties },
      }),
      signal: controller.signal,
    })
  } catch (err) {
    console.warn('[PostHog] server capture failed:', err)
  } finally {
    clearTimeout(timeout)
  }
}
