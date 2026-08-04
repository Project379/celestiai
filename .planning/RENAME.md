# Stellaeum Rename — Closed (2026-05-03)

Originally pending: Celestia → Stellaeum rename.

**Triggered:** Celestia trademark conflict + stellaeum.com domain purchased.
**Decision:** Latin "Stellaeum" everywhere (no Cyrillic transliteration).
**Block resolved:** §11 privacy counsel review can resume — Stellaeum is the canonical name in all forward-looking docs and product copy.

## What shipped (Layer 1–4)

| Layer | Commit | Scope |
|---|---|---|
| Layer 1 | `3c60b56` | Workspace npm scope (`@celestia/*` → `@stellaeum/*`), workspace deps, config cascades (next.config.js transpilePackages, eslint.config.js no-restricted-imports rule, GitHub Actions astrology workflow filter), mobile auth scheme/bundleId/android.package, root project name, supabase config_id |
| Layer 2 | (no code commits) | External service dashboards: Clerk project + email templates + redirect URL audit, Supabase project, Stripe products + customer portal, OpenRouter project label, Sentry project name |
| Layer 3a | `d05f718` | Web user-facing brand copy (37 files) — meta tags, landing pages, auth pages, protected pages, lib brand mentions, diary export filename prefix (`celestia-дневник` → `stellaeum-дневник`), UAT harness regex (lockstep with diary export), Stripe product comments |
| Layer 3b | `58c8377` | Mobile user-facing copy + Tailwind brand-color tokens (`amber-celestia` → `amber-stellaeum`, `violet-celestia` → `violet-stellaeum`) + 5 consumer files in lockstep — single atomic commit prevents transient broken-render state |
| Layer 4 | (this commit) | Forward-looking docs (CLAUDE.md, MIGRATION_TOOLING.md, FIGMA.md, .planning/{PROJECT,STATE,ROADMAP,REQUIREMENTS,PRE_LAUNCH_PREREQS,POST_LAUNCH_UPGRADES}.md, .planning/research/*, .planning/legal/*, docs/*) + REVISIT-TRIGGERS additions (items 9–11) + this close-out + `Celestia_AI_Reference.md` → `Stellaeum_AI_Reference.md` file rename + cross-reference updates in 4 forward-looking docs |

## Disambiguation discipline applied throughout

**Brand vs theme** — `Celestia` (capital C, standalone word) is the brand and was renamed via word-boundary sed `\bCelestia\b` → `Stellaeum`. `Celestial`/`celestial` (lowercase or as prefix to component names like `CelestialBackground`, `CelestialIcon`) is the astronomical/sky theme adjective and was correctly preserved by the word-boundary regex. No theme components renamed.

**Forward-looking vs historical** — phase summaries (`phases/*/SUMMARY.md`), drift entries (`09-01-PRECISION-FLOOR.md`), close summaries (`SUB-ROUND-1-CLOSE.md`, `SUB-ROUND-2-CLOSE.md`), commit messages — all preserved as historical record. Only forward-looking docs (PROJECT.md, ROADMAP.md, CLAUDE.md, research/, legal/, docs/) renamed.

**Cyrillic boundary** — verified word-boundary sed correctly fires at Cyrillic-Latin boundaries: `«Влез в Celestia»` → `«Влез в Stellaeum»`. Bulgarian copy renamed cleanly without per-file Edit fallback.

## Deferred items (logged in REVISIT-TRIGGERS)

- **Item 9** — Sentry org slug rename — plan tier blocks org slug rename; current slug stuck on celestia-prefixed identifier. Phase D pre-launch decision: accept-and-document OR migrate to new Sentry org.
- **Item 10** — Test email domain `@celestia-ai.dev` — kept as-is per sub-round 3 ratification 10. Arbitrary identifier in UAT infra; renaming requires registering `@stellaeum.dev` (~$10–15 + setup). Sub-round when ready: dedicated test infra cleanup task.
- **Item 11** — GitHub repo rename `Project379/celestiai` → TBD. Touches all remote URLs, GitHub Actions secrets, badges, README links, plus the `packages/core/tsconfig.json:7` GitHub URL preserved as-is. Trigger: when public visibility matters (Phase D approach) OR when consistency outweighs URL-stability concern.
- **Layer 5 branding artifacts** (logo, icon, splash, favicon) — deferred to a separate sub-round per ratification 4. Design work, not technical execution. Placeholder Latin wordmark for pre-launch.
- **Mobile bundle identifier change** `com.celestia.app` → `com.stellaeum.app` — Apple/Google treat as new app at App Store / Play Store enrollment time. Pre-launch with no enrolled developer account, no concern.
- **Mobile auth scheme** `celestia://` → `stellaeum://` — bundled with Layer 1; Clerk dashboard redirect URLs audited clean (no hardcoded `celestia://` callback URLs found per Layer 2 verification).

## Verification gates passed (all layers)

- **Pattern A vs B JWT verification — SUPERSEDED 2026-05-09 by B.0e:** the Clerk "supabase" JWT template was deprecated when Supabase rotated to ECC P-256 keys + third-party auth model. Mobile + web now use the third-party auth pattern via Clerk's standard session JWT, but server-side data access uses service role + manual `user_id` filter (see `.planning/SECURITY-MODEL.md`). Pattern A historical reference only — `apps/web/lib/supabase/server.ts` was deleted in B.0e (zero callers, legacy Bearer-header path). The 2026-01-31 dashboard verification is no longer load-bearing.
- **Mobile sub-round 2 verification**: pass with documented deferrals (Pattern A/B + loading/error visibility now closed).
- **`pnpm typecheck`** across 5 workspaces: green at every Layer 1/3 commit.
- **`pnpm --filter @stellaeum/astrology test`** (39 tests / 12 cases): green throughout — confirms theme integrity (test fixtures use "celestial sphere/poles/mechanics" as astronomy theme; word-boundary regex correctly preserved).
- **Mobile lint with renamed `no-restricted-imports` rule**: green; smoke-test confirmed barrel `@stellaeum/core` import correctly blocked with renamed message.
- **Founder visual eye-check on Layer 3b**: bento tiles render with violet borders post-Tailwind rename, sign-in H1 reads «Влез в Stellaeum», Oracle FAB clean.
- **Lockfile drift check (Layer 1)**: zero third-party version bumps; only workspace symlink relocations.

## Sub-round 3 close

This rename sub-round opened 2026-05-03 after sub-round 2 close (`7537e19`). Layers 1, 3a, 3b, 4 shipped as 4 commits. Layer 2 shipped as dashboard work. Layer 5 deferred. Branch held local pending founder push command. Next signal: sub-round 4 opens with the next product feature work.
