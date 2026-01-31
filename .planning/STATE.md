# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.
**Current focus:** Phase 3.1 - Bugfixes & Landing Page (INSERTED)

## Current Position

Phase: 3.1 of 8 (Bugfixes & Landing Page) - INSERTED
Plan: 3 of 3 in phase 3.1 (complete)
Status: Phase 3.1 complete - All bugfixes and landing page done
Last activity: 2026-01-31 - Completed 03.1-03-PLAN.md (Landing Page)

Progress: [##############] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 5m
- Total execution time: 1.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 20m | 7m |
| 02-authentication | 3 | 25m | 8m |
| 03-birth-data-database | 5 | 17m | 3m |
| 03.1-bugfixes-and-landing-page | 3 | 10m | 3m |

**Recent Trend:**
- Last 5 plans: 03-04 (4m), 03-05 (4m), 03.1-01 (3m), 03.1-02 (4m), 03.1-03 (3m)
- Trend: Consistent fast execution

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Web-first for v0.1, Bulgarian-only, server-side WASM only
- [Roadmap]: 8 phases derived from 54 requirements with security distributed across relevant phases
- [01-01]: Manual monorepo setup instead of create-turbo for exact control
- [01-01]: Next.js 15.5.9 with Turbopack for fast development
- [01-01]: React 19 with TypeScript 5.9 for latest features
- [01-02]: Tailwind v3.4.x (not v4) for NativeWind compatibility
- [01-02]: CSS variables with rgb() for alpha support
- [01-02]: React.createElement for dynamic tag Text component
- [01-03]: Nonce-based CSP with dynamic rendering via connection()
- [01-03]: Dev mode allows unsafe-eval/unsafe-inline for hot reload
- [01-03]: @celestia/ui as explicit workspace dependency
- [02-01]: clerkMiddleware replaces custom CSP middleware
- [02-01]: ClerkProvider with bgBG localization and dynamic prop
- [02-02]: Canvas-based star animation for performance
- [02-02]: Combined sign-up/sign-in on single /auth route
- [02-03]: Native dialog element for logout confirmation accessibility
- [02-03]: useRef for wasSignedIn tracking to avoid stale closures
- [02-03]: UserButton custom action for logout confirmation flow
- [03-01]: pgTable().enableRLS() with pgPolicy() helpers for type-safe RLS
- [03-01]: auth.jwt()->>'sub' for Clerk user ID (not auth.uid())
- [03-01]: Separate server/client Supabase factories for different contexts
- [03-02]: 203 settlements with mix of cities/towns/villages for comprehensive coverage
- [03-02]: Client-side re-sort for proper type ordering (city > town > village)
- [03-03]: Zod v4 error syntax uses { error: string } not { message: string }
- [03-03]: superRefine for conditional cross-field validation (time/range)
- [03-03]: RLS handles user isolation; API routes don't manually filter by user_id
- [03-04]: FormProvider wraps wizard for shared state across step components
- [03-04]: Per-step validation via trigger() before navigation forward
- [03-04]: 300ms debounce for city search autocomplete
- [03-05]: Server/client split for dashboard with initial data fetch
- [03-05]: Two-step confirmation for edit dialog (form -> confirm -> save)
- [03.1-01]: auth() instead of auth.protect() in API routes for JSON error responses
- [03.1-01]: Bulgarian error message "Неоторизиран достъп" for 401 responses
- [03.1-03]: Use /auth for both login and register CTAs (unified auth route)
- [03.1-03]: Sticky navigation with glassmorphism blur effect
- [03.1-03]: Landing section components with id attributes for anchor navigation

### Pending Todos

4 pending — run `/gsd:check-todos` to review:
- Human test - Complete wizard flow
- Human test - City search behavior
- Human test - Edit flow with confirmation
- Human test - RLS data isolation

### Roadmap Evolution

- Phase 3.1 inserted after Phase 3: Bugfixes & Landing Page (URGENT)
  - Two logout buttons in UI
  - JSON parsing errors (HTML returned instead of JSON)
  - /birth-data accessible without auth
  - City search fails for unauthenticated users
  - Remaining Latin text issues
  - Landing page needs proper structure with nav tabs

### Blockers/Concerns

None yet.

## Phase 1 Completion Summary

Phase 1 (Foundation) is complete with all requirements satisfied:

**Infrastructure:** Turborepo monorepo, Next.js 15.5.9, React 19, pnpm workspaces
**Styling:** NativeWind v4, Tailwind 3.4.x, cosmic glassmorphism theme
**Security:** CSP, XFO, XCTO, Referrer-Policy, HSTS headers
**UI:** Dark space aesthetic, Bulgarian language, responsive grid

## Phase 2 Completion Summary

Phase 2 (Authentication) is complete with all requirements satisfied:

**Clerk Integration:** clerkMiddleware with route protection, ClerkProvider with bgBG
**Auth UI:** Combined sign-in/sign-up page at /auth with cosmic star animation
**Protected Routes:** Dashboard with UserMenu, session expiry modal, protected API pattern
**Security:** auth.protect() for routes and APIs, logout confirmation dialog

## Phase 3 Completion Summary

Phase 3 (Birth Data & Database) is complete with all requirements satisfied:

**Database:** Supabase with RLS policies, charts table with Clerk user_id
**Cities:** 203 Bulgarian settlements with search API
**Validation:** Zod schemas with Bulgarian error messages, conditional time/range validation
**UI:** 4-step wizard with progress bar, city autocomplete with debounce
**Dashboard:** Birth data card or CTA based on user state, edit dialog with confirmation
**Security:** SEC-19 verified - no PII sent to third-party services

## Phase 3.1 Completion Summary

Phase 3.1 (Bugfixes & Landing Page) is complete with all issues fixed:

**Bugfixes:** API routes return JSON 401 errors, duplicate logout button removed
**Landing Page:** Sticky navigation with tabs, Features/Pricing/About sections
**UI:** All text in Bulgarian Cyrillic, smooth scroll anchor navigation

## Session Continuity

Last session: 2026-01-31
Stopped at: Completed 03.1-03-PLAN.md (Landing Page)
Resume file: None

---

*Next action: Plan Phase 4 (Swiss Ephemeris Integration)*

## Key Clarifications

- `.env.local` is NOT hardcoded keys -- it's gitignored and stays local only
- `.env.example` (committed) shows what variables are needed with placeholders
- This is standard Next.js secrets pattern
