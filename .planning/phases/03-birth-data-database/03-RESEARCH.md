# Phase 3: Birth Data & Database - Research

**Researched:** 2026-01-25
**Domain:** Birth data forms, Bulgarian city geocoding, PostgreSQL encryption, Supabase RLS
**Confidence:** HIGH

## Summary

This phase implements birth data collection with a step-by-step wizard, Bulgarian city search with coordinate resolution, and secure database storage using Supabase with Row Level Security (RLS) enforced via Clerk JWT claims. The integration follows the new Clerk + Supabase third-party auth pattern (JWT templates deprecated April 2025).

Key findings:
- **Clerk + Supabase integration** now uses a native third-party auth pattern with `accessToken()` callback, eliminating JWT template configuration
- **Bulgarian city data** is available from SimpleMaps (MIT license, 256 cities) and yurukov/Bulgaria-geocoding (comprehensive 5,000+ settlements with EKATTE codes)
- **Encryption at rest** is handled automatically by Supabase (AES-256), with optional column-level encryption via pgcrypto for sensitive PII
- **Drizzle ORM** now has first-class RLS support via `pgTable.withRLS()` and Supabase-specific helpers
- **Zod validation** provides type-safe schemas for birth data with ISO date/time parsing and transformation

**Primary recommendation:** Use Drizzle ORM with RLS policies that check `auth.jwt()->>'sub'` against user_id columns, store cities in a seeded lookup table with coordinates, and rely on Supabase's built-in AES-256 encryption at rest (with optional pgcrypto for extra-sensitive fields).

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.40.x+ | Type-safe ORM with RLS support | First-class Supabase integration, `pgTable.withRLS()` API |
| @supabase/supabase-js | 2.x | Supabase client with RLS | Native Clerk third-party auth support via accessToken() |
| zod | 3.24.x | Schema validation | Type-safe validation with ISO date parsing |
| react-hook-form | 7.54.x | Form state management | Minimal re-renders, excellent TypeScript support |
| @hookform/resolvers | 3.x | Zod integration for RHF | Connects Zod schemas to React Hook Form |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | 0.31.x+ | Database migrations | Schema changes, generating SQL |
| postgres | 3.x | PostgreSQL driver | Connection to Supabase database |
| @tanstack/react-query | 5.x | Server state management | Fetching/caching birth data, city search |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Drizzle ORM | Prisma | Prisma has larger binary, less flexible RLS support |
| Static city JSON | API-based geocoding | API adds latency, rate limits, cost; static data is fast and free |
| pgcrypto column encryption | Application-level encryption | App-level adds complexity; Supabase AES-256 at rest is sufficient for most compliance |

**Installation:**
```bash
pnpm add drizzle-orm @supabase/supabase-js zod react-hook-form @hookform/resolvers
pnpm add -D drizzle-kit postgres
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── db/                           # Database package
│   ├── src/
│   │   ├── schema/
│   │   │   ├── index.ts          # Schema exports
│   │   │   ├── users.ts          # User profile schema
│   │   │   ├── charts.ts         # Birth chart data schema
│   │   │   └── cities.ts         # Bulgarian cities lookup
│   │   ├── client.ts             # Supabase + Drizzle client factory
│   │   └── seed/
│   │       └── cities.ts         # City data seeding
│   ├── drizzle/
│   │   └── migrations/           # Generated migrations
│   └── drizzle.config.ts
apps/web/
├── app/
│   ├── (protected)/
│   │   ├── birth-data/
│   │   │   └── page.tsx          # Birth data wizard
│   │   └── settings/
│   │       └── page.tsx          # Edit birth data
│   └── api/
│       ├── birth-data/
│       │   └── route.ts          # CRUD for birth data
│       └── cities/
│           └── search/
│               └── route.ts      # City search endpoint
├── components/
│   └── birth-data/
│       ├── BirthDataWizard.tsx   # Multi-step wizard
│       ├── DateStep.tsx          # Date input step
│       ├── TimeStep.tsx          # Time input step
│       ├── LocationStep.tsx      # City search step
│       └── ConfirmStep.tsx       # Preview/confirm step
└── lib/
    ├── validators/
    │   └── birth-data.ts         # Zod schemas
    └── supabase/
        ├── server.ts             # Server-side client
        └── client.ts             # Client-side client
```

### Pattern 1: Clerk + Supabase Client Factory (2025 Native Integration)
**What:** Create Supabase clients that automatically inject Clerk session tokens
**When to use:** All database operations requiring RLS
**Example:**
```typescript
// Source: https://clerk.com/docs/guides/development/integrations/databases/supabase
// lib/supabase/server.ts
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export function createServerSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken()
      },
    },
  )
}

// lib/supabase/client.ts
'use client'
import { useSession } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

export function useSupabaseClient() {
  const { session } = useSession()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return session?.getToken() ?? null
      },
    },
  )
}
```

### Pattern 2: Drizzle Schema with RLS Policies
**What:** Define tables with RLS policies using Drizzle's Supabase helpers
**When to use:** All user data tables
**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/rls
// packages/db/src/schema/charts.ts
import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, real, boolean, uuid, pgPolicy } from 'drizzle-orm/pg-core'
import { authenticatedRole } from 'drizzle-orm/supabase'

export const charts = pgTable.withRLS('charts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().default(sql`auth.jwt()->>'sub'`),
  name: text('name').notNull(),
  birthDate: timestamp('birth_date', { withTimezone: true }).notNull(),
  birthTimeKnown: boolean('birth_time_known').notNull().default(true),
  birthTime: text('birth_time'), // HH:MM format, null if unknown
  approximateTimeRange: text('approximate_time_range'), // 'morning'|'afternoon'|'evening'|'night'
  cityId: uuid('city_id').references(() => cities.id),
  cityName: text('city_name').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  pgPolicy('users_select_own', {
    for: 'select',
    to: authenticatedRole,
    using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
  }),
  pgPolicy('users_insert_own', {
    for: 'insert',
    to: authenticatedRole,
    withCheck: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
  }),
  pgPolicy('users_update_own', {
    for: 'update',
    to: authenticatedRole,
    using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    withCheck: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
  }),
  pgPolicy('users_delete_own', {
    for: 'delete',
    to: authenticatedRole,
    using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
  }),
])

export type Chart = typeof charts.$inferSelect
export type NewChart = typeof charts.$inferInsert
```

### Pattern 3: Bulgarian Cities Lookup Table
**What:** Static lookup table with city data seeded at deployment
**When to use:** City search and coordinate resolution
**Example:**
```typescript
// packages/db/src/schema/cities.ts
import { pgTable, text, real, uuid, index } from 'drizzle-orm/pg-core'

export const cities = pgTable('bulgarian_cities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),           // Bulgarian name
  nameAscii: text('name_ascii').notNull(), // ASCII for search
  oblast: text('oblast').notNull(),        // Region/province
  ekatte: text('ekatte'),                  // National code
  type: text('type').notNull(),            // 'city' | 'town' | 'village'
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  population: real('population'),
}, (table) => [
  index('cities_name_ascii_idx').on(table.nameAscii),
  index('cities_type_idx').on(table.type),
])

export type City = typeof cities.$inferSelect
```

### Pattern 4: Multi-Step Wizard with React Hook Form + Zod
**What:** Step-by-step form with per-step validation and shared state
**When to use:** Birth data entry wizard (per CONTEXT.md decision)
**Example:**
```typescript
// Source: https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/
// components/birth-data/BirthDataWizard.tsx
'use client'
import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { birthDataSchema, type BirthData } from '@/lib/validators/birth-data'

const STEPS = ['date', 'time', 'location', 'confirm'] as const
type Step = typeof STEPS[number]

export function BirthDataWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('date')

  const methods = useForm<BirthData>({
    resolver: zodResolver(birthDataSchema),
    mode: 'onChange',
    defaultValues: {
      birthTimeKnown: true,
    },
  })

  const stepIndex = STEPS.indexOf(currentStep)
  const isLastStep = stepIndex === STEPS.length - 1

  const nextStep = () => {
    if (!isLastStep) {
      setCurrentStep(STEPS[stepIndex + 1])
    }
  }

  const prevStep = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1])
    }
  }

  const onSubmit = async (data: BirthData) => {
    // Submit to API
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        {/* Progress indicator */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((step, idx) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded ${
                idx <= stepIndex ? 'bg-purple-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        {currentStep === 'date' && <DateStep onNext={nextStep} />}
        {currentStep === 'time' && <TimeStep onNext={nextStep} onBack={prevStep} />}
        {currentStep === 'location' && <LocationStep onNext={nextStep} onBack={prevStep} />}
        {currentStep === 'confirm' && <ConfirmStep onBack={prevStep} />}
      </form>
    </FormProvider>
  )
}
```

### Pattern 5: Zod Validation Schema for Birth Data
**What:** Type-safe validation with date parsing and conditional fields
**When to use:** All birth data input validation
**Example:**
```typescript
// Source: https://zod.dev/api?id=iso-dates
// lib/validators/birth-data.ts
import { z } from 'zod'

// Approximate time ranges per CONTEXT.md
const timeRanges = ['morning', 'afternoon', 'evening', 'night'] as const

export const birthDataSchema = z.object({
  name: z.string()
    .min(1, 'Моля, въведете име')
    .max(100, 'Името е твърде дълго'),

  birthDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Невалиден формат на дата')
    .refine((date) => {
      const parsed = new Date(date)
      return !isNaN(parsed.getTime()) && parsed <= new Date()
    }, 'Моля, изберете дата в миналото'),

  birthTimeKnown: z.boolean(),

  birthTime: z.string()
    .regex(/^\d{2}:\d{2}$/, 'Невалиден формат на час')
    .optional()
    .nullable(),

  approximateTimeRange: z.enum(timeRanges).optional().nullable(),

  cityId: z.string().uuid().optional().nullable(),
  cityName: z.string().min(1, 'Моля, изберете населено място'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),

  // Manual coordinates fallback (per CONTEXT.md)
  manualCoordinates: z.boolean().optional(),
}).refine((data) => {
  // If time is known, birthTime is required
  if (data.birthTimeKnown && !data.birthTime) {
    return false
  }
  // If time is unknown, approximate range is required
  if (!data.birthTimeKnown && !data.approximateTimeRange) {
    return false
  }
  return true
}, {
  message: 'Моля, въведете час или изберете приблизителен период',
  path: ['birthTime'],
})

export type BirthData = z.infer<typeof birthDataSchema>

// API request schema (additional server-side validation)
export const createBirthDataSchema = birthDataSchema.extend({
  // Server validates user ID comes from JWT, not request body
})

// Update schema (partial)
export const updateBirthDataSchema = birthDataSchema.partial()
```

### Pattern 6: City Search API Route
**What:** Server-side city search with debounced results
**When to use:** Bulgarian city autocomplete
**Example:**
```typescript
// app/api/cities/search/route.ts
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { cities } from '@/lib/db/schema'
import { ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export async function GET(request: Request) {
  await auth.protect()

  const url = new URL(request.url)
  const parsed = searchSchema.safeParse({
    q: url.searchParams.get('q'),
    limit: url.searchParams.get('limit'),
  })

  if (!parsed.success) {
    return Response.json({ error: 'Invalid query' }, { status: 400 })
  }

  const { q, limit } = parsed.data
  const searchTerm = `%${q}%`

  // Search by name, prioritize cities over villages
  const results = await db
    .select({
      id: cities.id,
      name: cities.name,
      oblast: cities.oblast,
      type: cities.type,
      latitude: cities.latitude,
      longitude: cities.longitude,
    })
    .from(cities)
    .where(
      or(
        ilike(cities.name, searchTerm),
        ilike(cities.nameAscii, searchTerm),
      )
    )
    .orderBy(
      // Cities first, then towns, then villages
      sql`CASE WHEN ${cities.type} = 'city' THEN 1
               WHEN ${cities.type} = 'town' THEN 2
               ELSE 3 END`,
      cities.name,
    )
    .limit(limit)

  return Response.json(results)
}
```

### Anti-Patterns to Avoid
- **Using Clerk JWT templates:** Deprecated April 2025, use native third-party auth integration instead
- **Storing encryption keys in database:** Use Supabase Vault or environment variables
- **Client-side coordinate resolution:** Use pre-seeded city data to avoid API calls and rate limits
- **auth.uid() with Clerk:** Clerk uses string IDs, not UUIDs; always use `auth.jwt()->>'sub'`
- **Single form without steps:** Per CONTEXT.md, use wizard pattern with progress indicator
- **Indexing encrypted columns:** Encrypted columns cannot be efficiently indexed or searched

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bulgarian city coordinates | Geocoding API calls | Pre-seeded city table | Free, fast, no rate limits, works offline |
| Form state across steps | Custom context/useState | React Hook Form FormProvider | Built-in state persistence, validation |
| Date validation | Manual regex + Date.parse | Zod z.string() with refine | Type-safe, handles edge cases |
| RLS policy management | Raw SQL migrations | Drizzle ORM pgPolicy | Type-safe, version controlled |
| Encryption key storage | Environment variables only | Supabase Vault | Secure, auditable, rotatable |
| City search debouncing | setTimeout + state | useDebouncedCallback or lodash.debounce | Battle-tested, handles edge cases |

**Key insight:** The stack provides robust solutions for all security and data validation needs. Focus implementation effort on UX (wizard flow, error messages) rather than infrastructure.

## Common Pitfalls

### Pitfall 1: Using auth.uid() Instead of auth.jwt()->>'sub'
**What goes wrong:** RLS policies fail silently, returning empty results
**Why it happens:** Clerk uses string user IDs, not UUIDs. `auth.uid()` is for Supabase Auth only.
**How to avoid:** Always use `auth.jwt()->>'sub'` in RLS policies when using Clerk
**Warning signs:** Queries return empty results despite data existing

### Pitfall 2: Forgetting to Enable RLS on Tables
**What goes wrong:** All users can see all data
**Why it happens:** RLS must be explicitly enabled per table
**How to avoid:** Use `pgTable.withRLS()` in Drizzle schema or `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
**Warning signs:** Security audit fails, users report seeing others' data

### Pitfall 3: Missing Role in JWT Claims
**What goes wrong:** Supabase rejects all requests as unauthenticated
**Why it happens:** Clerk's native integration should add `role: "authenticated"` automatically, but requires dashboard setup
**How to avoid:** Verify Supabase integration is activated in Clerk Dashboard
**Warning signs:** 401 errors on all Supabase requests, RLS policies not matching

### Pitfall 4: Date/Timezone Handling
**What goes wrong:** Birth dates shift by a day depending on user's timezone
**Why it happens:** JavaScript Date objects are timezone-aware, but birth dates are conceptually timezone-free
**How to avoid:** Store dates as ISO strings (YYYY-MM-DD) or timestamps with timezone, parse/display in user's local timezone
**Warning signs:** Users report wrong birth dates, dates change when crossing timezones

### Pitfall 5: Form Validation Timing
**What goes wrong:** Errors show before user finishes typing, poor UX
**Why it happens:** Default validation mode triggers on every change
**How to avoid:** Use `mode: 'onBlur'` or `mode: 'onSubmit'` with per-step trigger validation
**Warning signs:** Red error messages appear immediately, user frustration

### Pitfall 6: City Search Performance
**What goes wrong:** Search feels slow, UI freezes
**Why it happens:** Searching 5,000+ cities without debouncing or proper indexing
**How to avoid:** Index name_ascii column, debounce input (300ms), limit results (20 max)
**Warning signs:** Input lag, high database CPU usage

## Code Examples

Verified patterns from official sources:

### Database Migration for RLS Setup
```sql
-- Source: https://supabase.com/docs/guides/auth/third-party/clerk
-- Enable RLS on charts table
ALTER TABLE charts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own charts
CREATE POLICY "Users can view own charts"
ON charts
FOR SELECT
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = user_id
);

-- Policy: Users can insert their own charts
CREATE POLICY "Users can insert own charts"
ON charts
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.jwt()->>'sub') = user_id
);

-- Policy: Users can update their own charts
CREATE POLICY "Users can update own charts"
ON charts
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = user_id
)
WITH CHECK (
  (SELECT auth.jwt()->>'sub') = user_id
);

-- Policy: Users can delete their own charts
CREATE POLICY "Users can delete own charts"
ON charts
FOR DELETE
TO authenticated
USING (
  (SELECT auth.jwt()->>'sub') = user_id
);
```

### API Route with Zod Validation
```typescript
// Source: https://dub.co/blog/zod-api-validation
// app/api/birth-data/route.ts
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createBirthDataSchema } from '@/lib/validators/birth-data'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  // Protect route
  const { userId } = await auth.protect()

  // Parse and validate body
  const body = await request.json()
  const parsed = createBirthDataSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Невалидни данни',
        details: parsed.error.flatten().fieldErrors
      },
      { status: 400 }
    )
  }

  const client = createServerSupabaseClient()

  // Insert with RLS - user_id set via default SQL function
  const { data, error } = await client
    .from('charts')
    .insert({
      name: parsed.data.name,
      birth_date: parsed.data.birthDate,
      birth_time_known: parsed.data.birthTimeKnown,
      birth_time: parsed.data.birthTime,
      approximate_time_range: parsed.data.approximateTimeRange,
      city_id: parsed.data.cityId,
      city_name: parsed.data.cityName,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    })
    .select()
    .single()

  if (error) {
    console.error('Database error:', error)
    return NextResponse.json(
      { error: 'Грешка при запазване' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}

export async function GET() {
  await auth.protect()

  const client = createServerSupabaseClient()

  // RLS ensures only user's own charts are returned
  const { data, error } = await client
    .from('charts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Грешка при зареждане' }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

### Drizzle Config for Supabase
```typescript
// Source: https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase
// packages/db/drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Enable role management for RLS
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
})
```

### Environment Variables
```bash
# .env.local.local

# Supabase (from Dashboard > Settings > API)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Direct database connection (for Drizzle migrations)
DATABASE_URL=postgresql://postgres:[password]@db.xxx.supabase.co:5432/postgres

# Clerk (existing from Phase 2)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clerk JWT templates | Native third-party auth | April 2025 | Simpler setup, no JWT secret sharing |
| Manual RLS SQL | Drizzle pgTable.withRLS() | Drizzle 0.40+ | Type-safe policies in schema |
| pgsodium TCE (UI) | Manual SQL or Vault | 2025 | TCE removed from Supabase UI due to misuse |
| auth.uid() for third-party | auth.jwt()->>'sub' | Supabase third-party auth | Required for non-Supabase auth providers |

**Deprecated/outdated:**
- **Clerk Supabase JWT template:** Deprecated April 1, 2025
- **pgsodium TCE via dashboard:** Removed from UI, SQL-only now
- **authMiddleware():** Replaced by clerkMiddleware() in Clerk v6

## Open Questions

Things that couldn't be fully resolved:

1. **Bulgarian city data completeness**
   - What we know: yurukov/Bulgaria-geocoding has 5,000+ settlements but ~300 lack coordinates
   - What's unclear: Whether SimpleMaps (256 cities) covers all needed locations
   - Recommendation: Combine both sources; use yurukov for settlements, SimpleMaps for coordinates where missing; include manual coordinate entry fallback per CONTEXT.md

2. **Encryption beyond AES-256 at rest**
   - What we know: Supabase encrypts all data at rest with AES-256, compliant with SOC 2/HIPAA/GDPR
   - What's unclear: Whether additional column-level encryption (pgcrypto) is needed for birth data specifically
   - Recommendation: Supabase's built-in encryption satisfies SEC-02/SEC-21; add pgcrypto only if explicit compliance requirement demands it

3. **City data licensing for yurukov repository**
   - What we know: SimpleMaps has explicit MIT license; yurukov repository has no explicit license
   - What's unclear: Whether yurukov data can be used commercially
   - Recommendation: Use SimpleMaps (MIT) for core cities; contact yurukov maintainer for clarification on commercial use

## Sources

### Primary (HIGH confidence)
- [Clerk Supabase Integration Docs](https://clerk.com/docs/guides/development/integrations/databases/supabase) - Native integration pattern, accessToken() API
- [Supabase Third-Party Auth - Clerk](https://supabase.com/docs/guides/auth/third-party/clerk) - Dashboard setup, RLS policy examples
- [Drizzle ORM RLS Documentation](https://orm.drizzle.team/docs/rls) - pgTable.withRLS(), Supabase helpers
- [Drizzle + Supabase Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) - Connection setup, migrations
- [Zod Date Validation](https://zod.dev/api?id=iso-dates) - ISO date schemas, coercion

### Secondary (MEDIUM confidence)
- [SimpleMaps Bulgaria Cities](https://simplemaps.com/data/bg-cities) - MIT-licensed city data with coordinates
- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault) - Secret storage, encryption
- [Supabase Security Page](https://supabase.com/security) - AES-256 at rest, compliance certifications
- [React Hook Form Multi-Step Guide](https://blog.logrocket.com/building-reusable-multi-step-form-react-hook-form-zod/) - Wizard pattern with Zod

### Tertiary (LOW confidence)
- [yurukov/Bulgaria-geocoding](https://github.com/yurukov/Bulgaria-geocoding) - Comprehensive settlement data, no explicit license
- Community discussions on pgcrypto column encryption - Various patterns, Supabase recommends against TCE for most use cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Clerk, Supabase, Drizzle documentation
- Architecture: HIGH - Patterns from official docs and established guides
- Pitfalls: HIGH - Documented in official upgrade guides and security docs
- City data sources: MEDIUM - SimpleMaps MIT-licensed, yurukov comprehensive but unlicensed
- Encryption approach: HIGH - Supabase's built-in encryption well-documented and compliant

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stack is stable, Clerk/Supabase integration recently updated)
