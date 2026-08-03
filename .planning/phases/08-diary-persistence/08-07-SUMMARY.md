# §8.7 — GDPR deletion cascade + export close summary

**Opened:** 2026-04-23 (after §8.6 close — markdown export shipped).
**Closed:** 2026-04-23 (typecheck-verified; cron-invocation verification deferred to founder with CRON_SECRET + Supabase console access).
**Outcome:** `diary_entries` now participate in both GDPR surfaces. Hard-deletion cascade added to the Vercel cron (`apps/web/app/api/cron/cleanup-deleted-accounts/route.ts`) via a new `deleteUserDiaryEntries` core helper. Data-portability export (`apps/web/app/api/gdpr/export/route.ts`) gains a `diaryEntries` key alongside the existing four sources. Three atomic commits on `mobile-parallel-test`, all typecheck-green.

---

## Plan correction — target file

The §8.0 plan's §8.7 scope line named `apps/web/app/api/gdpr/delete-account/route.ts` as the cascade wiring site. That was a mental-model error in the plan: the `delete-account` route is a **request** endpoint only — it sets `deleted_at` + `deletion_scheduled_at` on `users` with a 30-day grace window and never deletes rows from any other table. The **actual hard-deletion cascade** lives in `apps/web/app/api/cron/cleanup-deleted-accounts/route.ts`, a Vercel cron scheduled daily at 03:00 UTC via `vercel.json`, gated by `Bearer ${CRON_SECRET}`.

The target-file shift does not change the round's mechanical shape (the plan's assumption "§8.7 is mechanical-additive" holds). Documented here so future readers don't hit the same surprise when retracing §8's execution. `[verified]` via surface-before-doing round accompanying the §8.6 close.

## Purge timing — cron-only, 30-day grace inherited

Per §8.7 Q1 ratification: diary entries inherit the 30-day grace semantic from sibling cascade tables. No immediate-purge path from the `delete-account` POST. Cancellation during the grace window continues to work for diary entries the same way it works for charts / ai_readings / daily_horoscopes / push_subscriptions — the data stays put until the cron runs after `deletion_scheduled_at` elapses, and cancelling clears the trigger before any deletion happens.

This is consistency with the existing cascade shape, not a special-case decision. Single cascade path, single grace semantic.

## Intentional pattern divergence — core helper vs inline

Per §8.7 Q2 ratification: diary_entries cascade wiring introduces a core-layer helper (`deleteUserDiaryEntries` in `packages/core/src/diary/entries.ts`) following §8.4's discriminated-union pattern. Existing cascade tables (`charts`, `ai_readings`, `daily_horoscopes`, `push_subscriptions`) remain inline in the cron. This is a **direction-of-travel divergence, not an inconsistency**: new cascade additions use core helpers; existing inline calls remain until a dedicated post-launch migration round (if/when the inline pattern causes problems).

Reasoning recap: the cron's inline convention predates §8.4's core-layer pattern. §8.4 established five diary operations in `packages/core/src/diary/entries.ts` using the `{ ok: true, data } | { ok: false, error: 'CODE', ... }` shape. Adding `deleteUserDiaryEntries` as a sixth matches §8.4 (consistency within §8's scope) rather than matching the cron's older inline pattern (consistency across the cron's cascade block).

Net effect on the cron: one file has two patterns deliberately. The cron's inline deletes silently ignore error returns (Supabase resolves `{ error }` without throwing, and the inline code never inspects it); the core-helper call **surfaces** error returns via the discriminated union. The cron logs on `!ok` and continues — "one failure shouldn't stop the batch" is preserved, now with a loud console trail for diary-specific failures where before diary would have been silent.

## Commit trail

| Commit | SHA | What |
|---|---|---|
| 1 | `996165d` | `feat(core): §8.7 deleteUserDiaryEntries helper for GDPR cascade` — adds the bulk-delete operation to `packages/core/src/diary/entries.ts` with `DeleteUserDiaryEntriesResult` discriminated union |
| 2 | `e5c1fd4` | `feat(gdpr): §8.7 diary_entries cascade in cleanup-deleted-accounts cron` — imports the helper and wires one call in the per-user try block alongside `push_subscriptions` |
| 3 | `01a8b82` | `feat(gdpr): §8.7 include diary_entries in GDPR data-export payload` — extends `Promise.all` from four to five sources, adds `diaryEntries` to the export literal |
| close | (this doc) | §8.7 close summary |

## Verification evidence

### Layer 1 — Typecheck green

- `@celestia/core`: `tsc --noEmit` clean after commit 1. Helper types compile; discriminated-union matches existing pattern.
- `@celestia/web`: `tsc --noEmit` clean after commit 2. Import path `@celestia/core/diary/entries` resolves via the workspace export map (matches §8.4 endpoint routes).
- `@celestia/web`: `tsc --noEmit` clean after commit 3. Five-tuple destructure from `Promise.all` typechecks; new `diaryEntries` key compatible with the inferred response shape.

### Layer 1 — Astrology non-regression

- `@celestia/astrology`: `vitest run` → 39 / 39 tests pass. Non-regression baseline confirmed — commit 1 does not touch astrology but the suite is a fast sanity check the core workspace isn't broken.

### Layer 2 — UAT harness re-run — skipped, justified

The m3 UAT harness does not cover the GDPR surfaces (`/api/gdpr/delete-account`, `/api/gdpr/export`, `/api/cron/cleanup-deleted-accounts`). A re-run would only verify that the diary CRUD flow remains green post-§8.7, which typecheck already confirms at the type level given that §8.7's web-side changes are strictly additive to the GDPR routes and don't touch `/api/diary/*`. No signal loss from skipping. If founder wants an explicit 82-assertion re-run locally, the commands are documented in the §8.4 SUMMARY and §8.5 SUMMARY.

### Layer 3 — Cron cascade manual verification — founder-executed

Requires `CRON_SECRET` and Supabase console access. Runbook:

1. In Supabase SQL editor, pick (or create) a test user with `clerk_id = 'USER_X'` and at least one row in `diary_entries` for them.
2. Back-date the test user's `deletion_scheduled_at` so the cron picks them up:
   ```sql
   UPDATE users
   SET deletion_scheduled_at = now() - interval '1 day',
       deleted_at = now() - interval '31 days'
   WHERE clerk_id = 'USER_X';
   ```
3. Invoke the cron manually (local dev server or prod, depending on preference):
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" \
        http://localhost:3000/api/cron/cleanup-deleted-accounts
   ```
4. Verify response `{ "deleted": N }` where N ≥ 1.
5. Verify empty result in Supabase:
   ```sql
   SELECT COUNT(*) FROM diary_entries WHERE user_id = 'USER_X';
   -- Expected: 0
   SELECT COUNT(*) FROM users WHERE clerk_id = 'USER_X';
   -- Expected: 0 (full cascade, including the users row)
   ```
6. Check dev-server logs for `[Cron Cleanup] Deleted user USER_X`. If diary-specific delete failed (for whatever reason — permissions, constraint), logs will contain `[Cron Cleanup] diary_entries delete failed for USER_X:` with the Supabase error message. That's the new diagnostic surface §8.7 adds vs the silent-failure pattern of the inline cascade.

Founder runs this against the real cron path when comfortable; not a blocker for §8.7 close since typecheck already covers the code-shape correctness and the helper is unit-shaped (single Supabase call, discriminated-union return).

### Layer 4 — GDPR export manual verification — founder-executed

Simpler than the cron path since no bearer token gymnastics. Runbook:

1. Sign in as a test user with at least one diary entry.
2. Navigate browser to `http://localhost:3000/api/gdpr/export` (or use DevTools / `curl` with a Clerk session cookie).
3. Downloaded `celestia-data-export.json` should now have a top-level `diaryEntries` array alongside `charts`, `aiReadings`, `dailyHoroscopes`, `user`. Each row is the raw snake_case shape from `public.diary_entries` (`id`, `user_id`, `entry_date`, `phase_id`, `phase_name`, `intentions`, `created_at`, `updated_at`).
4. If the user has zero diary entries, `diaryEntries: []` renders — empty is not an error.

This can be folded into §8.9's end-to-end verification alongside the "GDPR export includes diary entries" UAT scenario per the §8.0 plan.

## Carry-forwards

- **§8.9 UAT additions per §8.0 plan.** Add two diary GDPR assertions: "GDPR export includes diary entries" and "GDPR cron cascade removes diary entries." Both are now wireable; harness extension belongs in §8.9 per the §8.0 structure.
- **SCHEMA_DRIFT_AUDIT cross-check.** §8.0 plan's §8.7 cross-check line notes that columns flagged as "extra in DB" may warrant GDPR-coverage updates. Not addressed in §8.7 core scope; the cross-check is a §8.9 or post-launch task.
- **Silent-failure pattern in the inline cascade.** Unrelated to §8.7's correctness but surfaced here as direction-of-travel observation: the cron's existing inline deletes (`daily_horoscopes`, `chart_calculations`, `ai_readings`, `charts`, `push_subscriptions`) await a Supabase call and never inspect the `{ error }` return. Failures are silent. If post-launch any of these tables accumulates undeleted rows for deleted users, the migration round that surfaces will want to extend §8.7's core-helper pattern across all cascade tables. Noted for discoverability; not §8.7's problem to solve.

## Next: §8.8 opens — Bulgarian prompt variants expansion

Per the §8.0 plan, §8.8 is the skill-dependent round: 16+ new Bulgarian prompts generated via the bulgarian-skill in batches, first-variant verification gate before any batch ships, cycle-based rotation logic in `lib/manifest/prompts.ts`.

Key scope beats:
- **Gate first.** Generate one variant for one phase, surface to founder, voice-check (traditional terminology, sentence-starter cadence, `ManifestPrompt` shape alignment, no English bleed-through).
- **Batch after.** 4-8 prompts per batch, each committed independently, founder approves Bulgarian copy batch-by-batch.
- **Prompt library refactor.** `MANIFEST_PROMPTS: Record<LunarPhaseId, ManifestPrompt>` → `Record<LunarPhaseId, ManifestPrompt[]>`; `getManifestPrompt(phaseId, entryCountForPhase)` selects `prompts[entryCountForPhase % prompts.length]`; `ManifestEntryForm` passes `entries.filter(e => e.phaseId === phase.id).length` as the rotation cursor.
- **Backward compatibility.** Existing 8 prompts become variant 0 of their phase; entries don't track variant index (Decision 2), so stored entries are untouched by the refactor.

Inherits §8.5/§8.6 disciplines: typecheck green before push, atomic commits per deliverable, surface-before-doing on scope changes, founder-approved Bulgarian copy per batch.
