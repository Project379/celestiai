# §8.6 — Markdown export close summary

**Opened:** 2026-04-23 (after §8.5 closed with hook swap + Decision G + UAT pass).
**Closed:** 2026-04-23 (founder-verified via browser UAT on live diary surface ≥2 entries).
**Outcome:** A "Изтегли дневника" button on the diary surface produces `celestia-дневник-YYYY-MM-DD.md` with UTF-8 BOM, Cyrillic filename intact, `# Лунен дневник` header + export date line, and per-entry blocks in the shape `## DATE · PHASE` with `U+00B7` middot and I/II/III intention numbering. Empty-state (no entries) hides the button. No new endpoint — client-side generation from the existing `GET /api/diary/entries` response.

---

## UAT evidence

Browser verification, 2026-04-23, diary surface with ≥2 entries:

| # | Step | Result |
|---|---|---|
| 1 | Button "Изтегли дневника" renders on diary surface when `entries.length ≥ 1` | pass |
| 2 | Filename is `celestia-дневник-YYYY-MM-DD.md` with Cyrillic intact (no mojibake, no URL-encoding artefacts) | pass |
| 3 | File opens cleanly in a plain text editor and a markdown-rendered preview | pass |
| 4 | `# Лунен дневник` header + export date line render correctly at the top | pass |
| 5 | Per-entry blocks render as `## DATE · PHASE` using `U+00B7` middot (not `·` lookalikes or `-`) | pass |
| 6 | Intention numbering I / II / III consistent with the on-screen form | pass |
| 7 | UTF-8 BOM present at file head (Excel-safe if pasted into office tools) | pass |
| 8 | All Cyrillic text renders without mojibake in both plain text and markdown-rendered views | pass |
| 9 | Empty-state (entries.length === 0) → button is hidden | pass |

All 9 UAT steps green. No follow-up defects surfaced.

## Scope-revisit breadcrumb — post-launch concern

Export re-uses the unpaginated `GET /api/diary/entries` list endpoint. At current diary-write rates and expected per-user entry counts (≤ one entry per day per user, several hundred per year per active user), fetching the full list for export is fine for several years. **Revisit if the list endpoint ever gains pagination** — at that point the button will silently export only the first page, which is a data-loss surface. Fallback when that happens: either add an `?all=true` query param to bypass pagination for the export path, or add a dedicated `GET /api/diary/entries/export` endpoint that always returns the full set. Decision deferred to whichever sub-round actually introduces pagination. Not a §8.6 concern; flagged here so the revisit is discoverable when the precondition fires.

No other scope observations from §8.6.

## Commit trail

| Commit | SHA | What |
|---|---|---|
| export button | `3bd8135` | `feat(web): §8.6 markdown export button on diary surface` — client-side markdown generation with UTF-8 BOM, Cyrillic filename, `## DATE · PHASE` per-entry blocks, I/II/III intention numbering, empty-state gating |
| close | (this doc) | §8.6 close summary |

## Next: §8.7 opens — GDPR deletion cascade + export inclusion

Per the §8.0 plan, §8.7 wires `diary_entries` into both GDPR surfaces:

1. **Deletion cascade.** Diary entries removed when a user's account is hard-deleted.
2. **Data-portability export.** Diary entries included in the GDPR data-export payload as JSON (machine-readable), not markdown (that's §8.6's user-facing format).

**Pre-open surface-before-doing** — the §8.0 plan's §8.7 scope line ("Wire into the existing `apps/web/app/api/gdpr/delete-account/route.ts` as an additional cleanup step") is slightly misaligned with the actual architecture. The `delete-account` route only sets `deleted_at` + `deletion_scheduled_at` on the `users` table (30-day grace period). The actual hard-deletion cascade lives in **`apps/web/app/api/cron/cleanup-deleted-accounts/route.ts`** — a Vercel cron scheduled daily at 03:00 UTC. That cron is where `diary_entries` must be added. The pattern is mechanical and established (charts → daily_horoscopes / chart_calculations → ai_readings → charts → push_subscriptions → users → Clerk user), so §8.7 stays an additive round; the only adjustment vs the plan is the file path. Full surface in the response accompanying this close summary.

§8.7 inherits the usual disciplines: typecheck green before push, atomic commits per deliverable, surface-before-doing on scope changes, user approval on any new user-visible copy (none expected in §8.7 — GDPR surfaces already have their Bulgarian register locked).
