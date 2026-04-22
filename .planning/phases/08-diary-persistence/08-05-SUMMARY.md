# §8.5 — Hook swap close summary

**Opened:** 2026-04-22 (after §8.4 shipped `/api/diary/*` CRUD + UAT 81/82).
**Closed:** 2026-04-22 (founder-verified via 5-step browser checklist + §8.4 harness re-run).
**Outcome:** `useManifestEntries` reads and writes through `/api/diary/*`. `localStorage` is no longer touched on the diary path. Cross-device persistence verified (same Clerk account on two browsers). Optimistic state with rollback on failure via `ERR-DI-003` / `ERR-DI-007` / `ERR-DI-008`. Delete UI removed per surfaced product decision. All four §8.5 commits land together on `mobile-parallel-test` with a clean §8.4 UAT harness re-run (81/82 pass, 0 fails — identical to the §8.4 close baseline).

---

## Hook surface changes

`apps/web/hooks/useManifestEntries.ts` rewritten as server-backed. Public return shape preserved (`{ entries, isLoaded, error, saveEntry, deleteEntry, findByDate, clearError }`) with one signature shift:

- `saveEntry: (input) => ManifestEntry` → `(input) => Promise<void>`. The only consumer (`ManifestDiaryContent.tsx`) discards the return value, so runtime is unchanged; typecheck clean.
- `deleteEntry: (id) => void` → `(id) => Promise<void>`. Retained per Decision G as a defensive affordance; no current UI consumer.
- `findByDate`, `clearError`, `entries`, `isLoaded`, `error` — unchanged.

Private `rowToEntry` adapter bridges snake_case server row (`DiaryEntryRow` from `packages/core/src/diary/entries.ts`) to camelCase `ManifestEntry`. The adapter lives inside the hook; `ManifestEntry` type stays unchanged, so downstream code (form, history, types.ts) is untouched.

Reconciliation after POST uses date-match, not id-match. The server's `(user_id, entry_date)` unique index is the authoritative key; matching on date gives eventual consistency under rapid double-submit (whichever POST resolves last wins the displayed state, matching the DB). Id-based merge would drift because the second optimistic update inherits the first's `tmp_*` id, the first POST's response replaces it, the second POST's response then finds no matching id and no-ops — leaving the UI showing stale content while the server has the fresh content.

## Error domain register — §8.5 updates

| Code | Status post §8.5 | Emit path | Copy |
|---|---|---|---|
| `ERR-DI-001` | **removed** | (was: localStorage write) | — |
| `ERR-DI-002` | **retained in registry, no emit path** | defensive for any future code reading abandoned `celestia.manifest.entries.v1` | `Не успяхме да заредим дневника. Опитай отново. Код: ERR-DI-002.` |
| `ERR-DI-003` | wired | POST non-ok | `Не успяхме да запазим страницата в дневника. Опитай отново. Код: ERR-DI-003.` |
| `ERR-DI-004` | wired | GET list non-ok (initial load) | `Не успяхме да заредим дневника. Опитай отново. Код: ERR-DI-004.` |
| `ERR-DI-007` | retained, no emit path from UI | hook method `deleteEntry` can still emit if called; no caller today | `Не успяхме да изтрием страницата. Опитай отново. Код: ERR-DI-007.` |
| `ERR-DI-008` | **new, approved 2026-04-22** | `fetch` rejection on any diary op (offline / DNS / TLS) | `Няма връзка със сървъра. Провери интернет връзката и опитай отново. Код: ERR-DI-008.` |

`ERR-DI-008`'s copy register intentionally diverges from the generic "Не успяхме да..." template: 008 is the only code where the user has a specific action available (check connection), so the copy frames cause + action directly. Founder-approved inline in the §8.5 scope-alignment round.

Banner clears on any successful server op (POST 2xx, DELETE 2xx/404) — mirrors the `ed0f606` pattern from §8.1.

## Decision G — Delete UI: none, diary entries are account-lifetime permanent

Surfaced during §8.5 verification. Full record in `.planning/research/DIARY_PRODUCT_DECISIONS.md § Decision G`. Summary:

- Product intent: a diary is practice across time. Users reading back months later shouldn't find impulse-delete gaps. Same-date upsert covers the "I wrote something I didn't mean" case without losing the date-anchored record.
- Full deletion is meaningful only at GDPR account-deletion granularity (§8.7).
- Server `DELETE /api/diary/entries/[id]` retained for §8.7 cascade.
- Hook `deleteEntry` method + `ERR-DI-007` registry entry retained symmetrically — defensive affordances paired so that a future UI re-introduction is a pure UI change, not a hook/error refactor.
- UI-surface removal: `ManifestHistory.tsx` drops the "Изтрий запис" / "Сигурен/на?" confirm block + the `onDelete` prop; `ManifestDiaryContent.tsx` drops `deleteEntry` from the destructure and the prop pass.

## `maxLength={500}` carry-forward

`ManifestEntryForm.tsx:130` gains `maxLength={500}` on the textarea (§8.2 Decision B sealing). Client cap matches the Zod validator (`1..500` chars) and the DB CHECK. Pre-submit hint rather than post-submit error.

## Verification evidence

Founder-led browser UAT on 2026-04-22, dev server on `localhost:3000`, post-commit `8647008` (before commits 3–4 — UI removal landed after verification confirmed the hook + form baseline works). Founder reported "everything works."

| # | Step | Result |
|---|---|---|
| 1 | Fresh sign-in → write entry → appears in history list | pass |
| 2 | Reload page → entries persist | pass (confirms server read) |
| 3 | Second browser, same Clerk account → entries visible | pass (cross-device) |
| 4 | Clear `localStorage` on origin browser → reload → entries still visible | pass (confirms server-backed, not local cache) |
| 5 | DevTools → Network → Offline → write → ERR-DI-008 banner + rollback | pass |
| 6 | DELETE endpoint | harness-only per Decision G — UAT harness §8.4 81/82 covers the round-trip; no browser test needed |
| 7 | PATCH path covered by the upsert-in-place behaviour in steps 1–2 (same-date re-save updates intentions; reload persists) | pass |

Machine-level verification: §8.4 UAT harness re-run against the live dev server post-hook-swap: **pass: 81 / fail: 0 / total: 82** — identical to the §8.4 close baseline. All 5 diary unauth gates + all 11 diary CRUD assertions green. Zero regression in non-diary surfaces (birth-data, chart/calculate, crystals, stripe, transits, oracle cap-gate, middleware gates).

## Files changed

| Commit | SHA | What |
|---|---|---|
| 1 | `56d2030` | `useManifestEntries.ts` rewritten: server-backed, optimistic with rollback, `rowToEntry` adapter, ERR-DI-003/004/007/008 emit paths, ERR-DI-001 removed, ERR-DI-002 retained |
| 2 | `8647008` | `ManifestEntryForm.tsx` textareas gain `maxLength={500}` (§8.2 Decision B sealing) |
| 3 | `a677e31` | `DIARY_PRODUCT_DECISIONS.md` adds Decision G — no delete UI, entries are lifetime-permanent |
| 4 | `9435ec5` | `ManifestHistory.tsx` + `ManifestDiaryContent.tsx` drop delete UI and `onDelete` wiring per Decision G |
| close | (this doc) | §8.5 close summary |

## Observations surfaced during the round

**Flash UX trade-off (not patched in §8.5).** `ManifestEntryForm`'s "✦ Записано в дневника" flash fires on optimistic commit, not on POST resolution. If a POST then fails with ERR-DI-003 or ERR-DI-008, the user briefly sees both the flash and the error banner — a visual contradiction that resolves within the flash's 2.4s fade. Acceptable for §8.5 since the error banner is persistent until dismissed and the flash auto-fades; post-launch UX polish item if user feedback surfaces it. Making `onSave` async + awaiting before flash would cleanly resolve it but crosses §8.5's hook-only scope.

**Rapid double-submit edge case.** Two POSTs before the first resolves: during the flight window the UI may briefly show the first POST's content while the server already has the second's; the second resolve reconciles via the date-match replacement and the UI converges. Inherent to optimistic-without-queue per the §8.0 plan's explicit scope bound ("No offline queue for later retry in §8.5"). Rollback on failure still preserves user intent because the snapshot captures pre-optimistic state.

**Stale `celestia.manifest.entries.v1` data in user browsers.** Per Implementation Decision 1, abandoned without clearing. `ERR-DI-002` retained in the registry is the defensive hook for any future code path that reads the stale key. No current code reads it.

**Delete UI was inherited, not ratified.** §8.5 is the first round to ask whether delete belongs in the product; the answer (Decision G) is "no, not in the user surface." Pre-§8.5 no round had explicitly scoped the delete UI, which is why it lived on from the localStorage era unexamined. Decision G closes that gap.

## Carry-forwards to §8.6

`§8.6 — Markdown export.` Per the §8.0 plan:
- New UI surface: button on `/rhythm/journal` (near the history section) labelled "Изтегли дневника" (Bulgarian copy drafts in §8.6 commit, user approves).
- Client-side markdown generation from `GET /api/diary/entries` response. Per-entry: date header, phase name, three intentions.
- File name: `celestia-дневник-YYYY-MM-DD.md`.
- No new endpoint needed — the §8.4 list endpoint already returns the full row array. If pagination is added post-launch, a `?all=true` / `GET /api/diary/entries/export` endpoint is the fallback.
- UTF-8 BOM for Excel-compatibility if users paste into office tools.

Inherits disciplines:
- Typecheck green before push
- Atomic commits per deliverable
- Surface-before-doing on scope changes (code OR prose)
- Stop-and-surface on unexpected behavior (optimistic timing, re-render issues, stale state)
