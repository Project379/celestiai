# Phase 8: Launch Prep - Research

**Researched:** 2026-02-18
**Domain:** Landing page conversion, GDPR compliance, audit logging
**Confidence:** HIGH

## Summary

Phase 8 enhances the existing landing page into a conversion-focused experience, adds GDPR compliance features (privacy policy, data export, account deletion), and implements audit logging. The technical stack is entirely established -- Next.js 15 App Router, Supabase/Drizzle ORM, Clerk auth, Tailwind CSS. No new frameworks or paradigms are introduced.

The landing page already exists with LandingNav, FeaturesSection, PricingSection, and AboutSection components. The work involves adding a hero starfield background (reusing AuthBackground), upgrading the feature showcase with Lucide icons and Premium badges, adding CTA touchpoints, and adding a footer privacy link. GDPR requires two new routes (/settings/privacy, /privacy) and two new API endpoints. Audit logging requires a new DB table and a utility function used across existing API routes.

**Primary recommendation:** Install lucide-react, reuse existing patterns (GlassCard, service Supabase client, server/client component split), add audit_logs table to Drizzle schema, and use pg_cron for grace-period deletion scheduling.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Landing page: "Explore then convert" approach with two CTA touchpoints (secondary in hero, primary after feature showcase)
- Reuse canvas-based animated starfield from auth page (AuthBackground component) for hero background
- Bulgarian placeholder motto/tagline written by Claude
- Feature showcase: Icon + title + description card grid, 4 features (natal chart, AI Oracle, daily horoscope, push notifications), free + Premium badges, Lucide-react icons
- GDPR data export (SEC-04): Instant JSON download in /settings/privacy -- no email workflow
- GDPR account deletion (SEC-05): Soft delete with 30-day grace period, Clerk deletion at hard-delete time only
- GDPR UI: Separate /settings/privacy page for controls, /privacy page for privacy policy, Bulgarian-language GDPR placeholder text
- Audit logging (SEC-20): Supabase DB table audit_logs, admin-only via dashboard, schema: user_id, event_type, timestamp, metadata JSONB
- Audit events: auth, data access, account changes, payment events

### Claude's Discretion
- Exact Bulgarian copy for hero motto and privacy policy placeholder
- Lucide icon selection per feature card
- Exact spacing, card shadow depth, typography within glassmorphism theme
- Audit log helper utility design (function signature, error handling)
- Grace-period deletion scheduling mechanism (cron job or Supabase pg_cron or manual)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^15.2.4 | App Router, API routes, server/client components | Already in project |
| react | ^19.0.0 | UI framework | Already in project |
| @clerk/nextjs | ^6.36.9 | Auth, user deletion API | Already in project |
| @supabase/supabase-js | ^2.49.1 | Database client | Already in project |
| drizzle-orm | (workspace) | Schema definitions, migrations | Already in project |
| tailwindcss | ^3.4.17 | Styling | Already in project |
| stripe | ^20.3.1 | Used in audit logging for payment event context | Already in project |

### New Dependency
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | SVG icons for feature cards and UI | Feature showcase icons, privacy page icons, settings icons |

### No Alternatives Needed
This phase uses entirely existing infrastructure. No new frameworks, state management, or paradigms are required. The only new dependency is lucide-react for icons (per CONTEXT.md decision).

**Installation:**
```bash
cd apps/web && pnpm add lucide-react
```

## Architecture Patterns

### Existing Project Structure (relevant files)
```
apps/web/
├── app/
│   ├── page.tsx                          # Landing page (EXISTS - modify)
│   ├── privacy/page.tsx                  # Privacy policy (NEW)
│   ├── (protected)/settings/
│   │   ├── page.tsx                      # Settings (EXISTS)
│   │   ├── SettingsContent.tsx           # Settings client (EXISTS)
│   │   └── privacy/
│   │       ├── page.tsx                  # Privacy settings (NEW - server)
│   │       └── PrivacySettingsContent.tsx # Privacy settings (NEW - client)
│   └── api/
│       ├── gdpr/
│       │   ├── export/route.ts           # Data export endpoint (NEW)
│       │   └── delete-account/route.ts   # Account deletion endpoint (NEW)
│       └── ...existing routes
├── components/
│   ├── auth/AuthBackground.tsx           # Star canvas (EXISTS - reuse or extract)
│   └── landing/
│       ├── LandingNav.tsx                # Sticky nav (EXISTS - modify for /privacy link)
│       ├── FeaturesSection.tsx           # Feature cards (EXISTS - replace with Lucide icons + Premium badges)
│       ├── PricingSection.tsx            # Pricing (EXISTS - link to /pricing, not duplicate)
│       └── AboutSection.tsx              # About (EXISTS)
├── lib/
│   └── audit.ts                          # Audit log helper (NEW)
packages/db/
├── src/schema/
│   ├── audit-logs.ts                     # Audit logs schema (NEW)
│   ├── users.ts                          # Add deleted_at, deletion_scheduled_at columns (MODIFY)
│   └── index.ts                          # Export new schema (MODIFY)
└── drizzle/
    └── 0006_*.sql                        # Migration (GENERATED)
```

### Pattern 1: Server/Client Component Split (established project pattern)
**What:** Server component fetches data, passes props to client component
**When to use:** Every page in this project follows this pattern
**Example:**
```typescript
// page.tsx (server)
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { PrivacySettingsContent } from './PrivacySettingsContent'

export default async function PrivacySettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth')
  // ... fetch data
  return <PrivacySettingsContent userId={userId} />
}

// PrivacySettingsContent.tsx (client)
'use client'
export function PrivacySettingsContent({ userId }: Props) { ... }
```

### Pattern 2: Service Role Supabase Client (established pattern)
**What:** Use service role client for tables without RLS (users, audit_logs, ai_readings)
**When to use:** Audit logging, data export, account deletion
**Example:**
```typescript
import { createServiceSupabaseClient } from '@/lib/supabase/service'

const supabase = createServiceSupabaseClient()
const { data, error } = await supabase
  .from('audit_logs')
  .insert({ user_id: userId, event_type: 'data_export', metadata: {} })
```

### Pattern 3: Audit Log Fire-and-Forget Helper
**What:** Async utility that logs events without blocking the main request
**When to use:** Every API route that handles sensitive operations
**Example:**
```typescript
// lib/audit.ts
import { createServiceSupabaseClient } from '@/lib/supabase/service'

type AuditEventType =
  | 'auth.sign_in' | 'auth.sign_out' | 'auth.password_reset' | 'auth.failed_attempt'
  | 'data.chart_calculation' | 'data.ai_reading' | 'data.horoscope_generation'
  | 'account.birth_data_edit' | 'account.data_export' | 'account.deletion_request' | 'account.deletion_confirm'
  | 'payment.subscription_created' | 'payment.subscription_cancelled' | 'payment.subscription_reactivated' | 'payment.webhook_received'

export async function logAuditEvent(
  userId: string | null,
  eventType: AuditEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient()
    await supabase.from('audit_logs').insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata ?? {},
    })
  } catch (err) {
    // Never throw from audit logging -- log to console and move on
    console.error('[Audit] Failed to log event:', eventType, err)
  }
}
```

### Pattern 4: JSON File Download from API Route
**What:** Return a JSON file as a downloadable response from Next.js route handler
**When to use:** GDPR data export
**Example:**
```typescript
// api/gdpr/export/route.ts
export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Gather all user data...
  const exportData = { charts: [...], readings: [...], horoscopes: [...] }

  const json = JSON.stringify(exportData, null, 2)
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="celestia-data-export.json"',
    },
  })
}
```

### Pattern 5: Soft Delete with Grace Period
**What:** Mark user as deleted (soft delete), schedule hard delete after 30 days
**When to use:** GDPR account deletion (SEC-05)
**Example:**
```typescript
// Users table additions
deletedAt: timestamp('deleted_at', { withTimezone: true }),       // When soft delete was requested
deletionScheduledAt: timestamp('deletion_scheduled_at', { withTimezone: true }), // deletedAt + 30 days
```

### Anti-Patterns to Avoid
- **Duplicating pricing logic on landing page:** The landing PricingSection should link to /pricing, not re-implement the checkout flow
- **Blocking requests on audit logging:** Audit log writes must never throw or delay the API response -- fire-and-forget with console.error on failure
- **Immediately deleting Clerk account:** Clerk deletion happens only at hard-delete time (30 days later), not when user requests deletion
- **Using RLS for audit_logs:** Follow the established pattern -- service role client, no RLS (consistent with users, ai_readings, chart_calculations, webhooks)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG icons | Inline SVGs (current FeaturesSection approach) | lucide-react | Consistent, tree-shakeable, many icons available |
| User deletion | Custom Clerk API calls | `(await clerkClient()).users.deleteUser(userId)` | Clerk Backend SDK handles it; note v6 requires `await clerkClient()` |
| Scheduled deletion | Custom setTimeout or in-memory timers | Supabase pg_cron or Vercel cron | Survives server restarts, reliable scheduling |
| Animated starfield | New canvas implementation | Reuse/extract AuthBackground component | Already built and tested in auth page |
| Privacy policy text | External legal service | Claude-written Bulgarian placeholder | It is explicitly a placeholder; real legal review comes later |

**Key insight:** This phase is almost entirely about composing existing patterns. The project has established conventions for server/client splits, service role DB access, API route auth guards, and glassmorphism UI. Follow them precisely.

## Common Pitfalls

### Pitfall 1: Clerk clerkClient() Must Be Awaited in v6
**What goes wrong:** Using `clerkClient.users.deleteUser()` without awaiting `clerkClient()` first
**Why it happens:** Clerk v6 changed `clerkClient` to an async function (documented in Phase 2 research)
**How to avoid:** Always use `const client = await clerkClient(); await client.users.deleteUser(userId)`
**Warning signs:** TypeScript error about clerkClient not having a `users` property

### Pitfall 2: Landing Page Auth Links Point to Wrong Routes
**What goes wrong:** Links to /sign-in and /sign-up instead of /auth
**Why it happens:** The existing LandingNav links to /sign-in and /sign-up, but the project uses a combined /auth route (decision from Phase 2)
**How to avoid:** All auth CTAs should link to `/auth` -- the sign-in page at `(auth)/sign-in` is only used by Clerk routing
**Warning signs:** Currently LandingNav has href="/sign-in" and href="/sign-up" -- these should be reviewed

### Pitfall 3: AuthBackground Fixed Positioning Conflicts
**What goes wrong:** AuthBackground uses `fixed inset-0 -z-10` which works in the auth layout but may conflict with the landing page layout
**Why it happens:** The landing page has its own gradient background and multiple sections
**How to avoid:** Either extract the star canvas logic into a reusable component without the gradient/nebula divs, or position it absolutely within the hero section only
**Warning signs:** Stars appearing over the entire landing page instead of just the hero section

### Pitfall 4: Data Export Missing Tables
**What goes wrong:** GDPR export misses user data from some tables
**Why it happens:** Data is spread across charts, chart_calculations, ai_readings, daily_horoscopes, push_subscriptions
**How to avoid:** Query ALL tables that contain user-specific data: charts, ai_readings, daily_horoscopes (all have user_id column)
**Warning signs:** Incomplete export that misses AI readings or horoscope history

### Pitfall 5: Soft Delete Without Middleware Protection
**What goes wrong:** Soft-deleted user can still log in and use the app during grace period
**Why it happens:** Only the database row is marked; Clerk session is still valid
**How to avoid:** Check `deleted_at` in the user fetch logic (dashboard, API routes) and redirect to a "deletion pending" state
**Warning signs:** User requests deletion, then continues using the app normally

### Pitfall 6: pg_cron on Supabase Free Tier
**What goes wrong:** pg_cron may not be available or may have limitations on Supabase free tier
**Why it happens:** Supabase free tier has restrictions on extensions
**How to avoid:** Use Vercel cron (already used for daily horoscope at 06:00 UTC) as fallback -- add a second cron job for deletion cleanup
**Warning signs:** pg_cron extension enable fails in SQL editor

## Code Examples

### Audit Logs Drizzle Schema
```typescript
// packages/db/src/schema/audit-logs.ts
import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core'

/**
 * Audit logs table
 *
 * Records sensitive operations for compliance and debugging.
 * Admin-only access via Supabase dashboard -- no in-app UI.
 *
 * No RLS policies -- accessed via service role client only.
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),  // nullable for system events
  eventType: text('event_type').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
```

### Users Table Soft Delete Columns
```typescript
// Addition to packages/db/src/schema/users.ts
deletedAt: timestamp('deleted_at', { withTimezone: true }),
deletionScheduledAt: timestamp('deletion_scheduled_at', { withTimezone: true }),
```

### GDPR Data Export API Route
```typescript
// apps/web/app/api/gdpr/export/route.ts
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Neotoriziran dostap' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()

  // Fetch all user data in parallel
  const [chartsRes, readingsRes, horoscopesRes, userRes] = await Promise.all([
    supabase.from('charts').select('*').eq('user_id', userId),
    supabase.from('ai_readings').select('*').eq('user_id', userId),
    supabase.from('daily_horoscopes').select('*').eq('user_id', userId),
    supabase.from('users').select('*').eq('clerk_id', userId).single(),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: userRes.data,
    charts: chartsRes.data ?? [],
    aiReadings: readingsRes.data ?? [],
    dailyHoroscopes: horoscopesRes.data ?? [],
  }

  // Audit log (fire-and-forget)
  logAuditEvent(userId, 'account.data_export')

  const json = JSON.stringify(exportData, null, 2)
  return new Response(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="celestia-data-export.json"',
    },
  })
}
```

### Account Deletion Request API Route
```typescript
// apps/web/app/api/gdpr/delete-account/route.ts
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'

export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Neotoriziran dostap' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date()
  const scheduledDeletion = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { error } = await supabase
    .from('users')
    .update({
      deleted_at: now.toISOString(),
      deletion_scheduled_at: scheduledDeletion.toISOString(),
    })
    .eq('clerk_id', userId)

  if (error) {
    return Response.json({ error: 'Failed to process deletion' }, { status: 500 })
  }

  await logAuditEvent(userId, 'account.deletion_request', {
    scheduledDeletion: scheduledDeletion.toISOString(),
  })

  return Response.json({
    message: 'Deletion scheduled',
    scheduledAt: scheduledDeletion.toISOString(),
  })
}

// DELETE to cancel deletion during grace period
export async function DELETE() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Neotoriziran dostap' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({ deleted_at: null, deletion_scheduled_at: null })
    .eq('clerk_id', userId)

  if (error) {
    return Response.json({ error: 'Failed to cancel deletion' }, { status: 500 })
  }

  await logAuditEvent(userId, 'account.deletion_confirm', { action: 'cancelled' })

  return Response.json({ message: 'Deletion cancelled' })
}
```

### Hard Delete Cron Job (Vercel Cron Pattern)
```typescript
// apps/web/app/api/cron/cleanup-deleted-accounts/route.ts
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { clerkClient } from '@clerk/nextjs/server'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: Request) {
  // Verify cron secret (same pattern as daily-horoscope cron)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date().toISOString()

  // Find users past grace period
  const { data: usersToDelete } = await supabase
    .from('users')
    .select('id, clerk_id')
    .not('deletion_scheduled_at', 'is', null)
    .lte('deletion_scheduled_at', now)

  if (!usersToDelete?.length) {
    return Response.json({ deleted: 0 })
  }

  const clerk = await clerkClient()
  let deleted = 0

  for (const user of usersToDelete) {
    try {
      // Delete from Clerk
      await clerk.users.deleteUser(user.clerk_id)
      // Hard delete from Supabase (cascades to charts, readings, etc.)
      await supabase.from('users').delete().eq('id', user.id)
      await logAuditEvent(user.clerk_id, 'account.deletion_confirm', { action: 'hard_delete' })
      deleted++
    } catch (err) {
      console.error(`[Cleanup] Failed to delete user ${user.clerk_id}:`, err)
    }
  }

  return Response.json({ deleted })
}
```

### Feature Card with Lucide Icon and Premium Badge
```typescript
import { Sparkles, Star, Calendar, Bell } from 'lucide-react'

const features = [
  {
    title: 'Natalna karta',
    description: '...',
    icon: Star,
    premium: false,
  },
  {
    title: 'AI Orakul',
    description: '...',
    icon: Sparkles,
    premium: true,  // Shows "Premium" badge
  },
]

// Render
<div className="relative">
  {feature.premium && (
    <span className="absolute -top-2 -right-2 rounded-full bg-gradient-to-r from-purple-600 to-violet-600 px-2 py-0.5 text-xs font-medium text-white">
      Premium
    </span>
  )}
  <feature.icon className="h-8 w-8 text-purple-400" />
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline SVG icons | lucide-react components | N/A (new to project) | Tree-shakeable, consistent, named imports |
| clerkClient sync | await clerkClient() async | Clerk v6 | Must await before accessing .users |
| Custom cron | Vercel cron + vercel.json | Already in project (Phase 6) | Reliable, no server management |

**No deprecated patterns apply.** This phase uses all established conventions.

## Open Questions

1. **AuthBackground extraction strategy**
   - What we know: AuthBackground has stars + gradient + nebula glows. Landing page already has its own gradient background.
   - What's unclear: Whether to extract just the star canvas logic, or use AuthBackground as-is with CSS overrides.
   - Recommendation: Extract the star canvas animation into a standalone `StarCanvas` component (just the canvas + useEffect). The hero section manages its own background gradient, and StarCanvas overlays on top. This avoids style conflicts.

2. **Hard delete cascade behavior**
   - What we know: charts table has RLS and foreign keys. ai_readings references charts with onDelete: cascade. daily_horoscopes references charts with onDelete: cascade.
   - What's unclear: Whether deleting from users table will cascade to charts (no direct FK from charts to users -- charts.user_id is just a text field, not a FK reference).
   - Recommendation: Hard delete must explicitly delete from charts, ai_readings, daily_horoscopes, push_subscriptions for the user_id before deleting the users row. Or add cascade FKs in the migration.

3. **Vercel cron schedule for deletion cleanup**
   - What we know: Daily horoscope cron runs at 06:00 UTC via vercel.json.
   - What's unclear: Optimal frequency for deletion cleanup.
   - Recommendation: Daily at 03:00 UTC is sufficient -- accounts are deleted within 24h of their 30-day window. Add to vercel.json alongside existing cron.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: All existing components, schemas, and patterns verified by direct file reading
- Clerk deleteUser docs: https://clerk.com/docs/reference/backend/user/delete-user -- confirmed function signature and import pattern

### Secondary (MEDIUM confidence)
- Supabase pg_cron docs: https://supabase.com/docs/guides/database/extensions/pg_cron -- pg_cron available but Vercel cron is recommended (already established in project)

### Tertiary (LOW confidence)
- None -- all patterns verified against existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- entirely existing dependencies plus lucide-react
- Architecture: HIGH -- follows established project conventions exactly
- Pitfalls: HIGH -- identified from direct codebase inspection (auth links, AuthBackground positioning, cascade behavior)

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (stable -- no fast-moving dependencies)
