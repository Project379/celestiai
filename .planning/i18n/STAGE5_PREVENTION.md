# Stage 5 — Prevention Mechanisms

Purpose: once Stage 1-4 fixed the known problems, Stage 5 stops new ones
from shipping. Four mechanisms: three fully implemented and gating in
`check:all`, one designed and not built.

## Scope note: machine-facing endpoints are NOT part of this workstream

`apps/web/app/api/cron/daily-horoscope/route.ts` and
`apps/web/app/api/cron/cleanup-deleted-accounts/route.ts` guard on
`CRON_SECRET`, not a user session. Their 401 response is never seen by a
real user — only Vercel's cron infra or an attacker probing the endpoint.
These briefly carried the Bulgarian "Сесията ти изтече. Влез отново."
(picked up during the blanket "Неоторизиран достъп" conversion, which
didn't distinguish user-auth routes from infra-auth routes) and were
corrected to plain English `'Unauthorized'` on 2026-07-30. **Do not
convert these back to Bulgarian** — they are machine-facing and out of
this workstream's scope entirely, the same way a webhook signature check
or a health-check endpoint would be. If a future change adds a genuinely
user-facing auth failure to a cron-triggered code path, that new surface
gets evaluated on its own, not by pattern-matching "it's in `api/cron/`."

## 1. `check:bg-strings` wired into `check:all` — IMPLEMENTED, GATING

`scripts/check-bg-static-strings.mjs` scans every `.ts`/`.tsx` Cyrillic
string literal against `dictionary-bg` + `bg-allowlist.txt`. It existed
before this session but was not part of `pnpm run check:all` — see that
script's own history for why (428 initial flags, mostly real domain
vocabulary, needed a triage pass into the allowlist first). The allowlist
triage happened across Stage 1-2 of this workstream (including a
word-by-word proper-noun review, three corrected transliterations —
Гъруик->Гървиг, Сияма->Шама, Аустралис->Австралис — and two real-word
rulings, страхова->боязлива and навичен->заучен, fixed at source rather
than allowlisted since they weren't real words). Verified gating for real
(not just "it currently passes"): a deliberate typo was injected, `check:all`
failed at the `check:bg-strings` step before reaching typecheck, then
reverted and confirmed clean again.

## 2. Approved-copy lock — IMPLEMENTED, GATING

`scripts/i18n/generate-copy-lock.mjs` snapshots every Cyrillic literal
(keyed by file+text, not file+line — a line-number key would make any
unrelated one-line edit above a literal register as a spurious remove+add)
into `scripts/i18n/copy-lock.json`. `check-copy-lock.mjs` fails when the
current tree's literals differ from that snapshot. Doesn't judge whether
new copy is *good* Bulgarian — it forces a human to notice and re-approve
(by regenerating the lock) when copy changes, rather than a well-intentioned
refactor silently drifting register or introducing a typo unnoticed.
Wired into `check:all` after `check:bg-strings`. Verified: a deliberate
text change was caught; a pure line-shift with no text change was
correctly NOT flagged (confirming the file+text key works as designed,
not file+line).

## 3. Lint rule against Cyrillic literals outside content-home files — IMPLEMENTED, GATING (ratchet baseline)

`packages/config/eslint/no-new-bg-strings.cjs` — shared `no-restricted-syntax`
rule (ESQuery selector matching any Cyrillic-containing `Literal`/
`TemplateElement`), wired into all three ESLint configs (web/mobile/core)
at `warn` severity, with an exemption glob list (`CONTENT_HOME_GLOBS`) for
established long-form content files (`catalog.ts`, `interpretations.ts`,
`guide-content-bg.ts`, `bg-grammar.ts`, `format-days-hours.ts`,
`transit-analysis.ts`, etc.) plus `packages/i18n/strings/**` pre-emptively
for the not-yet-built namespaced strings module.

A static ESLint rule has no concept of "new" vs. "pre-existing" — it flags
every matching literal every time it runs, uniformly. "A lint rule against
*new* Cyrillic literals" is actually implemented via a **ratcheting
baseline**, not a blanket `eslint --max-warnings` on each workspace's full
lint script (that would conflate this rule's count with unrelated
pre-existing warnings — react-hooks/exhaustive-deps, a11y, etc. — making
the ceiling meaningless). `scripts/i18n/check-bg-lint-baseline.mjs` runs
ESLint with the JSON formatter across all three workspaces, counts only
`no-restricted-syntax` violations, sums them, and fails if the total
exceeds `BASELINE`. Existing debt is grandfathered; a new instance
anywhere pushes the count over and fails the build.

**BASELINE = 1336, recorded 2026-07-30** (51 `@stellaeum/core`, 752
`@stellaeum/web`, 533 `@stellaeum/mobile`). Originally measured at 1338 the
same day; the cron-endpoint fix (see "Scope note" above) removed 2
Cyrillic literals before the baseline was locked in, so it already
reflects that rather than starting 2 wider than strictly necessary. As
the namespaced strings-module migration proceeds and literals move out of
components into that module, lower `BASELINE` in the script to match —
a future drop in the count is then visible as progress, not noise.

**Verified for real, both directions**: confirmed the exemption mechanism
correctly silences established content-home files (severity resolves to
`0`/off via `eslint --print-config`) while still flagging genuine
outside-content-home Cyrillic literals — caught two real gaps in the
initial exemption list (`format-days-hours.ts`) during this verification,
fixed before finalizing. Then verified the ratchet itself: injected one
new Cyrillic literal into a non-content-home file, ran the baseline check,
confirmed it failed (1337 > 1336) with a clear message, reverted, confirmed
clean pass (1336) again. Wired into `check:all` after `check:copy-lock`.

## 4. Assembled-output register/grammar check — DESIGNED, NOT BUILT

**Why this exists**: found 2026-07-30, during register-conversion cleanup.
`transit-analysis.ts`'s `houseTheme()`/`aspectMeaning()` were left formal
while `enrichActiveTransit`/`enrichUpcomingTransit` (which interpolate
those functions' output directly into their own sentences) had already
gone informal from an earlier, unrelated fix. Both fragments were
internally clean. Only the **assembled** sentence was broken — mixed
register, live in production. See `.planning/i18n/BG_COMPOSED_STRINGS.md`'s
"Structural finding" section for the full writeup and the actual broken
sentence.

**What it would need to do**: for every composed-string site catalogued in
`BG_COMPOSED_STRINGS.md`, generate real assembled output across a
representative sweep of input conditions (the way the transit-analysis.ts
verification in this session did by hand — vary planet, aspect, house,
gender, hoursUntil, etc.) and run register-consistency + spell + grammar
checks against the **assembled string**, not the template fragments.
Fragment-level checking (what `check-bg-generated.mjs` and the approved-
copy lock both do) structurally cannot catch this class of bug, because
each fragment passes on its own.

**Why not built this session**: this is a meaningfully larger scope than
mechanisms 1-3 — it needs a registry of composed-string sites (or a way to
enumerate them programmatically), a way to generate representative input
conditions per site, and a register/grammar checker that's more than
spelling (the existing `bg-speller.mjs` only catches non-words, not
"твоя natal X ... използвате"-style mixing — the words are all spelled
correctly). Proposing before building, same discipline as the runtime
safety net design earlier this session. Revisit trigger: next time a
composed-string site is added or changed, or when there's budget for a
dedicated design pass on what "generate representative input conditions"
means per site.
