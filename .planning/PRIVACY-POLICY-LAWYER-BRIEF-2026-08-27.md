---
title: Privacy policy — scoping brief for the lawyer
status: hand this to a Bulgarian data-protection lawyer. NOT a draft policy. Part A is the standard GDPR section inventory (reconstructed, not from Termly). Part B is what Stellaeum actually does — the part no template knows — with every claim tied to a verified code/schema fact.
created: 2026-08-27
audience: external counsel (Bulgarian data-protection lawyer)
verification: every "we store / we send / we do" statement below is checked against the codebase and the production schema as of 2026-08-27. Where a fact is a founder decision not yet made, it is marked [FOUNDER DECISION].
---

# Stellaeum — privacy policy scoping brief

**Purpose of this document.** We want a **Bulgarian-language** privacy
policy that is legally correct for an EU consumer app processing birth
data and payments, and correct in *legal* Bulgarian (a mistranslated
consent basis reads as authoritative while being wrong). This brief gives
you (a) the standard section inventory so you don't rebuild it, and (b)
the precise, verified description of what our app does, so you can write
the substantive parts without reverse-engineering them from our code.

**What we are NOT asking for:** a review of a machine-translated
template. We have not generated one.

> **⚠ TWO QUESTIONS WHERE A GENERIC POLICY WOULD LEAVE US EXPOSED — please
> address these first, they are also product decisions we may need to make
> depending on your answer:**
>
> 1. **Кръг (relationship compatibility) lets our user enter a THIRD
>    PARTY's birth data** (a partner's or friend's date/time/place of
>    birth) to compute a compatibility reading — see §5. We are
>    processing personal data about people who never agreed to our terms.
>    What is the lawful basis, what must the policy say, and what are
>    those third parties' rights against us?
> 2. **Free-text fields** — the lunar journal (`diary_entries`) and the
>    chart-name label — can contain **Art. 9 special-category data the
>    user volunteers** (health, sex life, religious or political belief).
>    We do not ask for it. Is "we don't solicit it; don't enter it"
>    sufficient, or do we need an explicit-consent / "manifestly made
>    public" framing, content filtering, or something else? See §5, §9.
>
> **One section is deliberately left with the vendor name blank: §4 (the
> AI processing / third-country transfer).** Our LLM provider is **not
> settled** — a co-founder is still evaluating options and we may not be
> on OpenRouter. The *shape* of the transfer is written out in full; the
> vendor name and its jurisdiction are the last thing to fill. **Do not
> assume OpenRouter.** See §4.

---

# PART A — Standard section inventory (GDPR / Bulgarian PDPA)

A compliant policy for this app should cover, at minimum:

1. **Controller identity & contact** — legal name, address, the contact
   point for privacy matters (`support@stellaeum.com` or a dedicated
   `privacy@`), and whether a DPO is appointed (likely not required under
   Art. 37, but state the position).
2. **Categories of personal data** processed — identity/account, birth
   data, user-generated content, derived astrological data, payment
   metadata, technical/device data, diagnostic data.
3. **Purposes** of each processing activity.
4. **Legal basis** per purpose (Art. 6(1)) — and an explicit Art. 9
   analysis (see Part B §9: we believe no Art. 9 special-category data is
   *required*, but users can volunteer it).
5. **Recipients and processors** — a named sub-processor list with each
   one's role and location.
6. **Third-country transfers** and the safeguard relied on for each
   (adequacy decision / SCCs / DPF).
7. **Retention periods** per data category, including what survives
   account deletion and why.
8. **Data-subject rights** (Art. 15–22): access, rectification, erasure,
   restriction, portability, objection; how to exercise them in-app; and
   the right to lodge a complaint with the **Commission for Personal Data
   Protection (КЗЛД / CPDP)**.
9. **Automated decision-making / profiling** (Art. 22) — see Part B §8.
10. **Source of data** where not collected from the data subject
    directly (e.g. OAuth provider profile data, payment-provider
    confirmations).
11. **Security measures** (Art. 32) — summary.
12. **Children** — minimum age and how it's enforced.
13. **International-transfer and processor changes** — how users are
    notified.
14. **Cookies / local storage** — see Part B §11 (we expect: only
    strictly-necessary; no consent banner).
15. **Changes to this policy** — notification mechanism.
16. **Effective date / version.**

---

# PART B — What Stellaeum actually does

## 0. The product in one paragraph

Stellaeum is a subscription astrology app for the Bulgarian market (Web +
iOS + Android, one codebase). A user enters their birth date, birth time,
and birth place; we compute a natal chart with Swiss Ephemeris on our
server; an LLM generates Bulgarian-language readings from the chart. There
is a daily horoscope, an "Oracle" reading (topics: general / love /
career / health), a relationship-compatibility feature ("Кръг"), a lunar
journal, and a crystals feature. Free tier + paid "Premium" subscription.

## 1. Controller

[FOUNDER DECISION] — the legal entity (sole trader / EOOD / other) and its
registered address. Two founders operate the project; identify the
controller (or joint controllers) precisely.

## 2. Identity & account data — held by **Clerk**, not in our database

Authentication is outsourced to **Clerk** (clerk.com). Clerk stores:

- **First name, last name** (required at sign-up — VERIFIED: `apps/mobile/
  app/(public)/sign-up.tsx` requires both; Clerk dashboard "Require name"
  is on).
- **Email address** and a **password** (hashed by Clerk).
- **[FOUNDER DECISION, imminent]** Google and Apple **Sign-In**
  connections are being added as a launch feature. For these Clerk also
  stores the **OAuth provider account id** and profile fields the
  provider returns. For **Apple "Hide My Email"** users, the email is an
  Apple **private-relay address** (`…@privaterelay.appleid.com`), not the
  user's real address — the policy should acknowledge this.
- Session data, sign-in timestamps, and the **IP address / user-agent**
  of authentication requests (Clerk-side).

**Our own `users` table** (Supabase/PostgreSQL) stores **only**:
`clerk_id` (the Clerk user id, our foreign key everywhere), account
timestamps, and subscription fields — `stripe_customer_id`,
`stripe_subscription_id`, `subscription_status`, `subscription_tier`,
`subscription_provider` (`stripe` | `revenuecat`), `subscription_expires_at`,
`trial_claimed_at`, `deleted_at`, `deletion_scheduled_at`. **No name, no
email, no date of birth in our database.** (VERIFIED against production
schema.)

Clerk is a **US company**; transfer safeguard is Clerk's DPF
certification / SCCs — counsel to confirm current basis and whether Clerk
acts as processor or independent controller for the auth-request
metadata.

## 3. Birth data — the sensitive combination

Stored in our **`charts`** table (Supabase). Per chart (a user may create
up to 20):

| Column | Content |
|---|---|
| `name` | a **free-text label** the user chooses for the chart — often their own name or a nickname ("Аз", "мама", a partner's name) |
| `birth_date` | date of birth |
| `birth_time` | exact time of birth (nullable) |
| `birth_time_known` / `approximate_time_range` | if the user doesn't know the exact time, a coarse range (morning/afternoon/evening/night) |
| `city_name`, `latitude`, `longitude`, `city_id` | **place of birth**, as a named city and precise coordinates |

**State this plainly in the policy, because a template will treat these
as three ordinary fields:** *date of birth + exact time of birth + place
of birth, collected together, constitute a unique identifier for a
natural person.* The tuple is precise enough to single out an individual
(GDPR Recital 26). It is the core input the entire product is built on,
and it is more sensitive in combination than any field is alone.

**It is not, in our assessment, Art. 9 special-category data** (it is not
health, biometric, genetic, racial, political, religious, trade-union,
sex-life, or sexual-orientation data). Counsel to confirm, and to advise
on the heightened-scrutiny posture appropriate for an app built entirely
around collecting it.

**Legal basis** we propose: **performance of a contract** (Art. 6(1)(b))
— the birth data is necessary to deliver the service the user signed up
for (their chart and readings). Counsel to confirm vs. consent
(Art. 6(1)(a)), and to advise whether explicit consent is nonetheless
advisable given the data's nature.

**Retention:** for the life of the account; hard-deleted on account
deletion (see §10).

## 4. Derived astrological data, and the transfer to an AI provider

> **VENDOR NAME DELIBERATELY UNFILLED.** The LLM provider is an open
> decision (a co-founder is evaluating). Everything below describes the
> *shape* of the transfer, which is identical regardless of provider;
> only `[[AI PROVIDER]]` and its `[[JURISDICTION]]` change. The current
> setup routes through **OpenRouter** to an underlying model, but we may
> leave OpenRouter. **Please do not draft this section around OpenRouter
> as settled.** If the final provider is **EU-hosted**, the
> third-country-transfer analysis in 4c falls away entirely — flag that
> in your draft as a conditional.
>
> **Status update 2026-08-28:** the co-founder's evaluation now has a
> *recommendation* — `google/gemini-3.7-flash` as production default,
> `openai/gpt-5.4-mini` as quality fallback — but it is **not yet decided
> in code**. Production still runs the Llama 3.3 70B placeholder. The
> placeholders stay unfilled until the swap is actually shipped and ruled
> on; a policy naming a provider we have not deployed would be worse than
> one with an honest placeholder. Do not fill `[[AI PROVIDER]]` /
> `[[JURISDICTION]]` on the strength of the recommendation alone.

### 4a. What we compute and store (provider-independent)

From the birth data we compute a **natal chart** (planet positions by
sign/degree/house, Ascendant, Midheaven, inter-planet aspects) using
**Swiss Ephemeris**, **on our own server** (a WASM/native library — no
third party involved in the calculation). The result is cached in
`chart_calculations`. Daily planetary transits are cached in
`daily_transits` (not user-specific — a shared ephemeris cache).

### 4b. What leaves our server for the AI provider — **exactly**

Readings are generated by an LLM at `[[AI PROVIDER]]`. **VERIFIED by
reading the request-construction code** (`lib/oracle/chart-to-prompt.ts`,
`lib/oracle/prompts.ts`, `app/api/oracle/generate/route.ts`,
`app/api/horoscope/generate/route.ts`) — this is what the request body
contains, and it does not depend on which provider we use:

**Sent:**
- A **static system prompt** (instructions to the model; topic-tuned for
  general/love/career/health — no user data in it).
- A **prompt body built only from the computed chart**: lines like
  "Слънце: 15°32' Лъв, дом 5", "Асцендент: 12°04' Скорпион", "Слънце
  тригон Луна (орб 2.3°)", and a flag if the birth time is unknown. For
  the daily horoscope, also the current day's transit positions and
  transit-to-natal aspects.
- The **topic** label (general / love / career / health).

**NOT sent:** the user's name, email, Clerk id, the chart's `name` label,
the raw birth **date**, the raw birth **time**, the raw birth **place**
(city / coordinates), any device or session identifier. The request
carries **no `user` parameter and no identifying headers** (VERIFIED —
`lib/ai/client.ts` configures only the provider base URL + API key).

**However:** a natal chart is derived from, and re-identifiable to, an
individual's birth data. Even without a direct identifier in the payload,
this is personal data under GDPR (it "relates to" an identifiable person).
The policy must disclose the transfer.

### 4c. The transfer's shape — the parts the policy must cover regardless of vendor

1. **Sub-processor disclosure.** Name `[[AI PROVIDER]]`. **If it is a
   router** (like the current OpenRouter setup) that forwards requests to
   a set of underlying model providers, the sub-processor list is **not
   one name** — it is the router **plus** each downstream provider the
   routing is allowed to reach. Counsel to advise: disclose the router +
   "the set of model providers it may route to", or pin an **allowlist**
   of named providers and disclose only those.
2. **Third-country transfer status.** If `[[AI PROVIDER]]` (or any
   allowed downstream provider) is **outside the EEA**, this is a
   Chapter V transfer needing a safeguard (adequacy / SCCs / DPF). **If
   the final provider and its routing are entirely EU-hosted, there is no
   third-country transfer and this sub-section is removed.**
3. **Retention & training terms — what we can actually promise.** For the
   current OpenRouter setup, verified against OpenRouter's own docs:
   OpenRouter does **not** log prompt/response content by default (only
   request metadata — timestamp, model, token counts, latency); prompt
   logging is opt-in and we will **not** opt in. OpenRouter supports
   **Zero Data Retention (ZDR)** enforceable account-wide, per model
   group, or **per request** (a `zdr` request parameter, OR-combined with
   account settings), plus provider **allow/deny lists**; ZDR-enforced
   endpoints do not retain and therefore cannot train on the data. Some
   non-ZDR providers don't train but do retain briefly for
   abuse-scanning / legal reasons. **[FOUNDER ACTION] before any
   retention claim goes in the policy:** enable **account-wide ZDR** + a
   **named provider allowlist** (ideally EU-hosted if the chosen model is
   available on one), and reinforce with the per-request `zdr` parameter
   in `lib/ai/client.ts`. Then the policy can state "we enforce zero data
   retention; request content is not retained or used for model
   training." If we cannot fully enforce ZDR for the chosen model,
   counsel to advise what the policy must instead say.
4. **Model name is not in the policy.** Describe the processing by role
   ("an AI language-model provider"), not by model — the model is a
   pre-launch placeholder and will change.

### 4d. Generation-quality monitoring — `bg_generation_flags`

Every generation writes one row to `bg_generation_flags` for a
Bulgarian-language quality metric. **VERIFIED** (`lib/ai/check-bg-output.ts`):
it stores `source` (horoscope/oracle), `model`, a list of flagged
non-words, a count, the **generated reading text** *only when the quality
check flags something* (otherwise null), and `input_conditions` — the
**astrological conditions only** (e.g. sun sign, aspect list). It stores
**no user id, no chart id, no FK** — the table's own code comment: "no
chartId, userId, or anything that ties a row to a person." It is a debug
table. **It is not touched by account deletion** because there is nothing
in it to delete for a given user. Counsel to advise: is a stored,
un-linked reading fragment "personal data" here? Our view: not
identifiable in practice. A **retention cap** (e.g. purge after 6–12
months) is a [FOUNDER DECISION] worth making regardless.

## 5. User-generated content

- **Lunar journal / "manifestation" entries** — `diary_entries`: the
  user's own **free-text reflections**, dated, keyed to `clerk_id`. Users
  may write anything here, including content that would be Art. 9 data if
  we asked for it (health, relationships, beliefs). We do not prompt for
  it, but the policy should note that free-text fields may contain such
  content and that the user controls what they write. Hard-deleted on
  account deletion.
- **"Кръг" relationship compatibility** — a user can save "people"
  (`saved_people_profiles`) with **birth data for a third party** (a
  partner, a friend) to compute compatibility, and can send an **invite
  link** for another Stellaeum user to connect. So we process **birth
  data about people who are not our user**, entered by our user.
  **Counsel: this needs its own treatment** — the user is providing third
  parties' personal data; what must the policy say about the basis for
  that, and about those third parties' rights. Connection data
  (`connection_spaces`, `connection_members`, `connection_reports`,
  `connection_invites`, `saved_people_reports`) is hard-deleted on the
  initiating user's account deletion.
- **Crystals** — `user_crystals` / `user_daily_crystals`: a user's saved
  crystal collection and daily-pick history. Low sensitivity. CASCADE-
  deleted with the account.

## 6. Payment data

- **Web — Stripe.** Checkout is hosted by **Stripe**. Stripe collects
  name, email, **card details**, billing address, and IP directly from
  the user (we never see or store card data). We store only
  `stripe_customer_id` / `stripe_subscription_id` on our `users` row and
  receive webhook events (subscription status, invoice paid/failed).
  Stripe is a **US** company (DPF / SCCs) and is an independent controller
  for fraud-prevention purposes.
- **Mobile — RevenueCat + the app stores.** The actual purchase is
  processed by **Apple** (App Store) or **Google** (Play). **RevenueCat**
  (revenuecat.com, US) sits in front as our subscription-management
  layer: we call `Purchases.logIn(clerkUserId)`, so RevenueCat receives
  the **Clerk user id** as its `app_user_id`, plus purchase/receipt
  metadata, device and app info, and IP. We receive webhook events from
  RevenueCat.
- We keep **no invoice or transaction table** of our own (VERIFIED — no
  such table in the schema). The record of the transaction lives with
  Stripe / RevenueCat / Apple / Google.
- **[COUNSEL + ACCOUNTANT]** Does Bulgarian tax/accounting law oblige
  *us* (as opposed to the payment providers) to retain any payment record
  after a user deletes their account? If yes, that record must be kept
  (Art. 17(3)(b)) and the policy must disclose the retention period; we
  would keep it pseudonymised. If no, we retain nothing payment-related
  after deletion. See §10.

## 7. Technical, device, and diagnostic data

- **Push notifications.**
  - Mobile: `push_tokens` — Expo **push token**, `platform` (ios/android),
    `device_id`, timestamps. Device-linked routing identifier.
  - Web: `push_subscriptions` — the browser **Web Push endpoint URL**
    (browser-unique) and the client's `p256dh` + `auth` encryption keys.
  - Both keyed to `clerk_id`, both **CASCADE-deleted** on account
    deletion, and the deletion cron also deletes them explicitly.
  - Purpose: sending the one daily horoscope notification. Legal basis:
    [FOUNDER DECISION] consent (the OS permission prompt) — counsel to
    confirm the interaction between the OS permission and GDPR consent.
- **IP address.** Used **transiently** to rate-limit requests. For
  logged-in requests the key is the user id; for a few anonymous paths
  the key includes the IP (`rate_limit_buckets` row like
  `crystals-today:ip:<ip>`). These rows carry a `reset_at` and are
  **pruned daily** by a cron. IP is **not** written to any long-lived
  log or profile by our code.
- **Error monitoring — Sentry.** Both apps use **Sentry**, configured
  conservatively (VERIFIED — `sentry.server.config.ts`,
  `apps/mobile/lib/monitoring/sentry.ts`): `sendDefaultPii: false`,
  `tracesSampleRate: 0` (no performance tracing), `includeLocalVariables:
  false`, `enableLogs: false`. So Sentry receives **exception events
  only**: error message, stack trace, an internal error-code tag, and any
  explicit `extra` context we attach. **Residual risk to disclose /
  mitigate:** an error message or `extra` payload could *incidentally*
  contain personal data (e.g. a caught error whose text includes user
  input). We should audit `logError`/`logServerError` call sites to
  ensure birth/chart data is never placed in `extra`. Our Sentry project
  is in the **EU (Germany) region** (`ingest.de.sentry.io`) — **no
  third-country transfer for Sentry** (note: a dedicated mobile Sentry
  project is being created; it must also be EU-region).
- **No third-party analytics / advertising SDKs.** [FOUNDER DECISION,
  ruled] none at launch. No Google Analytics, no Firebase Analytics, no
  ad networks, no attribution SDKs.

## 8. Automated decision-making / profiling (Art. 22)

The AI-generated readings are a form of **profiling** in the broad sense
(the chart is analysed to produce a personalised text). **Our position:**
this is **not** "a decision based solely on automated processing which
produces legal effects or similarly significantly affects" the user
(Art. 22(1)) — the output is an **entertainment / self-reflection**
reading with no legal, financial, or comparably significant consequence,
and no decision is *made* about the user (no eligibility, pricing, or
access outcome turns on it). The `/terms` will carry an explicit
disclaimer ("за самопознание и забавление; не е професионален съвет —
медицински, финансов, правен или психологически"). **Counsel to confirm**
this analysis and advise whether the policy should nonetheless describe
the profiling and offer a human-review/objection route out of caution,
particularly for the **"health" reading topic**.

## 9. Special-category data (Art. 9) — our analysis

- Birth date/time/place: **not** Art. 9 data (see §3).
- The **"health" Oracle topic** produces text *about* the user's
  "vitality and wellbeing" derived from the chart — it does not collect
  health data *from* the user, but counsel should assess whether
  generating health-themed content triggers any heightened obligation.
- **Free-text** `diary_entries` and the chart `name` label may contain
  Art. 9 data the **user volunteers**. We propose the policy state that
  we do not solicit special-category data and that users should not enter
  it; counsel to advise if more is needed (e.g. an Art. 9(2)(e)
  "manifestly made public by the data subject" or explicit-consent
  framing for volunteered content).
- **Кръг third-party birth data** (§5) — birth data about non-users,
  entered by a user.

## 10. Retention and deletion — verified against production

- **Account deletion** is user-initiated in-app: a **30-day grace
  period** (reversible), then a daily cron **hard-deletes** all user
  data and the Clerk account.
- **Verified against production `pg_constraint` (2026-08-27):** all
  user-linked tables either are explicitly deleted by the cron or
  `CASCADE` on the `users`-row delete — `charts`, `chart_calculations`,
  `ai_readings`, `daily_horoscopes`, `diary_entries`,
  `subscription_quotas`, `push_tokens`, `push_subscriptions`,
  `user_crystals`, `user_daily_crystals`, all `connection_*` and
  `saved_people_*` tables. The `users` row itself (with
  `stripe_customer_id`) is deleted last.
- **One table survives deletion by design: `audit_logs`.** Its FK is
  `ON DELETE SET NULL` (verified), so after deletion the row's `user_id`
  is `NULL`. It is a security/operations trail (auth events, payment
  webhook events, GDPR-request events, security anomalies). **As of
  2026-08-27 the payload is also de-identified:** a code change now
  rewrites any id-shaped value (Stripe `cus_`/`sub_`/`in_` ids, raw
  Clerk `user_` ids) to `prefix_…last4` before the row is written, so a
  surviving row cannot be resolved back to a person via Stripe or Clerk.
  What a surviving `audit_logs` row **still contains**: the event type,
  a timestamp, and non-identifying context (e.g. `reason:
  'unhandled_event_type'`, a product slug, a coarse status). **Counsel
  to advise:** is this residual retention lawful as a security-log
  legitimate-interest measure (Art. 6(1)(f)), and if so what retention
  period and what the policy must say. If counsel says it must go, we can
  add `audit_logs` to the deletion cron.
- **`bg_generation_flags`** (§4d) is not user-linked and is not deleted;
  a time-based purge is a [FOUNDER DECISION].
- **Clerk, Stripe, RevenueCat, Apple, Google** retain data per their own
  policies after we delete our copy; the policy should link to each.
- **Backups:** Supabase point-in-time-recovery backups will contain
  deleted data until they roll off (counsel to advise on stating the
  backup-retention window).

## 11. Cookies / local storage

- **Web:** Clerk sets authentication/session cookies (strictly
  necessary). Stripe Checkout (hosted on Stripe's domain) sets its own.
  We set no analytics or advertising cookies. Mobile app: no cookies;
  local storage is limited to auth tokens (secure store) and
  UI-preference values.
- **Our position:** only **strictly-necessary** cookies → **no consent
  banner required** under the ePrivacy/GDPR framework. Counsel to
  confirm, and to confirm this holds for Bulgaria specifically.

## 12. Children

**Minimum age: 14** (Bulgaria's digital-consent age under GDPR Art. 8, as
implemented in Bulgarian law — confirmed by the founder). The policy
should state the minimum age and that we do not knowingly process data of
anyone below it. Counsel to advise how the policy should frame
enforcement (we do not currently do age verification beyond the stated
minimum).

## 13. Data-subject rights — how they're served today

- **Access / portability:** in-app **"Export my data"** produces a JSON
  file of the user's charts, readings, horoscopes, diary entries,
  connection data, saved profiles, crystals, and the `users` row.
  (Known gap being closed: the export currently omits
  `subscription_quotas` and the crystals tables were recently added —
  counsel need not act on this, it's an engineering item.)
- **Erasure:** in-app account deletion (§10).
- **Rectification:** the user can edit their birth data in-app.
- **Restriction / objection:** currently only via contacting
  `support@stellaeum.com` — counsel to advise if that is sufficient.
- **Complaint:** to the **КЗЛД (CPDP)** — address and web form to be
  stated.

## 14. Sub-processor list (draft — counsel to finalise wording, roles, safeguards)

| Processor | Role | Location | Data |
|---|---|---|---|
| **Clerk** | Authentication / identity | US | name, email, password hash, OAuth ids, Apple relay email, auth IP/UA, sessions |
| **Supabase** | Primary database + backups | [check region — EU vs US; FOUNDER to confirm the project region] | all app data in Part B §2–§7 |
| **`[[AI PROVIDER]]`** — NOT SETTLED (§4) | LLM inference for readings | `[[JURISDICTION]]` — if a router like OpenRouter, this is the router **+ each allowed downstream model provider** | derived natal-chart text + topic label, no direct identifiers — §4b |
| **Stripe** | Web payments | US | name, email, card, billing address, IP (collected by Stripe) |
| **RevenueCat** | Mobile subscription management | US | Clerk user id, purchase/receipt metadata, device info, IP |
| **Apple / Google** | Mobile payment processing + push delivery | US / global | purchase data; push token routing |
| **Sentry** | Error monitoring | **EU (Germany)** | exception events, stack traces (PII-minimised) |
| **Vercel** | Web hosting | US (edge global) | request logs / IP at the platform layer — counsel to address platform-level logging |
| **Expo** (EAS) | Mobile build + push routing | US | push tokens in transit |

## 15. The decisions the policy's content depends on — please advise

1. **Кръг third-party birth data** (see the boxed warning at the top) —
   the lawful basis and disclosures for a user entering another person's
   birth data, and those third parties' rights against us. *This may
   force a product change.*
2. **Art. 9 in free-text** (boxed warning) — is "we don't solicit it;
   don't enter it" sufficient for `diary_entries` and the chart-name
   label, or is more needed. *May force a product change (filtering,
   consent gate).*
3. **AI-provider section (§4)** — written vendor-agnostic on purpose.
   Once the provider is chosen: how to name the sub-processor(s)
   (single company vs. router + downstream set), the transfer status
   (EU-hosted → no Chapter V analysis), and what retention/training claim
   we can actually back.
4. **Legal basis for birth data:** contract (Art. 6(1)(b)) vs. consent.
5. **`audit_logs` residual retention** after deletion — lawful under
   Art. 6(1)(f) with a stated period, or must it be deleted too?
6. **Payment-record retention** — does BG accounting law oblige *us* to
   keep anything after deletion (accountant question)?
7. **Art. 22 / profiling** — is our "not a significant decision" position
   sound; anything needed for the "health" topic?
8. **Cookie-consent** — confirm no banner needed (strictly-necessary
   only), for Bulgaria specifically.
9. **Minimum age** — 14 (founder-confirmed); how the policy should frame
   enforcement given no age verification beyond the stated minimum.
10. **Controller identity** — [FOUNDER, needs your input] the policy must
    name a controller. Founder + co-founder run the project; the choice
    is *a named individual* vs. *a Bulgarian legal entity* (EOOD etc.).
    This is not just a form field — it affects personal vs. limited
    liability, who signs the processor DPAs (Clerk/Supabase/Stripe/etc.
    name the controller), and it should match the **Apple / Google
    developer account holder** (an "Organization" store account requires
    the entity to exist, with a D-U-N-S number for Apple). Advise the
    founder on this alongside the policy — it likely also needs an
    accountant.
11. Whether an **Art. 30 record of processing** and/or a **DPIA** is
    advisable given the birth-data-at-scale + AI-transfer + third-party-
    data profile (we suspect a DPIA is at least worth doing).

---

*Every technical statement in Part B was verified against the Stellaeum
codebase and production database schema on 2026-08-27. Items marked
[FOUNDER DECISION] are business/legal choices not yet made. §4 (AI
provider) is deliberately vendor-agnostic — the provider is an open
decision, tracked separately (`.planning/COMPLETION-TRACKER.md` §5,
blocked-externally), and the model is a placeholder that will change —
describe the processing by role, not by name.*
