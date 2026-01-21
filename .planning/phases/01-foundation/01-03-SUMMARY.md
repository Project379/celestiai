---
phase: 01-foundation
plan: 03
subsystem: security-ui
tags: [security-headers, csp, middleware, responsive, glassmorphism]

dependency-graph:
  requires:
    - 01-01 (monorepo structure, Next.js app)
    - 01-02 (NativeWind styling, UI primitives)
  provides:
    - security-headers-middleware
    - csp-nonce-support
    - responsive-layout-foundation
  affects:
    - all-future-plans (security headers applied globally)
    - phase-2-auth (CSP adjustments may be needed)

tech-stack:
  added: []
  patterns:
    - next-middleware-security
    - csp-nonce-dynamic-rendering
    - responsive-grid-breakpoints

key-files:
  created:
    - apps/web/middleware.ts
  modified:
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - apps/web/package.json
    - apps/web/tailwind.config.ts

decisions:
  - id: D-01-03-01
    choice: "Nonce-based CSP with dynamic rendering"
    rationale: "Fresh nonce per request via connection() ensures security without caching issues"
  - id: D-01-03-02
    choice: "Dev mode allows unsafe-eval and unsafe-inline"
    rationale: "Required for Next.js hot reload and development experience"
  - id: D-01-03-03
    choice: "Add @celestia/ui as workspace dependency"
    rationale: "TypeScript module resolution requires explicit workspace dependency"

metrics:
  duration: "6m"
  completed: "2026-01-21"
---

# Phase 01 Plan 03: Security Headers & Responsive UI Summary

**One-liner:** Next.js middleware setting CSP/XFO/XCTO/Referrer-Policy security headers with nonce-based scripts, plus responsive 1/2/3-column glassmorphism home page.

## What Was Built

### Task 1: Security Headers Middleware
- Created `apps/web/middleware.ts` with comprehensive security headers
- Content-Security-Policy (SEC-13) with nonce-based script/style policy
- X-Frame-Options: DENY (SEC-14) preventing clickjacking
- X-Content-Type-Options: nosniff (SEC-15) preventing MIME sniffing
- Referrer-Policy: strict-origin-when-cross-origin (SEC-16)
- Strict-Transport-Security for HTTPS enforcement (SEC-01)
- Permissions-Policy restricting camera/microphone/geolocation
- Development mode allows unsafe-eval/unsafe-inline for hot reload

### Task 2: Layout CSP Nonce Support
- Updated `apps/web/app/layout.tsx` to async function
- Added `connection()` call to force dynamic rendering (fresh nonce per request)
- Retrieve nonce from x-nonce header set by middleware
- Added `suppressHydrationWarning` to prevent dark mode hydration warnings
- Added viewport meta tag

### Task 3: Responsive Home Page with GlassCard
- Updated `apps/web/app/page.tsx` with full responsive layout
- Hero section with gradient title (Celestia AI)
- Responsive grid: 1 column (mobile) / 2 columns (tablet) / 3 columns (desktop)
- Three GlassCard feature cards demonstrating glassmorphism
- All Bulgarian text (UI-02 compliance)
- Footer with copyright

## Verification Results

| Check | Status |
|-------|--------|
| `pnpm typecheck` passes | PASS |
| `pnpm build` succeeds | PASS |
| Content-Security-Policy header set | PASS |
| X-Frame-Options: DENY header set | PASS |
| X-Content-Type-Options: nosniff header set | PASS |
| Referrer-Policy header set | PASS |
| Strict-Transport-Security header set | PASS |
| Responsive grid classes present | PASS |
| GlassCard components imported | PASS |
| Bulgarian text on page | PASS |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| f0ffd8b | feat | Create security headers middleware |
| 9314d5e | feat | Update layout for CSP nonce support |
| 274e27b | feat | Create responsive home page with GlassCard components |
| 081cb06 | fix | Remove .js from tailwind content patterns |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @celestia/ui module not found**
- **Found during:** Task 3 typecheck
- **Issue:** TypeScript error "Cannot find module '@celestia/ui'"
- **Fix:** Added `"@celestia/ui": "workspace:*"` to apps/web/package.json dependencies
- **Files modified:** apps/web/package.json
- **Commit:** 274e27b (included in task commit)

**2. [Rule 1 - Bug] Tailwind content pattern warning**
- **Found during:** Post-task build verification
- **Issue:** Warning about content patterns with .js potentially matching node_modules
- **Fix:** Changed content patterns to use .ts/.tsx only (TypeScript-only project)
- **Files modified:** apps/web/tailwind.config.ts
- **Commit:** 081cb06

## Decisions Made

1. **Nonce-based CSP** - Using `connection()` to force dynamic rendering ensures fresh nonce per request, providing strong CSP without static generation conflicts.

2. **Dev mode relaxed CSP** - Development mode allows `'unsafe-eval'` and `'unsafe-inline'` to support hot reload and development experience.

3. **Explicit workspace dependency** - Added `@celestia/ui` as explicit workspace dependency for proper TypeScript resolution.

## Phase 1 Completion

This plan completes Phase 1 (Foundation). All requirements satisfied:

### Infrastructure
- Turborepo monorepo with pnpm workspaces
- Next.js 15.5.9 with React 19
- Shared packages structure (@celestia/ui, @celestia/config)

### Styling
- NativeWind v4 with Tailwind 3.4.x
- Cosmic glassmorphism theme with CSS variables
- GlassCard and Text UI primitives

### Security
- SEC-01: HTTPS via upgrade-insecure-requests + HSTS
- SEC-13: Content-Security-Policy with nonce
- SEC-14: X-Frame-Options: DENY
- SEC-15: X-Content-Type-Options: nosniff
- SEC-16: Referrer-Policy: strict-origin-when-cross-origin

### UI
- UI-01: Dark space glassmorphism aesthetic
- UI-02: Bulgarian language
- UI-03: Responsive 1/2/3 column layout

## Next Phase Readiness

### Ready for Phase 2 (Authentication):
- Security headers in place for Clerk integration
- CSP may need adjustments for Clerk scripts (add to connect-src)
- Layout ready for auth provider wrapping

### No Blockers
All Phase 1 success criteria met. Ready to proceed with Phase 2.
