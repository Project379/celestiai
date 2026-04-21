# §9.6 — CI integration (close artifact)

**Opened:** 2026-04-21
**Status:** CLOSED. §9.6 CI promotion complete; §9 workstream closed.
**Scope:** wire the §9 validation harness as a permanent CI regression gate; add package- and repo-level documentation; verify CI-green end-to-end.
**Predecessor:** `09-02-LONGITUDE-REPORT.md` — §9.2/§9.3/§9.4 PASS with observations, 2026-04-21.

**Epistemic tags used:** `[verified]` (observed in tool output or primary-source docs), `[observation]` (pattern datum without full explanation), `[inferred]` (reasoned attribution).

---

## Five deliverables — status

| # | Deliverable | Commit | Verified |
|---|---|---|---|
| 1 | CI pipeline wiring — `.github/workflows/astrology.yml` + turbo `test` task + root `test` script | `80d4f9d` | `[verified]` via run `24711742250` (success, 55 s) + run `24712029611` (success, 28 s) |
| 2 | `packages/astrology/README.md` — package-level doc covering validation layer, tiers, epistemic tags, scope | `631a757` | `[verified]` — file present, cross-referenced from workflow + this doc |
| 3 | `packages/astrology/test/validation/reference-data/README.md` — extended update protocol + `[inferred]` DE404-vs-DE441 caveat | `16fcf65` | `[verified]` — see § Reference-data update protocol summary below |
| 4 | CI verification trigger — trivial comment addition to `packages/astrology/README.md` | `95281f3` | `[verified]` via run `24712029611` — explicit trigger-commit CI fire, green end-to-end |
| 5 | This close artifact — `09-06-CI-INTEGRATION.md` | (this commit) | — |

---

## CI design — `.github/workflows/astrology.yml`

### Triggers

```yaml
on:
  pull_request:
    branches: [develop, main]
    paths:
      - 'packages/astrology/**'
      - '.github/workflows/astrology.yml'
  push:
    branches: [develop, main, mobile-parallel-test]
    paths:
      - 'packages/astrology/**'
      - '.github/workflows/astrology.yml'
```

**Path filter** scoped to `packages/astrology/**` + the workflow file itself. Changes outside the astrology package do not fire this workflow; typecheck-level regressions in downstream consumers (`apps/web`) are covered by the existing `ci.yml`'s `pnpm run check:all`.

**Push trigger** narrowed to `develop`, `main`, and `mobile-parallel-test`. Rationale: the §9.6 instruction required a verification-trigger commit that fires CI via `push`, not requiring an open PR. Feature-branch push-trigger supports this without polluting short-lived branches. Feature-branch developers can open a PR when ready; CI will then fire on both the PR and the underlying pushes.

### Job steps

| # | Step | Notes |
|---|---|---|
| 1 | `actions/checkout@v4` | Source checkout. |
| 2 | `pnpm/action-setup@v4` | Pinned to 9.15.4 (matches root `package.json` `packageManager`). |
| 3 | `actions/setup-node@v4` with `node-version: '22'` and `cache: pnpm` | Matches root `engines.node` and `ci.yml`'s existing choice. |
| 4 | `pnpm install --frozen-lockfile` | Reproducible install; fails CI if lockfile drifts. |
| 5 | `pnpm --filter @celestia/astrology typecheck` | Runs `tsc --noEmit` on `src/` + `test/`. Catches type regressions before the test step. |
| 6 | `pnpm --filter @celestia/astrology test` | Runs the §9 validation harness: 39 tests, 12 cases, 4 tiers. Fails CI on `pause-and-fix` case-level status. `queue`-level per-body statuses (e.g., Einstein Neptune 1.18″ scope-boundary `[observation]`) pass. |

Typecheck and test are separate steps so failures are attributable — a type error in the source doesn't masquerade as a validation failure and vice versa.

### What the CI gate does NOT cover

- **Downstream regressions in `apps/web`** when `@celestia/astrology` changes its public API. Covered by `ci.yml`'s `pnpm run check:all` (typecheck across the monorepo) firing on the same PR.
- **Reference-data regeneration drift.** The harness compares sweph output against committed reference-data snapshots. If reference data is intentionally regenerated (see § Reference-data update protocol below), the CI validates the new snapshots against the current sweph build but does not independently re-validate them against their external sources (JPL Horizons / Astronomy Engine). Manual spot-check during regeneration is the operator's responsibility per the protocol.
- **Queue-level discrepancies.** Harness assertion remains `not.toBe('pause-and-fix')`. Tightening to `fail-on-queue` was explicitly out of §9.6 scope; would immediately fail CI on the known-accepted Einstein Neptune 1.18″ `[observation]`. Re-opening requires planning-doc sign-off per `09-01-PRECISION-FLOOR.md § Locked thresholds`.

---

## Verification — two CI runs, both green

### Run 1 — initial wiring push (commit `16fcf65`)

- **Run ID:** 24711742250
- **Result:** `success`
- **Duration:** 55 s
- **URL:** https://github.com/Project379/celestiai/actions/runs/24711742250
- **Why it fired:** the wiring push included `.github/workflows/astrology.yml` (matches path-filter) plus the two README updates under `packages/astrology/`. GitHub Actions fires on the commit that creates a workflow file as long as the trigger conditions match. `[verified]`.

### Run 2 — explicit verification trigger (commit `95281f3`)

- **Run ID:** 24712029611
- **Result:** `success`
- **Duration:** 28 s end-to-end (job 27 s, queue 4 s)
- **URL:** https://github.com/Project379/celestiai/actions/runs/24712029611
- **Trigger:** trivial HTML-comment addition to `packages/astrology/README.md`, chosen specifically per §9.6 instruction for an explicit separate trigger commit.
- **Step-level timing:**
  - Node + pnpm setup: 10 s (with pnpm cache primed on fresh runner)
  - `pnpm install --frozen-lockfile`: 6 s
  - `@celestia/astrology typecheck`: 2 s
  - `@celestia/astrology test` (39 tests, 12 cases, 4 tiers): 2 s

**CI-green matches local-green.** `pnpm --filter @celestia/astrology test` locally reports 39/39 passing in ~550 ms; CI reports 39/39 passing in ~2 s (the step-level wall-time difference is runner overhead, not test-count divergence). No discrepancies surfaced between local and CI environments at this scope.

---

## Reference-data update protocol — summary + cross-reference

Full protocol lives in `packages/astrology/test/validation/reference-data/README.md § Updating reference data`. Summary for this artifact:

### When regeneration is needed

- JPL Horizons for past dates: **stable**, no regen needed unless the JPL ephemeris generation (DE441 → DE442 / DE450 / ...) is upgraded.
- JPL Horizons for future dates: **drift at the predict boundary as EOP data updates**; not relevant for natal-chart fixtures.
- Astronomy Engine: **deterministic per npm version**. Regenerate on upgrade if coefficients change materially.
- Inline Meeus / Placidus: **deterministic by implementation**. Never needs regeneration; recomputed at comparison time from case JD.

### Regeneration procedure

```bash
# 1. Delete target snapshot(s)
rm packages/astrology/test/validation/reference-data/<case-id>.ts

# 2. Rerun idempotent generator
pnpm --filter @celestia/astrology exec tsx \
  test/validation/scripts/generate-reference-data.ts

# 3. Verify
pnpm --filter @celestia/astrology typecheck
pnpm --filter @celestia/astrology test
```

Wall-time budget: ~3–5 minutes for all 12 cases (sequential JPL Horizons queries, polite-to-API by design). Network access required for JPL fetches; AE + Meeus / Placidus are local.

### `[inferred]` DE404-vs-DE441 caveat — named explicitly

`09-02-LONGITUDE-REPORT.md § Tier 1 § Far-range cases` resolves the Year 1600 / Year 2200 Moon deltas as:

> Observed deltas vs DE441 at far-T are `[observation]` with `[inferred]` attribution to DE404-vs-DE441 inter-ephemeris-generation divergence. Moshier is `[verified]` 0.5″ vs DE404 uniformly across 1369 BC – 3000 AD per SE docs; the observed 10.31″ (1600) and 47.54″ (2200) are not attributable to Moshier's own drift. Other candidate contributors (frame-convention differences, time-scale handling at far-T) have not been eliminated. No primary source quantifies the relative contributions.

**Operational consequence for future reference-data regeneration** (captured in `reference-data/README.md`):

- If JPL releases DE442 / DE450 / ... and Celestia regenerates against the new generation, **far-range observation magnitudes may shift in either direction**. This is expected inter-generation variance, **not** a Celestia-side regression.
- The discriminator: compare modern-era cases (1879–2020) against far-range cases in the same regeneration run.
  - Modern-era staying sub-arcsec + far-range shifting = inter-generation variance, as expected.
  - Modern-era also shifting by a non-noise amount = real regression worth investigating (sweph update, Moshier-to-DE404 fit regression, deeper issue).
- The modern-era `[verified]` claim is the load-bearing one for Celestia's user base. Far-range cases are scope-explicit `[observation]` records.

This discipline is baked into the `farRangeObservation` fixture flag behaviour (Tier 1 exceedances for flagged cases do not propagate to case-level pause-and-fix) and is documented at three levels:

1. `types.ts` block comment on the flag field.
2. `packages/astrology/README.md § Epistemic tags` (package-level doc).
3. `reference-data/README.md § Inter-ephemeris-generation caveat` (this cross-reference).

---

## Documentation cross-reference map — post-§9.6

| File | Role |
|---|---|
| `packages/astrology/README.md` | Package-level entry point — tiers, thresholds, epistemic tags, scope, CI reference |
| `packages/astrology/test/validation/README.md` | Module-level harness docs — file map, scope limitations, threshold-change discipline |
| `packages/astrology/test/validation/reference-data/README.md` | Reference-data conventions, sources, update protocol, DE404-vs-DE441 caveat |
| `packages/astrology/test/validation/fixtures/README.md` | Fixture-file conventions (pre-existing) |
| `.github/workflows/astrology.yml` | CI workflow definition |
| `.planning/phases/09-ephemeris-validation/00-PLAN.md` | §9 workstream plan (1879 origin) |
| `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md` | Threshold rationale + primary-source citations + doc-drift tracker (#1-#8) |
| `.planning/phases/09-ephemeris-validation/09-01-HARNESS.md` | Harness tier architecture |
| `.planning/phases/09-ephemeris-validation/09-01-TEST-CASES.md` | Test-case list + selection protocol (extended for non-modern dates) |
| `.planning/phases/09-ephemeris-validation/09-01-SAMPLE-QE2.md` | QE II n=1 sample run pre-§9.2 |
| `.planning/phases/09-ephemeris-validation/09-02-LONGITUDE-REPORT.md` | Consolidated §9.2/§9.3/§9.4 validation report |
| `.planning/phases/09-ephemeris-validation/09-06-CI-INTEGRATION.md` | This close artifact |

No orphan docs, no duplicate sources-of-truth. Thresholds live only in `thresholds.ts`. Reference-data protocol lives only in `reference-data/README.md` (with cross-references). Epistemic-tag vocabulary defined once in `packages/astrology/README.md` and used consistently.

---

## §9 workstream — closed

**Gate count and disposition:**

| Sub-round | Status | Closed |
|---|---|---|
| §9.0 | plan | 2026-04-20 |
| §9.1 | harness + reference-data sourcing + sample | 2026-04-20 / 2026-04-21 (multi-round) |
| §9.2 | planetary longitude validation | 2026-04-21 |
| §9.3 | house cusp validation | 2026-04-21 (consolidated into §9.2 report) |
| §9.4 | aspect validation | 2026-04-21 (consolidated into §9.2 report) |
| §9.5 | discrepancy fixes | 2026-04-21 — **zero bug-fix rounds**; items (a) polar-NaN + far-range flag + (b) observation-capture landed in §9.2/§9.6 commits |
| §9.6 | CI promotion | 2026-04-21 (this artifact) |

**Final count:** 6 sub-rounds + 0 discrepancy rounds = **6 total sub-rounds**, matching the §9.0 baseline estimate.

**Exit criteria met:**

1. `[verified]` Harness scaffold committed (§9.1 R1), 12-case reference-data corpus committed (§9.2), consolidated validation report committed (§9.2).
2. `[verified]` `@celestia/astrology`'s `test` script wired into CI via `.github/workflows/astrology.yml`. Fires on pull_request + push touching `packages/astrology/**` on branches develop / main / mobile-parallel-test.
3. `[verified]` Thresholds centralized in `thresholds.ts`; changing them requires planning-doc sign-off.
4. `[verified]` Reference-data files committed and stable; regeneration protocol documented.
5. `[verified]` Package-level README + module-level READMEs in place; no orphan docs.
6. `[verified]` CI run green end-to-end (runs `24711742250` + `24712029611`).

---

## Downstream — §8 diary persistence eligible to resume

Per the 2026-04-20 sequencing-pivot ruling recorded in `PRE_LAUNCH_PREREQS.md § Status-change log`, §8 (diary persistence workstream) becomes eligible to resume at §8.1 once §9 closes.

**§9 closes with this artifact.**

Before opening §8.1, the user should re-read:
- `.planning/research/DIARY_PRODUCT_DECISIONS.md` — durable decisions that survive the pause
- `.planning/phases/08-diary-persistence/00-PLAN.md` — §8 workstream plan, paused after §8.0

Twenty-plus rounds of §9 work likely displaced some §8 context; a re-read before §8.1 opens is cheap insurance against dropped constraints.

`PRE_LAUNCH_PREREQS.md` item 6 status was already flipped to `[done]` in the §9.2 round (commit `aaa177e`). No further update needed for item 6 from §9.6. The `§9.6 CI promotion remaining` note in the item-6 row will resolve to "done" on the next routine update of that doc; not a §9.6 commit, per the "no further update needed unless §9.6 changes something material" guidance.

---

## Lessons carried forward

From `09-02-LONGITUDE-REPORT.md § Lessons learned`:

- Validation-workstream branching rules should include an **out-of-scope observation** category, not just pause-and-fix / queue / clean-pass. Implemented via `farRangeObservation` flag.
- The "surface before classifying" discipline applies to **code changes that materially alter what the harness asserts**, not only prose classifications. The §9.5 scope-expansion process observation (2026-04-21) recorded this.

Implications for future workstreams in this codebase:

- Any future golden-file / validation workstream should pre-commit the four-category framing.
- Fixture-flag additions that change harness assertion semantics are themselves classification decisions and deserve surface-and-approve before landing.
- Primary-source checks before attribution are non-negotiable — the §9.2 round's "Moshier Moon degradation" hypothesis was partially contradicted by SE docs, and only caught because the user insisted on the primary-source search before the report was drafted.

---

**§9 CLOSED.**
