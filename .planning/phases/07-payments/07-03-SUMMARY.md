---
phase: 07-payments
plan: 03
subsystem: payments
tags: [stripe, subscription, settings, upgrade-prompt, cancel, portal]
dependency_graph:
  requires: ["07-02"]
  provides: ["subscription-management", "cancel-api", "portal-api", "upgrade-prompts"]
  affects: ["dashboard", "daily-horoscope", "settings"]
tech_stack:
  added: []
  patterns:
    - "Native <dialog> element for cancel confirmation (consistent with Phase 2)"
    - "Inline expand/collapse for UpgradePrompt (not modal, not redirect)"
    - "Promise.all parallel fetching in server component for tier + chart data"
    - "useTransition for async state transitions without isPending flash"
key_files:
  created:
    - apps/web/app/api/stripe/cancel/route.ts
    - apps/web/app/api/stripe/portal/route.ts
    - apps/web/app/(protected)/settings/page.tsx
    - apps/web/app/(protected)/settings/SettingsContent.tsx
    - apps/web/components/upgrade/UpgradePrompt.tsx
  modified:
    - apps/web/app/(protected)/dashboard/page.tsx
    - apps/web/components/dashboard/DashboardContent.tsx
    - apps/web/components/horoscope/DailyHoroscope.tsx
decisions:
  - "SettingsContent extracted to separate file for clean server/client split (consistent with PricingContent and SuccessContent patterns from 07-01 and 07-02)"
  - "UpgradePrompt uses inline expansion — collapsed teaser expands in-place to show pricing and checkout button, no modal or full-page redirect"
  - "DashboardContent receives subscriptionTier and priceMonthly from server page, avoiding client-side fetch for initial render"
  - "DailyHoroscope subscriptionTier prop defaults to 'free' for backward compatibility with any callers that haven't updated"
  - "Promise.all used in dashboard page to fetch charts + users rows concurrently (was sequential before)"
metrics:
  duration: 5m
  completed_date: "2026-02-17"
  tasks_completed: 2
  files_changed: 8
---

# Phase 7 Plan 03: Subscription Management and Upgrade Prompts Summary

**One-liner:** Cancel/reactivate APIs, Stripe portal, 4-state settings page, and inline UpgradePrompt deployed on dashboard and daily horoscope.

## What Was Built

### Task 1: Cancel, Reactivate, Portal APIs + Settings Page
- **POST /api/stripe/cancel** — sets `cancel_at_period_end: true`; accepts optional reason string for product feedback; logs reason to console
- **DELETE /api/stripe/cancel** — reactivates by setting `cancel_at_period_end: false`
- **POST /api/stripe/portal** — creates Stripe Customer Portal session and returns URL
- **/settings page** — server component fetches user + Stripe subscription data, passes to `SettingsContent` client component
- **4 subscription states handled:**
  - Free user: plan name, premium unlock CTA linking to /pricing
  - Active: plan name, status badge, next billing date, payment method, manage payments button, cancel button
  - Cancelling: amber status badge, expiry date notice, Reactivate button, manage payments link
  - Expired: expired badge, expiry date, re-subscribe CTA
- **Cancellation dialog:** native `<dialog>` element, 4-option reason dropdown, loading state on confirm, "Keep subscription" dismiss button

### Task 2: UpgradePrompt Component + Dashboard/Horoscope Integration
- **UpgradePrompt component:** `'use client'` with collapsed/expanded state; context-specific Bulgarian copy; calls `/api/stripe/checkout` with monthly priceId; links to /pricing for "see all benefits"
- **Dashboard page:** now fetches `subscription_tier` alongside birth chart (parallel Promise.all); passes `subscriptionTier` and `priceMonthly` to DashboardContent
- **DashboardContent:** premium badge ("✦ Премиум") on welcome header for premium users; UpgradePrompt for free users after birth data section
- **DailyHoroscope:** accepts optional `subscriptionTier` and `priceMonthly` props; renders UpgradePrompt inline after horoscope content for free users; premium users see no prompt

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b7dc6c7 | feat(07-03): subscription management API routes and settings page |
| 2 | 52f2919 | feat(07-03): UpgradePrompt component and dashboard/horoscope integration |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- [x] POST /api/stripe/cancel sets cancel_at_period_end: true
- [x] DELETE /api/stripe/cancel sets cancel_at_period_end: false
- [x] POST /api/stripe/portal creates billing portal session and returns URL
- [x] /settings handles 4 states: free, active, cancelling, expired
- [x] Cancellation dialog has optional "Why leaving?" dropdown with 4 options
- [x] UpgradePrompt reusable with context-specific copy
- [x] Dashboard and horoscope integrate upgrade prompts for free users
- [x] Premium users see badge on dashboard, no upgrade prompts
- [x] All UI text in Bulgarian
- [x] Build compiles successfully (both tasks verified)

## Self-Check: PASSED
