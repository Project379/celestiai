---
title: Human test - Complete wizard flow
area: testing
phase: 3
created: 2026-01-26
files:
  - apps/web/app/(protected)/birth-data/page.tsx
  - apps/web/components/birth-data/BirthDataWizard.tsx
---

## Problem

Phase 3 verification requires manual testing of the birth data wizard flow to confirm UX works correctly.

## Test Steps

1. Navigate to /birth-data
2. Complete all 4 steps with real data

## Expected

- Progress bar advances with each step
- Back navigation preserves entered data
- Form validates per-step before "Напред"
- Successful save redirects to /dashboard

## Why Human

Visual flow and UX validation cannot be automated.
