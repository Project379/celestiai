# Implementation Plan - Celestia AI (Universal)

## Goal
Build a state-of-the-art "Universal" astrology app (Web + iOS + Android) for the Bulgarian market.
**Key Tech**: Turborepo Monorepo, Solito (Next.js + Expo), React Native Skia, Swiss Ephemeris.

## User Review Required
> [!IMPORTANT]
> **Architecture Complexity**: We are moving to a **Monorepo**. This is "State of the Art" but more complex to set up.
> **RevenueCat**: Native mobile apps require In-App Purchases (getting Apple/Google approval is harder with just Stripe). We will use RevenueCat to handle the "Premium" entitlement across Web (Stripe) and Mobile (IAP).

## Tech Stack (The "Solito" Stack)
-   **Monorepo**: Turborepo
-   **Web/Mobile**: Next.js 15 + Expo SDK 52
-   **Auth**: **Clerk** (The "Better Auth" choice for Universal Apps)
-   **Database**: **Supabase** (PostgreSQL + Realtime)
-   **ORM**: **Drizzle ORM** (Best performance/validations)
-   **Styling**: NativeWind v4

## Database Schema (Proposed - Supabase)
-   `users`: ID (linked to Clerk), preferences, subscription_tier.
-   `charts`: user_id, name, date_time, lat, lon, city_name.
-   `daily_transits`: (Cached calculations) date, planet_positions (JSONB).
-   `journal_entries`: user_id, date, content (AI insights).

## Proposed Changes / Monorepo Structure

### 1. Project Initialization (`/`)
-   `create-solito-app` blank starter.
-   Configure `clerk-expo` and `clerk-nextjs`.

### 2. Core Engine (`packages/astrology`)
-   `swisseph-wasm` wrapper.
-   **API Route**: `apps/web/app/api/astro/route.ts` used by mobile app to fetch heavy calculations (keeping the WASM bundle on server).

### 3. Data Layer (`packages/db`)
-   Shared Drizzle ORM schema.
-   Exported `db` client connection to Supabase.
-   Used by `apps/web` (Server Actions) to read/write data.

### 4. Payments & Auth
-   **Clerk**: Configured with "JWT Templates" for Supabase RLS.
-   **Stripe/RevenueCat**: Webhooks update `users.subscription_tier`.

## Verification Plan

### Automated Tests
-   **Auth**: Verify Clerk token generation works for both Web and Mobile.
-   **DB**: Drizzle migrations run successfully against Supabase.

### Manual Verification
-   **Login Flow**: Test Google Login on Localhost (Web) and Expo Go (Mobile).
-   **Data Sync**: Create a chart on Mobile, verify it appears on Web Dashboard.
