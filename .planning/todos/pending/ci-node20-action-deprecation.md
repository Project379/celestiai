---
title: CI action pins target deprecated Node 20 runner
area: ci
phase: n/a
created: 2026-08-04
files:
  - .github/workflows/ci.yml
  - .github/workflows/astrology.yml
---

## Problem

GitHub Actions surfaces a warning annotation on every green run of both
workflows (confirmed directly via `gh api .../check-runs/{id}/annotations`
on a passing §9 ephemeris validation run, commit `aa29a18`):

> Node.js 20 is deprecated. The following actions target Node.js 20 but
> are being forced to run on Node.js 24: `actions/checkout@v4`,
> `actions/setup-node@v4`, `pnpm/action-setup@v4`. For more information
> see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/

GitHub is currently force-upgrading these Node20-targeting action
versions to Node24 transparently, so both workflows still pass today.
This is exactly the kind of warning on a green check that goes unread
until it stops being silently absorbed — once GitHub drops the forced
compatibility shim, both `ci.yml` and `astrology.yml` will fail outright
at the checkout/setup step with no code change on our side to explain it.

## Fix

Bump the pinned action versions in both workflow files to their
Node24-native majors (`actions/checkout@v5`, `actions/setup-node@v5`,
`pnpm/action-setup@v5` or whatever the current majors are at fix time —
check each action's own changelog for the version that dropped Node20
targeting) and re-verify the annotation is gone on the next run.

## Why Deferred

Low priority — purely a future-proofing fix, not a live failure. No
functional risk today; only becomes urgent once GitHub actually removes
the forced-upgrade shim, which has no announced date as of 2026-08-04.
Surfaced during the Circle-branch recovery investigation, not the CI
failure it was investigating (that was the pnpm-lock.yaml overrides
mismatch — a separate, unrelated issue).
