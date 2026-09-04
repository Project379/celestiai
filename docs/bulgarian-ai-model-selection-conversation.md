# Bulgarian AI Model Selection for Celestia

**Conversation date:** 27 August 2026  
**Project:** Celestia / Stellaeum AI  
**Purpose:** Select the best Bulgarian-language AI model and estimate its monthly capacity and cost.

> This is a cleaned transcript of the user-visible discussion. Internal tool activity has been omitted.

## Initial model shortlist

### User

We need the best Bulgarian-speaking AI and the cheapest for the quality out of these:

| Model | Bulgarian evidence | OpenRouter price / 1M tokens | Context | Initial take |
|---|---|---:|---:|---|
| **Gemini 3 Flash Preview** | **#1 EuroEval Bulgarian Knowledge: 80.16%**; #6 Bulgarian NER | **$0.50 input / $3 output** | 1M | Best measured Bulgarian/value |
| **GPT-5.4 Mini** | #4 Knowledge: **78.05%**; **#2 NER: 92.54%** | **$0.75 / $4.50** | 400K | Best production default |
| **Grok 4.20** | #9 Knowledge: 76.32%; **#1 NER: 93.5%** | **$1.25 / $2.50** | 2M | Excellent value and very fast |
| **Gemini 3.7 Flash** | Too new for the current Bulgarian benchmark snapshot | **$0.375 / $1.875** | 1M | Very promising challenger |
| **GPT-5.6 Luna Pro** | Too new for the current Bulgarian benchmark snapshot | **$0.20 / $1.20** | 1.05M | Extremely interesting price/quality |
| **Claude Sonnet 4.6** | #10 Knowledge: 75.2% | **$3 / $15** | 1M | Excellent model, poor value here |
| **Gemma 4 26B A4B** | Good Bulgarian NLU results, including sentiment/NER | **$0.042 / $0.22** | 262K | Ultra-cheap option |
| **BgGPT 27B** | Specifically trained for Bulgarian | Hosted separately | 8K | Interesting Bulgarian-specialized baseline |

### User clarification

Gather context from the app itself as well.

### User clarification

I mean from the Celestia AI project.

## Project-aware recommendation

### Assistant

For Celestia, my practical winner is **Gemini 3.7 Flash**, with **GPT-5.4 Mini as the quality fallback**.

If Bulgarian benchmark evidence is required before deployment, choose **GPT-5.4 Mini at medium/high reasoning**. The cheapest model worth considering is **Gemma 4 26B A4B IT**, but only for teasers—not premium readings.

### Why Celestia changes the ranking

Celestia does not primarily need named-entity recognition. It needs:

1. Natural, poetic Bulgarian.
2. Accurate use of supplied chart data.
3. Strong instruction following for sentinel markers.
4. Consistent four-to-nine-paragraph outputs.
5. Low latency for streaming.

The production code currently uses **Llama 3.3 70B**, despite older documentation referring to Gemini:

- Current model: [`apps/web/app/api/oracle/generate/route.ts`](../apps/web/app/api/oracle/generate/route.ts)
- Full readings allow up to 2,000 output tokens and are cached for seven days.
- The Oracle prompt requires exact degrees, Bulgarian Cyrillic, and sentinel formatting: [`apps/web/lib/oracle/prompts.ts`](../apps/web/lib/oracle/prompts.ts)
- Daily horoscopes allow up to 1,500 output tokens: [`apps/web/app/api/horoscope/generate/route.ts`](../apps/web/app/api/horoscope/generate/route.ts)
- The PRD explicitly requires native-level Bulgarian: [`product_requirements_document.md`](product_requirements_document.md)

Llama 3.3's Bulgarian EuroEval rank is only **2.61**, compared with approximately **1.3–1.8** for the serious candidates. Switching should therefore be a meaningful improvement.

### Task-aligned Bulgarian evidence

Lower overall rank is better. Scores come from the [official EuroEval Bulgarian results](https://github.com/EuroEval/leaderboards/blob/main/leaderboards/bulgarian_all.csv).

| Model | Overall rank | Acceptability | Reading comprehension | Knowledge | Celestia verdict |
|---|---:|---:|---:|---:|---|
| Gemini 3 Flash Preview, no thinking | **1.32** | 74.59 | 65.83 | **80.16** | Best overall measured Bulgarian |
| GPT-5.4 Mini, high | **1.38** | **77.40** | **70.53** | 78.05 | Best measured fit for structured readings |
| Claude Sonnet 4.6 | 1.42 | 75.49 | 70.30 | 75.20 | Strong, but dramatically overpriced |
| Grok 4.20 | 1.54 | 70.60 | **32.58** | 76.32 | Its #1 NER score is not relevant to this workload |
| Gemma 4 26B A4B **IT** | 1.76 | **58.99** | 70.32 | 58.76 | Cheap, but native prose quality is risky |
| Current Llama 3.3 70B | 2.61 | 54.02 | 22.35 | 21.51 | Clearly behind the shortlist |

This is why GPT-5.4 Mini belongs above Grok for Celestia even though Grok has the best NER score.

### Approximate Celestia cost

Assumption: 2,000 input tokens and 1,500 output tokens per uncached generation.

| Model | Approximate cost per 100,000 generations |
|---|---:|
| [Gemma 4 26B A4B IT](https://openrouter.ai/google/gemma-4-26b-a4b-it) | **$41** |
| [GPT-5.6 Luna / Luna Pro](https://developers.openai.com/api/docs/models/gpt-5.6-luna) | **$220+** |
| [Gemini 3.7 Flash](https://openrouter.ai/google/gemini-3.7-flash) | **$356** |
| [Gemini 3 Flash Preview](https://openrouter.ai/google/gemini-3-flash-preview) | $550 |
| [Grok 4.20](https://openrouter.ai/x-ai/grok-4.20) | $625 |
| [GPT-5.4 Mini](https://openrouter.ai/openai/gpt-5.4-mini) | $825 |
| [Claude Sonnet 4.6](https://openrouter.ai/anthropic/claude-sonnet-4.6) | $2,850 |

These are list-price estimates before prompt caching and reasoning tokens. Gemini 3.7's current OpenRouter price is marked **75% off**, so it should not be treated as permanently guaranteed.

### Deployment recommendation

- **Production default:** `google/gemini-3.7-flash`
- **Quality fallback or premium regeneration:** `openai/gpt-5.4-mini` with medium/high reasoning
- **Short 200-token teasers:** optionally `google/gemma-4-26b-a4b-it`
- **A/B-test challenger:** GPT-5.6 Luna
- **Do not select based on this evidence:** Grok for its NER score, Claude for value, or Gemini 3 Flash Preview for a new long-lived integration

`GPT-5.6 Luna Pro` is not a separate, stronger underlying model. Official OpenAI documentation defines Pro as additional inference work on Luna. It can therefore add latency and billed reasoning tokens even though the per-token price is unchanged.

The BgGPT row also needs updating. Current **BgGPT 3.0 27B** has an effective **131K context**, not 8K, but currently lacks a hosted inference provider and would require separate infrastructure or self-hosting. Its Bulgarian specialization makes it useful for a private evaluation rather than the default production choice today. See the [current BgGPT model card](https://huggingface.co/INSAIT-Institute/BgGPT-Gemma-3-27B-IT).

## Monthly customer capacity

### User

For how many customers will 100,000 generations serve on average monthly?

### Assistant

A realistic planning estimate is **about 6,000–7,000 monthly active customers per 100,000 generations**.

Celestia generates one daily horoscope per customer per active day, not per application session. The result is cached for that chart and date. Oracle readings are user-triggered and cached for seven days.

| Monthly behavior per customer | Generations per customer | Customers served by 100K |
|---|---:|---:|
| Light: 5 active days + 1 Oracle | 6 | **16,667** |
| Casual: 10 active days + 3 Oracle | 13 | **7,692** |
| Expected average: 12 active days + 3 Oracle | 15 | **6,667** |
| Engaged premium: 20 active days + 6 Oracle | 26 | **3,846** |
| Daily premium: 30 days + 8 Oracle | 38 | **2,632** |
| Extreme: daily + four regenerations every day | 150 | **667** |

For financial projections, use:

- **Conservative:** 4,000 customers per 100K generations
- **Expected:** 6,500 customers
- **Mostly casual/free users:** 8,000–12,000 customers

At the expected 6,500-customer level, the approximate monthly model cost is:

| Model | Monthly model cost | Approximate cost per active customer |
|---|---:|---:|
| Gemma 4 26B A4B IT | $41 | $0.006 |
| GPT-5.6 Luna | $220+ | $0.034+ |
| Gemini 3.7 Flash | $356 | $0.055 |
| GPT-5.4 Mini | $825 | $0.127 |

Even GPT-5.4 Mini is only approximately **$0.13 per active customer per month** at this usage level. For a €9.99 premium subscription, Bulgarian quality and customer retention matter considerably more than the cost difference between Gemini 3.7 and Luna.

## Final conclusion

For Celestia's current architecture and expected usage:

1. Start with **Gemini 3.7 Flash** as the best price/quality candidate.
2. Use **GPT-5.4 Mini** as the benchmark-backed quality fallback.
3. Budget **100,000 generations for roughly 6,500 monthly active customers**.
4. Validate the final choice with a blind Bulgarian-language evaluation using real natal charts, all four Oracle topics, sentinel compliance, factual accuracy, latency, and output-token usage.
