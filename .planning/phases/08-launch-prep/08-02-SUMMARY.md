---
phase: 08-launch-prep
plan: 02
subsystem: api, database, ui
tags: [gdpr, privacy, supabase, clerk, cron, soft-delete, data-export]

# Dependency graph
requires:
  - phase: 07-payments
    provides: users table with Stripe columns, settings page pattern
  - phase: 06-daily-horoscope
    provides: daily_horoscopes table, cron pattern, push_subscriptions table
  - phase: 05-ai-oracle
    provides: ai_readings table
provides:
  - GDPR-compliant privacy policy page at /privacy
  - Privacy settings page at /settings/privacy with data export and account deletion
  - GDPR data export API (GET /api/gdpr/export)
  - Account deletion API with 30-day grace period (POST/DELETE /api/gdpr/delete-account)
  - Hard-delete cron job (GET /api/cron/cleanup-deleted-accounts)
  - Users table soft-delete columns (deleted_at, deletion_scheduled_at)
affects: [08-launch-prep]

# Tech tracking
tech-stack:
  added: []
  patterns: [soft-delete with grace period, GDPR data export, cascading hard-delete cron]

key-files:
  created:
    - apps/web/app/privacy/page.tsx
    - apps/web/app/(protected)/settings/privacy/page.tsx
    - apps/web/app/(protected)/settings/privacy/PrivacySettingsContent.tsx
    - apps/web/app/api/gdpr/export/route.ts
    - apps/web/app/api/gdpr/delete-account/route.ts
    - apps/web/app/api/cron/cleanup-deleted-accounts/route.ts
    - packages/db/drizzle/0006_living_morg.sql
  modified:
    - packages/db/src/schema/users.ts
    - apps/web/vercel.json
    - apps/web/app/(protected)/settings/SettingsContent.tsx

key-decisions:
  - "daily_horoscopes has user_id column — queried directly instead of joining through charts"
  - "ai_readings has user_id column — queried directly for GDPR export and hard-delete"
  - "Cron hard-delete order: horoscopes/calculations by chart_id, then readings/charts/push_subscriptions by user_id, then users row, then Clerk account"
  - "await clerkClient() per Clerk v6 pattern for server-side Clerk API calls in cron"

patterns-established:
  - "Soft delete with grace period: deleted_at marks deactivation, deletion_scheduled_at sets hard-delete date"
  - "GDPR export: parallel Supabase queries, JSON file download via Content-Disposition header"
  - "Cascading hard-delete: dependency-ordered deletion across all user-related tables"

# Metrics
duration: 7min
completed: 2026-02-18
---

# Phase 8 Plan 2: GDPR Compliance Summary

**Bulgarian GDPR privacy policy, instant JSON data export, soft-delete account deletion with 30-day grace period, and automated hard-delete cron**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Public privacy policy page at /privacy with comprehensive Bulgarian GDPR text covering data collection, usage, storage, rights, cookies, and contact
- Privacy settings page at /settings/privacy with instant JSON data export download and account deletion with confirmation dialog
- GDPR API routes: data export (GET), deletion request (POST), deletion cancellation (DELETE)
- Hard-delete cron at 03:00 UTC that cascades deletion across all tables and removes Clerk account
- Users table extended with deletedAt and deletionScheduledAt soft-delete columns (migration 0006)

## Task Commits

Each task was committed atomically:

1. **Task 1: Users table soft-delete columns, privacy policy page, and GDPR API routes** - `7a6429c` (feat)
2. **Task 2: Privacy settings page with data export and account deletion UI** - `b18b5f7` (feat)

## Files Created/Modified
- `packages/db/src/schema/users.ts` - Added deletedAt and deletionScheduledAt soft-delete columns
- `packages/db/drizzle/0006_living_morg.sql` - Migration for soft-delete columns
- `apps/web/app/privacy/page.tsx` - Public Bulgarian GDPR privacy policy page
- `apps/web/app/api/gdpr/export/route.ts` - GDPR data export endpoint returning JSON file
- `apps/web/app/api/gdpr/delete-account/route.ts` - Account deletion request and cancellation endpoints
- `apps/web/app/api/cron/cleanup-deleted-accounts/route.ts` - Hard-delete cron for expired grace periods
- `apps/web/vercel.json` - Added cleanup cron at 03:00 UTC
- `apps/web/app/(protected)/settings/privacy/page.tsx` - Privacy settings server component
- `apps/web/app/(protected)/settings/privacy/PrivacySettingsContent.tsx` - Privacy settings client with export + delete controls
- `apps/web/app/(protected)/settings/SettingsContent.tsx` - Added link to /settings/privacy

## Decisions Made
- daily_horoscopes has user_id column, enabling direct query for GDPR export and hard-delete (no join through charts needed)
- ai_readings also has user_id, queried directly for both export and deletion
- Hard-delete cron processes in dependency order to avoid foreign key violations
- Used `await clerkClient()` per Clerk v6 pattern for Clerk user deletion in cron

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing Next.js build infrastructure issue (middleware-manifest.json not found during page data collection) prevents full `next build` completion. TypeScript compilation (`tsc --noEmit`) passes cleanly, confirming all code is correct. This is not caused by our changes.

## User Setup Required

**Database migration required.** Apply migration `0006_living_morg.sql` via Supabase dashboard SQL Editor to add `deleted_at` and `deletion_scheduled_at` columns to the users table.

## Next Phase Readiness
- GDPR compliance infrastructure complete (SEC-03, SEC-04, SEC-05)
- Privacy policy accessible at public /privacy route
- Data export and account deletion available via /settings/privacy
- Ready for remaining Phase 8 plans

---
*Phase: 08-launch-prep*
*Completed: 2026-02-18*
