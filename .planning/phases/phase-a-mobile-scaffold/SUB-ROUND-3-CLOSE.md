# Phase A Sub-Round 3 — Stellaeum Rename Close Summary

**Opened:** 2026-05-03 (after sub-round 2 close `7537e19`).
**Closed:** 2026-05-03 (Layer 4 docs commit `8214e90` after Layer 1, 3a, 3b shipped sequentially).
**Outcome:** Brand-wide rename from Celestia to Stellaeum complete across workspace npm scope, app identity, web/mobile user-facing copy, Tailwind tokens, forward-looking documentation, and external service dashboards. Historical records preserved intact. Sub-round 3 closes the §11 privacy counsel review block per RENAME.md gating logic — counsel can resume review with Stellaeum as the canonical name.

---

## Commit trail — 5 total commits

### Implementation commits (4)

| Layer | Commit | Files | Lines | What |
|---|---|---|---|---|
| Layer 1 | `3c60b56` | 74 | 161/162 | `chore(rename): @celestia → @stellaeum monorepo-wide (packages, workspace deps, config cascades, mobile auth scheme)` |
| Layer 3a | `d05f718` | 37 | 67/67 | `chore(rename): Celestia → Stellaeum web user-facing copy + diary export prefix + UAT harness regex` |
| Layer 3b | `58c8377` | 7 | 8/8 | `chore(rename): Celestia → Stellaeum mobile user-facing copy + Tailwind brand-color tokens` |
| Layer 4 | `8214e90` | 38 | 796/282 | `docs(rename): Celestia → Stellaeum forward-looking docs + REVISIT-TRIGGERS additions + RENAME.md close-out` |

### Layer 2 — dashboard work (no commits)

External service renames executed by founder in service dashboards:
- **Clerk**: project renamed, email templates updated, redirect URL audit clean (no hardcoded `celestia://` callbacks found)
- **Supabase**: project renamed (cosmetic; URL/anon key stay)
- **Stripe**: products renamed ("Celestia Premium" → "Stellaeum Premium"), customer portal branding updated (logo deferred to Layer 5)
- **OpenRouter**: project label renamed
- **Sentry**: project name renamed; **org slug stuck on plan tier** — logged as REVISIT-TRIGGERS item 9

### Documentation commit (1)

This summary lands as `docs(mobile): phase-a sub-round 3 close — SUB-ROUND-3-CLOSE summary` — bundles this doc and closes sub-round 3 formally.

---

## What shipped — feature surface

### Layer 1 — Code package rename + config cascades

- All 6 workspace packages renamed: `@celestia/web`, `@celestia/mobile`, `@celestia/core`, `@celestia/astrology`, `@celestia/ui`, `@celestia/config` → `@stellaeum/*`
- Root project name `celestia-ai` → `stellaeum`
- Cross-package workspace dependencies updated in 9 entries across 3 package.json files
- 60 TypeScript/JSX import statements updated (`from '@celestia/...'` → `from '@stellaeum/...'`)
- Config cascades: `apps/web/next.config.js` `transpilePackages`, `apps/mobile/eslint.config.js` `no-restricted-imports` rule + message, `.github/workflows/astrology.yml` `pnpm --filter` args (× 2 invocations)
- Mobile app identity: `apps/mobile/app.json` `name`/`slug`/`scheme`/`bundleIdentifier`/`android.package` — bundle ID change `com.celestia.app` → `com.stellaeum.app` is App Store/Play Store new-app signal at enrollment time (no concern pre-launch)
- Mobile auth scheme: `celestia://` → `stellaeum://` (deep-link change; Clerk dashboard redirect URL audit clean)
- `supabase/config.toml` `project_id` (cosmetic CLI identifier)
- `pnpm-lock.yaml` regenerated cleanly — zero third-party version drift, only workspace symlink relocations

### Layer 3a — Web user-facing brand copy

- 37 web files renamed via word-boundary sed `\bCelestia\b` → `Stellaeum`
- High-impact surfaces: `app/layout.tsx` meta tags (title, applicationName, openGraph, twitter), landing components, auth/protected pages, lib/horoscope, lib/oracle, lib/stripe
- **Diary export filename prefix**: `celestia-дневник-YYYY-MM-DD.md` → `stellaeum-дневник-YYYY-MM-DD.md` (`apps/web/lib/diary/export.ts`)
- **UAT harness regex**: filename pattern updated in lockstep at `apps/web/scripts/m3-uat-harness.mjs:1332-1333`; test email domains `@celestia-ai.dev` (lines 37, 1405) preserved per ratification 10
- **Stripe product name comments**: `apps/web/.env.example` updated to match Stripe dashboard product names from Layer 2
- **Theme components NOT renamed**: `CelestialBackground`, `CelestialBackgroundLazy`, `CelestialCanvas`, `CelestialCanvasLazy`, `CelestialIcons`, `CelestialIcon` — celestial as astronomy/sky theme adjective, not brand. Word-boundary regex correctly preserved these (`\b` doesn't match inside `Celestial*` because the next character is a word char)

### Layer 3b — Mobile user-facing brand copy + Tailwind cascade

- 7 mobile files in atomic single commit (lockstep prevents transient broken-render state)
- Brand text rename: `apps/mobile/app/(public)/sign-in.tsx:114` «Влез в Celestia» → «Влез в Stellaeum» (Cyrillic-Latin boundary sed verified)
- Tailwind config: `amber-celestia` → `amber-stellaeum`, `violet-celestia` → `violet-stellaeum`
- 5 consumer files updated in lockstep: `(tabs)/index.tsx`, `chart.tsx`, `circle.tsx`, `OracleEntry.tsx`, `CrystalCard.tsx` — all `border-violet-celestia/25` → `border-violet-stellaeum/25`
- **Founder visual eye-check passed**: bento tiles render with violet borders post-Tailwind rename, sign-in H1 reads correctly, Oracle FAB clean

### Layer 4 — Forward-looking documentation

- ~36 markdown files renamed via word-boundary sed
- Forward-looking scope: `CLAUDE.md`, `MIGRATION_TOOLING.md`, `FIGMA.md`, `.planning/{PROJECT,STATE,ROADMAP,REQUIREMENTS,PRE_LAUNCH_PREREQS,POST_LAUNCH_UPGRADES}.md`, all `.planning/research/*` (architecture/decision/feature/competitor/UX research), `.planning/legal/*` (privacy + DPA drafts), `docs/*` (implementation plan, v1 features, licensing, PRD)
- File rename: `.planning/research/Celestia_AI_Reference.md` → `.planning/research/Stellaeum_AI_Reference.md` (git mv at 93% similarity)
- 4 forward-looking cross-references updated to new filename; 1 historical cross-reference in `.planning/phases/09-ephemeris-validation/CONTEXT_HANDOFF.md` preserved as-is (broken link accepted; historical preservation discipline)
- **Pre-execution check on `docs/licensing.md` per ratification 4**: confirmed all 5 brand references are product-brand (no legal-entity patterns like "Celestia AI Ltd" / "OOD/EOOD/ЕООД/ООД" found anywhere in `.planning/legal/` or `docs/`). Safe bulk rename applied
- REVISIT-TRIGGERS items 9, 10, 11 added (Sentry org slug, test email domain, GitHub repo rename — all deferred to Phase D or beyond)
- RENAME.md rewritten from "Pending" planning skeleton to "Closed (2026-05-03)" close-out documenting all 4 commits + Layer 2 dashboard work + Layer 5 deferral + verification gates

---

## Disambiguation discipline applied throughout

**Brand vs theme**: `\bCelestia\b` word-boundary regex correctly distinguishes brand from theme. `Celestia` (capital C, standalone word) renamed; `Celestial` / `celestial` (adjective for sky/astronomy theme; component name prefix like `CelestialBackground`) preserved. No theme components touched.

**Forward-looking vs historical**: phase summaries in `.planning/phases/`, drift entries (`09-01-PRECISION-FLOOR.md`), close summaries (`SUB-ROUND-1-CLOSE.md`, `SUB-ROUND-2-CLOSE.md`), all commit messages — preserved as historical record. Forward-looking active docs (PROJECT.md, CLAUDE.md, research/, legal/, docs/) renamed.

**Cyrillic boundary**: pre-execution sed test verified that `«Влез в Celestia»` → `«Влез в Stellaeum»` works correctly. Sed treats Cyrillic chars as non-word chars at Bulgarian-Latin brand boundaries. No per-file Edit fallback needed for Bulgarian copy.

**Pre-launch advantage**: founder hasn't enrolled in Apple Developer / Google Play. Bundle identifier change (`com.celestia.app` → `com.stellaeum.app`) is App Store/Play Store new-app signal at enrollment time only — no migration concern. DNS/Vercel custom domain switching deferred to Phase D.

---

## Verification gates passed (all layers)

| Gate | Result |
|---|---|
| Zero `\bCelestia\b` / `\bcelestia\b` in code (Layer 1 scope) | ✓ confirmed |
| Zero brand mentions in apps/web (excl. UAT email preserves) post-Layer-3a | ✓ confirmed |
| Zero brand mentions in apps/mobile post-Layer-3b | ✓ confirmed |
| Zero brand mentions in forward-looking docs post-Layer-4 | ✓ confirmed |
| `pnpm install` lockfile drift check | ✓ zero third-party version bumps; only workspace symlink relocations (5 pairs) |
| `pnpm typecheck` root via turbo | ✓ 5/5 packages green at every Layer 1/3 commit |
| `pnpm --filter @stellaeum/astrology test` (39 tests / 12 cases) | ✓ green throughout — confirms theme integrity (test fixtures use "celestial sphere/poles/mechanics" theme adjective; word-boundary regex preserved correctly) |
| Mobile lint with renamed `no-restricted-imports` rule | ✓ green; smoke-test confirmed barrel `@stellaeum/core` import correctly blocked with renamed message |
| **Pattern A vs B JWT verification (deferred from sub-rounds 1.7 + 2.5)** | **✓ RESOLVED** — Pattern A confirmed via founder's Clerk dashboard verification of "supabase" JWT template existence (created 2026-01-31) |
| Founder visual eye-check on Layer 3b mobile | ✓ bento tiles render with violet borders; sign-in H1 «Влез в Stellaeum»; Oracle FAB clean |
| Cyrillic-boundary sed pre-execution test | ✓ Bulgarian-Latin context renamed correctly |
| Cross-reference updates after file rename | ✓ 4 forward-looking docs updated; 1 historical preserved |
| Pre-execution legal-entity check on `docs/licensing.md` | ✓ no legal-entity patterns; product-brand only |

---

## Workflow disciplines applied this sub-round

- **Layered execution plan** — Layer 1 (code packages) → Layer 2 (dashboards) → Layer 3a (web copy) → Layer 3b (mobile copy + Tailwind) → Layer 4 (docs). Atomic commits per layer; verification gates between. Layer 2 interleaved between Layer 1 and Layer 3 so dashboard names matched code copy.
- **Investigation before code** — pre-execution surface mapping documented in conversation: 70+ files identified for Layer 1, 64+ for Layer 3a, 7 for Layer 3b, ~38 for Layer 4. Each layer ratified with founder before sed ran.
- **Word-boundary regex discipline** — `\bCelestia\b` chosen specifically to handle the brand-vs-theme disambiguation mechanically. Pre-execution Cyrillic test verified Bulgarian-Latin boundaries work correctly. Spot-check on 3 representative theme files (CelestialBackground, AstrologyReference, NatalWheel) confirmed mixed theme+brand files surgically handled.
- **Founder-provided ground truth for shared surfaces** — sub-round 2 discipline carried forward: web's actual rendered Bulgarian content was the source of truth (already canonical). Layer 3 mirrored web copy without invoking bulgarian-skill (mobile-only surfaces still got skill calibration in earlier sub-rounds; rename touched no mobile-only copy).
- **Historical preservation** — phase summaries and drift entries left intact. Cross-references in historical docs to renamed files (e.g. `Celestia_AI_Reference.md`) accepted as broken-but-accurate-to-history.
- **Pre-execution gate verification before bulk operations** — Cyrillic test, lockfile drift check, legal-entity check on licensing.md. Each gate caught a class of failure before mass operation.

---

## Deferred items (logged in REVISIT-TRIGGERS or carry-forward)

| Item | Status | Tracker |
|---|---|---|
| Layer 5 branding artifacts (logo, icon, splash, favicon) | Deferred to dedicated sub-round; pre-launch placeholder Latin wordmark accepted | RENAME.md close-out |
| Sentry org slug rename | Plan tier blocks; cosmetic stuck-name accepted pre-Phase-D | REVISIT-TRIGGERS item 9 |
| UAT test email domain `@celestia-ai.dev` | Kept as-is; arbitrary identifier in test infra; renaming requires domain registration | REVISIT-TRIGGERS item 10 |
| GitHub repo rename `Project379/celestiai` | When public visibility matters or consistency outweighs URL-stability | REVISIT-TRIGGERS item 11 |
| Mobile bundle ID at App Store enrollment | New-app signal at enrollment time only; no pre-launch concern | RENAME.md deferred section |
| DNS/Vercel custom domain switching | Phase D concern; no Vercel custom domain currently configured | Sub-round 1 close existing entry |
| Router AP isolation fix for home WiFi | Phase D concern; hotspot is current working path | Sub-round 1 close existing entry |
| `.env.local` Supabase prefix bug (`NEXT_PUBLIC_*` → `EXPO_PUBLIC_*`) | Carried forward from sub-round 1.5 | Sub-round 2 close existing entry |
| Open M5 predecessors (Bulgarian error-msg placement, per-field error detail rendering) | Carried forward; relevant when first mobile write/submit endpoint lands | DATA_FETCHING_INVENTORY §7.2 |

---

## Sub-round 3 → next handoff

**Foundation paid down**:
- Brand identity coherent across code, docs, dashboards (excluding deferred items above)
- Workspace npm scope on `@stellaeum/*` — future packages follow this scope
- Mobile auth scheme `stellaeum://` registered; Clerk dashboard aligned
- Tailwind brand-color tokens normalized to `*-stellaeum` across web (web uses different token set, no rename impact) + mobile

**Sub-round 4 entry conditions met**:
- All sub-round 3 ratifications closed
- All verification gates passed including the previously-deferred Pattern A/B JWT verification
- 4 implementation + 1 docs commit form clean atomic per-layer history
- Branch held local pending founder push command (matching sub-round 1+2 pattern)

**Expected sub-round 4 scope** (per founder direction):
- Sub-round 4 returns to product feature work — likely 2nd coordinated mobile fetch (TanStack Query install becomes worthwhile here per sub-round 2 deferral) and continued mobile data wiring
- Layer 5 branding artifacts may slot in as a parallel design-work sub-round depending on priority

---

## Branch state at close

`mobile-parallel-test` at `8214e90` (Layer 4 commit) — **5 unpushed commits** ahead of last push (sub-round 2 close `7537e19`):
- `3c60b56` Layer 1 (74 files)
- `d05f718` Layer 3a (37 files)
- `58c8377` Layer 3b (7 files)
- `8214e90` Layer 4 (38 files)
- (this docs commit, when ratified)

Push held for explicit founder command per sub-round 1+2 pattern.
