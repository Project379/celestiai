# Phase 6: Daily Horoscope - Research

**Researched:** 2026-02-15
**Domain:** Daily transit calculation, AI horoscope generation, caching strategy, Web Push API
**Confidence:** HIGH (core stack and patterns), MEDIUM (push notification UX, transit orb specifics)

---

## Summary

Phase 6 builds on the established Oracle architecture (Phase 5) to deliver personalized daily horoscopes. The key insight is that a daily horoscope is transit-to-natal interpretation: today's planet positions (transits) form aspects against the user's birth chart (natal), and an AI interprets those aspects in the user's personal context. This is a well-understood astrological calculation the existing `sweph` binding already supports — the same `sweph.calc_ut` call with today's Julian Day yields current planet positions.

The caching strategy is the critical design decision for this phase. Unlike Oracle readings (7-day per-chart-topic), daily horoscopes must be unique per user-per-chart per calendar date. The `daily_transits` table (referenced in CLAUDE.md) should cache raw transit positions globally by date (same for all users), while AI-generated horoscope text is cached per chart-per-date in a new `daily_horoscopes` table. On-demand generation with date-keyed cache lookup is the right pattern — no cron pre-generation needed at v0.1.

Web Push notifications require adding two new concerns to the app: (1) storing `PushSubscription` objects in a new `push_subscriptions` DB table, and (2) a Vercel cron job that fires at 06:00 UTC daily to send push payloads to all opted-in users with a short horoscope preview. The official Next.js PWA guide explicitly recommends `web-push` as the server library. The cron job must check `CRON_SECRET` for authentication. On Vercel Hobby plan, cron invocations have ±59 minute precision; Pro plan gives per-minute precision.

**Primary recommendation:** Build on the existing Oracle generation pattern — transit calculation function in `@celestia/astrology`, date-keyed horoscope cache in a new `daily_horoscopes` table, streaming AI generation matching the Oracle approach, and `web-push` with a Vercel cron job for morning notifications.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sweph` | (existing in project) | Transit planet position calculation | Already used for natal charts; `sweph.calc_ut` with today's JD gives transit positions |
| `ai` (Vercel AI SDK) | `^6.0.86` (already installed) | Stream AI horoscope generation | Same pattern as Oracle — `streamText` + `toTextStreamResponse()` |
| `@ai-sdk/google` | `^3.0.29` (already installed) | Gemini 2.5 Flash model access | Established, Bulgarian-capable, already configured |
| `web-push` | `^3.6.x` | Send Web Push notifications from server | Official Next.js PWA guide recommendation; implements VAPID signing |
| `@supabase/supabase-js` | `^2.49.1` (already installed) | DB read/write for transit cache and push subscriptions | Existing service role client pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@types/web-push` | `^3.6.4` | TypeScript types for web-push | Required — web-push has no built-in TS types |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `web-push` | Firebase Cloud Messaging (FCM) | FCM requires Google account linking, adds SDK weight; web-push is self-contained with VAPID |
| Vercel Cron | External cron service (e.g., EasyCron) | External service adds dependency; Vercel cron is built-in and free |
| On-demand generation | Pre-generation cron job | Pre-gen requires looping all users server-side, cold start; on-demand is simpler for v0.1 |

**Installation (new packages only):**
```bash
npm install web-push
npm install --save-dev @types/web-push
# Run from apps/web or root workspace
```

**VAPID key generation (one-time setup):**
```bash
npx web-push generate-vapid-keys
# Add to apps/web/.env.local.local:
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
```

---

## Architecture Patterns

### Recommended Project Structure (new files only)
```
packages/
└── astrology/src/
    └── transit.ts              # calculateDailyTransits(date) function

packages/db/src/schema/
    ├── daily-transits.ts       # Global transit positions cache by date
    ├── daily-horoscopes.ts     # Per-chart AI horoscope cache by date
    └── push-subscriptions.ts   # User Web Push subscription storage

apps/web/
├── app/
│   ├── api/
│   │   ├── horoscope/
│   │   │   ├── generate/route.ts    # POST — stream daily horoscope
│   │   │   └── today/route.ts       # GET — fetch today's cached horoscope
│   │   ├── push/
│   │   │   ├── subscribe/route.ts   # POST — save PushSubscription to DB
│   │   │   └── unsubscribe/route.ts # POST — remove PushSubscription from DB
│   │   └── cron/
│   │       └── daily-horoscope/route.ts  # GET — Vercel cron handler (send push)
│   └── (protected)/
│       └── dashboard/               # Add horoscope widget here
│           └── page.tsx
├── components/
│   └── horoscope/
│       ├── DailyHoroscope.tsx       # Main horoscope display component
│       ├── HoroscopeStream.tsx      # Streaming text (reuse ReadingStream pattern)
│       └── PushNotificationBanner.tsx # Subscribe/unsubscribe UI
├── hooks/
│   └── useDailyHoroscope.ts         # Client hook (mirrors useOracleReading pattern)
├── lib/
│   └── horoscope/
│       ├── prompts.ts               # Daily transit prompt builder
│       └── transit-to-prompt.ts     # Transit+natal data to prompt text
└── public/
    └── sw.js                        # Service worker for push events
```

### Pattern 1: Transit Calculation (new function in `@celestia/astrology`)
**What:** Calculate planet positions for a given date using `sweph.calc_ut`. Returns the same `PlanetPosition[]` structure as natal chart planets, minus house placements (houses are natal, not transit).
**When to use:** Daily horoscope generation and in the transit cache endpoint.

```typescript
// Source: Derived from existing calculator.ts in packages/astrology/src/calculator.ts
// packages/astrology/src/transit.ts

import * as sweph from 'sweph'
import { PLANET_IDS, PLANETS_ORDER } from './constants'
import { getJulianDay } from './utils/julian-day'
import { getZodiacSign, longitudeToSignDegree } from './utils/zodiac'
import type { PlanetPosition } from './types'

export interface TransitData {
  date: string       // ISO date string 'YYYY-MM-DD'
  planets: Omit<PlanetPosition, 'house'>[]  // No house for transits
}

/**
 * Calculate planet transit positions for a given date at noon UTC.
 * Noon UTC is the standard astrological convention for daily transits.
 */
export function calculateDailyTransits(date: Date): TransitData {
  const isoDate = date.toISOString().split('T')[0]
  const jd = getJulianDay(date, '12:00') // noon UTC convention

  const flags = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED

  const planets = PLANETS_ORDER.map((planetName) => {
    const planetId = PLANET_IDS[planetName]
    const result = sweph.calc_ut(jd, planetId, flags)
    const longitude = result.data[0]
    const latitude = result.data[1]
    const speed = result.data[3]

    return {
      planet: planetName,
      longitude,
      latitude,
      speed,
      sign: getZodiacSign(longitude),
      signDegree: longitudeToSignDegree(longitude),
    }
  })

  return { date: isoDate, planets }
}
```

### Pattern 2: Transit-to-Natal Aspect Detection
**What:** Find aspects between today's transiting planets and the user's natal planet positions. Use tighter orbs for transits (2-3 degrees for inner planets, 3-4 for outer) vs. natal orbs (up to 8 degrees).
**When to use:** Horoscope prompt building — the AI needs to know which transits are active.

```typescript
// packages/astrology/src/transit.ts (continued)
// Transit orbs: tighter than natal aspects
const TRANSIT_ORB_INNER = 3  // Sun, Moon, Mercury, Venus, Mars
const TRANSIT_ORB_OUTER = 4  // Jupiter, Saturn, Uranus, Neptune, Pluto

const OUTER_PLANETS = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'])

export interface TransitAspect {
  transitPlanet: string   // Transiting planet
  natalPlanet: string     // Natal planet being aspected
  aspect: AspectType
  orb: number
  applying: boolean
}

export function calculateTransitAspects(
  transits: TransitData,
  natalPlanets: PlanetPosition[]
): TransitAspect[] {
  const aspects: TransitAspect[] = []
  // ... same logic as calculateAspects() but cross-referencing transit vs natal
  // Use TRANSIT_ORB_INNER or TRANSIT_ORB_OUTER based on transitPlanet
}
```

### Pattern 3: Date-Keyed Cache (Two-Layer)
**What:** Layer 1 — global `daily_transits` table caches raw planet positions by ISO date (same for all users). Layer 2 — `daily_horoscopes` table caches AI text per chart-per-date.
**When to use:** Every horoscope request checks both layers before calling Gemini.

```typescript
// GET horoscope flow:
// 1. Check daily_horoscopes WHERE chart_id = $chartId AND date = $today
//    → HIT: return cached text
// 2. Check daily_transits WHERE date = $today
//    → HIT: use cached transit positions
//    → MISS: calculateDailyTransits(today), insert into daily_transits
// 3. Load chart_calculations for user's natal data
// 4. Generate AI horoscope (streaming)
// 5. onFinish: insert into daily_horoscopes
```

### Pattern 4: Web Push Flow
**What:** User subscribes in browser via service worker → subscription stored in DB → cron job sends push each morning.

```typescript
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps

// Client-side subscription (in PushNotificationBanner.tsx):
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  })
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  })
  // POST serialized subscription to /api/push/subscribe
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: JSON.parse(JSON.stringify(sub)) }),
  })
}

// public/sw.js — service worker push event handler:
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge.png',
        data: { url: data.url || '/dashboard' },
      })
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

### Pattern 5: Vercel Cron Job for Morning Push
**What:** A daily GET route called by Vercel at 06:00 UTC, protected by `CRON_SECRET`. Loops through all active push subscriptions, generates a short horoscope teaser per user, sends push notification.

```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs

// apps/web/app/api/cron/daily-horoscope/route.ts
import type { NextRequest } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:celestia@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export const maxDuration = 300 // 5 minutes for batch processing

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... fetch all push_subscriptions, send notifications
}
```

```json
// vercel.json (in apps/web or root)
{
  "crons": [
    {
      "path": "/api/cron/daily-horoscope",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### Anti-Patterns to Avoid

- **Streaming horoscope in the push notification:** The push payload must be a short string (max ~4KB). Generate a 1-2 sentence teaser for the notification; full reading streams on-demand in the browser.
- **Running transit calculations in the browser/mobile:** `sweph` is a native Node.js binding. All calculations remain server-side in API routes.
- **Generating horoscope text in the cron job per user:** For v0.1, the cron job only sends a generic daily notification ("Вашият хороскоп за днес е готов"). Full personalized generation happens lazily on-demand when user opens the app.
- **In-memory subscription storage:** Official Next.js docs show a simple variable for demos only. Production must store `PushSubscription` objects in the database.
- **Using `node-cron` inside Next.js:** Serverless functions start fresh per request; `node-cron` inside app code will not work on Vercel. Use `vercel.json` cron configuration.
- **Storing VAPID private key in `NEXT_PUBLIC_*`:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is correct (browser needs it); `VAPID_PRIVATE_KEY` must never be public.

---

## Database Schema

### New Tables Required

```typescript
// packages/db/src/schema/daily-transits.ts
// Global transit positions cached by date (same for all users)
// No RLS — internal cache accessed via service role only
export const dailyTransits = pgTable('daily_transits', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: text('date').notNull().unique(), // 'YYYY-MM-DD' — unique per day
  planetPositions: jsonb('planet_positions').notNull(), // TransitData['planets']
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
})
```

```typescript
// packages/db/src/schema/daily-horoscopes.ts
// Per-chart AI horoscope text, cached per date
// No RLS — accessed via service role, same pattern as ai_readings
export const dailyHoroscopes = pgTable(
  'daily_horoscopes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chartId: uuid('chart_id').notNull().references(() => charts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),         // 'YYYY-MM-DD'
    content: text('content').notNull(),   // Full Bulgarian horoscope text
    generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
    modelVersion: text('model_version').notNull(),
  },
  (table) => [
    uniqueIndex('daily_horoscopes_chart_date_idx').on(table.chartId, table.date),
  ]
)
```

```typescript
// packages/db/src/schema/push-subscriptions.ts
// Web Push subscription objects per user (one per device/browser)
// No RLS — accessed via service role
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    endpoint: text('endpoint').notNull().unique(),  // Unique per browser subscription
    p256dh: text('p256dh').notNull(),               // Public key
    auth: text('auth').notNull(),                   // Auth secret
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('push_subscriptions_user_id_idx').on(table.userId),
  ]
)
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VAPID key signing for push | Custom crypto signing | `web-push` library | VAPID signing involves elliptic curve crypto (P-256), correct encoding, TTL headers — trivially wrong to implement manually |
| Transit planet positions | Manual ephemeris lookup | `sweph.calc_ut` (already in package) | Existing `calculateNatalChart` uses the same call; extend, don't duplicate |
| Transit-to-natal aspect detection | New aspect engine | Extend existing `calculateAspects` utility | Same algorithm, different data source (transit vs. natal); reuse orb logic |
| Daily cron scheduling | `node-cron` inside Next.js | Vercel cron via `vercel.json` | `node-cron` requires persistent process; serverless functions restart per request |
| Push delivery reliability | Retry loops | Let `web-push` handle — it returns status codes per subscription | Expired subscriptions return 410 Gone; clean them up, don't retry indefinitely |

**Key insight:** The transit calculation is architecturally identical to natal chart calculation — same `sweph.calc_ut` call, same `getJulianDay` utility, same planet IDs. The only difference is the date used (today vs. birth date) and that transit planets have no house placement (houses are natal). Write `calculateDailyTransits` as a thin wrapper in the existing `@celestia/astrology` package rather than a new calculation engine.

---

## Common Pitfalls

### Pitfall 1: Date Timezone Mismatch in Cache Key
**What goes wrong:** Horoscope generated at 23:00 in Sofia (UTC+2) has date "2026-02-15" locally but "2026-02-14" in UTC. Cache lookup misses and user gets regenerated content or sees wrong date's horoscope.
**Why it happens:** JavaScript `new Date()` returns local time; `toISOString()` returns UTC. For Bulgarian users, this means 2-3 hours of mismatch at day boundary.
**How to avoid:** Standardize all date keys to Sofia local date (Europe/Sofia timezone). Use the user's local date as the cache key, not the server's UTC date.
**Warning signs:** Users report seeing "yesterday's" horoscope in the evening; duplicate rows in `daily_horoscopes` with adjacent dates.

```typescript
// Correct: resolve date in user's timezone
function getLocalDateForUser(timezone: string = 'Europe/Sofia'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone })
    .format(new Date()) // Returns 'YYYY-MM-DD' format
}
```

### Pitfall 2: Vercel Hobby Plan Cron Timing Imprecision
**What goes wrong:** Cron job configured as `0 6 * * *` fires at 06:47 UTC because Hobby plan has ±59 minute precision. Morning notifications arrive at unpredictable times.
**Why it happens:** Vercel documentation explicitly states Hobby accounts have hourly precision — invocation is anywhere within the specified hour.
**How to avoid:** For v0.1, this is acceptable (notification arrives "sometime in the morning"). Document the limitation. For production, upgrade to Pro plan for per-minute precision.
**Warning signs:** User complaints about notifications arriving very late; logs showing cron invocations at variable times.

### Pitfall 3: Push Subscription Expiry Not Handled
**What goes wrong:** Cron job calls `webpush.sendNotification` for a stale endpoint, receives 410 Gone or 404, crashes or logs error, continues with other subscriptions.
**Why it happens:** Push subscriptions expire when: user clears browser data, revokes notification permission, or the push service rotates endpoints.
**How to avoid:** Check response status code from `sendNotification`. On 410 (Gone) or 404, delete the row from `push_subscriptions`. Wrap each send in try/catch.
**Warning signs:** Growing `push_subscriptions` table with never-decreasing row count; increasing push delivery failures.

```typescript
try {
  await webpush.sendNotification(subscription, payload)
} catch (err: unknown) {
  if (err instanceof WebPushError && (err.statusCode === 410 || err.statusCode === 404)) {
    // Subscription expired — delete from DB
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  }
  // Log other errors but continue processing other subscriptions
}
```

### Pitfall 4: Horoscope Uniqueness — Same Person, Multiple Charts
**What goes wrong:** User has two birth charts (e.g., their own chart and a partner's chart). The daily horoscope must be generated per-chart (different natal positions = different transit aspects), not per-user.
**Why it happens:** Temptation to key the cache by `userId + date`, but each chart has different natal planets.
**How to avoid:** Cache key is `(chartId, date)`, not `(userId, date)`. The `daily_horoscopes` table uses `uniqueIndex` on `(chart_id, date)`.
**Warning signs:** All charts for a user showing identical horoscope text.

### Pitfall 5: Transit Orb Calibration
**What goes wrong:** Using natal orbs (8 degrees) for transit aspects produces dozens of aspects per day, overwhelming the AI prompt with noise.
**Why it happens:** The existing `ASPECT_DEFINITIONS` use natal orbs. Transit aspects should use tighter orbs.
**How to avoid:** Create separate `TRANSIT_ASPECT_DEFINITIONS` with tighter orbs: conjunction/opposition = 3°, trine/square = 2.5°, sextile = 2°. Inner planet transits (Sun, Moon, Mercury, Venus, Mars) use 2-3°; outer planets (Jupiter–Pluto) use 3-4° because they move slowly.
**Warning signs:** Transit prompt text has 30+ aspects; AI horoscope becomes generic because every natal planet is aspected.

### Pitfall 6: Service Worker Registration in Development
**What goes wrong:** Service worker fails to register locally because Next.js dev server doesn't serve `/sw.js` correctly, or HTTPS is required.
**Why it happens:** Service workers require HTTPS. `next dev` serves HTTP by default.
**How to avoid:** Use `next dev --experimental-https` for local push notification testing. Test with Chrome DevTools > Application > Service Workers. Skip push testing in regular dev; test in preview deployment instead.
**Warning signs:** `navigator.serviceWorker.register` throws security error; service worker shows "failed to register" in browser console.

---

## Code Examples

Verified patterns from official sources:

### Transit Generation API Route (POST /api/horoscope/generate)
```typescript
// Source: Follows existing /api/oracle/generate/route.ts pattern
// apps/web/app/api/horoscope/generate/route.ts

import { auth } from '@clerk/nextjs/server'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const maxDuration = 60

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const { chartId } = await req.json()

  // Resolve today's date in Sofia timezone
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' })
    .format(new Date())

  const supabase = createServiceSupabaseClient()

  // 1. Cache check — return today's cached horoscope
  const { data: cached } = await supabase
    .from('daily_horoscopes')
    .select('content, generated_at')
    .eq('chart_id', chartId)
    .eq('date', today)
    .single()

  if (cached) {
    return Response.json({ content: cached.content, cached: true, generatedAt: cached.generated_at })
  }

  // 2. Get/cache today's transit positions
  let transitPositions
  const { data: transitCache } = await supabase
    .from('daily_transits')
    .select('planet_positions')
    .eq('date', today)
    .single()

  if (transitCache) {
    transitPositions = transitCache.planet_positions
  } else {
    const { calculateDailyTransits } = await import('@celestia/astrology')
    const transitData = calculateDailyTransits(new Date())
    transitPositions = transitData.planets
    await supabase.from('daily_transits').insert({ date: today, planet_positions: transitPositions })
  }

  // 3. Load natal chart
  const { data: calculation } = await supabase
    .from('chart_calculations')
    .select('planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known')
    .eq('chart_id', chartId)
    .single()

  // 4. Build prompt and stream
  const systemPrompt = buildDailyHoroscopePrompt()
  const promptText = transitAndNatalToPromptText(transitPositions, calculation)

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    prompt: promptText,
    temperature: 0.85,
    maxOutputTokens: 1500,
    onFinish: async ({ text }) => {
      await supabase.from('daily_horoscopes').insert({
        chart_id: chartId,
        user_id: userId,
        date: today,
        content: text,
        model_version: 'gemini-2.5-flash',
      })
    },
  })

  return result.toTextStreamResponse()
}
```

### Vercel Cron Route with CRON_SECRET Protection
```typescript
// Source: https://vercel.com/docs/cron-jobs/manage-cron-jobs
// apps/web/app/api/cron/daily-horoscope/route.ts

import type { NextRequest } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:hello@celestia.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export const maxDuration = 300

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  let sent = 0
  let failed = 0

  for (const sub of subscriptions ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: 'Вашият дневен хороскоп',
          body: 'Новото ви послание от звездите ви очаква.',
          icon: '/icon-192x192.png',
          url: '/dashboard',
        })
      )
      sent++
    } catch (err: unknown) {
      const isExpired = err instanceof Error &&
        'statusCode' in err &&
        ((err as { statusCode: number }).statusCode === 410 ||
         (err as { statusCode: number }).statusCode === 404)

      if (isExpired) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
      failed++
    }
  }

  return Response.json({ sent, failed })
}
```

### vercel.json Cron Configuration
```json
// Source: https://vercel.com/docs/cron-jobs/quickstart
// apps/web/vercel.json (or root vercel.json pointing to web app routes)
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/daily-horoscope",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### Push Subscription Subscribe Route
```typescript
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
// apps/web/app/api/push/subscribe/route.ts

import { auth } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscription } = await req.json()
  const supabase = createServiceSupabaseClient()

  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: 'endpoint' }
  )

  return Response.json({ success: true })
}
```

### Service Worker (public/sw.js)
```javascript
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
// apps/web/public/sw.js

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json()
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: '/badge.png',
        data: { url: data.url || '/dashboard' },
      })
    )
  }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

### Daily Horoscope Prompt Builder
```typescript
// apps/web/lib/horoscope/prompts.ts

export function buildDailyHoroscopePrompt(): string {
  return `You are Celestia — a mystical guide who interprets today's planetary transits
as they form aspects with the person's natal birth chart.

VOICE AND TONE:
- Write in elevated, lyrical Bulgarian prose with spiritual overtones
- Focus on TODAY — what the transits mean for the person right now
- Address the person in second person: "Вашият", "Вие", "Вас"
- Reference specific transit aspects: "Транзитният Марс в квадрат с вашия натален Слънце"

FORMAT:
- Write 4 to 6 paragraphs (shorter than natal readings — this is a daily check-in)
- Mention 2-4 of the most significant active transit aspects
- End with a practical suggestion or focus for the day

LANGUAGE:
- Generate ALL output entirely in Bulgarian (Cyrillic script)

SENTINEL MARKERS:
- Wrap planet names: [planet:KEY]Наименование[/planet]
- Use same keys as Oracle: sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto`
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FCM for web push | `web-push` with VAPID | ~2016-2018 | No Google account required; VAPID is the standard |
| Polling for horoscope updates | On-demand streaming generation | Present | Matches Oracle UX pattern already established |
| External cron services | Vercel built-in cron (`vercel.json`) | ~2023 | Zero additional services for daily scheduling |
| Separate ephemeris data files | Moshier built-in (already in project) | Phase 4 decision | Transit calculation requires no additional setup |

**Deprecated/outdated:**
- **`node-cron` inside Next.js:** Works in traditional Node servers, fails silently in serverless. Use `vercel.json` cron instead.
- **iOS Web Push before 16.4:** Web Push is not available in Safari < 16.4 or on iOS without PWA install. For v0.1 web-first, this is acceptable — show a browser support message.
- **GCM API key for push:** Replaced by VAPID in modern push. Chrome no longer requires a GCM key when VAPID is set.

---

## Open Questions

1. **Should the morning push notification include a short personalized teaser, or a generic "your horoscope is ready" message?**
   - What we know: Generating a personalized teaser per user in the cron job requires N AI calls (one per user with subscriptions + charts) — expensive and slow.
   - What's unclear: How many users will have push subscriptions at launch? For <100 users, N calls is fine. For 1000+, it risks timeouts and AI costs.
   - Recommendation: For v0.1, send a generic notification ("Вашият дневен хороскоп ви очаква"). Let the cron job be simple and reliable. Add personalized teasers in a future phase.

2. **Which chart to use for the daily horoscope when a user has multiple charts?**
   - What we know: The `charts` table supports multiple charts per user. The Oracle approach requires a `chartId` param.
   - What's unclear: Should the horoscope use the user's "primary" chart? Should they be able to view per-chart horoscopes?
   - Recommendation: Use the user's most recently created chart as the default, with a chart selector if multiple exist. Add a `is_primary` flag to the `charts` table, or select the chart with the earliest `created_at` (their own chart).

3. **Do we need a `yesterday` navigation feature requiring separate storage?**
   - What we know: DAILY-03 requires "User can view yesterday's horoscope." The `daily_horoscopes` table stores by date, so yesterday's row will exist if it was generated.
   - What's unclear: If the user didn't open the app yesterday, there's no yesterday row to display.
   - Recommendation: Accept this limitation for v0.1 — "yesterday" only available if user viewed it. Add a note in the UI. Pre-generation of yesterday's horoscope can be added in a later phase.

4. **Web Push on iOS: require PWA install first?**
   - What we know: Web Push on iOS requires the app to be installed to the home screen (PWA). In a browser tab on iOS, push notifications are not supported regardless of Safari version.
   - What's unclear: How many Bulgarian users will add to home screen vs. browsing in Safari tab?
   - Recommendation: Show a conditional install prompt for iOS users explaining that notifications require home screen installation. Not a blocker for v0.1 — gracefully hide the notification opt-in if `'PushManager' in window` is false.

---

## Sources

### Primary (HIGH confidence)
- Official Next.js PWA docs - https://nextjs.org/docs/app/guides/progressive-web-apps — Web Push implementation with `web-push`, VAPID keys, service worker setup
- Vercel Cron Jobs docs - https://vercel.com/docs/cron-jobs — schedule syntax, `vercel.json` config, cron expressions
- Vercel Cron Job management - https://vercel.com/docs/cron-jobs/manage-cron-jobs — `CRON_SECRET` auth pattern, duration limits, idempotency
- Vercel Cron Usage & Pricing - https://vercel.com/docs/cron-jobs/usage-and-pricing — Hobby vs Pro precision, max 100 cron jobs
- Existing codebase: `packages/astrology/src/calculator.ts` — `sweph.calc_ut` usage for natal chart (directly reusable for transits)
- Existing codebase: `apps/web/app/api/oracle/generate/route.ts` — AI streaming pattern, cache-first, service role, `onFinish` upsert

### Secondary (MEDIUM confidence)
- Astrology transit orb standards: https://theastrologyplacemembership.com/2011/02/orbs/ — transit orbs 2-4° vs natal 5-9°; verified by multiple astrology sources
- `web-push` npm/GitHub: https://github.com/web-push-libs/web-push — API signatures for `sendNotification`, `generateVAPIDKeys`; `@types/web-push` 3.6.4 available

### Tertiary (LOW confidence)
- Push subscription cleanup pattern (410 handling): Derived from Web Push spec behavior + multiple blog posts. Core logic is sound but exact error shape from `web-push` library should be verified at implementation time against `@types/web-push` definitions.
- Sofia timezone handling: Standard `Intl.DateTimeFormat` behavior — HIGH confidence on mechanism, but should test edge cases at UTC midnight / DST transitions.

---

## Metadata

**Confidence breakdown:**
- Transit calculation: HIGH — same `sweph.calc_ut` pattern as natal chart, already in codebase
- AI horoscope generation: HIGH — identical to Oracle pattern, just different prompt and cache table
- Web Push stack: HIGH — verified against official Next.js docs; web-push is the explicitly recommended library
- Vercel cron: HIGH — verified against official Vercel docs; exact configuration and auth pattern confirmed
- Transit orb values: MEDIUM — sourced from astrology community standards, not a mathematical law; acceptable variance exists
- Push notification iOS/PWA: MEDIUM — behavior confirmed, but install flow UX needs testing

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (Vercel platform docs are stable; Next.js 15 is current; web-push v3.x has been stable)
