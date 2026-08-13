=== CONTEXT HANDOFF — Stellaeum, rate limiting shipped, standing discipline updated ===

Repo: Stellaeum, Bulgarian-language astrology SaaS. Next.js web + Expo SDK 54
mobile in a monorepo. Branch mobile-parallel-test. Solo founder, Claude Code as
implementer.

=== STANDING DISCIPLINE UPDATE — 2026-08-03, supersedes the halt posture in
HANDOFF-CC-2026-05-12-EOD.md and any earlier handoff ===

Investigation-first stays. The halt boundary narrows — too many round-trips
were being spent on decisions the founder would have approved anyway.

HALT ONLY FOR:
- Security or privacy tradeoffs
- Anything that changes user-visible behaviour or product scope
- Design and architecture on a screen or system that has no precedent
- Scope exceeding 500 LOC, or needing a split
- Genuine ambiguity that cannot be resolved from source
- Anything requiring the founder's device, credentials, or a production migration

DECIDE AND PROCEED, report what was chosen and why, for everything else:
- Implementation approach where a precedent exists in the codebase
- Naming, file placement, function decomposition
- Doc corrections, comment freshening, REVISIT filing, allowlist additions
- Anything under 50 LOC that does not change behaviour
- Test and verification method

Batch small work into one message. Do not send a message per doc fix.

STANDING ANSWERS — do not ask these again:
- Fail-open on infrastructure that guards rather than gates, log loudly. Fail
  closed on anything touching auth, payment, or signature verification.
- Prefer the existing pattern in this codebase over introducing a new one,
  even if the new one is more conventional. Say so explicitly if the existing
  pattern is actually wrong.
- No new third-party dependencies or accounts pre-launch without asking.
- Key rate limits and quotas on userId where the route is authenticated. Fold
  in IP as a secondary signal only where a precedent already does.
- Internal or service-role-only tables: RLS enabled, no policy, documented in
  SECURITY-MODEL.md as part of the same migration. (Confirmed 2026-08-03 —
  rate_limit_buckets briefly shipped with RLS fully disabled by accident,
  corrected to this posture.)
- Bulgarian: informal ти, always. Real strings from source, never invented.
- If the founder asserts something that contradicts the code, the code wins —
  say so rather than complying. Has already prevented real damage twice
  (a cities/search auth-status claim, and an earlier branch-topology claim).

WHAT DOES NOT RELAX:
- Never report something done from source inspection alone when it is
  observable — screenshot, measure, or run it.
- Fetch fresh before any claim about branch topology.
- A migration is not done until the founder confirms it landed. Ask
  explicitly.
- Two failed fix attempts means instrumentation, not a third hypothesis.
- Surface disagreements as halts. Never silently substitute.

=== RATE LIMITING — SHIPPED, migrations confirmed landed on production ===

Built and applied (founder confirmed each migration ran):

1. `supabase/migrations/20260803130000_rate_limit_buckets.sql` — new
   `rate_limit_buckets` table + `check_and_increment_rate_limit` RPC. Single
   atomic `INSERT ... ON CONFLICT DO UPDATE` with the reset-vs-increment
   `CASE` inside the one statement (no separate check-then-write). Mirrors
   the existing `increment_quota_if_available` pattern
   (`20260510130557_quota_functions.sql`).
2. `apps/web/lib/rate-limit.ts` — `assertRateLimit`/`getRequestIp`. Fails
   open on limiter errors (logs loudly), matching the new standing answer.
3. Wired into three routes, all keyed on `userId` (all three require auth):
   - `cities/search` — `cities-search:{userId}:{ip}` (combined key,
     matching CA-0002's original design intent), 60/60s
   - `horoscope/generate` — `horoscope-generate:{userId}`, 5/60s. Tightened
     from CA-0002's original 20/60s because this route has no quota system
     backing it — the rate limit IS the spend control here, not a backstop.
   - `oracle/generate` — `oracle-generate:{userId}`, 10/60s. Backed by the
     existing monthly quota (Pattern B) and 24h regen cooldown, so this is a
     burst guard, not the primary defense.
4. `apps/web/app/api/cron/cleanup-deleted-accounts/route.ts` extended to
   prune expired `rate_limit_buckets` rows daily (rides the existing cron,
   no new hot-path cleanup — key cardinality is bounded by active users).
5. `supabase/migrations/20260803131500_rate_limit_buckets_disable_rls.sql`
   then `20260803133000_rate_limit_buckets_enable_rls.sql` — a Supabase SQL
   Editor prompt turned RLS fully off by accident when the first migration
   ran; corrected to this codebase's actual INTERNAL-table convention
   (RLS enabled, no policies — service role has BYPASSRLS, nothing else
   touches this table). Documented in `.planning/SECURITY-MODEL.md` as
   `rate_limit_buckets` / INTERNAL.
6. REVISIT-63 filed in
   `.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md` —
   `getRequestIp`'s trust in `x-forwarded-for` holds only because Vercel is
   currently the sole edge in front of the app; re-verify if a CDN/WAF is
   ever added in front of Vercel.

`oracle/teaser` dropped from scope entirely — confirmed via
`git log --diff-filter=D` that it was deliberately deleted 2026-07-21
(`12f6900`, REVISIT-38: dead code, zero importers), not an accidental gap.
Not one of the four routes that actually needed protection.

Four leftover git worktrees noticed under `.claude/worktrees/agent-*`, all
checked out at `main`'s commit (0c852ec) — stale artifacts from prior agent
sessions. Not touched. Flagging for cleanup consideration, not urgent.

=== BRANCH STATE — re-confirmed 2026-08-03 via fresh fetch ===

main (0c852ec) is still NOT an ancestor of mobile-parallel-test. develop
(b1269ca) is a pure ancestor, contributes nothing new. The rate-limiting gap
that made this matter is now closed — mobile-parallel-test has its own
(better) rate-limiting implementation, not a verbatim port of CA-0002's. No
merge has been performed. Always fetch fresh before any future ancestry claim
— do not trust this section as still-current without re-verifying.

=== CO-FOUNDER SITUATION — unchanged, still the largest project risk ===

Petko's pushed work stops at 2026-05-03. Кръг (synastry) built to completion
locally, demonstrated, never pushed — months of work on one machine, no
backup. Founder has messaged him. Nine Stream K tables remain pre-provisioned
in production with zero migration history and zero code references
(REVISIT-61, `.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md`).
Unconfirmed whether Petko hand-created them. Do not treat as settled.

=== EVERYTHING ELSE FROM THE PRIOR HANDOFF (P.9-P.18 stream state, blocked/
deferred items, founder-track blockers, key docs) IS UNCHANGED — see
HANDOFF-CC-2026-05-12-EOD.md for that detail. This handoff only supersedes
the standing-discipline section and adds the rate-limiting work above. ===
