---
title: Compliance and cost inventory — 2026-08-31
status: ARCHIVED 2026-09-04 — superseded by the 2026-09-01 pre-launch compliance batch (commit de3a91a) and the 2026-09-04 compliance follow-up. Current status lives in .planning/PLACEHOLDERS.md (TERMS, AI-ACT-COPY, ENTITY-NAME, WITHDRAWAL-COPY, STRIPE-TOS-URL, COMPLIANCE-AUDIT-RERUN) and the narrative in .planning/SYSTEM-MAP.md §11. This file is a point-in-time audit, not a living document — re-run rather than edit if state has moved on further.
created: 2026-08-31
---

# Compliance and cost inventory — 2026-08-31

Report-only audit, no code changed. Every claim tagged VERIFIED or
INFERRED. Sections 1-7 and part of 10 gathered by parallel read-only
research passes, cross-checked; section 8 and part of 9 measured directly
(real OpenRouter API calls with real token/cost accounting, a live
production curl, and a live Postgres query).

---

## 1. EU AI Act Article 50 disclosure sweep

**VERIFIED — zero AI-disclosure strings exist anywhere in this app's
user-facing Bulgarian copy.** Checked the canonical copy inventory
(`scripts/i18n/copy-lock.json`) for any disclosure phrasing (изкуствен
интелект, генерирано от, ИИ) — zero hits.

| Surface | File | Disclosure? |
|---|---|---|
| Oracle panel (web) | `apps/web/components/oracle/OraclePanelGlobal.tsx` + siblings | **NO** |
| Oracle screen (mobile) | `apps/mobile/app/(authed)/oracle.tsx` | **NO** |
| Daily horoscope (web) | `apps/web/components/horoscope/DailyHoroscope.tsx` | **NO** |
| Daily horoscope (mobile) | `apps/mobile/app/(authed)/(tabs)/index.tsx` | **NO** |
| Onboarding/wizard | `apps/mobile/app/(authed)/wizard/*` | **NO** |
| Pricing/paywall (web) | `apps/web/app/pricing/PricingContent.tsx` | **NO** |

"AI" appears only in pre-login marketing copy — never inside the
authenticated app, never near generated content. The app's real name is
just `"Stellaeum"` (`app.json`). **Every surface that displays
AI-generated content or accepts Oracle input has zero disclosure.**

---

## 2. Web checkout (Stripe), verbatim

VERIFIED, `apps/web/app/api/stripe/checkout/route.ts` read in full.

- **No custom Bulgarian button label.** No `custom_text`, no `locale` on
  `stripe.checkout.sessions.create()`. Stripe's hosted page renders its own
  default (English) button text.
- **No consent checkbox for anything.** No `consent_collection` parameter.
  Nothing captures consent to immediate performance or acknowledgement
  that the 14-day EU withdrawal right is lost as a result.
- **No withdrawal notice or model withdrawal form anywhere** — checked
  `/privacy`, `/support`, `/pricing`, the (nonexistent) `/terms`.
- **Price shown with no VAT statement at all.** `PricingContent.tsx:216-221`
  shows `€6,99`/`€59,99` with only a `/мес`/`/год` suffix.

---

## 3. Cancellation

**YES — achievable without contacting support.** VERIFIED,
`apps/web/components/auth/SettingsContent.tsx` + both API routes.

Path: Clerk account popover → Settings → premium panel shows
**"Управление на плащанията"** (Stripe Billing Portal, `POST
/api/stripe/portal`) and **"Отказ от абонамент"** → confirm dialog with an
optional reason picker → `POST /api/stripe/cancel` → state flips to
"Отменен," access continues until period end, "Възстанови абонамент"
button visible. Fully in-product.

---

## 4. Trader identification

**Only 1 of 6 required items present.** No footer component exists at all.

| Item | Present? |
|---|---|
| Legal entity name | **Absent** |
| ЕИК | **Absent** |
| Registered address | **Absent** |
| Contact email | **Present** — `support@stellaeum.com`, in `/support` and `/privacy` |
| VAT number | **Absent** |
| Supervisory authority (КЗП) | **Absent** |

No file anywhere identifies the operating legal entity.

---

## 5. Consent gating

No cookie-consent mechanism exists anywhere, so every item below "loads
before consent" trivially — there is no gate to be before or after:

- **Clerk** — loads unconditionally at the root layout.
- **Sentry** — all three `Sentry.init()` calls (client/server/edge)
  unconditional at module load.
- **Google Maps / Cloudflare Turnstile** — this section originally
  claimed both were CSP-allowlisted dead entries. Re-checked 2026-09-04
  (compliance batch): neither domain is CSP-allowlisted or referenced
  anywhere in code — there was no entry to remove. Correction, not
  re-verification of the original claim; see the same note in
  `SYSTEM-MAP.md` §12.
- **Stripe.js** — zero client-side usage (hosted-Checkout redirect design).

**Sentry session replay: NOT enabled.** VERIFIED directly against code —
zero hits for `replaysSessionSampleRate`/`replaysOnErrorSampleRate`/
`Sentry.replayIntegration()` anywhere.

---

## 6. Personal data flow

VERIFIED by reading `chart-to-prompt.ts` and `transit-to-prompt.ts` in full.

- **OpenRouter:** only computed astronomical output — planet/sign/degree/
  house/retrograde/aspect/ascendant/MC, plus a `birth_time_known` boolean.
  **Birth date, birth time, and birth place are NOT in the payload** —
  confirmed absent from every serialized field. No free text (diary, chart
  nickname) reaches either prompt anywhere in the codebase.
- **Sentry:** `sendDefaultPii: false` explicit in all three configs.
- **Clerk:** email + name (standard auth baseline).
- **Stripe:** `customer: stripeCustomerId` + metadata — no astrology/birth
  field near checkout.
- **RevenueCat:** `Purchases.logIn(userId)` — the Clerk user ID only.
- **Vercel:** hosting only, no data-sharing path found.

---

## 7. Paywall compliance

**Web `/pricing`:**

| Element | Present? |
|---|---|
| Plan name | YES |
| Price per period | YES |
| Billing period | YES |
| Auto-renewal statement | **NO** — only "Прекрати по всяко време," the opposite framing |
| Cancellation instructions | **NO** — same vague line only |
| Link to Terms | **NO** — zero links (route doesn't exist) |
| Link to Privacy Policy | **NO** — zero links anywhere on the page |

**Mobile: no native purchase screen exists.**
`apps/mobile/app/(authed)/you/premium.tsx` is status/management only — its
own header comment confirms the RevenueCat paywall UI is "its own
halt-required batch," not built. The free-state CTA opens web's `/pricing`
externally. Mobile currently sells nothing itself.

---

## 8. Token cost — measured, not estimated

Ran 3 real Oracle generations + 3 real daily-horoscope generations against
the actual production model via OpenRouter, reproducing the exact system
prompts and serialization, capturing OpenRouter's own returned `usage`
object (real tokens **and** real billed cost) per call.

**a. Real measured counts:**

| | Prompt tokens | Completion tokens | Real cost |
|---|---|---|---|
| **Oracle avg** | 936 | 1447 | **$0.000861** |
| **Horoscope avg** | 874 | 128 | **$0.000211** |

Catalog rate ($0.71/M both directions, live-fetched) predicts roughly 2×
higher than what was actually billed — OpenRouter evidently routes this
open-weight model to a cheaper effective upstream than its own listed
reference price. The real measured `cost` field is authoritative and used
below.

**b. Bulgarian-vs-English token ratio — measured on the same tokenizer:**

- System prompt alone: 619 tokens (isolated via a 1-token user message).
- Real Bulgarian output prose (747 words): 1878 completion tokens →
  **2.514 tokens/word**.
- Equivalent-content English prose (256 words, isolated from the system
  prompt): 294 tokens → **1.148 tokens/word**.
- **Measured ratio: Bulgarian costs ≈2.2× more tokens per word than
  English**, on this specific tokenizer. Real, not estimated.

**c. Cost per generation, current model and the two candidates.** Current
model = real measured averages. The two candidates have no real traffic to
measure, so their figures are **INFERRED**: catalog rate applied to
Llama-measured token counts as a proxy — flagged as a likely
**overestimate**, since GPT/Gemini tokenizers are generally more
multilingual-efficient than Llama's.

| Model | Oracle cost/gen | Horoscope cost/gen |
|---|---|---|
| **Llama 3.3 70B (current, VERIFIED)** | **$0.000861** | **$0.000211** |
| Gemini 3.7 Flash (INFERRED) | $0.006128 | $0.001134 |
| GPT-5.4-mini (INFERRED) | $0.007214 | $0.001230 |

**d. Monthly generation count that makes a subscriber margin-negative**,
at €5.83 net (EUR≈USD assumed — immaterial at these magnitudes):

| Model | Breakeven, all-Oracle | Breakeven, all-horoscope |
|---|---|---|
| Llama 3.3 70B (current) | ≈6,772/month | ≈27,630/month |
| Gemini 3.7 Flash (estimated) | ≈951/month | ≈5,140/month |
| GPT-5.4-mini (estimated) | ≈808/month | ≈4,740/month |

**e. The 300/month premium cap sits comfortably BELOW the margin-negative
line on every model checked** — by ≈2.7× even under the single worst
combination tested (GPT-5.4-mini, all-Oracle, pessimistic catalog-rate
estimate). Not a cost risk on any model under consideration.

---

## 9. Infrastructure usage — actual numbers

**Supabase — VERIFIED, queried live via `supabase inspect db db-stats` and
a direct Postgres connection:**
- Database size: **15 MB** total (97-98% cache hit rates).
- Row counts confirm pre-launch scale: `charts` 5, `users` 5, `ai_readings`
  0, `daily_horoscopes` 20, `diary_entries` 1.
- **Plan tier: UNVERIFIED** — CLI exposes project metadata (region
  `eu-west-2`, Postgres 17.6.1) but not billing tier; dashboard-only.
- **Egress, storage transfer, MAU, realtime connections, edge function
  invocations: UNVERIFIED — dashboard/Management-API-token-only, not
  reachable from this session.** No Management API token available
  (distinct from the service-role key, which only reaches the DB itself).
  To get these: Supabase dashboard → Project Settings → Usage, or generate
  a Management API personal access token.
- **Realtime is a hard zero regardless of plan or MAU** — VERIFIED zero
  `.channel()`/realtime usage anywhere in web or mobile, despite
  `CLAUDE.md`'s tech-stack line claiming "PostgreSQL + Realtime." **That
  line is stale.**

**Vercel — UNVERIFIED for all requested figures.** No Vercel CLI, no API
token in this environment. To get these: paste the dashboard's Usage tab
numbers, or generate a Vercel personal access token for direct REST API
access.

**What I CAN state, VERIFIED from Vercel's live public pricing docs:**
Vercel's Pro plan is **fully usage-based**, not fixed-quota — no flat
"included invocations" number exists to compare against. The only bundled
allowances are Fast Data Transfer (first 1 TB) and Edge Requests (first
10,000,000); everything else (Invocations $0.60/1M, Active CPU from
$0.128/hr, Provisioned Memory from $0.0106/GB-hr, Build CPU from
$0.0035/CPU-min, Image Optimization $0.05/1K transformations) draws from a
monthly usage credit, then pay-as-you-go. There is no clean "quota
exceeded at N MAU" answer for Vercel the way Supabase has one — only a
credit that runs out at a rate this session has no real invocation data to
model.

**Supabase overage arithmetic (live-fetched published rates), for when the
tier is confirmed:**

Free: 500 MB DB / 5 GB egress / 1 GB storage / 50,000 MAU / 200 realtime
connections / 500,000 edge function invocations — hard-blocked past cap,
not billed.
Pro: 8 GB DB ($0.125/GB over) / 250 GB egress ($0.09/GB over) / 100 GB
storage ($0.0213/GB over) / 100,000 MAU ($0.00325/MAU over) / 500 realtime
connections ($10/1000 over) / 2M edge functions ($2/1M over).

At **15 MB actual usage (0.19% of the Free tier's 500 MB cap)**, DB size
is not a constraint at any MAU count near launch scale. Realtime and Edge
Functions are moot (zero usage of both, confirmed §10). The only
plausibly-binding quota at real scale is egress and MAU, and modeling
either honestly needs real payload sizes and DAU/session data this
pre-launch app doesn't have yet.

---

## 10. Portability / vendor lock-in inventory

VERIFIED by direct code read.

**Vercel-specific:**
- **Vercel Cron** (`vercel.json`, 2 jobs) — *trivial migration: point any
  external scheduler at the same route with the existing `CRON_SECRET`
  bearer.*
- **`outputFileTracingIncludes`/`outputFileTracingRoot`** — exists to
  force-copy `sweph`'s native binary into the serverless function. **The
  real lock-in**: `sweph` is a native N-API addon; Cloudflare Workers'
  V8-isolate runtime cannot run native Node addons at all. *Migration:
  either a WASM recompile of Swiss Ephemeris, or keep astrology-compute
  routes on a Node-capable host regardless of where everything else
  moves.* **The single largest portability blocker in the codebase.**
- Next.js **middleware** — portable, standard framework feature.
- **No `@vercel/*` packages** anywhere — zero SDK-level lock-in.
- **`next/image`: zero usage** — no image-optimization dependency.
- **ISR/`revalidate`**: one file only, trivially portable.

**Supabase-specific:**
- **Row Level Security** — heavy use, 92 total `ENABLE ROW LEVEL
  SECURITY`/`CREATE POLICY` statements. *Fully portable — native Postgres,
  identical on any host.*
- **Realtime, Storage, Edge Functions, pgvector: zero usage of all four**,
  verified by grep. This app uses Supabase as plain managed Postgres+RLS,
  nothing more.
- **Supabase Auth: not used** — Clerk is the auth provider.

**Bottom line: the real lock-in surface is narrow — `sweph`'s native
binary needing a Node-capable serverless runtime, not Supabase (portable
Postgres+RLS) and not most of what Vercel offers (barely touched).** A
Cloudflare migration is realistic for the general app; astrology-compute
routes are the one piece needing a different or additional Node-native
host.
