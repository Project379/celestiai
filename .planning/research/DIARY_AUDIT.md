# Diary Feature End-to-End Audit

**Written:** 2026-04-20
**Scope:** Full audit of the lunar diary feature across routes, components, data model, prompt library, and premium-gate status. Opened at the start of §8 as a read-only investigation before any product-direction decisions.
**Epistemic tags:** `[verified]` — read from source; `[inferred]` — deduced from code but not directly executed; `[missing]` — explicitly not present in code; `[runtime-check-needed]` — cannot determine from static reading alone.

> **Audit method `[verified]`:** Grep + Glob + direct file reads across `apps/web/app/(protected)/rhythm/`, `apps/web/components/manifest/`, `apps/web/hooks/useManifestEntries.ts`, `apps/web/lib/manifest/`, `apps/web/lib/moon-phase.ts`, middleware, PREMIUM_MATRIX.md, next.config.js. Entry point: every file matched by `grep -rn "diary\|journal\|manifest\|useManifestEntries"` under `apps/web/`.

---

## 1. Routes & surfaces

### 1.1 Live routes `[verified]`

| Route | Page file | What renders |
|---|---|---|
| `/rhythm/journal` | `apps/web/app/(protected)/rhythm/journal/page.tsx` | **Canonical diary surface.** Directly mounts `<ManifestDiaryContent />`. This is the full diary — prompt, form, history, delete. |
| `/rhythm` | `apps/web/app/(protected)/rhythm/page.tsx` | `<LunarPhaseCard />` (lunar phase + meteor showers + manifesting guidance — not the diary form) + a separate CTA card titled *"Лунен дневник"* with the copy *"Три реда на ден..."* and a button *"Отвори дневника"* linking to `/rhythm/journal`. `<TransitOverviewCard />` below. **Does NOT embed `<ManifestDiaryContent />` inline** — that was removed 2026-04-20 per the inline comment at `rhythm/page.tsx:59-62`. |
| `/you` | `apps/web/app/(protected)/you/page.tsx` + `YouHub.tsx` | Hub page with four rows. Row 2 labelled *"Дневник"* with hint *"лунен дневник — по три реда"* links to `/rhythm/journal` (`YouHub.tsx:8`). |

### 1.2 Navigation and deep-link inventory `[verified]`

| Surface | Link label | Target href | Lands on |
|---|---|---|---|
| Protected nav (ProtectedNav.tsx:17) | "Ритъм" | `/rhythm` | CTA page, not diary |
| Protected nav (ProtectedNav.tsx:18) | "Ти" | `/you` | Hub, not diary |
| Dashboard LunarTile (LunarTile.tsx:51) | Lunar tile | `/rhythm` | CTA page, not diary |
| Dashboard TransitTile | Transit tile | `/rhythm` | CTA page, not diary |
| /rhythm page (rhythm/page.tsx:72) | "Отвори дневника" | `/rhythm/journal` | **Diary** |
| /you YouHub (YouHub.tsx:8) | "Дневник" | `/rhythm/journal` | **Diary** |
| /rhythm/journal footer (ManifestDiaryContent.tsx:169) | "Ръководството" | `/astrology-guide` | Guide, not diary |

**Two distinct entry points land on the diary:** `/you → Дневник → /rhythm/journal` is a direct link; `/rhythm` (from the "Ритъм" nav tab or either dashboard tile) requires one extra click through the *"Отвори дневника"* CTA. This is the likely source of the user's "/you then diary shows different page" UAT finding — not a broken link, but different visual experiences at the first hop.

### 1.3 Historical route state `[verified]`

- `/manifest` and `/manifest/:path*` are registered as 307 temporary redirects to `/rhythm/journal` and `/rhythm/journal/:path*` in `apps/web/next.config.js:29-30`. The old URL still works and cleanly forwards. **No orphan `/manifest` page exists.**
- `/rhythm` previously embedded `<ManifestDiaryContent />` inline — removed 2026-04-20 per the comment at `rhythm/page.tsx:59-62` (the comment is the only authoritative trace; git archaeology confirms the inline mount was replaced with the CTA card in the same round).
- **Stale comment `[verified]`:** `apps/web/components/dashboard/DashboardContent.tsx:247` claims *"Lunar → /rhythm (full lunar card + meteor + transits + diary)"* — the *"+ diary"* tail is comment-rot from before the 2026-04-20 consolidation. `/rhythm` now has a CTA link, not the diary itself. Documentation, not behavior.

### 1.4 Route map

```
 /rhythm/journal   ──────────────────────────►  <ManifestDiaryContent />  (CANONICAL)
                                                      │
                                                      ├─ uses hook:   useManifestEntries
                                                      ├─ mounts:      <ManifestEntryForm />
                                                      ├─ mounts:      <ManifestHistory />
                                                      └─ prompt src:  lib/manifest/prompts.ts

 /rhythm           ──────►  <LunarPhaseCard />       + CTA: "Отвори дневника" → /rhythm/journal
 /you              ──────►  <YouHub />               + link: "Дневник"         → /rhythm/journal
 /dashboard        ──────►  <LunarTile /> + tiles    + link: Lunar tile        → /rhythm   (one hop short of diary)
 /manifest         ──────►  307 redirect             → /rhythm/journal
```

---

## 2. UI components

### 2.1 Component inventory `[verified]`

| File | Role | Reads from | Mounted by |
|---|---|---|---|
| `apps/web/components/manifest/ManifestDiaryContent.tsx` | Top-level diary surface | `useManifestEntries`, `getLunarPhase`, header copy hardcoded in-component | `/rhythm/journal/page.tsx` |
| `apps/web/components/manifest/ManifestEntryForm.tsx` | 3-field textarea form + submit | `getManifestPrompt(phase.id)` from `lib/manifest/prompts.ts` | `ManifestDiaryContent` |
| `apps/web/components/manifest/ManifestHistory.tsx` | Expandable list of past entries with delete-with-confirm | Entries passed as prop (no direct data access) | `ManifestDiaryContent` |
| `apps/web/hooks/useManifestEntries.ts` | localStorage CRUD — read, upsert-by-date, delete | `window.localStorage` key `celestia.manifest.entries.v1` | `ManifestDiaryContent` |
| `apps/web/lib/manifest/prompts.ts` | Prompt library (8 phases × `{ heading, lead, fieldLabels[3], placeholders[3] }`) | Hardcoded Bulgarian copy | `ManifestEntryForm` |
| `apps/web/lib/manifest/types.ts` | `ManifestEntry`, `ManifestDraft` types | — | Hook + components |

### 2.2 Dashboard / adjacent components that touch diary-adjacent content `[verified]`

| File | What it renders | Diary connection |
|---|---|---|
| `apps/web/components/dashboard/LunarPhaseCard.tsx` | Full lunar phase card on `/rhythm` — moon disc, phase name, illumination, manifesting guidance, ritual, affirmation, crystal. Has a field labelled *"Въпрос за дневника"* showing `phase.journalPrompt` (line 164-167). | **Indirect** — shows a single-line journal question sourced from `lib/moon-phase`, NOT from `lib/manifest/prompts`. Two parallel prompt systems (see §4.3). |
| `apps/web/components/dashboard/tiles/LunarTile.tsx` | Compact dashboard bento tile (phase + countdown + meteor). | Links to `/rhythm`, not diary. |
| `apps/web/components/you/YouHub.tsx` | Hub page with 4 section rows | Row 2 links to `/rhythm/journal`. |

### 2.3 Prompt copy locality `[verified]`

- Structured 3-field prompts (one per phase): **single source** in `apps/web/lib/manifest/prompts.ts`. Consumed only by `ManifestEntryForm`. No duplication, no hardcoding in components.
- Heading copy on the diary page (*"Три реда, един цикъл"*, the *"Стара практика, пренаписана..."* lead, the *"Предишни страници"* section label): **hardcoded inline** in `ManifestDiaryContent.tsx:92-101, 142` — not in a content file. That's fine for a single-consumer page but flagged for i18n awareness.

---

## 3. Data model

### 3.1 localStorage persistence `[verified]`

- **Key:** `celestia.manifest.entries.v1` (the `.v1` suffix is versioning — future breaking schema changes can bump to `.v2` without colliding; current code does not read any prior-version key).
- **Value shape:** JSON-encoded `ManifestEntry[]` array.
- **Entry schema** (`lib/manifest/types.ts:10-18`):

```ts
interface ManifestEntry {
  id: string               // "mf_${ISO_timestamp}_${6-char-random}"
  date: string             // "YYYY-MM-DD" local-formatted in Europe/Sofia via isoDate()
  phaseId: LunarPhaseId    // snapshot of phase at time of save
  phaseName: string        // snapshot of Bulgarian phase name at time of save
  intentions: [string, string, string]   // three slots, tuple-typed
  createdAt: string        // ISO timestamp
  updatedAt: string        // ISO timestamp
}
```

- **Identity / upsert key:** the `date` field (`useManifestEntries.ts:51` — `entries.find(e => e.date === input.date)`). One entry per calendar date; same-date save updates existing. The `id` field is not the lookup key — it exists for DOM `key` stability in the history list.
- **Moon phase snapshot `[verified]`:** **YES, preserved at write time.** Entry stores `phaseId` + `phaseName` as the phase was at the moment of save (ManifestDiaryContent.tsx:58-64 → hook saveEntry). If moon-phase calculation ever changes, historical entries keep their original phase labels. Reads do **not** re-compute phase from the entry date.
- **Autosave / drafts:** `[missing]` — explicit submit only; form state lives in component `useState` and is lost on navigation before save (ManifestEntryForm.tsx:23-25).
- **Server-side persistence:** `[missing]` — no Supabase table, no API route. The hook's docstring (line 9-15) explicitly frames itself as *"Backend-swap boundary. Today: localStorage. Tomorrow: Supabase."* — the hook's return shape is designed to swap underlying storage without changing consumer code.
- **Export / backup capability:** `[missing]` — no export UI, no JSON-download, no print view. Clearing browser data → full entry loss. `[runtime-check-needed]` whether browser-level incognito mode also loses entries on session end (expected yes, not verified).

### 3.2 localStorage hygiene observations `[inferred]`

- Quota exceeded → silent catch at `useManifestEntries.ts:38-40` — UI state still updates, disk state diverges from memory. User can write entries that disappear on reload without error feedback.
- Corrupted storage (invalid JSON) → silent catch at line 28-30, resets to empty array. Same silent-failure category.
- No cross-tab sync — writing in one tab doesn't update another tab's state until reload. `[runtime-check-needed]` whether this surfaces as confusion.

---

## 4. Prompt library

### 4.1 Coverage `[verified]`

**All 8 moon phases have complete prompts** in `apps/web/lib/manifest/prompts.ts`. The user's framing-note guess that only one example might exist (Waxing Crescent "Three First Steps") was wrong — the full library is present.

| Phase ID | Heading | Tradition |
|---|---|---|
| `new` | Три намерения | Waxing: sow intentions |
| `waxing_crescent` | Три първи стъпки | Waxing: first steps |
| `first_quarter` | Три решения | Waxing: decisions |
| `waxing_gibbous` | Три настройки | Waxing: adjustments before fullness |
| `full` | Три благодарности | Full: gratitude for the cycle |
| `waning_gibbous` | Три урока | Waning: lessons learned |
| `last_quarter` | Три освобождавания | Waning: release |
| `waning_crescent` | Три акта на грижа | Waning: restoration before new |

Each phase has: a heading (2-3 words), a lead paragraph (1-2 sentences explaining the phase framing), three `fieldLabels` (short action-verb slots), and three `placeholders` (sentence-starters to prime the writer).

### 4.2 Structure / variability `[verified]`

- **Exactly one prompt per phase.** No rotation, no variants, no A/B branches.
- **No cycle-day variability.** Waxing Crescent on day 1 gets the same prompt as Waxing Crescent on day 3.
- **No illumination-%-based variability.** The prompt is keyed purely on `phaseId` (the discrete 8-phase bucket).
- **No calendar-date variability.** Same phase on January 1 and December 31 shows identical copy.
- **Bulgarian copy completeness `[verified]`:** all 8 phases have full copy — no placeholders, no `TODO` strings, no English bleed-through. Register reads consistent with the app's traditional-voice aesthetic (commit `7c7ffa5`).

### 4.3 Adjacent finding: dual prompt systems `[verified]`

Two parallel journaling-prompt surfaces exist and they are **not** linked:

1. **`lib/manifest/prompts.ts`** — structured 3-field diary prompts per phase. Consumed by `ManifestEntryForm` at `/rhythm/journal`. What the user writes against.
2. **`lib/moon-phase` → `phase.journalPrompt`** `[inferred, not directly read]` — a single-line journal question exposed per-phase, rendered at `LunarPhaseCard.tsx:164-167` under the header *"Въпрос за дневника"*. Shown on `/rhythm` inside the expandable lunar-phase card.

Both surface "a thing to write about given the current moon." They are separate systems with separate content. No cross-linking. A future consolidation pass might either merge them or explicitly frame them as different kinds of prompt (the manifest one is a structured exercise, the `journalPrompt` is a reflection cue). Flagged, not fixed.

### 4.4 Minor Bulgarian-copy issue (flagged, not changing per deferral pattern)

- `apps/web/lib/manifest/prompts.ts:8` — doc comment contains the fragment *"pълнолуние"* with a Latin lowercase `p` prefixing Cyrillic *"ълнолуние"*. Internal doc comment, not user-facing, likely encoding/paste drift. Noted for a future Bulgarian-register cleanup pass per the deferral pattern; not in-scope for this audit round.

---

## 5. Premium-gate timing

### 5.1 Code reality `[verified]`

- **Middleware** (`apps/web/middleware.ts:15-25`) lists `/rhythm`, `/rhythm/journal`, `/you` as auth-protected — signed-in users only, but no tier distinction.
- **No `subscription_tier` / `isPremium` / Clerk-role checks** in any of the diary code paths: `ManifestDiaryContent.tsx`, `ManifestEntryForm.tsx`, `ManifestHistory.tsx`, `useManifestEntries.ts`, `app/(protected)/rhythm/journal/page.tsx`, `app/(protected)/rhythm/page.tsx` — all clean. Grep confirmed zero matches.
- **No feature-flag guards** around diary UI.
- **No `<PremiumGate />` wrapper** on the diary surface. (Compare: `/you/crystals` wraps `<CrystalCollectionContent />` in `<PremiumGate />` — that's the expected shape if a gate were present. Diary has none.)

### 5.2 Product intent vs. code `[verified]`

`PREMIUM_MATRIX.md` row 13 audits diary as:

- **Current gate:** "none / any authed user"
- **Correct gate:** "premium — but only after server-side persistence ships (M4/M5 predecessor)"
- **Fix needed:** "deferred" — product decision 3 on that doc (line 70-74) resolved 2026-04-20: *"no UI-only gate now. Cosmetic gates train power users to bypass and are worse than no gate."*

**Code matches intent.** No accidental premium enforcement; no cosmetic premium UI that misleads free users. This line up with round 109's decision.

### 5.3 `[runtime-check-needed]`

One thing I cannot verify from code alone: whether any out-of-band element (dashboard banner, upsell modal, "Premium" badge on a nav item) incidentally implies diary is premium. Grep for `premium` near diary-related files turned up clean, but an upstream-mounted upsell component could still render text that talks about diary as premium. Worth a human eyecheck on `/rhythm/journal` + `/you` + `/pricing` for stray copy that contradicts 3b.

---

## Summary & Open Questions

### Is the feature functionally complete for all 8 phases?

**Yes `[verified]`.** All 8 lunar phases have complete structured prompts in Bulgarian. The form writes, upserts, and deletes entries. Phase is snapshotted per entry. History renders with expand + delete-with-confirm. The `useManifestEntries` hook is explicitly architected as a backend-swap boundary so server-side persistence can slot in without changing the consumer surface.

**The feature is not a skeleton.** It is a complete localStorage-backed implementation with intentional forward architecture for server migration.

### Product decisions now unblocked

1. **Server-side persistence timing.** Architecture is ready (hook docstring lines 9-15, PREMIUM_MATRIX row 13, DATA_FETCHING_INVENTORY §3.3 + §7.2). Decisions needed:
   - When to ship the endpoint (blocks the premium-gate activation per 3b resolution).
   - Schema: Supabase table mirror of `ManifestEntry` interface? Or normalized (entry header + intentions-per-row)?
   - Migration strategy: on first sign-in post-endpoint, sync localStorage → server? Or drop localStorage entries silently?

2. **Prompt variability.** Currently one prompt per phase. Decisions unblocked:
   - Keep one-prompt-per-phase (consistent framing, users know what to expect) — **recommended unless variety is an explicit product goal**.
   - Add variants rotating by cycle day, illumination %, or random selection (more variety but risks feeling random; also fragments the mental model).
   - Neither decision blocks anything — defer until user signal appears.

3. **Historical-phase-snapshot semantics.** Already implemented — entry captures `phaseId`/`phaseName` at save time, read-back uses the snapshot. No decision required unless you want to change the semantic (e.g., show a "recalculated phase" for historical entries if the calculation ever improves). Recommend leaving as-is — snapshot matches how users remember what they wrote under.

4. **"Clicking 'Дневник' from /you vs. navigating via Ритъм tab."** Explained above in §1.2 — not a broken link, but different visual experiences at the first hop. Decisions unblocked:
   - Accept the two-step via Ритъм as intentional (the Ритъм tab is the *"small's-world overview"* surface — phase, transits, diary *entry*); users wanting the diary click once more.
   - OR: add a direct diary tab / shortcut from the dashboard that bypasses `/rhythm`.
   - OR: surface the diary form inline on `/rhythm` itself (reverts the 2026-04-20 consolidation).

5. **Export / backup.** No export exists. Pre-server-migration, a simple "download entries as JSON" button would let a power user preserve data across devices or browsers. Decision: ship before server migration (user-facing backup feature), after server migration (data portability), or skip (trust server sync).

6. **localStorage quota & corruption silent-failure.** Both are caught silently today. Decision: surface a toast/banner on quota-exceeded so users don't think entries are saving when they aren't — or leave silent and trust the quota limit (~5MB = thousands of diary entries).

### Adjacent findings surfaced during audit

1. **Dual prompt systems `[verified]`** (§4.3) — `lib/manifest/prompts.ts` (3-field structured) and `phase.journalPrompt` from `lib/moon-phase` (single-line question shown on LunarPhaseCard). Both thematically overlap. Not a bug; worth confirming they're intentionally separate, or marking them for a future consolidation.

2. **Stale comment** (§1.3) — `DashboardContent.tsx:247` claims *"Lunar → /rhythm (full lunar card + meteor + transits + diary)"*. The *"+ diary"* tail is comment-rot from before the 2026-04-20 consolidation. One-line cleanup, non-blocking.

3. **Silent localStorage failures `[inferred]`** (§3.2) — quota exceeded and corrupted JSON both caught silently. Not diary-specific; also present in `useDailyHoroscope.ts` and `useStoryList.ts` per the grep. Product-level decision on whether client-side storage failures deserve any UI feedback.

4. **No cross-tab sync `[runtime-check-needed]`** (§3.2) — two tabs writing to `celestia.manifest.entries.v1` will overwrite each other on save. Not blocking but worth noting if mobile-web + desktop-web simultaneous use is a scenario.

5. **Bulgarian-register typo in doc comment** (§4.4) — `lib/manifest/prompts.ts:8` — *"pълнолуние"* mixed-alphabet artefact. Internal, not user-facing. Defer per the existing pattern.

6. **localStorage keys inventory `[inferred]`**: the app uses at least three localStorage keys (`celestia.manifest.entries.v1`, the horoscope cache in `useDailyHoroscope.ts`, the story list in `useStoryList.ts`). No centralized inventory of keys or size-budget tracking. Flag for a future localStorage-hygiene pass; not diary-specific.

---

## What's NOT in this audit

Per §8 scope bounds:
- Moon-phase calculation correctness — astrology-engine concern, out of scope.
- Rhythm-feature audit beyond diary — `/rhythm` itself is settled per 2026-04-20 consolidation; not re-litigated.
- Mobile parity — M5 workstream, separate.

These exclusions are intentional; if future findings suggest diary is entangled with one of them, the audit can be extended then.
