# Stage 5 — Prevention Mechanisms

Purpose: once Stage 1-4 fixed the known problems, Stage 5 stops new ones
from shipping. Four mechanisms: two fully implemented and gating, one
built and verified but deliberately not gating yet (needs a founder
decision on enforcement), one designed and not built.

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

## 3. Lint rule against Cyrillic literals outside content-home files — BUILT, VERIFIED, NOT GATING

`packages/config/eslint/no-new-bg-strings.cjs` — shared `no-restricted-syntax`
rule (ESQuery selector matching any Cyrillic-containing `Literal`/
`TemplateElement`), wired into all three ESLint configs (web/mobile/core)
at `warn` severity, with an exemption glob list (`CONTENT_HOME_GLOBS`) for
established long-form content files (`catalog.ts`, `interpretations.ts`,
`guide-content-bg.ts`, `bg-grammar.ts`, `transit-analysis.ts`, etc.) plus
`packages/i18n/strings/**` pre-emptively for the not-yet-built namespaced
strings module.

**Verified working**: confirmed the exemption mechanism correctly silences
established content-home files (severity resolves to `0`/off via
`eslint --print-config`) while still flagging genuine outside-content-home
Cyrillic literals — caught two real gaps in the initial exemption list
(`format-days-hours.ts`, a i18n-grammar sibling of `bg-grammar.ts`) during
this verification, fixed before finalizing.

**Not wired into `pnpm lint`/`check:all` as blocking — this needs a founder
decision, not a unilateral call.** Blast radius: 1338 warnings across the
whole app (51 core, 754 web, 533 mobile) — because the namespaced
strings-module architecture this rule assumes doesn't exist yet, nearly
every component's hardcoded UI label (buttons, headings, aria-labels) has
nowhere else to live. This is expected, not a sign anything is broken —
matches the original i18n-architecture note ("halt when the module
structure exists, before mass-migrating call sites").

**Also worth flagging explicitly**: "a lint rule against *new* Cyrillic
literals" and what got built are two different things. A static ESLint
rule has no concept of "new" vs. "pre-existing" — it flags every matching
literal every time it runs, uniformly. True new-only enforcement needs
either (a) a diff-aware check (compare only files/lines touched in a PR
against a base branch — more tooling, not built), or (b) ESLint's
`--max-warnings <N>` idiom: set N to the current baseline count, which
fails the build only if the count *increases*, effectively blocking new
violations while grandfathering existing ones without requiring an
immediate mass fix. (b) is the standard, low-effort way to get the
"prevent new" behavior the founder asked for without a bigger diff-tooling
build — flagging as the likely next step, pending the founder's call on
whether/when to wire it in and at what baseline.

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
