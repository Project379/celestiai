# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** Users return daily for precise, personalized readings that feel like wisdom from a knowledgeable friend who happens to know the stars.
**Current focus:** Phase 5 - AI Oracle

## Current Position

Phase: 5 of 8 (AI Oracle) - IN PROGRESS
Plan: 1 of 4 in phase 5 (complete)
Status: Phase 5 Plan 1 complete - Schema and prompt utilities done
Last activity: 2026-02-15 - Completed 05-01-PLAN.md (Schema and Prompt Utilities)

Progress: [####################] 93%

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: 9m
- Total execution time: 2.98 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 20m | 7m |
| 02-authentication | 3 | 25m | 8m |
| 03-birth-data-database | 5 | 17m | 3m |
| 03.1-bugfixes-and-landing-page | 3 | 10m | 3m |
| 04-astrology-engine-charts | 4 | 104m | 26m |
| 05-ai-oracle | 1 | 5m | 5m |

**Recent Trend:**
- Last 5 plans: 04-02 (65m), 04-03 (18m), 04-04 (9m), 05-01 (5m)
- Trend: Phase 5 starting fast with data/utility layer

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
- [03.1-02]: UserButton.MenuItems to explicitly list menu items (hides default signOut)
- [03.1-03]: Use /auth for both login and register CTAs (unified auth route)
- [03.1-03]: Sticky navigation with glassmorphism blur effect
- [03.1-03]: Landing section components with id attributes for anchor navigation
- [04-01]: Use sweph native Node.js bindings (not WASM) for server-side calculations
- [04-01]: Use Moshier ephemeris (built-in, no external files needed)
- [04-01]: Access sweph constants via sweph.constants object
- [04-01]: Houses result points array uses indices (SE_ASC=0, SE_MC=1)
- [04-01]: Aspect orbs: conjunction 8deg, sextile 5deg, square/trine 7deg, opposition 8deg
- [04-02]: Service role client for chart_calculations (internal cache table)
- [04-02]: Cache-first pattern: check cache before calculation
- [04-02]: JSONB columns for flexible chart data storage
- [04-02]: Unique constraint on chart_id (one calculation per chart)
- [04-03]: Separate @celestia/astrology/client for browser-safe imports
- [04-03]: D3 arc generator for zodiac segments with element colors
- [04-03]: useD3 hook pattern for React/D3 integration
- [04-03]: Responsive layout at lg (1024px) breakpoint
- [04-04]: Interpretation data layer in lib/interpretations/ for localized content
- [04-04]: Accessible SVG elements with role=button, tabindex, keyboard events
- [04-04]: Selection glow ring on wheel planets, scale transform on Big Three cards
- [05-01]: No RLS on users or ai_readings — service role access only (consistent with chart_calculations)
- [05-01]: Sentinel markers use English planet keys [planet:KEY]Bulgarian[/planet] for chart cross-highlighting
- [05-01]: Fresh RegExp per call (not module-level) to avoid stateful lastIndex bugs with 'g' flag
- [05-01]: Topic suffixes appended to base system prompt for voice consistency across reading types

### Pending Todos

4 pending — run `/gsd:check-todos` to review:
- Human test - Complete wizard flow
- Human test - City search behavior
- Human test - Edit flow with confirmation
- Human test - RLS data isolation

### Roadmap Evolution

- Phase 3.1 inserted after Phase 3: Bugfixes & Landing Page (COMPLETE)
  - Two logout buttons in UI - FIXED
  - JSON parsing errors (HTML returned instead of JSON) - FIXED
  - /birth-data accessible without auth - FIXED
  - City search fails for unauthenticated users - FIXED
  - Remaining Latin text issues - FIXED
  - Landing page needs proper structure with nav tabs - DONE

### Blockers/Concerns

- Supabase free tier project auto-paused (14 days inactive). Apply migration 0004_parched_lizard.sql manually via Supabase dashboard SQL Editor after unpausing. All TypeScript code is correct.

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

## Phase 4 Completion Summary

Phase 4 (Astrology Engine & Charts) is complete with all requirements satisfied:

**Swiss Ephemeris:** @celestia/astrology package with sweph native bindings
**Calculation API:** POST /api/chart/calculate with caching
**Visualization:** D3.js natal wheel with 10 planets, 12 zodiac segments, aspect lines
**Big Three:** Sun, Moon, Rising cards with Bulgarian translations
**Interactions:** Planet click reveals interpretation panel with Bulgarian text (CHART-03)
**Accessibility:** Keyboard navigable chart with focus management
**UI:** Responsive /chart page with loading skeleton and error states

## Phase 5 Progress

Phase 5 (AI Oracle) in progress - 1 of 4 plans complete:

**Plan 01 (complete):** users + ai_readings tables, Oracle prompt utilities (buildSystemPrompt, chartToPromptText, extractPlanetMentions, stripSentinels)
**Plan 02 (next):** Gemini streaming API route POST /api/oracle/reading
**Plan 03:** Topic cards UI and reading panel with streaming display
**Plan 04:** Cross-highlighting between reading text and natal wheel

## Session Continuity

Last session: 2026-02-15
Stopped at: Completed 05-01-PLAN.md (Schema and Prompt Utilities)
Resume file: None

---

*Next action: Execute Phase 5 Plan 02 (Gemini Streaming API Route)*

## Key Clarifications

- `.env.local` is NOT hardcoded keys -- it's gitignored and stays local only
- `.env.example` (committed) shows what variables are needed with placeholders
- This is standard Next.js secrets pattern
