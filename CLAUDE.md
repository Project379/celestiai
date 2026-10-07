# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stellaeum AI** is a subscription-based astrology application for the Bulgarian market. It combines Swiss Ephemeris astronomical precision with AI-powered readings, serving Web, iOS, and Android from a single codebase.

> **AI model:** this file does not restate model status. See `.planning/SYSTEM-MAP.md` §4 for the current AI truth — which model runs, via which provider/client, and what is and isn't checked on its output — and `.planning/PLACEHOLDERS.md` (LLM-MODEL-SWAP, LLM-FAILOVER, GEMINI-SLOW-NO-FAILOVER) for what is still open. The placeholder model is gone (Gemini, called directly through `@ai-sdk/google`); output now passes `apps/web/lib/ai/validate-reading.ts`. Read §4 before touching prompts or validators.
>
> **Language:** Bulgarian only at launch (informal ти register). New user-facing Bulgarian needs the founder's approval before it lands; the founder is the final word on Bulgarian. Strings live in content-home files and are locked by `scripts/i18n/copy-lock.json`.

## Tech Stack

- **Monorepo**: Turborepo
- **Apps**: Next.js 15 (web) and Expo SDK 54 (mobile) as two separate apps, no Solito (corrected 2026-10-07; it was never a dependency) — Expo version corrected 2026-09-28; `apps/mobile/package.json` pins `"expo": "~54.0.36"`. This line was wrong three times before being fixed; if you're touching version-sensitive behavior (targetSdkVersion, edge-to-edge, deprecations), read `apps/mobile/package.json` directly rather than trusting this line.
- **Auth**: Clerk (handles Web cookies + Native tokens/biometrics)
- **Database**: Supabase (PostgreSQL) — used as plain managed Postgres; Realtime/Storage/Edge Functions are not used
- **Data access**: `@supabase/supabase-js` query builder (Drizzle was removed 2026-04-20, see `.planning/research/DRIZZLE_DECISION.md` §9); migrations are plain SQL in `supabase/migrations/`
- **Styling**: NativeWind v4
- **Visualization**: react-native-svg (mobile), D3.js-driven SVG (web) — corrected 2026-08-04; no Skia dependency exists in the app, and web's chart renders to SVG, not Canvas. See CHECKPOINT-2026-08-04.md §2.
- **Astrology Engine**: native `sweph` (Swiss Ephemeris via N-API bindings), server-side only — not `swisseph-wasm`
- **AI**: Gemini via `@ai-sdk/google` (`apps/web/lib/ai/`), server-side only
- **Payments**: Stripe (web) + RevenueCat (mobile IAP)

## Monorepo Structure

```
/
├── apps/
│   ├── web/          # Next.js 15 app (app/api/ = compute routes, crons, webhooks)
│   └── mobile/       # Expo app (design-system primitives in components/design-system/)
├── packages/
│   ├── core/         # Framework-agnostic logic + Supabase data access + Zod schemas (no React/Next/Expo/Clerk imports)
│   ├── astrology/    # Swiss Ephemeris wrapper (native sweph)
│   ├── ui/           # Shared primitives (small)
│   └── config/       # Shared ESLint + TypeScript configs
├── supabase/migrations/   # Hand-applied SQL (never `db push` — see CC-SESSION-HANDOFF §3)
├── scripts/          # check:* gates, i18n copy-lock, post-deploy smoke
└── .planning/        # Register (PLACEHOLDERS.md), SYSTEM-MAP.md, design docs, handoff
```

(`packages/db` no longer exists.)

## Database Schema

Production has 41 tables in `public`, all with RLS enabled (checked 2026-10-07). Do not trust a short list here — read `supabase/migrations/` and query the database. Groups:

- **Accounts & billing:** `users`, `subscription_quotas`, `processed_webhook_events`, `processed_revenuecat_events`, `audit_logs`, `rate_limit_buckets`
- **Charts & sky:** `charts`, `chart_calculations`, `birth_data_edits`, `daily_transits`, `bulgarian_cities`
- **Readings:** `ai_readings`, `daily_horoscopes`, `bg_generation_flags`
- **Diary:** `diary_entries`, `diary_reminder_preferences`, `diary_reminder_deliveries`
- **Кръг (people graph):** `saved_people_profiles`, `saved_people_reports`, `connection_spaces`, `connection_members`, `connection_invites`, `connection_reports`
- **Crystals:** `crystals`, `crystal_vendors`, `crystal_listings`, `crystal_recommendations`, `user_crystals`, `user_daily_crystals`
- **Recommendations (feature disabled pending licensing):** `recommendation_*`, `user_recommendation_work_states`
- **Push:** `push_subscriptions`, `push_tokens`

Migration ledger caveat: 16 tables from the Drizzle era have no `CREATE TABLE` in any tracked migration, and one ledger row (`20260928120000 full_diary_v2`) has no file in this checkout (Petko's branch). See PLACEHOLDERS.md MIGRATION-PROCESS-GAP.

## Key Architecture Decisions

- Heavy Swiss Ephemeris calculations (native `sweph`) run server-side via API routes, not in the mobile bundle
- Clerk session token is passed to Supabase through `accessToken()` (`apps/web/lib/supabase/client.ts`) so RLS sees the user
- Stripe/RevenueCat webhooks update `users.subscription_tier`
- Web and mobile are two separate apps, not a Solito universal app (measured 2026-10-07: `solito` is not a dependency anywhere). What they share is logic, not UI: `packages/core` and `packages/astrology` (~8.7k lines, imported by 46 mobile and 82 web files) against ~55k lines of app code. `packages/ui` has no importers. Screens, components and styling are written twice.

## Build Commands

```bash
pnpm install                 # Install dependencies (pnpm@9.15.4, Node >= 22)
pnpm run dev                 # Run dev servers (web + mobile)
pnpm run build               # Production build
pnpm test                    # Run tests
pnpm run check:all           # The full gate: strictness, bg-strings, copy-lock, bg-lint baseline,
                             # error codes, rpc contract, env consistency, typecheck, lint, test,
                             # placeholders, and a real `next build`
pnpm run i18n:update-copy-lock   # Only after reading the new Bulgarian string
```

No `test:e2e` script or Playwright config exists in this repo — the smoke-test workflow (`scripts/smoke.mjs`, `.github/workflows/smoke.yml`) covers post-deploy checks instead. See PLACEHOLDERS.md's SMOKE-TEST and CSP-SMOKE-CHECK rows.

## Branches

`main` is the long-lived branch and deploys to production on push. `ui-parity` (created 2026-10-07) is the short-lived UI branch: preview deploys only, never merged without the founder's say. Order of work there: all mobile screens first (design size 384×832, floor 360×780), web afterwards; until mobile is approved web gets only shared tokens, fonts and copy-file changes (`.planning/UI-PARITY-PLAN.md`). Merge `main` into it daily. CI runs on every push and PR.

## GSD Workflow

This project uses GSD (Get Shit Done) for structured planning:

- `/gsd:progress` - Check status and next action
- `/gsd:plan-phase <number>` - Create phase plan
- `/gsd:execute-plan <path>` - Execute a plan
- `/gsd:debug [issue]` - Systematic debugging

Planning files are in `.planning/`.
