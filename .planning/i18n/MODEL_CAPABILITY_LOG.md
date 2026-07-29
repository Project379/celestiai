# Model Capability Log — Bulgarian Generation Quality

Findings about the current AI model's (OpenRouter `meta-llama/llama-3.3-70b-instruct`,
see `apps/web/lib/ai/client.ts`) Bulgarian output quality. This is observational
only — no correction map, no post-processing, no retry logic is built off these
findings. The point is a measured baseline for the eventual model swap
(tracked in `.planning/research/AI_PROVIDER_DECISION.md`), not a patch for the
current model's weaknesses.

Backed by `scripts/i18n/check-bg-generated.mjs` (manual/ad hoc so far) and,
as of the runtime safety net below, `bg_generation_flags` in production.

---

## Confirmed garbled/non-word tokens

### Batch 1 (6 real generated horoscope samples, see `scripts/i18n/README.md`)
4 of 6 samples produced a genuine non-word:
- **Съсредени**
- **Съсема**
- **Съсключващото**
- **сеiyan** — mixed-script garble (Cyrillic directly followed by Latin, no
  word boundary). This is the sample that motivated `bg-speller.mjs`'s
  any-script tokenizer (`WORD_RE`) — the original Cyrillic-only tokenizer
  would have split this at the script boundary and silently passed the
  Cyrillic half.

### Batch 2 — live production horoscope output (2026-07-29)
- **съсредни** (4 instances) — not a word. Same stem-family as Съсредени /
  Съсема / Съсключващото above: all four are the model garbling the
  **съсредоточ-** stem ("съсредоточи (се)" = "to focus/concentrate").
  Five confirmed failures now trace to this one stem across two sample
  batches — the strongest single repeating pattern found so far, not a
  one-off.
- **интUITIВNA** — mid-token script collapse for "интуитивна" (Cyrillic И-Н-Т
  start, Latin U-I-T in the middle, Cyrillic В-N-A tail with a stray Latin N).
  Same class as **сеiyan**: tokenizer-level failure, not a prompt-wording
  problem — no prompt instruction plausibly causes a mid-word script switch.

## Pattern summary

- **Stem-specific breakage**: the model repeatedly fails on `съсредоточ-`
  specifically (5 instances across 2 batches, 3 distinct garbled surface
  forms: Съсредени, Съсема, съсредни — plus Съсключващото, which may be the
  same root failure mode on a different stem, unconfirmed). Worth watching
  whether other specific stems show the same repeat-failure signature once
  the runtime log has volume.
- **Mid-token script collapse**: сеiyan and интUITIВNA are the same failure
  class — tokenizer/decoding-level corruption, not a grammar or prompt issue.
  Not fixable by prompt engineering.

## What this tells us, and what it doesn't

This is a qualitative log of confirmed failure *modes*, not a failure *rate*.
Sample-based — we know these things happen, we don't yet know how often across
real traffic. That's what the runtime safety net (`bg_generation_flags` table)
is for: a measured per-day baseline, and an immediate before/after signal
when the model swaps.
