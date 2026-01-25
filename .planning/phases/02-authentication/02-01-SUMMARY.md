# Plan 02-01: Clerk SDK Setup - Summary

## Outcome

**Status:** Complete
**Duration:** ~15 minutes (across session)

## What Was Built

Clerk authentication SDK integrated with Next.js 15 App Router:

- **clerkMiddleware** replaces Phase 1 custom CSP middleware
- **ClerkProvider** wraps the app with Bulgarian localization
- **Route protection** configured for dashboard, settings, and chart routes
- **Cosmic theme** applied to all Clerk components

## Deliverables

| File | What it provides |
|------|------------------|
| `apps/web/middleware.ts` | Auth + CSP middleware with route protection |
| `apps/web/app/layout.tsx` | ClerkProvider with bgBG localization and cosmic appearance |
| `apps/web/.env.example` | Environment template documenting required variables |
| `apps/web/.env.local` | User-configured Clerk API keys (gitignored) |

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | Install Clerk packages and create environment template | 065647a |
| 2 | User checkpoint: Clerk account setup and .env.local | (user action) |
| 3 | Replace middleware with clerkMiddleware | 81520f8 |
| 4 | Wrap layout with ClerkProvider | 81520f8 |

## Key Implementation Details

### Middleware (`apps/web/middleware.ts`)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/settings(.*)',
  '/chart(.*)',
])

export default clerkMiddleware(
  async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect()
    }
    // Security headers preserved
  },
  { contentSecurityPolicy: { strict: true, directives: {...} } }
)
```

### Layout (`apps/web/app/layout.tsx`)

```typescript
<ClerkProvider
  localization={bgBG}
  dynamic
  appearance={{
    baseTheme: dark,
    variables: {
      colorPrimary: '#8B5CF6',
      colorBackground: 'rgba(15, 23, 42, 0.95)',
      // ... cosmic theme
    }
  }}
>
```

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `contentSecurityPolicy.directives` as arrays | Clerk types require `string[]` not single strings |
| Preserve security headers in middleware callback | X-Frame-Options, HSTS, etc. not handled by Clerk CSP |
| Use `dynamic` prop on ClerkProvider | Required for strict CSP nonce handling |

## Verification

- `pnpm typecheck` passes
- `pnpm build` succeeds (4 routes generated)
- Clerk SDK packages installed: @clerk/nextjs@6.36.9, @clerk/localizations, @clerk/themes

## Issues Encountered

1. **CSP config type mismatch** - Initial implementation used `mode: 'strict'` instead of `strict: true`, and string values instead of arrays for directives. Fixed by consulting Clerk TypeScript definitions.

## What This Enables

- Plan 02-02 can now create the `/auth` page with `<SignIn>` component
- Plan 02-03 can implement protected layouts and user menu
- All auth routes will use Bulgarian localization and cosmic theme automatically
