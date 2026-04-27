# Processor DPA Audit

**Purpose:** track Data Processing Agreement status for every personal-data processor used by Celestia AI in production. Required by GDPR Art. 28 — controllers must have a DPA in place with each processor before live traffic flows.

**Status:** founder-driven, in progress. Opened 2026-04-27 as part of §11.4.

**How to read:**
- `[ ]` — not yet verified / DPA not on file
- `[x]` followed by date — DPA signed and filed
- `[verify]` next to a URL — URL is the standard provider DPA path; founder to confirm reachable + current
- `[founder action]` — explicit todo for founder

**Estimated time to complete:** ~90 min total (~10-20 min per processor, mostly dashboard verification + downloading signed-DPA PDFs to a stable file location).

---

## Processors

### 1. Clerk (authentication)

- **Region:** US-based; DPF (EU-US Data Privacy Framework) self-certified
- **DPA URL:** `https://clerk.com/legal/dpa` `[verify]`
- **Status:** `[ ]` `[founder action]` — verify DPA accepted in Clerk dashboard (Settings → Legal & Compliance), confirm DPF self-certification still active for the relevant entity
- **Cross-border basis:** DPF self-certification (post-Schrems II framework)
- **Personal data flow:** authentication for all users; processes email, IP, session metadata, MFA factors if enabled
- **Filed at:** `[founder action]` — link or path to signed DPA copy

### 2. Supabase (database + auth helper)

- **Region:** EU project (Frankfurt) — same-region for EU users, no cross-border transfer
- **DPA URL:** `https://supabase.com/legal/dpa` `[verify]`
- **Status:** `[ ]` `[founder action]` — verify DPA accepted in Supabase dashboard (Settings → Legal)
- **Cross-border basis:** N/A (EU-EU)
- **Personal data flow:** users, charts, ai_readings, daily_horoscopes, diary_entries, audit_logs, push_subscriptions; the entire authoritative data store
- **Filed at:** `[founder action]`

### 3. Stripe (payments)

- **Region:** Global with regional adequacy mechanisms
- **DPA URL:** `https://stripe.com/legal/dpa` `[verify]`
- **Status:** `[ ]` `[founder action]` — verify DPA in Stripe dashboard (Settings → Compliance & Documents)
- **Cross-border basis:** Stripe regional adequacy + SCCs (Standard Contractual Clauses) depending on flow
- **Personal data flow:** payment-method metadata + billing identifiers (Stripe stores card numbers; we store only Stripe customer/subscription IDs + non-sensitive metadata)
- **Filed at:** `[founder action]`

### 4. OpenRouter (AI inference)

- **Region:** US-based; routes to multiple underlying model providers
- **DPA URL:** `[founder action]` — OpenRouter DPA path not standard self-serve; may require contacting OpenRouter support
- **Status:** `[ ]` `[founder action]` — request DPA from OpenRouter via support if not self-serve in dashboard
- **Cross-border basis:** SCCs (Standard Contractual Clauses) — required since US-based + EU users
- **Personal data flow:** AI Oracle prompts contain birth-data context (DOB / coords / chart calculations) for personalization; user identifiers (clerk_user_id) may appear in request metadata depending on integration
- **Filed at:** `[founder action]`
- **Sub-processor caveat:** sub-processor chain depends on which model OpenRouter routes to. Currently `meta-llama/llama-3.3-70b-instruct` per `.planning/research/AI_PROVIDER_DECISION.md`. Verify the underlying provider's data-handling (Meta hosting, or whichever inference partner OpenRouter delegates to). Document the sub-processor chain in this entry once confirmed.

### 5. Sentry (error monitoring)

- **Region:** EU project (Frankfurt) — explicit data-residency choice from §10.1
- **DPA URL:** `https://sentry.io/legal/dpa/` `[verify]`
- **Status:** `[verified active per §10.1 founder action 2026-04-27]` — founder confirmed DPA active during Sentry org setup before §10.1 SDK install
- **Cross-border basis:** N/A (EU-EU)
- **Personal data flow:** error event metadata (stack traces, route paths, ERR-* tag, clerk_user_id); PII scrubbing on per `sendDefaultPii: false` in `instrumentation-client.ts` + `sentry.{server,edge}.config.ts`
- **Filed at:** `[founder action]` — confirm filing location for the signed DPA copy from §10.1 setup

### 6. Vercel (hosting + edge)

- **Region:** Global with regional pinning expected to `fra1` (Frankfurt) for EU traffic `[verify]`
- **DPA URL:** `https://vercel.com/legal/dpa` `[verify]`
- **Status:** `[ ]` `[founder action]` — verify DPA accepted in Vercel team settings (Settings → Legal)
- **Cross-border basis:** Vercel global infra; regional pinning + SCCs depending on configuration
- **Personal data flow:** hosting + edge for the web app; sees all request metadata (IPs, user agents, headers) at the proxy layer; static-asset caching; no persistent user-identifying data store under our control on Vercel
- **Filed at:** `[founder action]`

---

## Cross-references

- **§11.5 ROPA draft** (`.planning/legal/pending-review/ROPA-draft.md`, pending) — consumes this list as the per-activity processor column
- **§11.1 privacy-draft** (`.planning/legal/pending-review/privacy-draft.md`, pending) — section XI lists these processors with links to their privacy policies for transparency disclosure
- **Item 9 (third-party licensing) overlap:** Clerk + Supabase + Stripe + OpenRouter TOS reviews per `PRE_LAUNCH_PREREQS.md` item 9 are personal-data-processor TOS reviews — once this DPA audit is complete, those 4 sub-items in Item 9 can be marked covered. JPL Horizons + Astronomy Engine remain Item 9-specific (non-personal-data, library-license-only)

---

## Trail

- 2026-04-27 — §11.4 opens with this scaffold doc. Sentry pre-marked verified per §10.1's founder action. Founder runs ~90-min audit for the 5 remaining processors when calendar allows.
