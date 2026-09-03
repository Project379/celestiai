/**
 * Server-side PostHog capture — the ONE event that has no reliable
 * client-side signal: "signup completed". `afterSignUpUrl=/birth-data`
 * is not exactly-once (a returning user with no chart also lands there),
 * and there's no client moment that fires only for a genuinely new user.
 *
 * `ensureUserRecord`'s INSERT branch (lib/users/ensure-user.ts) IS
 * exactly-once by construction — it already handles the concurrent-first-
 * request race (23505 unique-violation) and only the winning caller sees
 * `createdUser`. Firing from there, once, server-side:
 *   - needs no SDK (posthog-node) for a single call site — a plain POST
 *     to the HTTP capture API
 *   - carries no browser properties ($current_url, $browser, …) at all,
 *     since there is no browser on this side of the request
 *   - the source IP PostHog receives is Vercel's, not the end user's —
 *     this call cannot leak the signing-up user's IP
 *
 * Covers both platforms: mobile reaches the same Next.js API routes
 * through apps/mobile/lib/api/client.ts, so mobile signups flow through
 * this same server-side call — no separate mobile call site needed.
 *
 * Never throws — a PostHog outage must not break account creation.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST

export async function captureServerEvent(
  event: string,
  distinctId: string,
): Promise<void> {
  if (!POSTHOG_KEY || !POSTHOG_HOST) {
    console.error(
      '[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_POSTHOG_HOST — server capture skipped.',
    )
    return
  }

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: { $process_person_profile: true },
      }),
    })
  } catch (err) {
    console.error('[PostHog] server capture failed:', err)
  }
}
