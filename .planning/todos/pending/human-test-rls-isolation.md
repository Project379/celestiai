---
title: Human test - RLS data isolation
area: testing
phase: 3
created: 2026-01-26
files:
  - packages/db/src/schema/charts.ts
  - packages/db/drizzle/0000_slow_invaders.sql
---

## Problem

Phase 3 verification requires manual testing that Row Level Security properly isolates user data.

## Test Steps

1. Create accounts for two different users
2. Each user adds birth data
3. Verify isolation

## Expected

- User A cannot see or access User B's birth data
- API returns empty for other users' data

## Why Human

Requires multiple authenticated sessions to verify.
