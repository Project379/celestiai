---
phase: 07-payments
plan: 01
subsystem: payments
tags: [stripe, subscription, pricing, database, checkout]
dependency_graph:
  requires: []
  provides:
    - stripe-client-singleton
    - checkout-api-route
    - pricing-page
    - stripe-db-schema
    - webhook-idempotency-table
    - drizzle-migration-0005
  affects:
    - packages/db/src/schema/users.ts
    - packages/db/src/schema/webhooks.ts
    - apps/web/lib/stripe/
    - apps/web/app/api/stripe/
    - apps/web/app/(protected)/pricing/
tech_stack:
  added:
    - stripe@20.3.1 (payment processing SDK)
    - drizzle-kit updated to latest for ORM version compatibility
  patterns:
    - Stripe singleton via module-level export
    - priceId allowlist validation against env vars
    - Server component for data fetch, client component for interactivity
    - clerkUserId metadata on both session and subscription_data for webhook correlation
key_files:
  created:
    - apps/web/lib/stripe/client.ts
    - apps/web/app/api/stripe/checkout/route.ts
    - apps/web/app/(protected)/pricing/page.tsx
    - apps/web/app/(protected)/pricing/PricingContent.tsx
    - apps/web/components/upgrade/PricingToggle.tsx
    - packages/db/src/schema/webhooks.ts
    - packages/db/drizzle/0005_slow_blue_shield.sql
  modified:
    - packages/db/src/schema/users.ts (added 3 Stripe columns)
    - packages/db/src/schema/index.ts (added webhooks export)
    - apps/web/.env.example (added Stripe env var placeholders)
    - apps/web/package.json (added stripe@20.3.1)
    - packages/db/package.json (drizzle-kit updated to latest)
decisions:
  - "stripe@20.3.1 installed (latest); plan specified ^17 — API version updated from 2025-01-27.acacia to 2026-01-28.clover to match SDK"
  - "drizzle-kit updated to latest to resolve drizzle-orm 0.40.1 version mismatch (0.31.8 was incompatible)"
  - "PricingContent extracted as separate client component file to keep page.tsx as clean server component"
  - "clerkUserId metadata set on both checkout session and subscription_data for reliable webhook correlation"
metrics:
  duration: 5m
  completed: 2026-02-17
  tasks_completed: 2
  files_created: 7
  files_modified: 5
---

# Phase 7 Plan 01: Stripe Foundation Summary

**One-liner:** Stripe SDK integrated with checkout session API, pricing page with monthly/annual toggle, and DB schema extended with Stripe and webhook idempotency tables.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Install Stripe SDK and add database schema | `498adec` | Done |
| 2 | Create checkout API route and /pricing page | `e92deb9` | Done |

## What Was Built

### Database Layer

- **`packages/db/src/schema/users.ts`** — Extended with 3 Stripe columns:
  - `stripeCustomerId` (text, unique, nullable) — links to Stripe customer object
  - `stripeSubscriptionId` (text, nullable) — active subscription ID
  - `subscriptionExpiresAt` (timestamp with timezone, nullable) — for expiry tracking

- **`packages/db/src/schema/webhooks.ts`** — New idempotency table `processed_webhook_events`:
  - Tracks `stripeEventId` (unique), `eventType`, and `processedAt`
  - Prevents duplicate processing when Stripe retries webhook delivery

- **`packages/db/drizzle/0005_slow_blue_shield.sql`** — Drizzle migration with all schema changes

### Stripe Client

- **`apps/web/lib/stripe/client.ts`** — Module-level Stripe singleton using API version `2026-01-28.clover` (required by stripe@20.x)

### Checkout API

- **`apps/web/app/api/stripe/checkout/route.ts`** — POST endpoint:
  - Clerk auth guard → 401 if unauthenticated
  - priceId validated against allowlist (`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`) → 400 if invalid
  - Looks up existing Stripe customer ID from Supabase to enable returning-customer flow
  - Creates checkout session with `clerkUserId` metadata on both session and `subscription_data`
  - Supports `allow_promotion_codes: true`
  - Returns `{ url }` for client redirect

### Pricing Page

- **`apps/web/app/(protected)/pricing/page.tsx`** — Server component:
  - Reads `subscription_tier` from Supabase
  - Passes tier and price IDs to `PricingContent`

- **`apps/web/app/(protected)/pricing/PricingContent.tsx`** — Client component (207 lines):
  - Side-by-side Free/Premium cards (stacked mobile, side-by-side lg)
  - `cancelled=true` URL param shows subtle Bulgarian cancellation message
  - Free tier card with 3 features; Premium with 6 features
  - Premium state: active badge "Активен план" + "Управление на абонамент" link to /settings
  - Free user state: "Отключи Премиум" button with loading state → POST to /api/stripe/checkout → redirect to Stripe

- **`apps/web/components/upgrade/PricingToggle.tsx`** — Client component:
  - Monthly (€9,99/мес) / Annual (€99,99/год) toggle
  - Savings badge "~17% спестявате" shown when annual is selected
  - Emits priceId to parent via `onPriceChange` callback

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stripe API version updated for stripe@20.x**
- **Found during:** Task 1 verification (TypeScript check)
- **Issue:** Plan specified `apiVersion: '2025-01-27.acacia'` which is only valid for stripe@^17. stripe@20.3.1 requires `'2026-01-28.clover'`.
- **Fix:** Updated `apps/web/lib/stripe/client.ts` to use `'2026-01-28.clover'`
- **Files modified:** `apps/web/lib/stripe/client.ts`
- **Commit:** `e92deb9` (included in Task 2 commit as this was discovered post-Task-1 commit)

**2. [Rule 3 - Blocking] drizzle-kit updated to fix version mismatch**
- **Found during:** Task 1 migration generation step
- **Issue:** drizzle-kit@0.31.8 was incompatible with drizzle-orm@0.40.1 — error: "Please install latest version of drizzle-orm"
- **Fix:** Updated drizzle-kit to latest version via `pnpm --filter @celestia/db add -D drizzle-kit@latest`
- **Files modified:** `packages/db/package.json`, `pnpm-lock.yaml`
- **Commit:** `498adec`

**3. [Design] PricingContent extracted to separate file**
- **Found during:** Task 2 implementation
- **Reason:** Next.js requires server components to not have any `'use client'` directive — the plan suggested PricingContent as a separate component in the same file, but for clean server/client separation it was moved to `PricingContent.tsx`.
- **Impact:** No behavior change; cleaner file structure.

## Self-Check

Verifying created files exist:
- [x] `apps/web/lib/stripe/client.ts` — FOUND
- [x] `apps/web/app/api/stripe/checkout/route.ts` — FOUND
- [x] `apps/web/app/(protected)/pricing/page.tsx` — FOUND
- [x] `apps/web/app/(protected)/pricing/PricingContent.tsx` — FOUND
- [x] `apps/web/components/upgrade/PricingToggle.tsx` — FOUND
- [x] `packages/db/src/schema/webhooks.ts` — FOUND
- [x] `packages/db/drizzle/0005_slow_blue_shield.sql` — FOUND

Verifying commits exist:
- [x] `498adec` — Task 1: Install Stripe SDK, extend DB schema, create migration
- [x] `e92deb9` — Task 2: Create checkout API route and /pricing page

TypeScript: PASSED (zero errors via `pnpm --filter @celestia/web run typecheck`)

## Self-Check: PASSED
