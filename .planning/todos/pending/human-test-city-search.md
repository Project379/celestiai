---
title: Human test - City search behavior
area: testing
phase: 3
created: 2026-01-26
files:
  - apps/web/components/birth-data/CitySearch.tsx
  - apps/web/app/api/cities/search/route.ts
---

## Problem

Phase 3 verification requires manual testing of Bulgarian city search to confirm search accuracy and UI behavior.

## Test Steps

1. Type "Соф" in city search field

## Expected

- Results appear after 300ms debounce
- София appears first (city type prioritized over towns/villages)
- Keyboard navigation works (arrows, enter, escape)

## Why Human

Real-time UI behavior and search accuracy validation.
