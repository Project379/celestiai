# Celestia AI — Technical & Operational Reference

*Architecture, compliance, and launch readiness*

## About this document

This is a working reference for Celestia AI — a subscription astrology app for the Bulgarian market. It consolidates the architectural decisions, production-readiness requirements, GDPR obligations, AI provider strategy, and known risks that have been worked through across multiple sessions. It is intentionally opinionated. Where something is uncertain or depends on external information, that is called out explicitly.

*Nothing here is legal advice. The GDPR sections in particular describe an engineering posture and obligations as they have been publicly documented; a Bulgarian lawyer with data-protection expertise is required before any paying user signs up.*

---

# 1. Product snapshot

Celestia AI is a subscription-based astrology app targeting the Bulgarian market. It combines Swiss-Ephemeris-grade astronomical calculations with AI-authored readings delivered in Bulgarian, wrapped in an editorial-dark visual language (Cinzel eyebrows over slate backdrops, violet and amber accents, Bulgarian throughout).

## Stack

| Area | Technology |
| --- | --- |
| Monorepo | Turborepo |
| Cross-platform UI | Solito |
| Web app | Next.js 15 (App Router) |
| Mobile app | Expo |
| Auth | Clerk |
| Database | Supabase (Postgres) + Drizzle ORM |
| Payments | Stripe (web) + RevenueCat (mobile IAP) |
| Astronomical engine | `@celestia/astrology` package calling `swisseph-wasm` server-side |
| AI (current) | OpenRouter (meta-llama/llama-3.3-70b-instruct) via Vercel AI SDK. BgGPT deferred post-launch — see AI_PROVIDER_DECISION.md. |
| Hosting (planned) | Vercel (Next.js) in EU region |

## Features shipped

- Dashboard greeting with live lunar phase and sun-sign copy
- Daily streaming horoscope
- Natal chart view with legend and Big Three
- Transits page
- Premium crystal collection tied to lunar windows
- Ritual-style manifestation card
- Oracle conversational panel
- Ръководство reference guide
- Лунен дневник at `/manifest` — three-line-a-day diary whose prompts shift with the lunar phase (intentions on the waxing half, gratitude and release on the waning half)
- Истории at `/stories` — daily-and-monthly book/film/episode recommendations indexed to the current moon and the user's sun sign, each explained across three labeled blocks (connection, timing, what it gives)

Current branch: `gemstone-integration-premium`. Лунен дневник and Истории currently persist to `localStorage` behind hooks whose shape matches the eventual API contract — the backend swap is designed to be a drop-in.

---

# 2. Architecture decisions

## The question that kept coming back

Across multiple conversations the same shape of question kept surfacing in different disguises: Next.js API routes, Next + NestJS, a separate mobile backend, NestJS for scalability, NestJS for security. The pattern underneath was the same — looking for a reason to add a new backend framework to a stack that already has one.

**The consistent answer: you already have a backend. Supabase + the shared `@celestia/astrology` package covers the data and domain layers. The real question is where the small amount of additional server code lives.**

## The decision: Next.js route handlers in `apps/web`

For Celestia AI specifically, server-side code belongs in Next.js route handlers inside the existing `apps/web`. Rationale:

- One deployment target (Vercel) — not two
- The `@celestia/astrology` package imports directly, with no WASM re-bundling for a second runtime
- Streaming AI responses work natively
- Expo and web hit the same endpoints — no duplication
- Clerk, Supabase, Stripe, and RevenueCat SDKs are already configured for this surface

## What server-side code is actually needed

- AI streaming endpoint for horoscopes and Oracle panel — cannot call AI providers from mobile clients (key leakage, cost drain)
- Stripe and RevenueCat webhooks — these are HTTP POSTs from the payment providers; they must land on a server, verify signatures, and update entitlements
- Swiss Ephemeris calculations for natal charts and transits — WASM runs server-side; results can be cached because a natal chart never changes
- Scheduled jobs — daily horoscopes, monthly Истории recommendations, moon-phase content rotation (Vercel Cron or Supabase `pg_cron`)

## When to add a dedicated `apps/api` (not yet)

Reserve this for after a real wall is hit. Legitimate triggers would be: complex non-CRUD domain logic spanning many tables, heavy background job infrastructure (BullMQ + Redis), custom real-time protocols (gRPC, WebSockets with custom logic, MQTT), tight orchestration across 10+ third-party services, regulated-industry compliance, or a team growing past ~8 people. Celestia AI meets none of these today.

## What was explicitly rejected and why

| Rejected choice | Reason |
| --- | --- |
| NestJS as main backend | Structure tax without a team. Duplicates auth, WASM packaging, deploy pipeline, and env vars. Kills solo-dev velocity. |
| Firebase over Supabase | NoSQL is awkward for relational astrology data (charts, transits, users, subscriptions). Already committed to Postgres. |
| Self-hosted NestJS + Postgres instead of Supabase | Writing auth, RLS, backups, and connection pooling from scratch is the highest-risk code in any app. Supabase has been audited and hardened. |
| Splitting frontend/backend into separate repos | Loses shared types and shared `@celestia/astrology` package. Adds friction without benefit at current scale. |

---

# 3. Production reliability on Vercel

Vercel will not be the bottleneck. The bottlenecks are, in order of likelihood:

## Ranked risks at scale

### 1. AI bill

This is the single biggest scaling risk. Rough math: 10,000 DAU × 2,000 tokens per interaction = 20M tokens per day. On frontier APIs this reaches hundreds of euros per day in output costs alone. Mitigations:

- Generate daily horoscopes once per (sun-sign × moon-phase) combination per day — fewer than 100 unique combinations. Cache them. Serve from the cache.
- Aggressive prompt caching via provider features (Anthropic prompt caching, OpenAI caching)
- Per-user generation throttling with clear UX when the limit is hit
- Pre-generate daily content via cron at midnight Sofia time, not on-demand

### 2. Supabase connection limits

Vercel serverless functions spin up per request. Without pooling, Postgres connections will exhaust in minutes under load.

- **Fix:** Use Supabase's Supavisor pooler in transaction mode with Drizzle. This is the #1 thing people get wrong.

### 3. Vercel function timeouts and pricing

Hobby: 10s timeout. Pro: 60s serverless, up to 800s for Fluid Compute / streaming. Streaming AI works because bytes flow as they generate, not all at once. At real scale Pro pricing can surprise — if that happens, migrate only the streaming AI endpoint to Cloudflare Workers or Fly.io, keep the rest on Vercel.

### 4. `swisseph-wasm` cold starts

WASM initialization on a cold serverless function adds 500ms–2s. Options:

- Compute the natal chart once on first render, store the result in Supabase, never recompute — this is correct because a natal chart is a function of fixed birth data
- Run ephemeris in a long-lived process (Fly.io machine, Railway worker) if cold starts become user-visible
- Aggressive edge caching of transit results, which only change meaningfully by the day

## Pre-launch operational checklist

- Sentry on both Next.js and Expo — non-negotiable, free tier is generous
- Vercel Analytics + Speed Insights for Core Web Vitals
- Supabase Log Explorer with alerts for slow queries (>500ms)
- UptimeRobot or Better Stack for external uptime checks on `/`, `/api/horoscope`, `/api/webhooks/stripe`, `/api/webhooks/revenuecat`
- Stripe webhook dashboard reviewed weekly for failed deliveries
- Supabase Pro tier daily backups verified — know the retention policy
- Load test before launch with k6 or Artillery against the streaming endpoint at 500 concurrent connections — 10 is not a load test
- Feature flag kill-switches for every AI feature — if costs spike or the model misbehaves, turn it off without a deploy

## Regions — critical for both latency and GDPR

Bulgarian users are closest to Frankfurt. Default Vercel regions push functions to US East, which is wrong for both latency and compliance.

```json
// vercel.json
{
  "regions": ["fra1"]
}
```

Supabase project region: `eu-central-1` (Frankfurt) or `eu-west-1` (Ireland). Chosen at project creation. **Cannot be changed after.** Pick Frankfurt.

---

# 4. GDPR and Bulgarian data compliance

**Disclaimer:** This is not legal advice. A 2-hour consult with a Bulgarian lawyer who knows data protection costs roughly €300–€800 and is required before onboarding any paying user. The items below are the engineering posture that consult will build on, not a substitute for it.

## Data residency

GDPR does not strictly require EU storage, but it restricts transfers outside the EEA unless adequate safeguards exist. For the Celestia stack, this means:

| Service | Residency posture |
| --- | --- |
| Supabase | EU project: `eu-central-1` (Frankfurt) or `eu-west-1` (Ireland). Request DPA via dashboard support. |
| Vercel | Functions pinned to `fra1` or `dub1`. Default is `iad1` (US) — must be changed. |
| Clerk | US-based. Legal today via Data Privacy Framework (DPF) self-certification. Legally fragile long-term — Schrems III could invalidate DPF. Document a migration path to Supabase Auth as a contingency. |
| Stripe / RevenueCat / OpenAI / Anthropic | All US-based. All offer DPAs. Sign each. Relies on DPF or SCCs for EU→US transfers. |
| BgGPT API (INSAIT) | Bulgarian institute. Closest thing to 'fully EU-resident' available. Pricing and DPA must be verified directly. |

## Controller obligations (non-negotiable checklist)

- Register a legal entity — typically a Bulgarian ЕООД. Shipping a paid subscription as an unregistered individual is a tax and liability problem, not just GDPR.
- Sign DPAs with every processor: Supabase, Clerk, Stripe, RevenueCat, the AI provider(s), Vercel, Sentry, any analytics. File them.
- Privacy Policy + Terms of Service in Bulgarian. List every subprocessor and every category of data collected. Not ChatGPT-generated; use a Bulgarian legal template and have the lawyer review.
- Cookie banner with real consent — distinguishes functional, analytics, marketing. Allows rejection. Library: klaro or cookie-consent.
- Explicit consent checkbox at signup, not pre-ticked. Store timestamp and policy version.
- Right-to-access endpoint — user settings button dumps Clerk profile + all Supabase rows as JSON.
- Right-to-deletion endpoint — button deletes the user, cascades to Supabase data, revokes in Clerk, cancels Stripe/RevenueCat. Soft deletes do not satisfy GDPR. Must actually delete.
- Data retention policy — written down. Automated (`pg_cron` or a scheduled Vercel function).
- Breach notification plan — 72-hour window to notify КЗЛД. One-page written procedure is enough.
- Records of Processing Activities (ROPA, Article 30) — list: what data, why, legal basis, retention, recipients. Template from the lawyer.

## Celestia-specific GDPR points

### Birth data

Birth date, time, and place are borderline sensitive under Article 9 because they relate to a philosophical/belief practice. The practical posture: treat as standard personal data; document legal basis as consent (explicit signup) combined with contract performance (cannot produce a chart without it). Do not use birth data for profiling beyond stated purpose. Do not share it with AI providers unless disclosed in the privacy policy.

### AI calls

Sending chart data to OpenRouter (current primary) is a transfer of personal data to a US processor. Requirements:

- DPA signed with OpenRouter (verify availability and tier)
- Disclosure in the privacy policy that OpenRouter + the underlying model host generate reading content
- Confirm OpenRouter's and the backing model host's data-retention policy for API traffic
- If BgGPT is later adopted as primary (currently deferred — see `AI_PROVIDER_DECISION.md`), Bulgarian data stays with a Bulgarian institute and the surface area of this concern shrinks substantially

## Biggest risks, ranked

- AI bill kills the business before GDPR ever does
- User requests data deletion and the code doesn't actually cascade — this is the #1 thing that turns a complaint into a fine
- A webhook fails silently and a paying user doesn't get their Premium entitlement — not GDPR, but refunds, churn, reputation
- Wrong Vercel function region quietly sends Bulgarian data to Virginia — easy fix, embarrassing in an audit
- DPF gets invalidated and Clerk becomes non-compliant overnight — low probability, high impact; mitigated by having a documented migration path

---

# 5. AI provider strategy

**2026-04-20 reality update:** The pre-implementation plan below (BgGPT primary, Claude/GPT-4o fallback) was never wired up. The product has been running on OpenRouter (`meta-llama/llama-3.3-70b-instruct`) throughout — no migration, just aspirational-vs-actual drift. See `.planning/research/AI_PROVIDER_DECISION.md` for the full reversal trail. BgGPT remains `[deferred / post-launch]` with three revisit conditions documented. This section preserves the original strategic thinking because the Bulgarian-quality tradeoffs and unit-economics discipline still apply to whatever provider is in use; only the "which provider ships first" decision was settled differently than the original plan.

## Current reality (verified)

`meta-llama/llama-3.3-70b-instruct` via OpenRouter (OpenAI-API-compatible aggregator). Called from three endpoints: `/api/oracle/generate`, `/api/oracle/teaser`, `/api/horoscope/generate`. No fallback configured — single provider, single model. See `PRE_LAUNCH_PREREQS.md` for the pre-launch gates (verify quota, document rate-limit policy, decide fallback strategy).

## The three realistic paths (original strategic analysis, preserved)

| Path | Fit for Celestia | Key tradeoff |
| --- | --- | --- |
| Frontier APIs (Claude/GPT) | Works but imperfect Bulgarian — occasional language confusion, Russian-flavored phrasing, wrong gendered forms. Bad for register-sensitive astrology copy. | Easiest, cheapest to ship; quality ceiling in Bulgarian; US data transfers. |
| BgGPT managed API (INSAIT) | Originally the primary choice. Bulgarian-native, state-of-the-art for Bulgarian, Bulgarian institute. | Managed API exists but pricing/SLA/DPA must be verified before commit. Currently `[deferred / post-launch]`. |
| Open-source inference providers (Together, Fireworks, Replicate, Modal, **OpenRouter**) | Host various models for you, OpenAI-compatible endpoints. Cheaper than frontier. | Most are US-based — check data residency before using. **This is the path we actually took: OpenRouter + Llama 3.3 70B.** |

## Original recommendation (superseded)

> BgGPT API primary, Claude or GPT-4o as fallback. Wire both from day one behind the Vercel AI SDK — the same `streamText` call works across providers, so switching is an env variable. This also protects against single-vendor outages.

That recommendation was never wired. OpenRouter/Llama shipped instead. Fallback is `[not started]` per `PRE_LAUNCH_PREREQS.md`. The multi-provider-behind-AI-SDK pattern still applies when the fallback decision is made — adding an alternate provider is the same env-variable swap the original plan envisioned.

## Before committing to any model (still applies)

- Take 20 real horoscope prompts from the app
- Run them through the candidate models (today: Llama 3.3 70B; if BgGPT revisited, add BgGPT; comparison models like Claude Sonnet / GPT-4o optional)
- Have a native Bulgarian speaker (ideally two) read the outputs without knowing which model produced which
- Pick the one that sounds right for the register, not the one that benchmarks best
- Re-run this eval quarterly — models change

Llama 3.3 70B was presumably chosen without this eval being run explicitly; if launch quality is acceptable, great. If not, this eval is the next step before switching providers.

## Unit economics to check before launch

Decide what a Premium tier must cost to work. If one Premium user at €9.99/month costs €3 in AI, there is room. If they cost €8, the model is broken. This is arithmetic — do it, write the answer in this document, and check actuals against it monthly. OpenRouter's per-model pricing is the current reference; update this calc when the provider or model changes.

---

# 6. Webhook handling

Webhooks are how Stripe and RevenueCat tell the app a user paid. If a webhook fails silently, a user who paid does not get Premium. This will happen. The question is whether it happens loudly (recoverable) or quietly (churn and refunds).

## Failure modes

| Mode | What happens |
| --- | --- |
| Endpoint returns 500 | Provider retries for a window, then gives up. User paid, DB never updated, user opens the app and Premium is still locked. Angry email, refund, lost trust. |
| Endpoint returns 200 but silently skips DB write | Provider stops retrying. No log. User opens app, Premium is still locked. Found out three weeks later when they complain or churn. |
| Faked webhook | Anyone can POST to the public URL. Without signature verification, an attacker can grant themselves Premium or revoke real users'. |

## The four-part pattern

- **Signature verification** — reject unsigned or invalid requests with 401
- **Raw body access** — signature is computed over raw bytes; parsing JSON first breaks verification
- **Idempotency** — a `webhook_events` table logging every event ID; duplicate deliveries become no-ops
- **Log-then-process** — record the event before acting, so it can be replayed if downstream logic fails

## Reference implementation (Drizzle + Next.js route handler)

```ts
// app/api/webhooks/revenuecat/route.ts
export async function POST(req: Request) {
  const signature = req.headers.get('authorization');
  const body = await req.text(); // raw body BEFORE parsing

  // 1. Verify signature — reject fakes
  if (!verifyRevenueCatSignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  // 2. Idempotency check
  const existing = await db.select().from(webhookEvents)
    .where(eq(webhookEvents.id, event.id));
  if (existing.length) return new Response('OK', { status: 200 });

  // 3. Log first, act second
  await db.insert(webhookEvents).values({
    id: event.id,
    type: event.type,
    payload: body,
    processed: false,
    received_at: new Date(),
  });

  // 4. Process, catch, mark done
  try {
    await handleRevenueCatEvent(event);
    await db.update(webhookEvents)
      .set({ processed: true, processed_at: new Date() })
      .where(eq(webhookEvents.id, event.id));
  } catch (err) {
    Sentry.captureException(err, { extra: { event } });
    return new Response('Processing failed', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
```

Apply the same pattern to Stripe. Both providers have dashboards showing delivery failures with retry. Check weekly until stable. Set a Sentry alert on any webhook endpoint returning non-2xx.

---

# 7. Launch readiness checklist

Nothing ships to one paying user without these. Items are grouped by when they must be done.

## Before first paying user

- [ ] Supabase project in `eu-central-1` or `eu-west-1`
- [ ] Vercel regions pinned to `fra1` in `vercel.json`
- [ ] Supavisor connection pooling (transaction mode) enabled
- [ ] DPAs signed: Supabase, Vercel, Clerk, Stripe, RevenueCat, AI provider(s), Sentry
- [ ] Bulgarian Privacy Policy and Terms of Service live
- [ ] Cookie banner with real accept/reject controls
- [ ] Consent checkbox (not pre-ticked) at signup
- [ ] Right-to-access endpoint working end-to-end
- [ ] Right-to-deletion endpoint working end-to-end — verified by deleting a real test account and confirming all traces are gone
- [ ] Stripe webhook: signature verification, idempotency, log-then-process
- [ ] RevenueCat webhook: same four-part pattern
- [ ] Sentry wired on Next.js and Expo
- [ ] Daily horoscope cron job (Vercel Cron or Supabase `pg_cron`)
- [ ] Per-user AI rate limiting (by entitlement tier)
- [ ] Feature-flag kill switches for every AI feature
- [ ] Fallback AI provider wired and tested — primary goes down, app still works
- [ ] Native Bulgarian speaker eval of AI output passed
- [ ] Load test at 500 concurrent connections passed
- [ ] Legal entity (ЕООД) registered

## Within 30 days of first paying user

- [ ] 2-hour consult with a Bulgarian data-protection lawyer, findings actioned
- [ ] ROPA document drafted
- [ ] Breach notification procedure written (one page)
- [ ] Uptime monitoring on all critical endpoints with alerts to phone
- [ ] Monthly AI unit economics review vs projections

## Ongoing (quarterly)

- [ ] Review processor list for new services added
- [ ] Re-run AI model eval against real prompts
- [ ] Review Stripe + RevenueCat webhook failure logs
- [ ] Verify backup restoration actually works — don't trust backups you haven't restored
- [ ] Review Clerk DPF status — if DPF is invalidated, trigger migration plan

---

# Appendix: Decisions made and rejected

| Question | Decision | Why |
| --- | --- | --- |
| Where does backend code live? | Next.js route handlers in `apps/web` | One deploy, shared package imports directly, streaming native, Expo and web hit same endpoints |
| Add NestJS? | No | Structure tax for a team that doesn't exist; duplicates infrastructure already handled by Supabase and Next.js |
| BaaS choice? | Supabase | Postgres fits relational astrology data; already committed; open-source and portable |
| Primary AI provider? | **OpenRouter (`meta-llama/llama-3.3-70b-instruct`)** actually shipped. BgGPT was the original pre-implementation plan — never wired, `[deferred / post-launch]`. See AI_PROVIDER_DECISION.md. |
| Fallback AI? | **None configured today.** Original plan (Claude Sonnet / GPT-4o as fallback) never shipped. `[not started]` in PRE_LAUNCH_PREREQS.md — separate row for the strategy decision. |
| Self-host AI? | No (at launch) | Operational complexity not justified; managed API exists; if needed later, vLLM not Ollama |
| Hosting region? | Vercel `fra1` + Supabase `eu-central-1` | Latency to Bulgarian users + GDPR residency posture |
| Auth? | Keep Clerk, plan migration path | Works today via DPF; Schrems III is a tail risk; Supabase Auth is the documented fallback |
