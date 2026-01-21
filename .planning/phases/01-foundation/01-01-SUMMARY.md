---
phase: 01-foundation
plan: 01
subsystem: infrastructure
tags: [turborepo, nextjs, monorepo, typescript, pnpm]

dependency-graph:
  requires: []
  provides:
    - turborepo-monorepo
    - nextjs-15-web-app
    - shared-packages-structure
    - pnpm-workspace
  affects:
    - 01-02 (NativeWind styling)
    - 01-03 (mobile app)
    - all-future-plans (builds on this structure)

tech-stack:
  added:
    - turbo@2.7.5
    - next@15.5.9
    - react@19.0.0
    - react-dom@19.0.0
    - typescript@5.9.3
  patterns:
    - turborepo-monorepo
    - pnpm-workspaces
    - nextjs-app-router

key-files:
  created:
    - turbo.json
    - pnpm-workspace.yaml
    - package.json
    - tsconfig.json
    - .gitignore
    - apps/web/package.json
    - apps/web/next.config.js
    - apps/web/tsconfig.json
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - packages/ui/package.json
    - packages/ui/index.ts
    - packages/ui/tsconfig.json
    - packages/config/package.json
    - packages/config/typescript/base.json
    - pnpm-lock.yaml
  modified: []

decisions:
  - id: D-01-01-01
    choice: "Manual monorepo setup instead of create-turbo"
    rationale: "create-turbo scaffolds apps we don't need; manual setup gives exact control"
  - id: D-01-01-02
    choice: "Next.js 15.5.9 with Turbopack"
    rationale: "Latest stable version, patched for CVE-2025-29927, uses Turbopack for fast dev"
  - id: D-01-01-03
    choice: "React 19 with TypeScript 5.9"
    rationale: "Latest stable versions for new project, full type safety"

metrics:
  duration: "7m"
  completed: "2026-01-21"
---

# Phase 01 Plan 01: Monorepo Setup Summary

**One-liner:** Turborepo 2.7.5 monorepo with Next.js 15.5.9 (React 19) web app and shared packages structure using pnpm workspaces.

## What Was Built

### Task 1: Turborepo Monorepo Structure
- Created root `package.json` with turbo, typescript devDependencies
- Created `turbo.json` with modern `tasks` configuration (not deprecated `pipeline`)
- Created `pnpm-workspace.yaml` defining apps/* and packages/*
- Created root `tsconfig.json` with strict TypeScript settings
- Created `.gitignore` for node_modules, .turbo, .next, dist

### Task 2: Next.js 15 Web Application
- Created `apps/web/` with Next.js 15.5.9 (patched for CVE-2025-29927)
- React 19 with TypeScript support
- Turbopack enabled for fast development
- Bulgarian placeholder content:
  - Title: "Celestia AI"
  - Description: "Вашият астрологичен спътник"
  - Homepage: "Добре дошли"
- App Router structure with layout.tsx and page.tsx

### Task 3: Shared Packages Structure
- Created `packages/ui/` - placeholder for shared UI components
- Created `packages/config/` - shared TypeScript configuration
- Both packages configured with proper exports and tsconfig

## Verification Results

| Check | Status |
|-------|--------|
| `pnpm install` completes | PASS |
| `pnpm dev` starts on localhost:3000 | PASS |
| `pnpm build` succeeds | PASS |
| `pnpm typecheck` passes | PASS |
| turbo.json uses "tasks" syntax | PASS |
| 4 workspace projects recognized | PASS |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 07126e2 | chore | Initialize Turborepo monorepo structure |
| f57c10a | feat | Create Next.js 15 web application |
| 39f8269 | chore | Create shared packages structure |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] pnpm not installed**
- **Found during:** Task 2 verification
- **Issue:** pnpm command not found on system
- **Fix:** Installed pnpm 9.15.4 via `npm install -g pnpm@9.15.4`
- **Files modified:** None (system-level install)

**2. [Rule 1 - Bug] Next.js auto-modified tsconfig.json**
- **Found during:** Task 2 dev server start
- **Issue:** Next.js added target and allowJs to apps/web/tsconfig.json
- **Fix:** No action needed - Next.js auto-configuration is expected behavior
- **Files modified:** apps/web/tsconfig.json (by Next.js)

## Decisions Made

1. **Manual monorepo setup** - Used manual file creation instead of create-turbo to avoid scaffolding unwanted apps and maintain exact control over structure.

2. **pnpm 9.15.4** - Installed exact version specified in packageManager field for reproducibility.

3. **Next.js 15.5.9** - Latest stable version automatically resolved, exceeds minimum 15.2.4 requirement for CVE patch.

## Next Phase Readiness

### Provides for 01-02 (NativeWind):
- Working Next.js app to add styling
- TypeScript configuration in place
- Shared packages structure ready

### Provides for 01-03 (Mobile):
- Monorepo structure supports adding Expo app
- Shared packages ready for cross-platform components

### No Blockers
All success criteria met. Ready to proceed with 01-02.
