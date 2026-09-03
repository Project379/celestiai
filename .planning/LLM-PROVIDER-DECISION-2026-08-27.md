---
title: LLM provider decision — criteria and integration scoping
status: DECIDED-AND-IMPLEMENTED. Gemini 3.7 Flash via the direct Google Gemini API, implemented 2026-09-01.
created: 2026-08-27
gates: (1) the privacy policy's AI sub-processor + third-country-transfer section — cannot be finalised until the provider and its jurisdiction are known; (2) the 300/month premium safety-net cap, which was derived from Llama 3.3 70B pricing and must be re-derived on any swap.
---

# LLM provider decision

## Implementation decision — 2026-09-01

The production model is now **Gemini 3.7 Flash** (`gemini-3.7-flash`)
through Google's direct Gemini API and the Vercel AI SDK Google provider.
Both the Oracle and daily-horoscope generation routes share the centralized
provider in `apps/web/lib/ai/client.ts`. OpenRouter/Llama and its SDK
dependency have been removed. Every model call uses `maxRetries: 0` so the
SDK cannot silently multiply API requests. The daily horoscope makes exactly
one Gemini 3.7 request and has no model fallback. Oracle first makes one
Gemini 3.7 request and, only when that call fails with a transient provider
error (408, 429, retryable, or 5xx), makes one fallback request to
**Gemini 3.6 Flash** (`gemini-3.6-flash`). Non-transient errors do not trigger
the fallback.

Both routes request native structured output and suppress returned thinking.
Oracle buffers the complete result before showing it, allowing the application
to expose only sanitized final Bulgarian text and to avoid mixing a partial
3.7 answer with a 3.6 fallback answer. The server does not forward the browser
abort signal to Gemini, so generation and persistence can finish after the
user closes the Oracle panel or navigates away.

The analysis below is retained as the decision record that led to the swap.
Any sentence describing OpenRouter/Llama as the "current" implementation is
historical as of 2026-09-01. The privacy-policy processor section, Google
terms/DPA review, production `GEMINI_API_KEY`, and quota cost-envelope update
remain launch follow-ups.

## Why this is now urgent, not just "the model swap"

The current model (Llama 3.3 70B via OpenRouter) is a placeholder — it
produces non-words and drifts into Russian. Replacing it has always been
known-open. **What changed:** two things now depend on the *provider*
choice, not just the model:

1. **The privacy policy** (`PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md` §4)
   names the AI sub-processor and states the third-country-transfer
   safeguard and the retention/training terms. If we're not on
   OpenRouter, that section names the wrong company and possibly the
   wrong jurisdiction. The brief is written vendor-agnostic with
   `[[AI PROVIDER]]` / `[[JURISDICTION]]` placeholders precisely so the
   lawyer isn't blocked — but the policy can't ship until they're filled.
2. **The 300/month premium safety-net cap** (`COMPLETION-TRACKER` Tier 2
   #4) was derived from Llama 3.3 70B's per-call cost at OpenRouter's
   routing ($0.0006–$0.002/call). A different model/provider changes that
   number. Re-derive on swap.

## Decision criteria — what actually matters for us

Not "which model is best." These six, in rough priority order:

### 1. Bulgarian output quality
The whole reason for switching. The bar: coherent, idiomatic Bulgarian
with correct grammar (пълен/кратък член, agreement), no invented words,
no script drift. Test the shortlist against **real prompts from this
codebase** — `lib/oracle/prompts.ts` + `lib/oracle/chart-to-prompt.ts`
output for a few charts, and `lib/horoscope/prompts.ts`. Run the results
through `scripts/i18n/bg-speller.mjs` (the same checker `check:bg-strings`
uses) for an objective non-word count, and read them for register.

### 2. Cost per call at our token shape
Our shape: **~1,000–1,500 input tokens** (system prompt + chart text),
**1,500–2,000 max output tokens**. Get the blended $/call at that shape
for each candidate. This directly re-sets the premium cap and the
unit-economics model. A 5–10× cost swing between candidates is realistic.

### 3. Single company vs. router — determines the sub-processor list
- A **direct provider** (Anthropic, OpenAI, Mistral, Google) = **one
  name** in the policy, one DPA, one jurisdiction.
- A **router** (OpenRouter, and some others) fans out to many downstream
  providers = the sub-processor list is the router **plus every
  downstream provider the routing can reach**, unless we pin an
  allowlist. More disclosure, more DPAs, a weaker retention guarantee
  unless ZDR is enforced.
- **This is a real trade:** routers give model flexibility and failover;
  a direct provider gives a clean, defensible privacy story. Given we're
  a birth-data app writing a policy a regulator may read, lean toward a
  **single direct provider** unless the router's flexibility is load-
  bearing.

### 4. Data retention & training terms (goes verbatim in the policy)
For each candidate, get in writing:
- Does it **train** on API inputs by default? (Anthropic and OpenAI API:
  **no** by default. Many others: **no**. Some: yes unless opted out.)
- **Retention window** for prompts/outputs (abuse-scanning holds are
  common — e.g. 30 days — even where there's no training).
- Is a **zero-retention / no-logging** mode available, and on what plan?
- For OpenRouter specifically (if we stay): OpenRouter itself doesn't log
  content by default (metadata only); **ZDR is enforceable account-wide,
  per-model-group, or per-request** (`zdr` param), plus provider
  allow/deny lists; ZDR endpoints can't retain or train. **Action if we
  stay on OpenRouter:** turn on account-wide ZDR + a named allowlist.

### 5. Jurisdiction — an EU-hosted provider removes a whole section
If the provider (and, for a router, all allowed downstream providers) is
**EU/EEA-hosted**, the Chapter V third-country-transfer analysis
disappears from the policy entirely — no SCCs, no adequacy question, no
transfer-impact assessment. Candidates worth checking for EU hosting:
**Mistral** (French, EU data residency available), **Anthropic** and
**OpenAI** (EU data-residency / EU-region endpoints now exist for some
plans), Azure OpenAI (EU regions), some OpenRouter providers filtered by
region. This is worth real weight — it's the difference between a
two-paragraph disclosure and a section with SCCs and a TIA.

### 6. Integration cost — string change or real work? (see below)

---

## Integration scoping — how much work is a non-OpenRouter provider?

**Answer: it's a `apps/web/lib/ai/client.ts`-only change. Not a rewrite.**
VERIFIED by reading the code:

- `lib/ai/client.ts` is the **single source of truth** — it exports
  `AI_MODEL` (a string) and `openrouter` (a provider instance from
  `createOpenAI({ baseURL, apiKey })`).
- **Exactly two consumers:** `app/api/oracle/generate/route.ts` and
  `app/api/horoscope/generate/route.ts`, both calling
  `generateText` / `streamText` from the **Vercel AI SDK** with
  `model: openrouter(AI_MODEL)`. The AI SDK's `generateText`/`streamText`
  interface is **provider-agnostic** — the route code does not change.
- The sentinel post-processing (`[planet:KEY]…[/planet]`) is
  prompt-instruction-based, not provider-specific.

So the swap is one of:

| New provider type | Change | Effort |
|---|---|---|
| **OpenAI-compatible** endpoint (Together, Fireworks, DeepInfra, Groq, Mistral's OpenAI-compat API, Azure OpenAI, a self-host) | change `baseURL` + `apiKey` env + `AI_MODEL` string in `client.ts` | **~3 lines** |
| **Has a first-party Vercel AI SDK provider** (`@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/mistral`, `@ai-sdk/openai` proper) | `pnpm add @ai-sdk/<x>`; swap the import + factory call + `AI_MODEL` in `client.ts`; adjust any provider-option names | **~10–20 lines + 1 dependency**, still one file |
| **No AI SDK support at all** (rare) | write a thin adapter conforming to the AI SDK's `LanguageModelV1` interface, or call the provider's REST API directly in `client.ts` | **~half a day**, still contained to `client.ts` + maybe a small helper |

The streaming path (`streamText` in both routes) is normalised by the AI
SDK, so **streaming keeps working across a provider swap without touching
the routes**. Nothing downstream of `client.ts` — the quota gate, the
`bg_generation_flags` check, the sentinel rendering, the caching — is
provider-aware.

**Planning takeaway:** the provider choice does **not** need to be scoped
as an integration project. Whatever the co-founder picks, the code change
is small and lives in one file. The gating work is the *decision* and its
downstream effects (policy section, cost-cap re-derivation), not the
wiring.

---

## What to bring back from the evaluation

For the shortlist (2–3 candidates):
1. Bulgarian quality verdict + `bg-speller` non-word counts on real
   prompts.
2. $/call at ~1.25k in / ~1.75k out.
3. Direct provider or router (→ sub-processor list shape).
4. Training default + retention window + zero-retention option, **in
   writing** (a link to their data-processing terms).
5. Hosting region(s) — is an EU option available for the model we'd use?
6. Which of the three integration tiers above it falls into.

Then: pick, fill `[[AI PROVIDER]]` / `[[JURISDICTION]]` in the lawyer
brief, re-derive the premium cap, and make the `client.ts` change.

---

## Premium cap re-derivation (gate 2) — analysis only, 2026-08-28

**No code change. No decision made in code.** The swap is not shipped; this
is the number-work the founder asked for so the 300/month cap can be judged
against Petko's recommended default (`google/gemini-3.7-flash`) before it
lands. Petko still owns the swap and the final ruling.

### Inputs

- **Cap:** `PREMIUM_MONTHLY_LIMIT = 300` (`apps/web/lib/subscriptions/quota.ts:25`),
  shared by `oracle/generate` + `horoscope/generate`. Alert at 200
  (`PREMIUM_ALERT_THRESHOLD`). Daily horoscope and regenerations are
  exempt from the quota, so 300 = user-initiated Oracle readings +
  on-demand horoscope generations per calendar month.
- **Original basis:** Llama 3.3 70B at OpenRouter routing, **$0.0006–$0.002
  per call**.
- **Gemini 3.7 Flash, current OpenRouter price:** ≈ $356 per 100k
  generations at 2k in / 1.5k out → **$0.0036 per call**. Research flags
  this as **currently ~75% off and explicitly not guaranteed**.
- **List price** (discount removed): $0.0036 ÷ 0.25 = **$0.0144 per call**
  — 4× the current price. This is the figure to plan against, per the
  research's own warning.
- **Subscription price:** €9,99/mo, or €99,99/yr (annual effective ≈
  €8,33/mo) — Phase 7 settled on EUR. USD→EUR at ≈ 0.93: $0.0144 ≈
  **€0.0133 per call**.

### Cost per premium user per month, at the cap

| Pricing regime | €/call | 300 calls | % of €9,99/mo | % of €8,33/mo (annual) |
|---|---|---|---|---|
| Llama 3.3 70B (cap's original basis) | €0.0006–€0.0019 | €0.17–€0.56 | 2–6% | 2–7% |
| Gemini 3.7 Flash — current (75% off) | €0.0033 | **€1.00** | ~10% | ~12% |
| Gemini 3.7 Flash — **LIST price** | €0.0133 | **€4.00** | **~40%** | **~48%** |
| GPT-5.4-mini (quality fallback) | not quoted in brief — assume ≥ Gemini list; any cap must hold here too | | | |

### Reading

**At Llama prices, 300 is a pure circuit breaker.** It exists to catch a
runaway client or a compromised account — a number no legitimate user
reaches (300/month = 10 generations every single day). Whether it were 300
or 3,000 would not move the P&L. That is the regime the cap was designed
in.

**At Gemini list price, 300 stops being only a circuit breaker and becomes
a margin input.** €4.00/user/month at the cap is ~40% of monthly
subscription revenue (~48% against the annual effective rate), before
Stripe fees, hosting, the Swiss Ephemeris licence, and support. The
*average* premium user will not hit 300 — average cost sits far below the
cap — but the cap is what bounds the expensive tail, and at 4× the
per-call price that tail is 4× more costly. A cohort of 5–10% power users
near the cap now meaningfully shifts blended COGS per premium user.

**So: 300 is still a safety net at the discounted price (~10% of revenue —
noticeable but tolerable). At list price it is a real bill.** Planning
against the promotional price is the trap the research is warning about.

### Options (for Petko's ruling, not decided here)

1. **Keep 300** — defensible only if the swap lands on the discounted
   price *and* the business accepts re-visiting the moment the discount
   moves. Fragile.
2. **Re-set to ~150/month** (5/day; alert at 100) — still far above any
   genuine use, halves the tail to ~€2.00/user/month (~20% of revenue) at
   list price, stays invisible to real users.
3. **Decouple the two jobs the number is doing** — keep a high abuse cap
   (300–500, circuit-breaker only) and add a separate per-user *cost*
   alert at a spend threshold, so the number that defends margin is not
   the same number that defends against a leaked key. Cleanest, slightly
   more work.
4. Whatever the number: **derive it at list price**, and confirm it also
   holds at the **GPT-5.4-mini fallback** price — the fallback path must
   not blow the budget the primary path was sized for.

### Cross-references to update when the swap ships

- `COMPLETION-TRACKER.md` Tier 2 #4 (the cap's rationale text still says
  "derived from Llama 3.3 70B pricing").
- `MODEL_CAPABILITY_LOG.md` — EuroEval baseline table added 2026-08-28;
  add the measured post-swap flag-rate delta.
- The lawyer brief's `[[AI PROVIDER]]` / `[[JURISDICTION]]` stay unfilled
  until the swap is shipped and ruled on — a recommendation exists, it is
  **not yet decided in code** (noted in
  `PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md`).
