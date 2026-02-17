---
phase: 07-payments
plan: 02
subsystem: payments
tags: [stripe, webhooks, subscription, idempotency, success-page]
dependency_graph:
  requires:
    - 07-01 (stripe-client-singleton, checkout-api-route, webhook-idempotency-table, stripe-db-schema)
  provides:
    - stripe-webhook-handler
    - subscription-lifecycle-helpers
    - subscription-success-page
    - stripe-status-api
  affects:
    - apps/web/app/api/webhooks/stripe/route.ts
    - apps/web/lib/stripe/subscription.ts
    - apps/web/app/(protected)/subscription/success/
    - apps/web/app/api/stripe/status/route.ts
tech_stack:
  added: []
  patterns:
    - Raw text body (request.text()) for Stripe signature verification
    - Idempotency check via processed_webhook_events before processing
    - Return 500 on webhook processing errors so Stripe retries delivery
    - Server/client component split for success page (server fetches, client polls)
    - setInterval polling with 30-second timeout and graceful fallback
    - stripe@20.x: current_period_end on SubscriptionItem not Subscription
    - stripe@20.x: invoice subscription via parent.subscription_details.subscription
key_files:
  created:
    - apps/web/lib/stripe/subscription.ts
    - apps/web/app/api/webhooks/stripe/route.ts
    - apps/web/app/(protected)/subscription/success/page.tsx
    - apps/web/app/(protected)/subscription/success/SuccessContent.tsx
    - apps/web/app/api/stripe/status/route.ts
  modified: []
decisions:
  - "stripe@20.x moves current_period_end from Subscription to SubscriptionItem (sub.items.data[0].current_period_end) — updated subscription helpers accordingly"
  - "stripe@20.x moves invoice.subscription to invoice.parent.subscription_details.subscription — updated handleInvoicePaid to use parent path"
  - "SuccessContent extracted to separate file (SuccessContent.tsx) for clean server/client component separation per Next.js App Router requirements"
metrics:
  duration: 5m
  completed: 2026-02-17
  tasks_completed: 2
  files_created: 5
  files_modified: 0
---

# Phase 7 Plan 02: Stripe Webhook Handler Summary

**One-liner:** Stripe webhook handler with signature verification, idempotency, and 4 subscription lifecycle handlers; success page polls every 2s until premium tier confirmed.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Webhook handler and subscription lifecycle helpers | `9879dbf` | Done |
| 2 | Success page with activating state | `6ac7611` | Done |

## What Was Built

### Subscription Lifecycle Helpers

**`apps/web/lib/stripe/subscription.ts`** — 4 exported handler functions:

- **`handleCheckoutComplete(session)`** — Grants premium after checkout: retrieves full subscription via Stripe API, updates `subscription_tier: 'premium'`, `stripe_customer_id`, `stripe_subscription_id`, and `subscription_expires_at` in users table.

- **`handleSubscriptionUpdated(sub)`** — Recalculates tier from `sub.status`: `active` or `trialing` → `'premium'`; anything else → `'free'`. Updates expiry date from subscription items.

- **`handleSubscriptionDeleted(sub)`** — Revokes premium: sets `subscription_tier: 'free'`, clears `stripe_subscription_id` and `subscription_expires_at` to null.

- **`handleInvoicePaid(invoice)`** — Refreshes expiry on renewal: non-throwing on missing metadata (invoice events can be noisy). Uses `invoice.parent.subscription_details.subscription` path (stripe@20.x API).

All handlers extract `clerkUserId` from subscription/session metadata (set by checkout API in 07-01).

### Webhook Route

**`apps/web/app/api/webhooks/stripe/route.ts`** — POST endpoint:

- Reads raw body via `request.text()` (critical for HMAC signature verification)
- Verifies signature with `stripe.webhooks.constructEvent()` → 400 on failure
- Idempotency check: queries `processed_webhook_events` table by `stripe_event_id` → returns 200 immediately for duplicates
- Processes 5 event types: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` (log-only)
- Records `stripe_event_id` in `processed_webhook_events` after successful processing
- Returns 500 on processing errors (Stripe retries), 200 on success

### Success Page

**`apps/web/app/(protected)/subscription/success/page.tsx`** — Server component:
- Auth guard via Clerk `auth()` → redirects to `/auth` if not authenticated
- Fetches current `subscription_tier` from Supabase service client
- Passes `initialTier` to `SuccessContent` client component

**`apps/web/app/(protected)/subscription/success/SuccessContent.tsx`** — Client component:
- 3 UI states: `activating` (pulsing cosmic spinner), `activated` (celebration with feature list), `timeout` (graceful fallback)
- Polls `/api/stripe/status` every 2 seconds via `setInterval`
- Stops polling when tier = 'premium' or after 30 seconds
- Timeout message: "Ако активирането отнеме повече време, опреснете страницата или се свържете с нас"
- Activation message: "Добре дошли в Celestia Премиум! ✨" with "Към таблото" link
- Cosmic glassmorphism styling consistent with app theme

### Status Endpoint

**`apps/web/app/api/stripe/status/route.ts`** — GET endpoint:
- Clerk auth guard → 401 if unauthenticated
- Queries users table for `subscription_tier` by `clerk_id`
- Returns `{ tier: string }` — defaults to `'free'` on lookup failure
- Exists solely to support success page polling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] stripe@20.x API: current_period_end on SubscriptionItem not Subscription**
- **Found during:** Task 1 verification (TypeScript typecheck)
- **Issue:** Plan specified `subscription.current_period_end` but in stripe@20.x the field moved from `Stripe.Subscription` to `Stripe.SubscriptionItem`. The `Subscription` object no longer exposes `current_period_end` directly.
- **Fix:** Created `getSubscriptionExpiry(sub)` helper that reads `sub.items.data[0].current_period_end` (Unix seconds, multiplied by 1000 for JS Date).
- **Files modified:** `apps/web/lib/stripe/subscription.ts`
- **Commit:** `9879dbf`

**2. [Rule 1 - Bug] stripe@20.x API: Invoice.subscription moved to parent path**
- **Found during:** Task 1 verification (TypeScript typecheck)
- **Issue:** Plan specified `invoice.subscription` but in stripe@20.x this is now accessed via `invoice.parent?.subscription_details?.subscription` (the Invoice object restructured to use a `parent` union type).
- **Fix:** Updated `handleInvoicePaid` to check `invoice.parent?.type === 'subscription_details'` and extract `invoice.parent.subscription_details?.subscription`.
- **Files modified:** `apps/web/lib/stripe/subscription.ts`
- **Commit:** `9879dbf`

**3. [Design] SuccessContent extracted to separate file**
- **Found during:** Task 2 implementation
- **Reason:** Next.js App Router requires server components to not contain `'use client'` — extracting SuccessContent to `SuccessContent.tsx` keeps `page.tsx` as a clean server component with no client directives.
- **Impact:** No behavior change; cleaner file structure matching established pattern from 07-01 (PricingContent).

## Self-Check

Verifying created files exist:
- [x] `apps/web/lib/stripe/subscription.ts` — FOUND
- [x] `apps/web/app/api/webhooks/stripe/route.ts` — FOUND
- [x] `apps/web/app/(protected)/subscription/success/page.tsx` — FOUND
- [x] `apps/web/app/(protected)/subscription/success/SuccessContent.tsx` — FOUND
- [x] `apps/web/app/api/stripe/status/route.ts` — FOUND

Verifying commits exist:
- [x] `9879dbf` — Task 1: Webhook handler and subscription lifecycle helpers
- [x] `6ac7611` — Task 2: Success page with activating state

TypeScript: PASSED (zero errors via `pnpm --filter @celestia/web run typecheck`)
Build: PASSED (Next.js build completed successfully — all 5 new routes appear in output)

## Self-Check: PASSED
