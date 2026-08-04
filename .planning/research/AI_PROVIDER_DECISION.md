# AI Provider — Decision Trail

**Written:** 2026-04-20
**Status:** Current reality documented. BgGPT deferral confirmed. Reversal story told honestly because the planning doc, recent memory, and actual code had been out of sync for long enough that documenting the mismatch is part of the point.
**Epistemic tags:** `[verified]` / `[inferred]` / `[planned]` / `[assumed]` / `[open]`. Sub-claims get their own tag when they make a different claim than parent.

---

## 1. Why this doc exists

`[verified]` During the 2026-04-20 §7 Bug 1 investigation, a side question arose: what AI provider is actually running in production? Three separate descriptions of it existed in the repo and in conversation:

| Source | Claim |
|---|---|
| Round-1 stack snapshot (`Stellaeum_AI_Reference.md`) | "BgGPT primary (INSAIT), Claude/GPT-4o fallback via AI SDK" |
| 2026-04-20 conversation (pre-audit) | "Google Gemini only (in .env)" |
| Actual code + `.env.local` (verified) | OpenRouter (`meta-llama/llama-3.3-70b-instruct`), no fallback |

Three different stories for the same thing. The planning doc was aspirational and never matched reality; a recent mental model added a second layer of drift by remembering "Gemini" when nothing Gemini-shaped was ever wired. This doc pins the ground truth so the next reader doesn't add a fourth layer.

This is the same pattern as `DRIZZLE_DECISION.md §9` — document decisions and reversals at the level of honesty that keeps future readers from re-deriving the history. Not the same pattern as a code fix; this commit changes no runtime behavior.

---

## 2. Original plan (aspirational, never wired)

`[verified — Stellaeum_AI_Reference.md round-1 snapshot]` The initial stack claim:

- **Primary:** BgGPT (INSAIT Institute's Bulgarian-optimized LLM) — chosen for native-Bulgarian quality advantage over English-primary models
- **Fallback:** Claude or GPT-4o via Vercel AI SDK's multi-provider support — chosen so a BgGPT outage didn't stop the product

`[inferred]` This plan was written during early architecture scoping, before implementation. The team installed `@ai-sdk/google` (and by package-lock history, at various points probably `@ai-sdk/openai` and `@ai-sdk/anthropic` too) against the aspiration. **None of the BgGPT integration was ever actually wired up** — no BgGPT client, no BgGPT env key, no BgGPT request code in any route handler.

---

## 3. Current reality (verified 2026-04-20)

### 3.1 What's actually running

`[verified]` The three AI-streaming / AI-generating endpoints all share the same setup:

```ts
// apps/web/app/api/oracle/generate/route.ts
// apps/web/app/api/oracle/teaser/route.ts
// apps/web/app/api/horoscope/generate/route.ts

import { createOpenAI } from '@ai-sdk/openai'

const LLAMA_MODEL = 'meta-llama/llama-3.3-70b-instruct'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})
```

- **Provider:** OpenRouter (OpenAI-API-compatible aggregator, hosts many models)
- **Model:** `meta-llama/llama-3.3-70b-instruct` (Meta's Llama 3.3, 70B parameter instruct-tuned)
- **SDK client:** Vercel AI SDK's `@ai-sdk/openai` — used as a generic OpenAI-compatible client, NOT actually pointed at OpenAI. The import name is slightly misleading.
- **Streaming path:** `streamText({ model: openrouter(LLAMA_MODEL), … })` from the `ai` package
- **Non-streaming path:** `generateText({ model: openrouter(LLAMA_MODEL), … })` for cached teaser/horoscope generation

### 3.2 `.env.local` AI keys (2026-04-20)

```
OPENROUTER_API_KEY=***
```

That's the full set today. No `GEMINI_API_KEY`, no `GOOGLE_GENERATIVE_AI_API_KEY`, no `ANTHROPIC_API_KEY`, no `BGGPT_*`.

**Correction (2026-08-04):** the claim in this section previously read "no `OPENAI_API_KEY` … never was." That was wrong. `.env.local` stored the OpenRouter key under the name `OPENAI_API_KEY` for an unknown period, and `lib/ai/client.ts` read `process.env.OPENROUTER_API_KEY`, which was undefined the whole time. `@ai-sdk/openai`'s `loadApiKey` helper silently falls back to `process.env.OPENAI_API_KEY` when the passed `apiKey` is falsy — so the routes worked anyway, with no error, log, or 500 to surface it. Two coincidences stacked (wrong var name in `.env.local`, undocumented SDK fallback) and neither alone would have been visible. Fixed 2026-08-04 by renaming the var in `.env.local` to `OPENROUTER_API_KEY` and documenting it in `apps/web/.env.example`. See §3.3 below and `MODEL_CAPABILITY_LOG.md` for the naming-collision history.

### 3.3 Fallback behavior

`[verified]` **SDK-level fallback exists and was previously masking a misconfiguration** — see the correction in §3.2. Provider-level fallback (across models/vendors on request failure) is still **none configured**. If OpenRouter returns 429/5xx mid-stream:

- The AI SDK's `streamText` / `generateText` throws
- The route handler's outermost try/catch returns a 500 with a generic Bulgarian error ("Грешка при генериране на четенето" or variant)
- No retry, no backoff, no alternate-provider failover

Single provider, single model, single failure mode. Flagged as a pre-launch decision in `PRE_LAUNCH_PREREQS.md` (separate row for fallback strategy).

### 3.4 Leftover scaffolding

`[verified]` Two artifacts from the aspirational-plan era that don't match current reality:

- `apps/web/package.json` declares `@ai-sdk/google@^3.0.29` as a dependency. **Zero imports across the workspace.** Dead dep.
- `apps/web/app/api/oracle/generate/route.ts:218` has the comment `// 9. Stream via Gemini gemini-2.5-flash` directly above the `openrouter(LLAMA_MODEL)` call. Fossilized — code has been OpenRouter/Llama since before git history I can spot-check.

Both are being cleaned up in a dedicated chore commit at the tail of this docs block. Neither changed runtime behavior.

---

## 4. Three-way mismatch, recorded explicitly

`[verified]` For the trail:

1. **Planning doc said BgGPT primary** (Stellaeum_AI_Reference.md, round 1) — aspirational; was never wired.
2. **Recent conversation memory said Gemini primary** — that was my incorrect recollection in the 2026-04-20 thread. Gemini was also never wired; the `@ai-sdk/google` dep in package.json may have contributed to the mis-memory. Apologies for the confusion.
3. **Actual code always used OpenRouter/Llama** — verified by reading the three generating endpoints + `.env.local` + package.json imports.

The correct reading going forward: **OpenRouter/Llama is and has been the primary AI provider.** There is no migration story to tell. There is an aspiration-to-reality gap story to tell, which is §2 vs §3.

---

## 5. BgGPT status — deferred, not cancelled

`[planned]` BgGPT stays on the roadmap as **[deferred / post-launch]**. The original rationale (native-Bulgarian quality advantage) remains a plausible future value, just not one worth integrating during the current refactor / pre-launch window. The minimum viable product ships on OpenRouter/Llama's Bulgarian output, which is acceptable-not-native-first.

### Revisit conditions

Reopen the BgGPT decision if one or more of the following holds:

- **Bulgarian-language quality advantage demonstrated over Llama 3.3 70B.** Requires a controlled eval — same prompts, same chart, same topic, human-rated output comparison. Not a vibe check. BgGPT is smaller (7B / 27B depending on variant) than Llama 3.3 70B, so "more Bulgarian-specialized" has to beat "more parameters" on relevant tasks for the switch to be worth it.
- **Cost pressure from OpenRouter.** Current OpenRouter pricing for `meta-llama/llama-3.3-70b-instruct` is public; if production traffic scales past where BgGPT's (presumably lower) inference cost matters more than its quality, revisit.
- **Data-residency requirement surfaces.** If legal or enterprise-customer constraints require Bulgarian / EU data residency that OpenRouter (US-hosted) can't satisfy and BgGPT (INSAIT, Bulgarian-hosted) can, the switch becomes a compliance gate rather than a quality/cost one.

None of these hold today. All three are plausible futures.

### What a BgGPT revisit would need to do

- Re-validate the streaming-placement decision per `LOAD_TEST_PLAN.md §5.3` — BgGPT's latency characteristics may differ from Llama's enough to shift the Edge / Serverless / dedicated-service choice for the streaming endpoints.
- Re-run `LOAD_TEST_PLAN.md` Scenarios B (warm-cache) and C (cold-cache) against BgGPT, since TTFT and throughput numbers gathered against Llama don't transfer.
- Integration code: add BgGPT client (likely via REST, not via Vercel AI SDK unless INSAIT ships a provider plug-in), wire as primary with Llama/OpenRouter as fallback, update the prompt layer if needed for BgGPT's tokenizer / context window.

---

## 6. Consequences for the current docs

`[verified]` Three planning docs need updating as a result of pinning this reality:

- `Stellaeum_AI_Reference.md` — replace "BgGPT primary, Claude/GPT-4o fallback" with the OpenRouter/Llama reality. Preserve BgGPT references where they describe the deferred future.
- `LOAD_TEST_PLAN.md` — provider under test in §5.2 is OpenRouter/Llama, not BgGPT. Predecessor chain entry about "BgGPT API access" becomes "OpenRouter API access." Add §5.3 forward-looking note about the BgGPT revisit requiring re-validation.
- `PRE_LAUNCH_PREREQS.md` — the AI-provider verification row becomes OpenRouter-specific. Add a separate row for fallback-strategy decision.

Shipping as a trio of commits right after this doc, so each source of truth points at the same current reality.

---

## 7. Trail

- Earlier aspirational plan: `.planning/research/Stellaeum_AI_Reference.md` round-1 snapshot (pre-update)
- Current provider code: `apps/web/app/api/oracle/generate/route.ts`, `oracle/teaser/route.ts`, `horoscope/generate/route.ts`
- Env: `apps/web/.env.local` (OPENROUTER_API_KEY only)
- Cleanup of leftover scaffolding: dedicated chore commit at the tail of the 2026-04-20 docs block
- Related pattern (reality vs planning doc mismatch surfacing during unrelated bug investigation): `DRIZZLE_DECISION.md §9` + `SCHEMA_DRIFT_AUDIT.md`
