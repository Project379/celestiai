---
phase: 06-daily-horoscope
plan: 03
subsystem: notifications
tags: [web-push, service-worker, pwa, cron, vercel, drizzle, supabase, nextjs]

# Dependency graph
requires:
  - phase: 06-daily-horoscope
    provides: daily_horoscopes table, POST /api/horoscope/generate, DailyHoroscope component, DashboardContent integration point

provides:
  - push_subscriptions Drizzle schema — Web Push endpoint storage with user_id index
  - apps/web/public/sw.js — service worker with push event + notificationclick handlers
  - POST /api/push/subscribe — upsert push subscription on endpoint conflict
  - POST /api/push/unsubscribe — delete subscription by endpoint + user_id
  - GET /api/cron/daily-horoscope — CRON_SECRET-protected batch sender with 410/404 cleanup
  - apps/web/vercel.json — cron schedule at 06:00 UTC daily
  - PushNotificationBanner component — subscribe/unsubscribe UI with Bulgarian text, graceful hide on unsupported browsers
  - Dashboard integration — PushNotificationBanner rendered below DailyHoroscope when user has birth chart

affects:
  - 07+ phases (push_subscriptions table available for future personalized notifications)

# Tech tracking
tech-stack:
  added: [web-push, "@types/web-push"]
  patterns:
    - CRON_SECRET Bearer token auth for Vercel cron endpoint protection
    - Expired subscription cleanup: 410/404 status codes trigger delete from push_subscriptions
    - Service worker registered with updateViaCache:'none' for reliable updates
    - urlBase64ToUint8Array helper for VAPID applicationServerKey conversion
    - Notification click opens dashboard URL from event.notification.data.url
    - Generic push notification body (not personalized) — avoids N concurrent AI calls at cron time

key-files:
  created:
    - packages/db/src/schema/push-subscriptions.ts
    - apps/web/public/sw.js
    - apps/web/app/api/push/subscribe/route.ts
    - apps/web/app/api/push/unsubscribe/route.ts
    - apps/web/app/api/cron/daily-horoscope/route.ts
    - apps/web/vercel.json
    - apps/web/components/horoscope/PushNotificationBanner.tsx
  modified:
    - packages/db/src/schema/index.ts
    - apps/web/components/dashboard/DashboardContent.tsx

key-decisions:
  - "Generic push notification body ('Новото ви послание от звездите ви очаква.') avoids N concurrent AI calls at cron time — personalized content generated on dashboard visit"
  - "410/404 error codes from web-push trigger automatic subscription cleanup — expired endpoints removed in batch after cron run"
  - "Service worker registered with updateViaCache:'none' to ensure stale cached sw.js does not prevent updates"
  - "Uint8Array<ArrayBuffer> explicit generic required for TypeScript 5.7 compatibility with PushManager.subscribe applicationServerKey"

patterns-established:
  - "Cron auth pattern: Authorization: Bearer CRON_SECRET header check, return 401 on mismatch"
  - "Batch send with error classification: 410/404 = expired (auto-delete), other errors = transient (log only)"
  - "PushNotificationBanner: checks 'serviceWorker' in navigator && 'PushManager' in window before rendering"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 6 Plan 03: Daily Horoscope Push Notifications Summary

**Web Push pipeline: push_subscriptions schema + service worker + subscribe/unsubscribe API + CRON_SECRET-protected batch cron at 06:00 UTC + Bulgarian subscribe/unsubscribe banner on dashboard**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T16:07:56Z
- **Completed:** 2026-02-15T16:10:40Z
- **Tasks:** 2 of 3 automated; Task 3 (human-verify) deferred to post-Phase 7 batch testing
- **Files modified:** 9 (7 created, 2 modified)

## Accomplishments

- `push_subscriptions` Drizzle schema with endpoint uniqueness and user_id index — persistent Web Push endpoint storage
- `apps/web/public/sw.js` service worker handling push events (showNotification) and notificationclick (openWindow to /dashboard)
- Subscribe/unsubscribe API routes with auth, upsert-on-conflict, and service role Supabase access
- Cron endpoint with CRON_SECRET auth, batch web-push sends, automatic 410/404 expired endpoint cleanup, maxDuration=300
- `PushNotificationBanner` client component with Bulgarian UI text, service worker registration on mount, graceful hide on unsupported browsers
- Dashboard integration: PushNotificationBanner placed below DailyHoroscope when user has birth chart

## Task Commits

Each task was committed atomically:

1. **Task 1: Push subscription schema, service worker, and API routes** - `8a7a180` (feat)
2. **Task 2: Push notification banner UI and dashboard integration** - `fd15199` (feat)
3. **Task 3: Human verification checkpoint** - deferred to post-Phase 7 batch testing (user decision 2026-02-15)

## Files Created/Modified

- `packages/db/src/schema/push-subscriptions.ts` - push_subscriptions table with id, user_id, endpoint (unique), p256dh, auth, created_at; index on user_id
- `packages/db/src/schema/index.ts` - Re-exports pushSubscriptions, PushSubscription, NewPushSubscription
- `apps/web/public/sw.js` - Service worker: push event listener (showNotification) + notificationclick listener (openWindow)
- `apps/web/app/api/push/subscribe/route.ts` - POST endpoint, Clerk auth, upsert subscription with onConflict:'endpoint'
- `apps/web/app/api/push/unsubscribe/route.ts` - POST endpoint, Clerk auth, delete by endpoint + user_id
- `apps/web/app/api/cron/daily-horoscope/route.ts` - GET endpoint, CRON_SECRET auth, web-push batch send, expired cleanup, maxDuration=300
- `apps/web/vercel.json` - Cron schedule "0 6 * * *" for /api/cron/daily-horoscope
- `apps/web/components/horoscope/PushNotificationBanner.tsx` - Subscribe/unsubscribe UI component with Bulgarian text
- `apps/web/components/dashboard/DashboardContent.tsx` - Added PushNotificationBanner import and conditional render below DailyHoroscope

## Decisions Made

- Generic notification body chosen intentionally: "Новото ви послание от звездите ви очаква." — sends same text to all subscribers, avoids N concurrent Gemini calls at cron execution time
- Expired subscription cleanup on 410/404: industry standard approach — web-push spec mandates servers clean up subscriptions returning 410 Gone or 404 Not Found
- `updateViaCache: 'none'` in service worker registration ensures updated sw.js is picked up without browser caching stale version
- Explicit `Uint8Array<ArrayBuffer>` type required in TypeScript 5.7 for `applicationServerKey` in `pushManager.subscribe` — `Uint8Array<ArrayBufferLike>` is incompatible

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Uint8Array generic type mismatch for applicationServerKey**
- **Found during:** Task 2 TypeScript verification (tsc --noEmit)
- **Issue:** `urlBase64ToUint8Array` returned `Uint8Array<ArrayBufferLike>` but `PushSubscriptionOptionsInit.applicationServerKey` expects `Uint8Array<ArrayBuffer>`. TypeScript 5.7 tightened generic variance on ArrayBuffer types.
- **Fix:** Changed return type annotation to `Uint8Array<ArrayBuffer>` and added `as Uint8Array<ArrayBuffer>` cast on the `new Uint8Array()` constructor call
- **Files modified:** `apps/web/components/horoscope/PushNotificationBanner.tsx`
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** `fd15199` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Required for TypeScript compilation. No scope creep.

## Issues Encountered

None.

## User Setup Required

Before the push notification pipeline works in production, the following environment variables must be configured:

**Generate VAPID keys:**
```bash
npx web-push generate-vapid-keys
```

**Environment variables to add to `.env.local` (development) and Vercel dashboard (production):**
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key (safe to expose to browser)
- `VAPID_PRIVATE_KEY` — VAPID private key (keep secret, server-side only)
- `CRON_SECRET` — any random string to protect the cron endpoint (e.g., `openssl rand -hex 32`)

**Database migration:** The new `push_subscriptions` table must be created in Supabase:
```bash
cd packages/db && npx drizzle-kit push
```
Or apply the generated migration SQL manually via Supabase dashboard SQL Editor.

**Note:** Push notifications require HTTPS. For local development testing, use `next dev --experimental-https` or test on a deployed preview URL.

## Next Phase Readiness

- Complete Web Push pipeline is implemented and type-checked
- Phase 6 (Daily Horoscope) is complete — all automated tasks done
- Task 3 human verification deferred: will be tested in the post-Phase 7 batch testing session alongside other deferred human-verify checkpoints (wizard flow, city search, edit flow, RLS isolation)
- Phase 7 can proceed immediately; push_subscriptions table is available for future personalized notification features

---
*Phase: 06-daily-horoscope*
*Completed: 2026-02-15*

## Self-Check: PASSED

All files verified present:
- packages/db/src/schema/push-subscriptions.ts: FOUND
- packages/db/src/schema/index.ts (updated): FOUND
- apps/web/public/sw.js: FOUND
- apps/web/app/api/push/subscribe/route.ts: FOUND
- apps/web/app/api/push/unsubscribe/route.ts: FOUND
- apps/web/app/api/cron/daily-horoscope/route.ts: FOUND
- apps/web/vercel.json: FOUND
- apps/web/components/horoscope/PushNotificationBanner.tsx: FOUND
- apps/web/components/dashboard/DashboardContent.tsx (updated): FOUND

All commits verified present:
- 8a7a180: feat(06-03): push subscription schema, service worker, and API routes
- fd15199: feat(06-03): push notification banner UI and dashboard integration
