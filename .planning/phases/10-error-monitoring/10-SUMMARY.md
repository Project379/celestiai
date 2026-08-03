# §10 Error Monitoring — Close Summary

**Workstream chain:** §10.1 (SDK install + manual wiring) → §10.2 (server-side ERR-* tag aggregation) → §10.3 (client-side surfacing + global-error.tsx) → §10.4 (tunnelRoute + forced-throw verification + close).

**Status:** PRE_LAUNCH_PREREQS.md item 2 closed 2026-04-27.

**Disposition:** All hard correctness work done. Prod build verified. End-to-end forced-throw verification confirmed Sentry dashboard receipt with correct `errorId` tags for representative codes from each architectural pattern (server BD, server DI, client DI-008).

---

## Sub-round chain

### §10.1 — SDK install + manual wiring (commit `a111cc8`)

- Installed `@sentry/nextjs@10.50.0` exact-pinned to `@celestia/web` (matched against Next 15.2.4 peer dep `^15.0.0-rc.0` — clean).
- Manual wiring (NOT wizard) per the doc-drift #14 risk concern (preserved sweph customizations in next.config.js):
  - `apps/web/instrumentation-client.ts` (browser runtime)
  - `apps/web/sentry.server.config.ts` (Node.js runtime)
  - `apps/web/sentry.edge.config.ts` (Edge runtime)
  - `apps/web/instrumentation.ts` (registration hook + `onRequestError = Sentry.captureRequestError` for auto-capture of unhandled server errors)
- `apps/web/next.config.js` wrapped with `withSentryConfig` preserving `serverExternalPackages: ['sweph']`, the webpack externals hook, the `redirects()` block, and the boot-time `console.log` diagnostic.
- `apps/web/.env.example` extended with placeholders for `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.

**Conservative-defaults posture (ratified pre-implementation):**
- `sendDefaultPii: false` (overrides Sentry's `true` default; PII scrubbing on)
- `tracesSampleRate: 0` (performance traces out of scope)
- `enableLogs: false` (Sentry Logs is a separate product, out of Item 2 charter)
- `includeLocalVariables: false` (server config; PII implications)
- No session replay (privacy + zero pre-launch value)
- `tunnelRoute` initially skipped — reversed in §10.4 per drift #17

**Verification:** prod build clean, dev boot diagnostic fires, sweph still externalized, monorepo typecheck green (5/5 packages), `/api/planets/current` returned 200 with full planet JSON post-Sentry-wrap (no regression).

### §10.2 — Server-side ERR-* tag aggregation (commits `ec5c063`, `459ac3b`, `1ab05f8`)

- Created `apps/web/lib/monitoring/log-server-error.ts` (commit `ec5c063`):
  - Strict `ServerErrorCode` union: 10 codes (`ERR-BD-001..005`, `ERR-DI-003..007`). TypeScript catches drift if anyone emits a new code without extending the union.
  - Function: `logServerError(code, err, extra?)` — calls both `console.error` (local-dev visibility) AND `Sentry.captureException(err, { tags: { errorId: code }, ...extra })`. Defensive try/catch around Sentry call (audit.ts precedent — monitoring failures shouldn't crash the request).
- Wired all 7 ERR-BD emit sites in birth-data routes (commit `459ac3b`): `apps/web/app/api/birth-data/route.ts` + `[id]/route.ts`. Includes both `result.ok === false` branches and outer catch blocks.
- Wired all 8 ERR-DI emit sites in diary routes (commit `1ab05f8`): `apps/web/app/api/diary/entries/route.ts` + `[id]/route.ts`. Same pattern.

**Total: 15 emit sites converted across 10 codes.** Response shapes preserved exactly (every error path still returns `{ error, code }` JSON with `status: 500` + Bulgarian message).

**Verification:** monorepo typecheck green throughout. Dev-mode UAT harness flagged 5 false-positive failures from session-TTL timeout (Sentry instrumentation compile overhead pushes test run past Clerk's 60s session TTL — see "Dev-mode harness quirk" below). Prod-build harness 101 pass / 1 skip / 102 total — exact §8.9 baseline match. tunnelRoute deferral surfaced as a known cost: client-side Sentry transport untested at this point.

### §10.3 — Client-side surfacing + global-error.tsx (commits `0ddb18a`, `44627a8`, `6e3536a`, `494d7be`)

- Created `apps/web/lib/monitoring/log-client-error.ts` (commit `0ddb18a`) — sibling to server wrapper.
- **Resolution β architecture** (drift #16): `ClientErrorCode = 'ERR-DI-002' | 'ERR-DI-008'` only. Server-mapped client codes (`ERR-DI-003/004/007`) are NOT included — those already fire from server-side `logServerError(...)` when their routes return 500. Wrapping the client-side `console.error` sites for those codes would create a second Sentry event for the same logical error, with no trace context (`tracesSampleRate=0`) to link them.
- Wired the 3 `ERR-DI-008` (network-class failure) emit sites in `apps/web/hooks/useManifestEntries.ts` (commit `44627a8`) — GET list, POST upsert, DELETE. The 3 server-mapped client emits (003/004/007) at lines 107/192/260 left as plain `console.error` for browser-DevTools visibility.
- Created `apps/web/app/global-error.tsx` (commit `6e3536a`) — minimal scope, `Sentry.captureException(error)` + Bulgarian fallback copy `"Нещо неочаквано се обърка. Опитай да презаредиш страницата."` (deliberate register-shift for catastrophic-UI vs handled-error voice).
- Drift #16 entry committed (commit `494d7be`) — captures the advisor double-tagging recommendation pattern.

**Falsifying check passed:** Sentry advisory #2 (`global-error.js missing`) disappeared from dev-server boot logs after `global-error.tsx` landed.

### §10.4 — tunnelRoute + forced-throw verification (commit `47bef38`, plus this close commit)

Forced-throw verification covered representative-per-category (3 throws total):

| Code | Throw mechanism | Mode | Dashboard receipt |
|---|---|---|---|
| `ERR-BD-005` | Temp instrumented `throw` in `birth-data/[id]/route.ts` GET try-block | Dev (port 3003) | ✓ 2 events, `errorId` tag, suspect-commit attribution to `459ac3b` |
| `ERR-DI-005` | Temp instrumented `throw` in `diary/entries/[id]/route.ts` GET try-block | Dev (port 3003) | ✓ 3 events, `errorId` tag, suspect-commit attribution to `1ab05f8` |
| `ERR-DI-008` | DevTools request-URL blocking on `/api/diary/entries` POST | Prod (port 3344) post-tunnelRoute | ✓ 1 event, `errorId` tag, source maps showing `useManifestEntries.ts:179:27`, suspect-commit attribution to `44627a8` |

All forced-throw events have descriptive `'Sentry test ERR-XX-NNN'` messages and ISO-timestamped commits in this trail; no manual cleanup performed (test trail is part of the verification evidence, single Sentry project pre-launch).

**CSP discovery + tunnelRoute (commit `47bef38`):** during ERR-DI-008 verification, browser DevTools console showed `connect-src` CSP violation blocking direct `*.ingest.de.sentry.io` transmission. Diagnostic identified Clerk's strict-mode CSP at `apps/web/middleware.ts:47-53` as the connect-src owner. Resolution: enabled `tunnelRoute: '/monitoring'` in `withSentryConfig` — same-origin proxy bypasses CSP entirely AND gives ad-blocker resistance. Matcher analysis confirmed `/monitoring` is not in `isProtectedRoute`, so no Clerk auth interception; no middleware exemption needed. Verified via direct curl with the required query params (`o`, `p`, `r`) — proxy fired and Sentry returned proper auth-error response. Drift #17 captures the conservative-defaults-must-be-environment-verified lesson + the DevTools-offline-as-invalid-test-method note.

**Final prod-build harness (Action 5): 101/102 + 1 skip — exact baseline match.** No regression from tunnelRoute config change.

---

## Architecture notes

### `global-error.tsx` is the SOLE error boundary in the app

No segment-level `error.tsx` files exist as of §10.3 (verified via `Glob 'apps/web/app/**/error.tsx'` returning empty). Trade-off: full capture at one file, but no per-segment granularity in the dashboard. Every unhandled React render error from any route segment bubbles all the way to the global handler.

**Post-launch revisit trigger:** if error volume becomes meaningful and dashboard triage benefits from segment-level granularity, add per-route-group `error.tsx` files. Estimated ~1-round UX investment (5-10 segments × ~5 lines each + verification).

### Conservative-defaults posture honored throughout

Reaffirmation per drift #17's lesson: SDK defaults are tuned for *"give me everything, I'll filter later"* — Celestia's posture is *"give me the minimum I need, expand only with evidence."* All five conservative-default decisions (`sendDefaultPii`, `tracesSampleRate`, `enableLogs`, `includeLocalVariables`, no replay) held throughout; only `tunnelRoute` flipped from skip→enabled, and that flip was driven by hard environmental data (CSP blocking transport), not speculative future-proofing.

### Resolution β: server-mapped client codes do NOT double-tag

Architectural insight from §10.3 pre-round 3: with `tracesSampleRate: 0`, there's no trace context to link client + server Sentry events from the same logical failure. So for `ERR-DI-003/004/007` (which fire server-side via `logServerError`), the client-side `console.error` calls in `useManifestEntries.ts` are intentionally left unwrapped. Client-side `logClientError` covers only client-only emit codes (`ERR-DI-002` defensive, `ERR-DI-008` network-class).

### Cron observability deferred (post-launch)

`apps/web/app/api/cron/cleanup-deleted-accounts/route.ts` and `apps/web/app/api/cron/daily-horoscope/route.ts` use `[Cron <Name>]` prefix tags but no formal ERR-* domain. Their per-item catches swallow errors by design (batch resilience — one failure shouldn't stop the batch), so they don't bubble to `onRequestError` and aren't tagged with `errorId`s. Top-level fetch failures DO bubble (return 500) and ARE captured automatically via `onRequestError`.

**Post-launch revisit triggers** (any one fires → re-evaluate cron observability):
1. Cron failures surface in user reports as missed deletions, stuck accounts, or undelivered daily horoscopes
2. Any cron's swallow-on-error rate exceeds operational tolerance (indicates systemic failure rather than expected per-item churn)
3. Sentry Crons free-tier accommodates all critical batch jobs (heartbeat / check-in / batch-failure-rate is the right shape for this concern, NOT request-handler error tagging)

### Mobile Sentry deferred to M3 close

Item 2 scoped to web only per pre-round 1 ratification. Mobile (`apps/mobile`) has no Sentry SDK installed and no error-tagging scheme established yet. Defer to M3 workstream's natural close — `@sentry/react-native` or `sentry-expo` install + ERR-* domain establishment for mobile-specific surfaces.

### Single Sentry project (dev + prod) — post-launch revisit trigger

Founder confirmed single project (free-tier supports 1, additional requires paid). Forced-throw verification events live in the same project as eventual prod events; identifiable by descriptive `'Sentry test ERR-XX-NNN'` messages + commit-trail timestamps in this summary.

**Post-launch revisit trigger:** if dashboard noise from dev events becomes a triage problem (e.g., dev-only false positives obscuring real prod signal), create separate dev project with distinct DSN. Cost: paid tier upgrade.

### Dev-mode harness quirk

Dev-mode harness runs may surface session-TTL timeouts on long-running auth'd flows when compile overhead extends test duration past Clerk's 60s default. Prod-build harness is the canonical verification path; dev-mode runs are best-effort regression checks. Documented falsifying-evidence pattern: if early auth'd tests pass and later auth'd tests fail with `status=401`, suspect session expiry (verified by cascade test fresh-session approach succeeding under the same conditions).

### DevTools-offline is not a valid test method for client-side Sentry verification

Surfaced during §10.4 ERR-DI-008 verification (drift #17 update): DevTools "Offline" throttling blocks ALL network including `/monitoring` tunnel transmission, causing Sentry SDK to queue events but never transmit. Sentry's transport queue doesn't reliably retry envelopes across offline-online transitions.

**Correct method for client-side network-failure error capture verification:** use DevTools request-URL blocking (right-click request → "Block request URL") to fail only the target endpoint while keeping `/monitoring` transmission available.

---

## Verification trail

**Action timeline (sub-round 4):**
- Action 1 (prod-build harness baseline): 101/102 + 1 skip — clean
- Action 2 (ERR-BD-005): dev-mode, 2 events, dashboard confirmed
- Action 3 (ERR-DI-005): dev-mode, 3 events, dashboard confirmed
- Action 4 (ERR-DI-008): prod-mode + tunnelRoute, 1 event, dashboard confirmed (after CSP fix + DevTools-offline diagnostic correction)
- Action 5 (final prod-build harness): 101/102 + 1 skip — exact baseline match

**Sentry dashboard tags confirmed across all 3 codes:**
- `errorId: ERR-XX-NNN` (the critical verification target — wrapper's contribution)
- `transaction:` correct route path
- `environment:` correct (`development` for ERR-BD-005 + ERR-DI-005 dev-mode tests; `production` for ERR-DI-008 prod-mode test)
- `release:` commit-SHA (`494d7beb79b1` for §10.3-state events; `47bef38f94f3` for ERR-DI-008 post-tunnelRoute event)
- `handled: yes` (caught by route handler's try/catch)
- Suspect commit attribution working (Sentry's git-blame integration via release matched commits to expected wrapper invocations)
- Source maps working — production stack traces deobfuscated to source `file:line`

**Forced-throw revert verification:** `grep -rnE "Sentry test ERR-|FORCED-THROW VERIFICATION|REVERT BEFORE COMMIT" apps/web/app/api` returns empty post-revert; typecheck exit 0; final prod-build harness baseline-match confirms no instrumentation residue.

---

## Asymmetry vs §8 acknowledged

§10 ran 4 sub-rounds with smaller per-round scopes than §8's 10-sub-round workstream; per-sub-round summary artifacts (`10-01-SUMMARY.md` ... `10-04-SUMMARY.md`) deferred in favor of this single close summary + commit-message trail. Pattern fits the workstream's actual shape rather than mechanical §8 mirroring.

§8 (diary persistence) was 10 sub-rounds, 68 commits, with substantial decisions per round (schema, RLS, CRUD, error domain, cutover, markdown export, GDPR cascade, prompt expansion, harness, rotation math). Per-sub-round detail benefited from dedicated summary artifacts.

§10 (error monitoring) was 4 sub-rounds, 11 commits across the workstream (including this close), with the bulk of decisions front-loaded to pre-round surfaces (sub-round 0 / pre-round 1 / pre-round 2 / pre-round 3 / pre-round 4). The detail lives durably in commit messages, drift entries (#15, #16, #17), and this single summary.

---

## Parking-lot items (noticed during forced-throw test, scope-extension candidates)

**P1 — `небесен ритъм` label tone register mismatch:** observed during Action 4 offline test on `/rhythm/journal`. The "небесен ритъм" label and underlying secondary text don't match the Bulgarian-skill voice register established elsewhere in the app. Real concern, not actionable in §10's monitoring charter.

**P2 — Diary button discoverability in `/rhythm`:** observed during Action 4 offline test. The diary entry-point button is easy to miss. Real UX concern, not actionable in §10's monitoring charter.

Triage decision pending at workstream-level discussion: do P1+P2 land before Item 3 (browser UAT) or after? Founder-level call.

---

## Trail

**Sub-round commits (chronological):**
- `a111cc8` — feat(monitoring): §10.1 install @sentry/nextjs + manual wiring with sweph-preserving next.config.js wrap
- `ec5c063` — feat(monitoring): §10.2 logServerError wrapper for ERR-* tag aggregation
- `459ac3b` — feat(monitoring): §10.2 wire ERR-BD-* through logServerError
- `1ab05f8` — feat(monitoring): §10.2 wire ERR-DI-* through logServerError
- `0ddb18a` — feat(monitoring): §10.3 logClientError wrapper for client-only ERR-* tag aggregation
- `44627a8` — feat(monitoring): §10.3 wire ERR-DI-008 client emits through logClientError
- `6e3536a` — feat(monitoring): §10.3 global-error.tsx for unhandled React render errors
- `494d7be` — docs(drift): #16 advisor double-tagging recommendation caught by emit-site grep
- `47bef38` — feat(monitoring): §10.4 enable tunnelRoute /monitoring to bypass CSP connect-src + ad-blocker risk
- this commit — §10.4 close: verification trail + summary + PRE_LAUNCH item 2 done + drift #17 update

**Drift tracker entries:** #15 (advisor branch-hygiene recommendation), #16 (advisor double-tagging recommendation), #17 (CSP discovery + DevTools-offline test-method correction). All in `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md`.

**PRE_LAUNCH_PREREQS.md item 2** updated to `[done]` as of this commit.
