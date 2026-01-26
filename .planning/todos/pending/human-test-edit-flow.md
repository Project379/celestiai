---
title: Human test - Edit flow with confirmation
area: testing
phase: 3
created: 2026-01-26
files:
  - apps/web/components/birth-data/BirthDataCard.tsx
  - apps/web/components/birth-data/EditBirthDataDialog.tsx
---

## Problem

Phase 3 verification requires manual testing of the edit birth data flow to confirm multi-step dialog UX.

## Test Steps

1. Click "Редактирай" on BirthDataCard
2. Modify a field
3. Save

## Expected

- Form pre-populated with existing data
- Confirmation step asks "Сигурни ли сте?"
- Changes persist after page refresh

## Why Human

Multi-step dialog UX validation.
