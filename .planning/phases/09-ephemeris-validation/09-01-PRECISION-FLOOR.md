# §9.1 — Precision-floor investigation and locked thresholds

**Opened:** 2026-04-20
**Status:** user-approved 2026-04-20. Thresholds locked. Unblocks §9.1 harness scaffold + test-case list + sample comparison.
**Scope:** the "first action in §9.1" from the opening planning message — verify the ephemeris backend actually in use, report the library's precision floor, lock §9.2 thresholds that are defensible given that floor.

**Epistemic tags used:** `[verified]` (observed in code or quoted from primary doc), `[inferred]` (reasoning from observations), `[user-decision]` (authority is the user's direct call).

---

## Doc drift corrections (2026-04-20, same class as DRIZZLE_DECISION.md §9 reversal)

1. **Planning docs repo-wide reference "swisseph-wasm"** — shipped dep is `sweph` (native N-API).
2. **`COMPETITOR_ANALYSIS.md:501` claims topocentric Moon as a Celestia precision feature** — removed from code at `calculator.ts:42-45`, caused ~27′ parallax shift.
3. **`COMPETITOR_ANALYSIS.md:211, 501, 531` position True Node as a precision differentiator** — per §9.1 decision, Celestia switched to Mean Node because True Node under Moshier (~70″) is ~14× less precise than Mean Node at modern dates (<5″ empirical, 20″ worst-case ceiling per Swiss Ephemeris docs).
4. **`localTimeToUTC` handles pre-standardized-tz historical birth dates via modern civil-zone interpretation**, which produces incorrect UTC for any birth date predating the region's timezone standardization. Discovered 2026-04-20 during §9.1 test-case fixture commit (Einstein 1879 Ulm + Kahlo 1907 Coyoacán). **Scope of impact:** any user entering a birth date predating the local civil-timezone standardization (roughly pre-1880 in Western Europe, pre-1920 in the Americas, varies elsewhere — Bulgaria adopted Europe/Sofia in the 1879-1894 range). **Technical fix:** extend `localTimeToUTC` with an LMT branch for pre-standardized-tz dates, looked up by longitude rather than civil zone. **Product-scope question:** does Celestia intend to support historical/ancestor birth charts as a feature? Currently no product copy claims this capability (founder-verified 2026-04-20). If the answer is "no, historical charts are out of scope," the fix is to add an input-validation boundary rejecting pre-1920 birth dates with a clear Bulgarian-language error. If the answer is "yes eventually," the fix is the LMT branch. Decision deferred; flagged so it doesn't sleep. **If marketing adds copy about historical/ancestor charts, this deferral converts to a pre-launch blocker.**
5. **Threshold table mislabel — Mean Node reference source.** During §9.1 JPL adapter work, discovered that `09-01-PRECISION-FLOOR.md`'s threshold table mislabeled Mean Node's reference source as "JPL" — JPL doesn't produce Mean Node at all (only instantaneous osculating ascending node, which would be ~True Node). Corrected 2026-04-20 to "Meeus Ch. 47 polynomial" with explicit scope-honesty language (see `09-01-HARNESS.md § Node validation — explicit scope`). Threshold value (20″) unchanged; the source label was wrong, the number was right. **Inline-vs-per-case asymmetry:** Mean Node reference is ~5 lines of TypeScript code inline in the harness (landing with §9.2 code); per-case reference-data files omit the `northNode` entry in their `planets.jpl` arrays. Documented in `packages/astrology/test/validation/reference-data/README.md § Mean Node — inline-reference asymmetry` so a future reader doesn't try to find a `northNode` reference snapshot and think it's missing. Validation constant renamed from `JPL_THRESHOLDS_ARCSEC` to `PRIMARY_THRESHOLDS_ARCSEC` in `thresholds.ts` so the name doesn't bake in the incorrect JPL framing.
6. **§9.0 plan assumed astro.com is an independent reference source for houses and aspects.** Verified during §9.1 task 5c: astro.com uses Swiss Ephemeris internally, so house-cusp and aspect comparisons against astro.com are sweph-family comparisons, not independent-implementation comparisons. This invalidates the originally-planned §9.3 and §9.4 reference-data sourcing protocol. **Corrected during §9.1:** astro.com demoted from primary reference to optional spot-check tertiary; houses validated via an independent inline Placidus implementation (same pattern as Mean Node's Meeus polynomial); aspects validated arithmetically from §9.2-validated planetary longitudes plus synthetic unit-test inputs for orb/type/applying-separating classification logic. This restructures §9.3 / §9.4 around code-path-integrity checks where the input data (planets) is the physical-reality anchor; houses + aspects inherit correctness from correct inputs + correct code. See `09-01-HARNESS.md § §9.2/§9.3/§9.4 validation semantics — tiered by reference source` for the full tiered architecture.
7. **`localTimeToUTC` DST-transition-day ambiguity.** Discovered 2026-04-21 during §9.2 fixture generation (Leonor 2005-10-31 01:46 Madrid). The 01:00-03:00 local hour on a DST fall-back day is genuinely ambiguous — the same wall-clock local time refers to two distinct UTC instants (pre-transition at UTC+2 / CEST, post-transition at UTC+1 / CET). Celestia's `localTimeToUTC` via `geo-tz` + `Intl.DateTimeFormat` probe resolves the ambiguity to the **post-transition interpretation** (CET for Leonor, i.e., `00:46 UTC` on 2005-10-31) rather than the pre-transition interpretation (CEST, i.e., `23:46 UTC` on 2005-10-30) without user input or documentation of the choice. **Scope of impact:** any user born in the 01:00-03:00 local window on a DST fall-back day gets a chart based on one of two defensible UTC interpretations, silently. Sibling case to historical-tz (entry 4): both are `localTimeToUTC` semantic gaps where input disambiguation is absent. **Product-scope question:** should Celestia (a) gate this input window during onboarding with a Bulgarian-language "please specify pre- or post-transition" prompt, (b) document the deterministic choice so at least it's not silent, or (c) flag in chart metadata when the birth time is DST-ambiguous? Decision deferred; flagged so it doesn't sleep. **If product copy ever positions Celestia as handling edge-case birth times with care, this deferral converts to a pre-launch blocker.**
8. **DE441 upper-bound assumption in §9 planning docs.** Planning docs referenced DE441's theoretical upper bound (~17000 CE per SE docs, with the "13,200 BC to 17,191 AD" figure cited in Park 2021's DE440/DE441 AJ paper). Verified 2026-04-21 during §9.2 S7 coverage check: JPL Horizons' serving of DE441 returns `Jupiter` ephemeris ending `2200-01-08 23:58:50.8159 UT` and `Pluto` ending `2199-12-28 23:58:50.8163 UT`. Other bodies may also have caps below DE441's theoretical upper bound that have not been surveyed. Symmetric finding to the pre-1800 historical-body gap uncovered in S6 (Saturn pre-1749, Pluto pre-1800). Not a Celestia-user issue (Celestia supports modern-era birth dates only), but documented so future test-case selection for far-from-modern dates requires per-body coverage verification on both ends. **Test-case selection protocol extension:** any test case outside the ~1900-2100 window requires a pre-selection JPL Horizons per-body coverage check (both lower and upper bounds) before JPL is used as the Tier 1 reference. Captured in `09-01-TEST-CASES.md § Test-case selection protocol`.
9. **`packages/core` sweph dep drifted to AGPL-3.0 (`sweph@2.10.3-b-1`) despite `docs/licensing.md` claiming workspace-wide GPL-2.0 pin.** Discovered 2026-04-21 during §9.6 post-close sweph-pin verification. `packages/core` was created after `d5811fb` (packages/astrology's GPL pin) and picked up latest-matching-semver via `"sweph": "^2.10.3-4"` by default; `packages/core/src/horoscope/transit-analysis.ts` called `sweph.calc_ut` at runtime. Doc claimed the workspace was on the GPL-2.0 path; part of the codebase was on the AGPL-3.0 path. This is **the most severe instance of the doc-drift pattern tracked in this workstream** — `docs/licensing.md` ran for ~20+ conversational rounds claiming a license posture the codebase didn't honor, and only surfaced because the user asked "verify the sweph version pin is still at 2.10.0 on the current mobile-parallel-test" as a routine sanity check post-§9.6. Resolved in §9A (`.planning/phases/09A-licensing-compliance/`): `packages/core` pinned to `2.10.0-11`, `pnpm.overrides` added workspace-wide, `docs/licensing.md` and `PRE_LAUNCH_PREREQS.md` item 9 updated to reflect reality. **Lesson:** *"pin the dep in the package"* is not sufficient in a monorepo; *"pin the dep workspace-wide via overrides"* is needed to make the discipline durable against future package additions that default to latest-matching-semver. The pnpm override is the explicit guardrail; the drift was a foreseeable consequence of its absence.
10. **`.planning/phases/08-diary-persistence/00-PLAN.md §8.2` referenced `clerk_id()` as an "existing JWT-claim helper used on `charts`" for RLS.** Grep-verified during §8.2 schema recon (2026-04-21) that no such function exists anywhere in the codebase. Actual pattern used across every RLS policy (charts, chart_calculations, oracle_readings, user_daily_crystals, user_crystals, push_subscriptions, plus every snippet in `.planning/research/` and `03-birth-data-database/`) is `(select auth.jwt()->>'sub') = user_id` inline — no helper function abstraction. The §8.2 schema doc at `.planning/phases/08-diary-persistence/08-02-SCHEMA.md` uses the correct form throughout; §8.3's migration will use the correct form. Filed here because this is the **tenth instance** of planning-doc-vs-code drift in ~30 rounds of work — the pattern persists across workstreams (ephemeris §9, licensing §9A, diary §8) and deserves process-level discipline: **any planning-doc claim about an "existing helper," "existing pattern," or "established convention" should be grep-verified at the time the doc is written, not at the time the doc is executed against.** Without that discipline the drift is silent until a downstream round trips on it (or worse, rubber-stamps the claim and propagates the drift).
11. **§8.2 sealed DDL specified `user_id TEXT NOT NULL DEFAULT (select auth.jwt()->>'sub')`.** The `(select ...)` subquery form is valid in RLS-policy context (per-query constant, planner-cached) but **invalid in column DEFAULT context** — Postgres returns `0A000 "cannot use subquery in DEFAULT expression"`. Discovered 2026-04-21 during §8.3 dry-run (pure-Node `BEGIN/ROLLBACK` against prod `DATABASE_URL` via the `postgres` npm package) — the dry-run was the only verification surface that would have caught this before `supabase db push` hit prod. Rather than correcting syntax to the unverified scalar form `DEFAULT (auth.jwt()->>'sub')` (no primary-source evidence of it working against Supabase's `auth.jwt()` in a raw `CREATE TABLE` DEFAULT — only Drizzle `sql` tagged-template forms were in the research docs), **DEFAULT was dropped entirely**; §8.4 endpoints pass `user_id` explicitly from auth middleware's JWT sub. Pattern reminder: **RLS policy patterns don't transfer to DEFAULT context; verify each usage in isolation.** The §9.1 tracker entries #1-#9 are planning-doc-vs-code-drift within a single workstream; entries #10 and #11 are the first §8 instances, showing the pattern is cross-workstream and the grep-verify discipline from #10 should extend to **syntax-context verification too** — "pattern X works in context A" does not imply "pattern X works in context B" for the same primitive.
12. **Supabase migration-history drift — phantom `20260413113051` and out-of-band-applied `20260420100254`.** Discovered 2026-04-21 when `supabase db push` for the §8.3 diary migration refused with `"Remote migration versions not found in local migrations directory"`. Read-only recon (`.planning/phases/08-diary-persistence/08-03-RECON.md`) surfaced **two drifts**: (a) `20260413113051_migration_for_database_optimisation` — tracked in remote `schema_migrations` but never existed as a committed file in any branch (git `--diff-filter=D` + `-S` searches definitively empty). Classified Scenario B: a Drizzle→Supabase-CLI transition baseline-squash, applied pre-§7, with its generated SQL file never committed. (b) `20260420100254_realign_charts_approximate_time_range.sql` — the inverse: committed in `1c4e551`, DDL effect verifiably in prod (`charts.approximate_time_range text NULL` + 3 rows all null), but no tracking row in `schema_migrations`. Applied via an out-of-band channel. Repaired via `supabase migration repair --status reverted 20260413113051` + `--status applied 20260420100254` (neither alters prod schema — only the CLI tracking table). **Process discipline going forward:** `supabase migration list` must precede every `db push`; any Local-vs-Remote mismatch surfaces before the push attempt. The BEGIN/ROLLBACK dry-run does NOT catch this class of drift (different layer: CLI tracking state, not DDL state).

    **Supplementary finding (stronger signal about the out-of-band channel):** pre-flight verification of `20260420100254`'s file-DDL-vs-prod-reality before Step 2 found a **third divergence**: the file's `COMMENT ON COLUMN` uses SQL-quoted enum values (`'morning' | 'afternoon' | 'evening' | 'night'`), but prod's actual column comment has unquoted values (`morning | afternoon | evening | night`). Git log confirms the file was committed once (`1c4e551`) with the quoted form. This means the out-of-band channel that applied this migration **didn't run the file as-written** — it ran either a different COMMENT statement or skipped the COMMENT entirely. Stronger signal than pure tracking-table omission: not just "tracking missed an entry" but "the DDL that actually ran wasn't the DDL in the committed file." Accepted as-is in §8.3 (marking as applied despite COMMENT divergence) because the divergence is metadata-only — no runtime impact, no code reads column comments. Queued for post-launch as a stronger signal for the out-of-band-channel audit below.

    **Queued for post-launch:** identify all channels that can write DDL to prod (Supabase dashboard direct-SQL, manual `psql`, CI pipelines, Supabase internal features like `db diff`, etc.) and decide which are sanctioned versus locked down. The #12 drifts (both the tracking-table discrepancies AND the file-vs-reality COMMENT divergence) exist because some channel permits DDL writes outside `supabase db push`. Until that channel is identified and either sanctioned with process discipline or locked down, drift #13 / #14 / #N remain likely — and the DDL divergences may not always be metadata-only. Not a §8 scope item; pattern-level observation that needs a dedicated decision round post-launch.
13. **§8.2 and §8.3 language repeatedly framed RLS as the primary gate for diary (`"RLS enforces user isolation"`).** §8.4 post-close architectural verification (grep across 25 API routes under `apps/web/app/api/`) revealed the actual codebase pattern: **service-role Supabase client + app-layer `.eq('user_id', userId)` filter with `auth().userId` from Clerk middleware, universal across every user-scoped endpoint.** Not a bug — a clarification. RLS policies on `diary_entries` (and the other user-scoped tables) stay configured as defense-in-depth, matching the established pattern. No endpoint uses anon-client-with-forwarded-JWT where RLS would be the primary gate. Additional in-§8.4 finding: `apps/web/app/api/diary/entries/route.ts` originally inlined `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {...})` rather than using the established `createServiceSupabaseClient` factory — functionally identical but stylistically out-of-convention; amended in the §8.4 close-consolidation commit. **This joins #10 (`clerk_id()` phantom helper), #11 (RLS syntax vs DEFAULT syntax), #12 (migration-history drift + COMMENT divergence) as the fourth §8 drift from the general class of "asserted pattern doesn't match codebase reality."** Pattern observation: four instances in ~35 rounds means advisor-level reasoning about the codebase has been treated as verified when it was inferred. **Going forward in §8.5+: any advisor claim about existing codebase patterns (how endpoints work, what helpers exist, what conventions are established elsewhere) should be explicitly tagged `[inferred]` unless accompanied by a specific `file:line` reference or grep output.** Claude Code's verification discipline — grepping before confirming — is the safety net that caught all four; the advisor's reasoning is the source. §8.5 onwards: Claude Code proactively grep-verifies any advisor claim about existing patterns before acting on it.
14. **Next.js 15.5.9 bundled `sweph` into server vendor-chunks despite `serverExternalPackages: ['sweph']` — four-step escalation ladder needed to unblock §8.4 UAT.** Discovered 2026-04-21 when founder attempted to run the §8.4 UAT harness against a locally-started dev server; `/api/planets/current` returned 500 with `TypeError: The "path" argument must be of type string or an instance of URL. Received an instance of URL` at sweph's `fileURLToPath(new URL(".", import.meta.url))` bootstrap in `index.mjs`. Classification: environmental regression orthogonal to any §8 work; the diary module graph doesn't import `sweph` and the §8.4 endpoints compile clean.

    **Baseline verifications before escalation (all `[verified]`):**
    - `node -e "require('sweph')..."` from `packages/astrology/` at Node v24.12.0 loaded sweph cleanly; `calc_ut` returned real planet positions (Sun ~336.1° for JD 2460000.5). Native module itself is fine.
    - CI (Vitest) on current HEAD is green across 3 most-recent `Astrology Validation` runs. Vitest bypasses Webpack, so the CI path never hits this bundler issue.
    - `apps/web/next.config.js` had no `serverExternalPackages` entry before this fix. The file has no shadow `.mjs`/`.ts` variant; config is read correctly by Next.
    - `pnpm-lock.yaml` had resolved `"next": "^15.2.4"` forward to `15.5.9` — 7 patch releases past what `package.json` originally requested.

    **Escalation ladder executed:**
    1. `fd6dd8b` added `serverExternalPackages: ['sweph']` at top level of `next.config.js`. Cache-cleared restart: **same error**. Externalization config not taking effect.
    2. `4832def` added `transpilePackages: ['@celestia/astrology', '@celestia/core']` alongside `serverExternalPackages`. Cache-cleared restart: **same error**.
    3. `d9bd940` refactored `packages/astrology/src/{calculator,transit,utils/julian-day}.ts` from `import * as sweph from 'sweph'` to `createRequire(import.meta.url)` + `require('sweph')`. Astrology vitest 39/39 green after each file. Cache-cleared restart: **different error** — `TypeError: No native build was found... webpack=true` at `node-gyp-build`'s platform detection. The `webpack=true` flag (produced by `node-gyp-build/index.js:1` checking `typeof __webpack_require__ === 'function'`) confirmed sweph **was still inside Webpack's module graph** despite both config paths. Definitive proof that `serverExternalPackages` wasn't working for this specific transitive-native-module case on 15.5.9.
    4. `7fa5684` combined three changes in one atomic commit: (a) Next pinned exact to `15.2.4` (dropped caret, regenerated lockfile) to bypass any 15.3+ bundler regression; (b) explicit `webpack.externals` hook for `sweph` in the `isServer: true` branch — known-working pattern for native modules across Next.js versions (sweph, sharp, bcrypt, etc.); (c) diagnostic `console.log` at config-load time confirming file is being read. **Dev server green on restart.** UAT harness ran clean: pass 81 / fail 0 / total 82, all 5 diary unauth gates and all 11 diary CRUD assertions green, zero non-diary regressions.

    **Resolution accepted (all four recovery artifacts retained):** even though only `7fa5684`'s combination was strictly load-bearing for 15.5.9's specific regression, the prior three recoveries compose defense-in-depth and remain on the branch:
    - Next `15.2.4` exact pin → prevents forward drift into the regression.
    - `serverExternalPackages: ['sweph']` → aligns with the newer sugar's documented intent; works once combined with the webpack hook.
    - `transpilePackages: ['@celestia/astrology', '@celestia/core']` → correct workspace-package handling; hygiene worth keeping.
    - `webpack.externals` hook → primary version-agnostic safety net; known-working across Next versions.
    - `createRequire` pattern in the three astrology source files → defensive against any future bundler that statically analyzes `import * as sweph`; 39/39 tests pass identically.

    **`[inferred]` root cause:** regression in Next 15.3.x–15.5.x where `serverExternalPackages` stopped externalizing native modules in the RSC / API-route compilation layer. Not definitively confirmed to a specific commit in the Next.js repo (WebFetch against issue search is thin; direct browser visit to `github.com/vercel/next.js/issues` post-launch can surface the matching bug report if one exists). Secondary trigger candidates (Node 24 stricter URL handling, §9A pnpm-override regenerate) both turned out to be downstream symptoms, not root causes — the Next pin + webpack.externals would have been needed regardless.

    **Post-launch queued actions:**
    - Re-test sweph externalization on each Next release as they ship. If 15.6+ (or 16.x) restores the documented `serverExternalPackages` behavior, the exact pin can be relaxed back to a caret range. **Keep the `webpack.externals` hook regardless** — it's a durable safety net.
    - If any future native dep lands (different crypto primitive, new native binding), add it to the same `webpack.externals` hook.
    - File a reproducible issue upstream at vercel/next.js with the four-step escalation evidence if a matching bug report isn't already open.
    - The diagnostic `console.log` at `next.config.js:80-85` is removable after the sweph saga stabilizes across a few deploys; not load-bearing.
    - `engines.node` in root `package.json` remains at `">=22.0.0"` — no narrowing needed given the fix is trigger-agnostic, but consider adding `.nvmrc` at launch to lock dev/CI/prod Node versions for reproducibility. Deferred post-launch, not this round.

15. **Advisor reflexively recommended ceremony work without evidence-based justification.** During Item 2 (error monitoring) opening on 2026-04-27, the advisor first claimed *"develop has ERR-BD-NNN but not ERR-DI-NNN"* — wrong on both counts (develop had neither; was 195 commits behind `mobile-parallel-test` which is the actual product trunk). Caught by Claude Code's grep-verification before any code landed. Subsequent advisor recommendation was *"merge `mobile-parallel-test` → `develop` wholesale"* (Option I), which the founder pushed back on by asking *"why are we merging?"* — exposing that the recommendation was norm-driven (branches-should-converge developer instinct) rather than evidence-driven (no actual user or development harm from the divergence).

    **Resolution:** don't merge. Treat `mobile-parallel-test` as active trunk. `develop` stays frozen as historical reference. Update keep-parallel discipline accordingly: *"all git ops target `mobile-parallel-test` until further notice; `develop` is currently a frozen historical reference, not the active trunk."*

    **Pattern observation:** this is distinct from but adjacent to drift findings #10–#14, which were all instances of *"advisor makes confident state-claims about codebase without grep-verification."* This one is *"advisor reflexively recommends ceremony from developer-norm defaults without evidence specific to the situation."* Both deserve `[inferred]` discipline, but the second is harder to catch because it doesn't surface as a verifiable factual error — it just looks like a reasonable recommendation until someone asks why. **The "why?" question is the right founder check on advisor recommendations going forward.**

    **Meta-observation surfaced during this entry's drafting:** the advisor's *"#15 already tracked"* framing in the drafting prompt was itself a fresh instance of the unverified-state-claim pattern (Claude Code grep'd and found no #15 existed; entry numbered as #15 not #16). Pattern self-reproduced even within the act of documenting it. The grep discipline is doing real work — without it, this entry would have shipped as #16 with a phantom #15 gap.

16. **Advisor's initial §10.3 sub-round 3 recommendation would have produced Sentry double-tagging for `ERR-DI-003/004/007` client emits.** During pre-round 3 surface on 2026-04-27, the advisor recommended wrapping all client-side `console.error('[ERR-DI-XXX]', err)` calls in `useManifestEntries.ts` with the new `logClientError` wrapper *"for symmetry with server."* But codes `ERR-DI-003`, `ERR-DI-004`, and `ERR-DI-007` already fire from server-side `logServerError(...)` when their routes return 500 — wrapping the client-side `console.error` sites would create a **second Sentry event for the same logical error**. With `tracesSampleRate: 0` (the ratified §10.1 config), there's no trace context to link client + server events, so the dashboard would show 2 disconnected events per failure.

    **Caught by:** Claude Code's grep of actual emit sites in `apps/web/hooks/useManifestEntries.ts` — 6 emit sites across 4 codes (`003`, `004`, `007`, `008`), not the 2 codes the advisor's surface assumed. The hook's UI banner-state union (`ManifestEntriesErrorCode`) and the Sentry-tagging code union (`ClientErrorCode`) are related but distinct concerns; the advisor's surface conflated them.

    **Resolution: Resolution β.** `ClientErrorCode = 'ERR-DI-002' | 'ERR-DI-008'` only — the codes that fire client-only with no server-side counterpart. Wrap the 3 `ERR-DI-008` emit sites in `useManifestEntries.ts`. Leave the 3 `003/004/007` `console.error` calls untouched: server already tags those via `logServerError`, and the client `console.error` retains browser-DevTools visibility for local-dev debugging without contaminating the Sentry dashboard.

    **Pattern instance — same shape as #15.** Advisor recommended symmetric server/client wrapping without verifying actual emit-site distribution or the architectural differences between the two surfaces. #15 was *"advisor recommends ceremony from developer-norm defaults without evidence specific to the situation"* (branch hygiene without merge-conflict evidence); #16 is the same pattern applied to a different decision surface (cross-cutting helper application without emit-site verification). **Going forward: any advisor recommendation about wrapping/replacing existing code paths should be tagged `[inferred]` until Claude Code grep-verifies actual emit sites and their dependencies.**

17. **Sub-round 1 ratified `tunnelRoute: skip` based on conservative-defaults posture and "ad-blocker prevalence unknown" reasoning. Sub-round 4 forced-throw verification revealed a different actual problem: app's existing CSP `connect-src` directive blocks client-side Sentry transport entirely.** The *"revisit post-launch with real-data signals"* trigger documented in sub-round 1's close has fired during pre-launch verification. Decision to be re-ratified in sub-round 4 with the actual data: enable `tunnelRoute` (resolves both CSP and future ad-blocker concerns) or add Sentry to CSP allowlist (surgical but doesn't generalize). **Pattern observation:** conservative-defaults posture is correct in spirit but should include *"verify the default works in your environment, not just in the SDK's reference setup."* The forced-throw verification gate is doing real work — without it, this would have shipped to prod with client-side errors silently dropped.

Full cleanup pass deferred to post-§9.6 — this breadcrumb exists so future readers searching for "swisseph-wasm," "topocentric Moon," "True Node precision," "historical-tz / LMT," "Mean Node reference source," "astro.com independence," "DST-transition ambiguity," "DE441 upper bound," "packages/core AGPL drift / pnpm overrides," "clerk_id helper / diary RLS," "auth.jwt() in DEFAULT / subquery feature not supported," "migration-history drift / out-of-band DDL channel," "RLS as primary gate vs service-role actual," "Next.js serverExternalPackages / sweph native-module bundler," "advisor ceremony recommendation / mobile-parallel-test as active trunk," "advisor double-tagging recommendation / client-vs-server emit-site distribution," or "tunnelRoute / CSP connect-src blocking client-side Sentry transport" find the trail.

---

## Findings summary

1. **Library identity: `sweph` v2.10.3-b-1 (native Node N-API bindings), not `swisseph-wasm`.** `[verified]` — `packages/astrology/package.json` dependency list; `packages/astrology/node_modules/sweph/package.json` name + version; `binding.gyp` confirms native C/C++ add-on build.
2. **Ephemeris mode: Moshier (`SEFLG_MOSEPH`), exclusively.** `[verified]` — only flag combination used in `packages/astrology/src`; `calculator.ts:46` and `transit.ts:113` both pass `SEFLG_MOSEPH | SEFLG_SPEED` to `sweph.calc_ut`. No `set_ephe_path()` call anywhere in `@celestia/astrology`. No `.se1` or JPL data files are bundled with the `sweph` package (sweph README: *"This library does not include any ephemeris files by default"*).
3. **Moshier precision floor is not uniform across bodies.** Planets ≤1″ vs JPL; Moon "a few arc seconds"; True Node ~70″; Mean Node <20″ worst-case over full range (≪5″ at modern dates). `[verified]` — quoted below from the Swiss Ephemeris official documentation.
4. **Node-type decision: Mean Node.** `[user-decision]` `constants.ts:118` changed from `northNode: 11 // SE_TRUE_NODE` to `northNode: 10 // SE_MEAN_NODE` in this round's atomic commit. Rationale: True Node's ~70″ Moshier floor is incompatible with validation at arc-second tolerances; Mean Node's <5″ modern-date floor is compatible with a 20″ threshold that gives meaningful regression-detection.

---

## Evidence — library identity

`[verified]` `packages/astrology/package.json`:

```json
"dependencies": {
  "geo-tz": "^8.1.6",
  "sweph": "^2.10.3-4"
}
```

`[verified]` `packages/astrology/node_modules/sweph/package.json`: name `"sweph"`, version `"2.10.3-b-1"`, "Equivalent to Swiss Ephemeris version: 2.10.03b revision 1".

`[verified]` `packages/astrology/node_modules/sweph/binding.gyp` present; sweph README explicitly: *"This library is a C/C++ add-on designed for Node.JS only, it will not work in browsers"*. Runtime path is native bindings, never WebAssembly.

## Evidence — Moshier mode in use

`[verified]` Only two places in `@celestia/astrology/src` set ephemeris flags, and both choose Moshier:

- `packages/astrology/src/calculator.ts:46` — `const flags = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED`
- `packages/astrology/src/transit.ts:113` — same flag combination.

`[verified]` `calculator.ts:4-6` source comment: *"All calculations use the Moshier ephemeris (built-in, no external files needed)."*

`[verified]` No `set_ephe_path` call in `packages/astrology/src` (grep across src tree for `set_ephe_path` and `SEFLG_SWIEPH` / `SEFLG_JPLEPH`: zero hits).

`[verified]` Houses: `sweph.houses(jd, lat, lon, HOUSE_SYSTEM_PLACIDUS)` at `calculator.ts:164` — takes no ephemeris flag. House computation in the Swiss Ephemeris depends on sidereal time / Earth rotation, **not** on planetary ephemeris tables. Moshier-vs-SE-files does not affect house output. `[inferred]` — from Swiss Ephemeris source (`swehouse.c`) and the `sweph.houses` signature not accepting flags.

## Evidence — Moshier precision floor (planets and Moon)

`[verified]` Quoted verbatim from the Swiss Ephemeris official documentation (`https://www.astro.com/swisseph/swisseph.htm`, Moshier section):

> "Its deviation from JPL is below 1 arc second with the planets and a few arc seconds with the Moon."

> "The Moon's position is calculated by a modified version of the lunar theory of Chapront-Touze' and Chapront. This has a precision of 0.5 arc second relative to DE404 for all dates between 1369 B.C. and 3000 A.D."

> "The Moshier Ephemeris covers the interval from 3000 BCE to 3000 CE."

> "the adjustment for the inner planets is strictly valid only from 1350 B.C. to 3000 A.D., but may be used to 3000 B.C. with some loss of precision"

> "The advantage of the Moshier mode of the Swiss Ephemeris is that it needs no disk storage. Its disadvantage, besides the limited precision, is reduced speed: it is about 10 times slower than JPL mode and the compressed JPL mode."

`[verified]` Source-level date-range defines (`packages/astrology/node_modules/sweph/swisseph/sweph.h:219-222`), active branch:

```
#define MOSHPLEPH_START  625000.5    // JD, roughly 3001 BC
#define MOSHPLEPH_END   2818000.5    // JD, roughly 3000 AD
#define MOSHLUEPH_START  625000.5
#define MOSHLUEPH_END   2818000.5
```

`[verified]` Synthetic-case date-range check against those defines:
- Year **1600** → JD ≈ 2305448 → **inside** Moshier range. OK.
- Year **2200** → JD ≈ 2524593 → **inside** Moshier range. OK.

## Evidence — Moshier precision floor (lunar nodes)

`[verified]` Quoted verbatim from the Swiss Ephemeris official documentation (`https://www.astro.com/swisseph/swisseph.htm`, lunar nodes section):

> **Mean Node vs ELP2000-85:** *"its deviation from the mean node of ELP2000-85 is 0 for J2000 and remains below 20 arc seconds for the whole period."*

> **Mean Node vs DE431 extension:** *"Estimated precision is 1 arcsec, relative to DE431."*

> **True Node differences:**
> - JPL-derived vs Swiss Ephemeris-derived: *"~ 0.1 arc second"*
> - JPL-derived vs Moshier-derived: *"~ 70 arc seconds"*

> **Precision warning:** *"If you want a precision of the order of at least one arc second, you have to choose either the JPL or the Swiss Ephemeris."*

> **Node-type semantics:** *"In the strict sense of the word, even the 'true' nodes are true only twice a month"* (when the Moon crosses the ecliptic); monthly oscillations between those passages.

`[verified]` Empirical constant check: `packages/astrology/node_modules/sweph/constants.js:25` → `SE_MEAN_NODE = 10`; line 26 → `SE_TRUE_NODE = 11`. Prior `constants.ts:118` used id 11 (True Node); this round's commit switches to id 10 (Mean Node).

---

## Locked thresholds for §9.2

### Primary threshold — reference source is heterogeneous across bodies

| Body | Threshold | Reference source | Queue-for-later trigger | Pause-and-fix trigger |
|---|---|---|---|---|
| Sun + 7 planets (Mercury through Pluto) | **1″** | JPL Horizons (physical-reality) | any planet >1″, all ≤5″ | any planet >10″ **OR** >1 planet >5″ |
| Moon | **3″** | JPL Horizons (physical-reality) | >3″ but ≤15″ | >30″ **OR** >1 trigger across bodies |
| Mean Node | **20″** | sweph Mean Node vs. Meeus Ch. 47 polynomial (independent implementation of the same ELP2000-85 secular formula used by sweph's Moshier mode) | >20″ but ≤100″ | >200″ |

See `09-01-HARNESS.md § Node validation — explicit scope` for the epistemic qualifier on the Mean Node row (code-path integrity check, not physical-reality check) and `§ §9.2 validation semantics — tiered by reference source` for the planet/Moon-vs-Node distinction.

**Trigger scope:**
- The *"any planet / >1 planet"* systemic-issue rule applies only to the **9 non-Moon non-Node bodies** (Sun + 7 planets).
- Moon and Mean Node trigger independently. A threshold miss on the Moon or Node does not compose with the planet-systemic rule.

**Retroactive-tightening clause (Mean Node only):** the 20″ threshold reflects the worst-case ceiling Swiss Ephemeris documents across the full Moshier range. At modern birth dates (post-1950, the vast majority of Celestia's target users), actual Mean Node drift is expected in the low single-digit arc-seconds. If §9.2 runs show consistent <5″ drift at modern dates, the threshold can be retroactively tightened and the change re-committed with the supporting numbers.

### Secondary sanity check (vs Astronomy Engine)

| Body | Threshold vs Astronomy Engine | Scope note |
|---|---|---|
| Sun + 7 planets | **1′ (60″)** | sanity check only — Astronomy Engine's stated ±1′ accuracy means a tighter threshold is not meaningful |
| Moon | **not checked** | Astronomy Engine's 1′ accuracy spec is coarser than the Moon's 3″ primary threshold; it cannot meaningfully validate the Moon at that level |
| Mean Node | **not checked** | same rationale — 1′ spec > 20″ Node threshold |

Document this scope-limitation explicitly in the harness README so future readers don't wonder why Moon/Node have only one reference source.

### House and aspect thresholds (unchanged from original proposal)

| Dimension | Threshold vs astro.com | Notes |
|---|---|---|
| House cusps (12 cusps + ASC + MC) | 1′ (60″) | house math independent of ephemeris mode (no flag on `sweph.houses`) |
| Aspect orbs | 1′ (60″) | worst-case 3″ Moon noise is 5% of this threshold — inside budget |
| Aspect type identification | exact match | conjunction / sextile / square / trine / opposition |
| Applying / separating classification | exact match | via speed-comparison; verify semantic matches astro.com convention |

---

## Rationale — why Mean Node over True Node

Product context: `COMPETITOR_ANALYSIS.md:211, 501, 531` previously positioned True Node as a Celestia precision differentiator vs competitors using Mean Node. The marketing frame was written assuming the ephemeris backend could deliver sub-arc-second True Node precision. Under the shipped Moshier mode, that assumption is false — True Node's ~70″ Moshier floor is ~14× less precise than Mean Node's <5″ modern-date floor.

Switching to Mean Node:

- **Restores arc-second-level precision** for the node in the validated output. A 20″ threshold with expected <5″ actual drift is meaningful regression-detection; a 60″ threshold permanently parked at the ~70″ True Node floor is theatre.
- **Matches astro.com / TimePassages default behaviour** for cross-user chart comparison. Users checking their Celestia chart against those tools will see agreement, not a systematic mismatch.
- **Requires marketing copy revision** in the post-§9.6 cleanup pass. Either drop the Node-based precision claim entirely, or reframe as "Mean Node for classical-astrology agreement." Product decision on framing; this report flags it but does not resolve it.

The Swiss Ephemeris advisory *"In the strict sense of the word, even the 'true' nodes are true only twice a month"* reinforces the choice — monthly oscillation in the "true" node is arguably more noise than signal for chart-interpretation at UI precision, independent of the ephemeris-backend question.

---

## What is now unblocked

- Harness scaffold at `packages/astrology/test/validation/` — fixture loader, threshold config file (single source of truth for the table above), comparison runner with human-readable output. Vitest-picked-up automatically, no separate package. Atomic commit, separable from the sample-comparison commit.
- AA-rating verification for Einstein via Astro-Databank. Propose 2-4 additional AA-rated candidates (vary latitude, era, hemisphere) with Rodden ratings and birth-data sources. Surface for user approval before reference-data sourcing for those cases. Einstein drops from the set if Astro-Databank does not confirm AA rating.
- JPL Horizons API adapter sketch — how to query planetary positions for a given (UTC instant, set of bodies), how to parse the response, where to commit reference-data snapshots.
- Astronomy Engine integration — `astronomy-engine` npm package install + call; flag any API-surface differences that complicate comparison logic.
- astro.com transcription protocol for 8-10 cases — exact fields to transcribe, commit format, spot-check procedure for catching transcription errors on the first discrepancy pass.
- One reference case against a known-good native-Swiss-Ephemeris tool (not astro.com) — identification is part of §9.1 sourcing work; if harder to find than expected, flag rather than guess.
- Sample end-to-end comparison using Queen Elizabeth II (AA-rated, no verification needed). Full tiered-threshold comparison output surfaced for user review before §9.2 opens.

## Exit criteria for §9.1

1. Harness scaffold committed with threshold config wired to the locked table above.
2. Test-case list user-approved (Einstein AA-verification + 2-4 additions + 7 synthetic + 1 reference case).
3. Reference-data sourcing plan documented and user-reviewed (JPL adapter, Astronomy Engine integration, astro.com transcription protocol).
4. Sample comparison output for Queen Elizabeth II reviewed by user.
5. User signs off: *"proceed to §9.2."*
