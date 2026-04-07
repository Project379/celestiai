---
phase: 03-birth-data-database
plan: 01
subsystem: database
tags: [drizzle, supabase, rls, postgresql, clerk]
dependency_graph:
  requires:
    - 02-authentication (Clerk auth for JWT tokens)
  provides:
    - @celestia/db package with schema types
    - Supabase client factories with Clerk integration
    - RLS policies for user data isolation
    - Migration SQL ready for Supabase
  affects:
    - 03-02 (Bulgarian cities data seeding)
    - 03-03 (Birth data wizard forms)
    - 03-04 (Birth data API routes)
tech_stack:
  added:
    - drizzle-orm@0.40.0
    - drizzle-kit@0.31.0
    - postgres@3.4.5
    - "@supabase/supabase-js@2.49.1"
  patterns:
    - Drizzle pgTable.withRLS() for RLS-enabled tables
    - accessToken() callback for Clerk JWT injection
    - Server/Client Supabase client factory pattern
key_files:
  created:
    - packages/db/package.json
    - packages/db/tsconfig.json
    - packages/db/drizzle.config.ts
    - packages/db/src/index.ts
    - packages/db/src/client.ts
    - packages/db/src/schema/index.ts
    - packages/db/src/schema/charts.ts
    - packages/db/src/schema/cities.ts
    - packages/db/drizzle/0000_slow_invaders.sql
    - apps/web/lib/supabase/server.ts
    - apps/web/lib/supabase/client.ts
  modified:
    - apps/web/package.json
    - apps/web/.env.local.example
    - pnpm-lock.yaml
decisions:
  - id: "03-01-01"
    choice: "pgTable().enableRLS() with pgPolicy() helpers"
    reason: "Type-safe RLS policies defined in schema, version controlled"
  - id: "03-01-02"
    choice: "auth.jwt()->>'sub' for user ID matching"
    reason: "Clerk uses string IDs, not UUIDs - auth.uid() is Supabase Auth only"
  - id: "03-01-03"
    choice: "Separate server/client Supabase factories"
    reason: "Server uses auth().getToken(), client uses useSession().getToken()"
metrics:
  duration: 5m
  completed: 2026-01-26
---

# Phase 3 Plan 1: Database Schema & Supabase Setup Summary

Drizzle ORM schema with charts (RLS-enabled) and bulgarian_cities tables, Supabase client factories integrating Clerk JWT tokens for user data isolation.

## What Was Built

### @celestia/db Package
- **Schema**: `charts` table with RLS policies enforcing `auth.jwt()->>'sub' = user_id`
- **Schema**: `bulgarian_cities` lookup table with name_ascii and type indexes
- **Client**: Generic `createSupabaseClient()` factory accepting accessToken function
- **Config**: Drizzle config with Supabase role management enabled
- **Types**: Exported `Chart`, `NewChart`, `City`, `NewCity` TypeScript types

### Supabase Client Factories
- **Server**: `createServerSupabaseClient()` using `auth().getToken()` from Clerk
- **Client**: `useSupabaseClient()` hook using `useSession().getToken()`
- Both automatically inject Clerk JWT for RLS policy evaluation

### Database Migration
- SQL file with CREATE TABLE for charts and bulgarian_cities
- RLS enabled on charts table
- Four policies: select_own, insert_own, update_own, delete_own
- Indexes on bulgarian_cities for search performance

## Key Implementation Details

### RLS Policy Pattern
```typescript
pgPolicy('charts_select_own', {
  for: 'select',
  to: authenticatedRole,
  using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
})
```

### Server Client Pattern
```typescript
export async function createServerSupabaseClient() {
  return createClient(url, key, {
    async accessToken() {
      return (await auth()).getToken()
    },
  })
}
```

## Verification Results

- [x] `pnpm install` succeeds
- [x] `pnpm --filter @celestia/db typecheck` passes
- [x] `pnpm --filter @celestia/web typecheck` passes
- [x] Migration SQL includes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [x] Migration SQL includes all four `CREATE POLICY` statements

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

Before using the database:

1. **Create Supabase Project**
   - Go to https://supabase.com/dashboard
   - Create new project

2. **Configure Environment Variables**
   - `NEXT_PUBLIC_SUPABASE_URL`: Project Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings > API > anon public key
   - `DATABASE_URL`: Project Settings > Database > Connection string (URI)

3. **Enable Clerk Integration**
   - Supabase Dashboard > Authentication > Third-party Auth > Add Clerk
   - Clerk Dashboard > Integrations > Supabase > Enable

4. **Apply Migration**
   - Run `pnpm --filter @celestia/db db:push` for development
   - Or copy SQL to Supabase SQL Editor for production

5. **Verify Backup Encryption (SEC-21)**
   - Supabase Dashboard > Project Settings > Database > Backups
   - Confirm "Encrypted" status is shown

## Next Phase Readiness

Ready for 03-02 (Bulgarian cities data seeding):
- Cities table schema defined
- Migration can be applied to create table
- Seed data can be inserted after table creation
