# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Celestia AI** is a subscription-based astrology application for the Bulgarian market. It combines Swiss Ephemeris astronomical precision with AI-powered readings (via Gemini/GPT-5), serving Web, iOS, and Android from a single codebase.

## Tech Stack

- **Monorepo**: Turborepo
- **Universal Framework**: Solito (Next.js 15 + Expo SDK 52)
- **Auth**: Clerk (handles Web cookies + Native tokens/biometrics)
- **Database**: Supabase (PostgreSQL + Realtime)
- **ORM**: Drizzle ORM
- **Styling**: NativeWind v4
- **Visualization**: React Native Skia (mobile), D3.js + Canvas (web)
- **Astrology Engine**: swisseph-wasm (Swiss Ephemeris)
- **Payments**: Stripe (web) + RevenueCat (mobile IAP)

## Monorepo Structure

```
/
├── apps/
│   ├── web/          # Next.js 15 app
│   │   └── app/api/  # API routes (astrology calculations, webhooks)
│   └── mobile/       # Expo app
├── packages/
│   ├── astrology/    # Swiss Ephemeris wrapper (swisseph-wasm)
│   └── db/           # Shared Drizzle ORM schema + Supabase client
```

## Database Schema

- `users` - Linked to Clerk ID, preferences, subscription_tier
- `charts` - user_id, name, date_time, lat, lon, city_name
- `daily_transits` - Cached calculations (date, planet_positions JSONB)
- `journal_entries` - user_id, date, AI insight content

## Key Architecture Decisions

- Heavy WASM calculations (Swiss Ephemeris) run server-side via API routes, not in mobile bundle
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
