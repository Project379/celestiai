# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stellaeum AI** is a subscription-based astrology application for the Bulgarian market. It combines Swiss Ephemeris astronomical precision with AI-powered readings, serving Web, iOS, and Android from a single codebase.

> **AI model:** this file does not restate model status. See `.planning/SYSTEM-MAP.md` §4 for the current AI truth — which model runs, via which provider/client, and what is and isn't checked on its output — and `.planning/PLACEHOLDERS.md` LLM-MODEL for provider-swap status. The output is a known-weak placeholder: do not add prompt workarounds or post-processing for it.

## Tech Stack

- **Monorepo**: Turborepo
- **Universal Framework**: Solito (Next.js 15 + Expo SDK 52)
- **Auth**: Clerk (handles Web cookies + Native tokens/biometrics)
- **Database**: Supabase (PostgreSQL) — used as plain managed Postgres; Realtime/Storage/Edge Functions are not used
- **ORM**: Drizzle ORM
- **Styling**: NativeWind v4
- **Visualization**: react-native-svg (mobile), D3.js-driven SVG (web) — corrected 2026-08-04; no Skia dependency exists in the app, and web's chart renders to SVG, not Canvas. See CHECKPOINT-2026-08-04.md §2.
- **Astrology Engine**: native `sweph` (Swiss Ephemeris via N-API bindings), server-side only — not `swisseph-wasm`
- **Payments**: Stripe (web) + RevenueCat (mobile IAP)

## Monorepo Structure

```
/
├── apps/
│   ├── web/          # Next.js 15 app
│   │   └── app/api/  # API routes (astrology calculations, webhooks)
│   └── mobile/       # Expo app
├── packages/
│   ├── astrology/    # Swiss Ephemeris wrapper (native sweph)
│   └── db/           # Shared Drizzle ORM schema + Supabase client
```

## Database Schema

- `users` - Linked to Clerk ID, preferences, subscription_tier
- `charts` - user_id, name, date_time, lat, lon, city_name
- `daily_transits` - Cached calculations (date, planet_positions JSONB)
- `journal_entries` - user_id, date, AI insight content

## Key Architecture Decisions

- Heavy Swiss Ephemeris calculations (native `sweph`) run server-side via API routes, not in the mobile bundle
- Clerk JWT Templates configured for Supabase RLS
- Stripe/RevenueCat webhooks update `users.subscription_tier`
- 90% code sharing between web and mobile via Solito

## Build Commands

```bash
npm install              # Install dependencies
npm run dev              # Run dev servers (web + mobile)
npm run build            # Production build
npm test                 # Run tests
npm run test:e2e         # Playwright e2e tests
```

## GSD Workflow

This project uses GSD (Get Shit Done) for structured planning:

- `/gsd:progress` - Check status and next action
- `/gsd:plan-phase <number>` - Create phase plan
- `/gsd:execute-plan <path>` - Execute a plan
- `/gsd:debug [issue]` - Systematic debugging

Planning files are in `.planning/`.
