---
phase: 02-authentication
plan: 03
subsystem: auth-flow
tags: [clerk, protected-routes, session, logout, api-protection]

dependency-graph:
  requires:
    - 02-01 (Clerk SDK setup, middleware configuration)
  provides:
    - Protected route group with layout shell
    - User menu with logout confirmation
    - Session expiry modal for soft auth UX
    - Protected teaser component for unauthenticated content
    - Protected API route pattern
  affects:
    - 02-02 (auth pages can redirect to dashboard)
    - 03-xx (database phase will use protected API patterns)

tech-stack:
  added: []
  patterns:
    - Route group (protected) for authenticated pages
    - auth.protect() for API route protection
    - Custom logout confirmation dialog
    - Session tracking with wasSignedIn pattern

files:
  created:
    - apps/web/app/(protected)/layout.tsx
    - apps/web/app/(protected)/dashboard/page.tsx
    - apps/web/app/api/user/route.ts
    - apps/web/components/auth/UserMenu.tsx
    - apps/web/components/auth/LogoutConfirmDialog.tsx
    - apps/web/components/auth/SessionExpiryModal.tsx
    - apps/web/components/auth/ProtectedTeaser.tsx
  modified: []

decisions:
  - id: 02-03-01
    title: Native dialog element for modals
    rationale: Accessibility built-in, no external dependencies
  - id: 02-03-02
    title: UserButton with custom menu action for logout
    rationale: Clerk UserButton handles avatar/dropdown, custom action triggers confirmation
  - id: 02-03-03
    title: useRef for wasSignedIn tracking
    rationale: Avoids stale closure issues compared to useState for tracking previous auth state

metrics:
  duration: 6m
  completed: 2026-01-25
---

# Phase 02 Plan 03: Protected Routes and Session Management Summary

**One-liner:** Protected route group with logout confirmation, session expiry modal, and API protection using Clerk auth patterns.

## What Was Built

Complete protected route infrastructure following CONTEXT.md UX decisions:

1. **Protected Layout** (`apps/web/app/(protected)/layout.tsx`)
   - Route group shell with cosmic gradient background
   - Glassmorphism header with Celestia branding
   - Slot for UserMenu placement

2. **User Menu** (`apps/web/components/auth/UserMenu.tsx`)
   - Wraps Clerk's UserButton with cosmic styling
   - Custom "Изход" menu action triggers confirmation dialog
   - Purple ring accent on avatar

3. **Logout Confirmation** (`apps/web/components/auth/LogoutConfirmDialog.tsx`)
   - Native `<dialog>` element for accessibility
   - Bulgarian text: "Сигурни ли сте, че искате да излезете?"
   - Glassmorphism styling with gradient buttons
   - Loading state during signOut

4. **Session Expiry Modal** (`apps/web/components/auth/SessionExpiryModal.tsx`)
   - Tracks wasSignedIn state via useRef
   - Shows modal instead of hard redirect when session expires
   - Bulgarian text: "Сесията ви изтече"
   - SignInButton with modal mode preserves page context

5. **Protected Teaser** (`apps/web/components/auth/ProtectedTeaser.tsx`)
   - Blurs children content with overlay CTA
   - Bulgarian text: "Влезте, за да видите съдържанието"
   - Reusable component with customizable text props

6. **Dashboard Page** (`apps/web/app/(protected)/dashboard/page.tsx`)
   - Welcome message with user's first name
   - Placeholder cards for future features
   - Includes UserMenu and SessionExpiryModal
   - Shows userId for verification

7. **Protected API Route** (`apps/web/app/api/user/route.ts`)
   - Demonstrates SEC-17 pattern: auth.protect() before processing
   - Returns userId and sessionId
   - Returns 404 for unauthenticated requests

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | Configure protected routes and create protected layout | 9600f77 |
| 2 | Create user menu with logout confirmation | 640c663 |
| 3 | Create session expiry modal and protected teaser | 905cde5 |
| 4 | Create dashboard page and protected API route | cd1be37 |

## Key Implementation Details

### Session Expiry Pattern
```typescript
// SessionExpiryModal.tsx
const wasSignedInRef = useRef(false)

useEffect(() => {
  if (isSignedIn) wasSignedInRef.current = true
  if (wasSignedInRef.current && !isSignedIn) setShowModal(true)
}, [isLoaded, isSignedIn])
```

### API Protection Pattern
```typescript
// route.ts
export async function GET() {
  await auth.protect()  // Returns 404 if not authenticated
  const { userId } = await auth()
  return Response.json({ userId })
}
```

### Logout Confirmation Flow
```
UserButton click -> Custom "Изход" action -> LogoutConfirmDialog -> Confirm -> signOut({ redirectUrl: '/' })
```

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Native `<dialog>` for modals | Built-in accessibility (focus trap, escape key, backdrop click) without dependencies |
| useRef for wasSignedIn | Avoids stale closure issues that would occur with useState in the effect |
| Custom UserButton menu action | Clerk's UserButton handles avatar rendering, we just add a custom action for confirmation |
| Fixed positioning for UserMenu | Ensures visibility regardless of scroll position in dashboard |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `pnpm typecheck`: PASS
- `pnpm build`: PASS (6 routes generated including /dashboard and /api/user)
- Protected routes: middleware has isProtectedRoute matcher with auth.protect()
- All components have Bulgarian text as specified

## Requirements Satisfied

| Requirement | How Satisfied |
|-------------|---------------|
| AUTH-05 | Session persistence via Clerk (default behavior) |
| AUTH-06 | Logout with confirmation dialog in LogoutConfirmDialog.tsx |
| SEC-11 | Protected routes use auth.protect() in middleware |
| SEC-17 | API routes call auth.protect() before processing |

## What This Enables

- Users can access protected dashboard after signing in
- Session expiry shows friendly modal instead of jarring redirect
- Protected content shows teaser to encourage sign-in
- API routes have consistent auth protection pattern
- Phase 3 (Database) can extend /api/user with Supabase queries
