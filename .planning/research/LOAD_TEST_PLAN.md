# AI Streaming Endpoint — Load Test Plan

**Written:** 2026-04-18
**Status:** Plan only — no tests written yet
**Epistemic tags:** `[verified]` = read from files/tools; `[inferred]` = deduced from files; `[planned]` = not yet implemented; `[assumed]` = conventional wisdom / placeholder. `[open]` = question not yet answered, action required.

---

## Why this doc exists

`[verified — Celestia_AI_Reference.md §3]` The reference doc says *"Load test before launch with k6 or Artillery against the streaming endpoint at 500 concurrent connections — 10 is not a load test."*

`[inferred]` That's framing as a credible-test-floor guideline ("10 is not a load test"), not a derived traffic estimate from expected Bulgarian MVP DAU. Previous chat treated the 500 number as a measured SLO — it isn't.

`[verified — standard k6 behavior]` A default `k6` script cannot meaningfully validate any streaming-endpoint target either way; its built-in metrics measure the wrong things (§1 below).

`[planned]` This doc exists so the design and the targets are shared, reviewable, and attackable.

---

## 1. What default k6 tools fail to measure

`[verified — standard k6 behavior]` k6's default HTTP module emits:

- `http_req_duration` — wall time from send-to-final-byte
- `http_reqs` — request count
- `http_req_failed` — failure rate

For a non-streaming JSON endpoint, that's sufficient. For an **LLM streaming endpoint**, every one of those metrics is a trap:

- `http_req_duration` **collapses TTFT and generation time into a single number**. A response that streams its first token in 200ms and finishes in 28s reports identically to one that hangs for 22s then dumps everything in 6s. The user experience is vastly different; the metric doesn't see it.
- `http_reqs / s` **doesn't distinguish reqs that started streaming from reqs still waiting for upstream connection**. 50 reqs/s with 45 waiting on cold-cache BgGPT warm-up is a different system than 50 reqs/s with warm cache.
- `http_req_failed` **misses partial failures**. A stream that starts fine then aborts mid-way returns HTTP 200 with a truncated body. To k6 it looks fine.

## 2. What the test actually needs to measure

`[planned]` Custom k6 metrics via the `k6/metrics` module:

| Metric | Definition | Target |
|---|---|---|
| `ttft` (Trend) | Time from request open to first body byte (first streamed token) | p50 < 800ms, p95 < 1.8s [assumed — typical perceptual thresholds] |
| `itl` (Trend) | Median inter-token latency within a stream (sampled every N tokens) | p50 < 60ms [assumed — baseline for BgGPT tier not yet measured] |
| `stream_duration` (Trend) | Total time from TTFT to last byte | p95 < 30s [assumed — soft UX cap] |
| `stream_tokens` (Counter) | Total tokens streamed, to correlate with cost | reporting only |
| `stream_aborted` (Counter) | Streams that closed mid-response | < 0.5% [assumed] |
| `stream_stalled` (Counter) | Streams that had ≥3s gap between tokens | < 2% [assumed] |
| `cache_hit` (Rate) | Proportion of requests served from pre-generated cache | should be high — see §4 |

## 3. Test scenarios — ordered

`[planned]` Each scenario is a separate k6 test with a distinct failure mode:

### Scenario A — mocked upstream, correctness
- **Purpose:** validate that the test harness itself measures what we think it measures
- **Upstream:** mock BgGPT with a local stub that emits tokens at deterministic cadence (10 tokens/s, 15-second total)
- **Load:** 10 concurrent for 2 minutes
- **Pass:** `ttft` and `itl` read sensibly; `stream_duration` ≈ 15s as expected
- **Why first:** if the harness is broken, every downstream number is garbage

### Scenario B — warm cache, real traffic shape
- **Purpose:** baseline under realistic MVP conditions
- **Upstream:** real BgGPT (or fallback Claude), but requests deliberately hit pre-generated daily horoscope combinations (see Celestia_AI_Reference.md §3 — cached per sun-sign × moon-phase × day, ~100 unique per day)
- **Load:** ramp 0 → 100 concurrent over 5min, hold 10min
- **Pass:** `cache_hit` > 90%; `ttft` p95 < 500ms; cost per request near zero

### Scenario C — cold cache, worst case
- **Purpose:** characterize behavior when cache is empty (first request of the day for a combo)
- **Upstream:** real BgGPT, cache-bypass header set
- **Load:** 50 concurrent for 5min
- **Pass:** `ttft` p95 < 3s; `stream_aborted` < 1%; ** cost envelope** understood (this tells us AI bill per 1k cold requests)

### Scenario D — saturation probe, Bulgarian MVP target
- **Purpose:** find where the system breaks under MVP-appropriate load (see §5 below for number derivation)
- **Upstream:** real BgGPT, realistic cache hit mix (80% warm / 20% cold)
- **Load:** ramp 0 → 100 concurrent over 5min, hold 15min, then 100 → 200 over 5min, hold 10min
- **Pass:** no degradation of `ttft` p95 above 2.5s up to 100; identify and document where p95 crosses 3s

### Scenario E — aspirational target (Celestia_AI_Reference §3)
- **Purpose:** validate the 500-concurrent guideline from the reference doc
- **Upstream:** real BgGPT, realistic cache mix
- **Load:** ramp 0 → 500 over 10min, hold 10min
- **Pass:** system stays up; `ttft` p95 degrades gracefully, doesn't cliff
- **When:** before Series-A-style growth push, not MVP launch

## 4. Why cache-hit matters more than raw concurrency

`[verified — per Celestia_AI_Reference.md §3 and §5]` The daily horoscope endpoint generates ONCE per (sun-sign × moon-phase) combination per day. That's <100 unique responses for the entire user base on any given day. Everything else is a cache lookup from Supabase.

`[inferred]` Implication: under warm-cache conditions, the AI streaming endpoint is effectively serving static content and can trivially handle hundreds of concurrent. The real bottleneck is **cold-cache request rate** (first request of the day per combo, or Oracle FAB conversations which are per-user-unique).

`[planned — proposed free/premium caps, not yet implemented]` The Oracle FAB is the uncached path. Its load is bounded by:
- Free tier: 3 queries/month/user — negligible fleet-wide
- Premium tier: 20 queries/day/user — the real driver
These caps come from `MOBILE_UX_RESEARCH.md §11.7` as proposals, not shipped code. Adjust the load model if caps change.

## 5. Deriving an MVP traffic target — and what "500" actually means

`[assumed — no measured baseline yet; numbers should be revised against analytics]`

### Forward model: how much traffic does Bulgarian MVP realistically produce?

- Bulgarian internet-adult population: ~5M `[assumed]`
- Celestia TAM (women 22-40, spiritual/wellness-leaning): ~300-500k `[assumed]`
- Year-1 DAU target: 1-3% of TAM → 3k-15k DAU `[assumed]`
- AI interactions per DAU: 1-3 `[assumed — varies by tier and Oracle adoption]`

At **10k DAU × 2 interactions/day = 20k streaming responses/day**, with 30% of daily traffic in a peak 90-minute window (morning + evening pair):
- Peak volume: 6k interactions / 90min = 67/min = **1.1 interactions/sec average**
- At ~25s streaming duration, mean concurrency: 1.1 × 25 = **~28 concurrent**
- With 3× safety margin for spikes: **~85 concurrent**

### What this says about the 500 number

- `[verified — Celestia_AI_Reference.md §3]` 500 concurrent is the architecture *target* in the reference doc. It is **not** a measured SLO, **not** a user-derived requirement, and **not** MVP-calibrated.
- `[inferred]` 500 is credibly ~5× above forward-modeled MVP traffic. The reference doc's framing ("10 is not a load test") suggests it's a floor for "test like you mean it," not an expected-load estimate.
- `[planned]` **Proposal:** gate MVP launch at Scenario D passing (100 concurrent Bulgarian MVP traffic, cache-mix realistic). Hold Scenario E (500 concurrent) as the Year-1 or international-expansion gate. Both need TTFT/ITL instrumentation — neither is satisfied by default k6 metrics.

The 500 number should stay in the reference doc as the aspirational architecture target. It should NOT be cited as "the load target" without the MVP-100 distinction.

## 6. What runs when

`[planned]` Pre-launch checklist ordering:

1. Write Scenario A (mocked upstream) — validates the test harness
2. Write Scenario B (warm cache, 100 concurrent) — baseline MVP pass
3. Write Scenario C (cold cache, 50 concurrent) — cost ceiling baseline
4. Run A+B+C on the deployed staging environment (Vercel `fra1` + Supabase `eu-central-1` per ADR)
5. Record results as numbered rows in this doc (append "§7. Results")
6. Gate MVP launch on B + C passing; flag D and E as post-launch validation

## 7. Results

`[planned — to be appended as tests run]`

Format:

```
| Date | Scenario | Concurrent | ttft p95 | itl p50 | cache_hit | stream_aborted | Notes |
|---|---|---|---|---|---|---|---|
```

### 7.1 Baseline status — 2026-04-18 [blocker]

`[blocker]` Scenarios B and C **cannot run today**. The request to run them against pre-refactor architecture (to establish a baseline for post-refactor regression detection) is blocked on prerequisites. Status audit:

| Prerequisite | State [verified 2026-04-18] | Blocks |
|---|---|---|
| k6 installed or listed in any `package.json` | Not present. Grep of all package.json files returned zero matches. | All scenarios |
| k6 script with custom TTFT / ITL / cache_hit / stream_aborted metrics | Does not exist. Zero files matching `*.k6.js` or `loadtest*` in the repo. | All scenarios |
| Scenario A — mocked upstream harness | Does not exist. Nothing is instrumented today. Without A validating the harness, B/C numbers are unattributable. | B, C, D, E |
| BgGPT managed API access (project ID, endpoint, rate limits) | `[open]` per `Celestia_AI_Reference.md §5` — pricing and DPA unverified. | B, C, D, E against real upstream |
| Staging deployment pinned to `fra1` | `vercel.json` exists but has no `regions` field. Default is `iad1` (US). | B, C (real-latency measurement) |
| Supabase `eu-central-1` project confirmed | `[open]` — not verified in this audit | B, C (real-latency measurement) |

`[inferred]` Running "k6 with default metrics against the deployed endpoint" is technically possible right now and would produce numbers, but those numbers would measure `http_req_duration` collapsing TTFT and generation into one useless value (§1). The result would be "looks fine / looks broken" theater, not a pre-refactor baseline we can compare against.

### 7.2 Unblock chain — specific tasks in order

`[planned]` To produce a legitimate pre-refactor baseline for B and C:

1. **Add k6 to the dev toolchain.** Either `pnpm add -D -w k6` at the workspace root, or document that k6 is run as a standalone binary and not a Node dependency. Decision point, not work.
2. **Write Scenario A script** — `loadtest/scenarios/A-mocked-harness.js`. Script defines custom metrics (`ttft`, `itl`, `stream_duration`, `stream_aborted`, `stream_stalled`, `cache_hit`, `stream_tokens`), connects to a local Next dev server with a deterministic mock upstream swapped in via env var (e.g. `AI_PROVIDER=mock`), runs 10 concurrent for 2 minutes, asserts that the custom metrics read sensibly.
3. **Add mock-upstream toggle to `apps/web`** — tiny change behind `AI_PROVIDER=mock`: return a stream that emits deterministic tokens at 10 tokens/s for 15s. Doesn't touch production code path. One day of work including tests.
4. **Run Scenario A locally.** `pnpm dev` + `k6 run loadtest/scenarios/A-mocked-harness.js`. Iterate until metrics land where §2 targets them. This proves the harness works.
5. **Pin Vercel regions.** Edit `apps/web/vercel.json` to add `"regions": ["fra1"]` per `Celestia_AI_Reference.md §3`. Deploy to staging. Small change, no code impact.
6. **Confirm Supabase project region is `eu-central-1` or `eu-west-1`.** Cannot be changed after creation. If it's wrong, that's a much bigger conversation (data migration). Verify in Supabase Dashboard.
7. **Write Scenario B script** — `loadtest/scenarios/B-warm-cache.js`. Ramp 0→100 concurrent over 5min, hold 10min, hit cached daily-horoscope endpoints.
8. **Write Scenario C script** — `loadtest/scenarios/C-cold-cache.js`. 50 concurrent for 5min, `X-Cache-Bypass` header set.
9. **Run B and C against staging** with `AI_PROVIDER=bggpt` (real) and record results in §7 above.

### 7.3 Time estimate [inferred]

- Steps 1-4: 2-3 days for one engineer familiar with k6 and Next streaming. +1 week ramp-up tax if nobody has used k6 before (same pattern as Skia and Option-B in prior docs — ramp-up visible, not hidden).
- Steps 5-6: 1-2 hours, mostly "confirm and redeploy."
- Steps 7-8: 2 days (derivative of A once the metrics layer is stable).
- Step 9: half a day execution + analysis.
- **Total to unblock baseline: ~1 week engineering, ~2 weeks if ramp applies.**

`[planned]` None of this work touches `apps/` or `packages/` source code except step 3 (add mock-upstream toggle) and step 5 (pin region). Both are additive and revertible. Keep them on their own branch off `mobile-parallel-test` or a new branch if the load-test work is going to precede Option-B execution.

## 8. Open questions before implementation

1. `[open]` BgGPT managed API pricing and rate limits — confirm before running any scenario against real upstream. Running Scenario C without this answered risks unexpected invoice.
2. `[open]` What happens on BgGPT failure — does the Vercel AI SDK fall back to Claude automatically? If yes, Scenario C might accidentally test Claude. Need to disable fallback during load tests or track which provider served each request.
3. `[open]` Does Supabase `eu-central-1` have explicit rate limits on the `daily_horoscopes` lookup query? Cache hit is only fast if the lookup itself is fast.
4. `[open]` Should we use Artillery or k6? The reference doc mentions both. k6 has stronger custom-metrics support via `k6/metrics`; Artillery's YAML DSL is friendlier. [assumed — k6 wins on metric flexibility, which is the decisive requirement here]
