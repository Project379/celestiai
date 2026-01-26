# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.
**Current focus:** Phase 3 - Birth Data & Database (Phase 2 complete)

## Current Position

Phase: 3 of 8 (Birth Data & Database)
Plan: 3 of 5 in current phase
Status: In progress
Last activity: 2026-01-26 - Completed 03-03-PLAN.md (Birth Data Validation & API)

Progress: [########..] 45%

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: 6m
- Total execution time: 0.8 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 20m | 7m |
| 02-authentication | 3 | 25m | 8m |
| 03-birth-data-database | 3 | 9m | 3m |

**Recent Trend:**
- Last 5 plans: 02-02 (4m), 02-03 (6m), 03-01 (5m), 03-03 (4m)
- Trend: Consistent execution

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

### Pending Todos

None yet.

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

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed 03-03-PLAN.md (Birth Data Validation & API)
Resume file: None

---

*Next action: Execute 03-04-PLAN.md (Birth Data Wizard UI)*

## Key Clarifications

- `.env.local` is NOT hardcoded keys — it's gitignored and stays local only
- `.env.example` (committed) shows what variables are needed with placeholders
- This is standard Next.js secrets pattern
