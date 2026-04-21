# §9A — Licensing compliance closure (summary)

**Opened:** 2026-04-21
**Closed:** 2026-04-21 (same day)
**Status:** CLOSED. Remediation complete; durable workspace-wide guardrail in place; docs reflect reality.
**Scope:** follow-up to §9.6 after the post-close sweph-pin verification surfaced a `packages/core` AGPL drift. Not a new workstream class, not part of §9 proper — a focused compliance-closure round.

**Epistemic tags used:** `[verified]` (observable in tool output or diff), `[inferred]` (reasoning applied to observations).

---

## Trigger

Post-§9.6, the user asked for a routine sanity check: *"verify the sweph version pin is still at 2.10.0 on the current mobile-parallel-test."* The answer was *yes* for `packages/astrology` — but the verification grep also surfaced `packages/core` depending on `"sweph": "^2.10.3-4"`, resolved to `sweph@2.10.3-b-1` with license `(AGPL-3.0-or-later OR LGPL-3.0-or-later)`.

`packages/core/src/horoscope/transit-analysis.ts` calls `sweph.calc_ut` at runtime. This placed part of the Celestia server-side code on the AGPL-3.0 path while `docs/licensing.md` claimed the workspace was on the GPL-2.0 path. Founder decision: GPL-2.0 path continues; no Professional License purchase pre-launch; §9A opens to remediate.

See `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md § Doc drift corrections` entry #9 for the full narrative.

---

## Five deliverables — status

| # | Task | Commit | Status |
|---|---|---|---|
| 1 | Global AGPL/GPL/share-alike audit across workspace — doc commit, no code changes | `7345473` | `[verified]` — `01-AUDIT-REPORT.md` committed, findings surfaced and user-approved before remediation. Only sweph and benign `node-forge` dual-license surfaced; no other AGPL / GPL-3 / SSPL / BUSL / Elastic / CC-BY-NC / EUPL deps anywhere in the workspace. |
| 2-3 | `packages/core` sweph pin → `2.10.0-11`; `pnpm.overrides` added at root; lockfile regenerated | `6bb4ff2` | `[verified]` — lockfile `overrides: sweph: 2.10.0-11` present; both workspace packages resolve sweph to `2.10.0-11`; `node_modules/.pnpm/` contains sweph@2.10.0-11 only (no AGPL version on disk post-clean-reinstall); re-running audit grep returns 4 clean hits (3× node-forge benign + 1× sweph GPL-2.0); `pnpm typecheck` 5/5 green; `pnpm --filter @celestia/astrology test` 39/39 green. |
| 4 | `docs/licensing.md` rewritten to reflect workspace-wide override enforcement | `d031bd2` | `[verified]` — new "Enforcement mechanism" section documents the override JSON; new "Drift discovery and remediation" subsection captures the AGPL finding honestly (drift existed, caught pre-launch, attributed to monorepo-default latest-matching-semver); Professional License upgrade path updated to bump three places in one atomic commit. |
| 5 | `PRE_LAUNCH_PREREQS.md` item 9 rewritten; status-change log entry added | `d031bd2` | `[verified]` — item 9 names the pnpm-override enforcement + both current packages; status-change log records 2026-04-21 §9A open+close; notes that the guardrail protects against sweph-style-drift specifically, not against new deps introducing AGPL under a different package name. |
| 6 | Doc-drift tracker entry #9 added to `09-01-PRECISION-FLOOR.md` | `d031bd2` | `[verified]` — entry #9 labels this "the most severe instance of the doc-drift pattern tracked in this workstream" and records the lesson (*"pin the dep in the package" is not sufficient in a monorepo*). |
| 7 | This close artifact | (this commit) | — |

Numbering matches the user-approved §9A scope. The user's final scope message consolidated the earlier six-item draft into five (no separate Task 7); the table above follows that consolidation. The audit doc (task 1) and the code fix (tasks 2-3) are separate commits per the approved structure; doc updates (tasks 4-6) landed as one atomic commit per project convention for coordinated prose-only updates.

---

## Audit findings — summary

Full report at `01-AUDIT-REPORT.md`. Key results:

- **5 scan hits, 3 distinct packages.** sweph@2.10.0-11 (GPL-2.0, compliant), sweph@2.10.3-b-1 (AGPL, the drift — remediated in task 2-3), node-forge@1.4.0 × 3 installs (dual-licensed BSD-3-Clause OR GPL-2.0 — BSD path elected, benign).
- **Zero hits on the other scanned classes:** no AGPL beyond the sweph drift, no GPL-3, no SSPL, no BUSL, no Elastic, no CC-BY-NC, no EUPL, no OSL, no QPL, no RPL, no CPAL.
- **Methodology documented** for reproducible re-audit — exact grep command, pnpm version, scan scope, when-to-re-run triggers. Re-audit is a one-line copy-paste for a future reviewer, not a research task.

---

## Post-remediation verification

| Check | Result | Evidence |
|---|---|---|
| `packages/astrology` resolves sweph to `2.10.0-11` | `[verified]` | `pnpm-lock.yaml` line 243: `version: 2.10.0-11` |
| `packages/core` resolves sweph to `2.10.0-11` | `[verified]` | `pnpm-lock.yaml` line 270: `version: 2.10.0-11` |
| Root-level override recorded | `[verified]` | `pnpm-lock.yaml` line 7-8: `overrides: sweph: 2.10.0-11` |
| No AGPL sweph version installed on disk | `[verified]` | `ls node_modules/.pnpm/ | grep sweph` → `sweph@2.10.0-11` only (post-clean-reinstall) |
| Re-audit grep clean (no new hits vs pre-drift baseline) | `[verified]` | 4 hits post-fix: 3× node-forge benign + 1× sweph GPL-2.0. Exactly matches `01-AUDIT-REPORT.md § Methodology § Clean-run expectation`. |
| Monorepo typecheck green | `[verified]` | `pnpm typecheck` → 5/5 tasks pass |
| §9 validation harness green against pinned sweph | `[verified]` | `pnpm --filter @celestia/astrology test` → 39/39 pass |
| CI workflow green on the remediation push | `[inferred]` until the post-close push verifies | GitHub Actions runs on `packages/astrology/**` + `.github/workflows/astrology.yml` paths only — the §9A commits touch `packages/core` and root `package.json`, which do NOT match the astrology.yml path filter. Correct behavior: this workflow does not fire for licensing-compliance commits. Root-level `ci.yml` runs `pnpm run check:all` on all PRs touching develop/main; its typecheck covers the whole monorepo including packages/core and will catch any build break in `transit-analysis.ts` against the re-pinned sweph. No additional CI coverage needed for §9A's change-set. |

---

## Guardrail — how recurrence is prevented

The `pnpm.overrides` entry at the repository root is the durable mechanism. Specifically:

```jsonc
// package.json
{
  "pnpm": {
    "overrides": {
      "sweph": "2.10.0-11"
    }
  }
}
```

**What the override does:** pnpm intercepts any `sweph` specifier — in any current or future workspace package, or any transitive dep — and force-resolves it to `2.10.0-11`. A new workspace package adding `"sweph": "^2.x"` or `"sweph": "latest"` will install `2.10.0-11` regardless of what its specifier says.

**What the override doesn't do:** it doesn't protect against a **different AGPL-licensed package** being added (e.g., if someone adds `sweph-ng` or some forked npm package that happens to be AGPL). That class of drift is what a **periodic re-audit** is for. The audit methodology in `01-AUDIT-REPORT.md § Methodology` is a one-line grep — rerunning it before release milestones (and when adding any new direct dep) is the matching discipline.

The combination of override (guards the known compliance-sensitive dep) + re-audit methodology (catches new entrants) is the durable posture. Neither alone is sufficient.

---

## §9 posture alignment — confirmed

The root issue driving §9A was that `docs/licensing.md` claimed a workspace-wide GPL-2.0 path while the codebase had drifted. Post-§9A:

- `docs/licensing.md § Swiss Ephemeris` describes the workspace-wide override mechanism that now exists.
- `docs/licensing.md § Drift discovery and remediation` documents the 2026-04-21 finding honestly (drift existed, caught pre-launch, mechanism corrected, lesson captured).
- `PRE_LAUNCH_PREREQS.md` item 9 names the enforcement mechanism and cross-references this artifact.
- `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry #9 preserves the finding in the same tracker that caught earlier §9 doc drifts.
- **Codebase matches the documented posture.** The claim and the reality are now one.

`[verified]` via the diff between the pre-§9A and post-§9A states of `docs/licensing.md`, `PRE_LAUNCH_PREREQS.md`, and `09-01-PRECISION-FLOOR.md`.

---

## §9A closes — downstream handoff

**With §9 and §9A both closed,** `§8` (diary persistence) is now fully eligible to resume at §8.1 per the 2026-04-20 sequencing-pivot ruling and its 2026-04-21 §9A-extension.

Before opening §8.1, recommend re-reading:
- `.planning/research/DIARY_PRODUCT_DECISIONS.md` — durable decisions that survive the pause
- `.planning/phases/08-diary-persistence/00-PLAN.md` — §8 workstream plan, paused after §8.0

Twenty-plus rounds of §9 and one round of §9A likely displaced some §8 context; a re-read before §8.1 opens is cheap insurance against dropped constraints.

---

## Lessons carried forward

1. **Monorepo dep-pinning discipline** — pinning a sensitive dep in one workspace package isn't sufficient. `pnpm.overrides` at the root is the mechanism that makes a workspace-wide pin durable. `[verified]` by the drift that surfaced before the override was added.
2. **License audit as release-gate discipline** — the exact grep command + patterns live in the audit methodology. Rerun before release milestones and when adding any new direct dep. Cost: <5 minutes.
3. **"Verify the claim" is itself a forcing function** — the drift surfaced only because the user asked for a routine sanity check. The §9.6 close artifact claimed the GPL-2.0 posture was in order; the claim wasn't tested until the user asked "is this actually true?" Periodic verification of claimed-stable state catches drift that no process alarm will raise.
4. **Small commits for compliance work** — the audit-separate-from-fix structure (`7345473` audit → `6bb4ff2` fix → `d031bd2` docs) makes the round's reasoning reviewable. A single combined commit would have buried the audit findings inside the fix diff and the docs would reference an implicit audit rather than a discrete artifact.

---

**§9A CLOSED.** §8 eligible to resume on user signal.
