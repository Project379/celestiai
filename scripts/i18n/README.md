# Bulgarian spell-checking tooling

Two scripts, one shared core (`bg-speller.mjs`), backed by `dictionary-bg`
(actively maintained Hunspell-format Bulgarian dictionary, `wooorm/dictionaries`)
+ `nspell`. No Java, no Docker, no API key, no per-call cost.

## What this catches

Real non-words — typos, garbled/mixed-script tokens (e.g. an LLM output like
`сеiyan`), misspellings. Confirmed against 6 real generated horoscope samples:
caught all 4 genuine garbled tokens produced by the current placeholder model
(Llama 3.3 70B) in that batch.

## What this CANNOT catch — read this before trusting a green run

- **Register and tone.** "Вашият ден е под влиянието на" is grammatically
  perfect and spell-checks clean, and still reads as translated-from-English
  rather than natural Bulgarian. This tool has no concept of register.
- **Calques and translated-feel syntax.** Word-for-word-correct sentences
  built on English sentence structure pass every check here.
- **Grammar** in the broader sense — case agreement, word order, article
  placement. `dictionary-bg` is a spelling dictionary, not a grammar checker
  (LanguageTool, which does check grammar, does not support Bulgarian at all —
  confirmed directly against its API, not assumed; see the earlier investigation).
- **Whether a flagged word is a real domain term or an actual typo.** The
  checker cannot tell "Асцендент" (real astrology term) from a genuine
  misspelling — that's why `bg-allowlist.data.mjs` exists, and why it's
  explicitly a human-curated list, not something inferred automatically.

Register/grammar/calque review stays a human pass. Green here means "no
non-words found," nothing more.

## Two entry points

- `pnpm run check:bg-strings` (`../check-bg-static-strings.mjs`) — scans
  every `.ts`/`.tsx` file in `apps/mobile`, `apps/web`, `packages` for
  Cyrillic string literals and spell-checks each one. **Not wired into
  `check:all`/CI yet** — first run flagged 428 occurrences, nearly all real
  domain vocabulary and loanwords the general-purpose dictionary doesn't
  know (astrology jargon, "имейл", productive "по-X" comparative forms),
  not actual typos. Wiring a check with that much noise into a required CI
  gate would just get ignored or ratchet down over time; it needs a real
  triage pass into `bg-allowlist.data.mjs` first (down to 339 after the
  first mechanical pass — see that file's own header for what's still
  uncategorized). That triage is a human judgment call (real word vs.
  typo), not something to guess at automatically.
- `node scripts/i18n/check-bg-generated.mjs <samples.json>` — checks
  arbitrary generated text (LLM sample output), given a JSON array of
  `{label, text}`. Run manually whenever a prompt changes. Always exits 0 —
  a high failure rate here is expected, currently-baseline noise from a
  known-weak-Bulgarian placeholder model, not something that should fail a
  build. Report generated-output failures separately from static-string
  failures; they mean different things (baseline model noise vs. a real
  bug to fix now).

## Runtime safety net (production)

As of 2026-07-29, `check-bg-generated.mjs`'s checker (via `bg-speller.mjs`,
reused directly rather than duplicated) also runs in production: every
horoscope/Oracle generation is checked fire-and-forget after the response
already returned, and one row is written to the `bg_generation_flags` table
(INTERNAL, RLS-locked — see `.planning/SECURITY-MODEL.md`). This is purely
observational — nothing corrects, retries, or rewrites output. It exists to
measure the real per-day failure rate (not samples) and give an immediate
before/after when the model swaps. See `apps/web/lib/ai/check-bg-output.ts`
and `.planning/i18n/MODEL_CAPABILITY_LOG.md`.

- `node scripts/i18n/report-generation-flags.mjs [--days N]` — reads that
  table and prints a per-day, per-source failure-rate summary plus a
  flagged-word frequency breakdown (are failures concentrated on specific
  stems, e.g. съсредоточ-?). Read-only, service-role key, default 30-day
  window.

## `bg-allowlist.data.mjs`

Starter list only, seeded from the highest-frequency/least-ambiguous flags
in the first run. Growing it correctly requires reviewing each remaining
flagged word and deciding real-word-add-here vs. actual-typo-fix-at-source
— that review has not been done exhaustively and shouldn't be assumed done.

Was `bg-allowlist.txt` (read via `readFileSync` at module scope in
`bg-speller.mjs`) until 2026-08-27. Converted to a bundled data module
after that `readFileSync` 500'd in production — webpack freezes
`import.meta.url` to the build machine's absolute path, so the read target
was wrong on Vercel regardless of file tracing (see
`COMPLETION-TRACKER.md` §0.7). Edit `bg-allowlist.data.mjs` directly; it is
now the source of truth. One string per array entry, case-sensitive.
