---
title: Apple App Review requirements — research and scope
status: research only, build nothing. For founder decisions.
created: 2026-08-27
updated: 2026-08-27 — item 1 (Sign in with Apple) FLIPPED from "not applicable" to "BLOCKS SUBMISSION" after the founder ruled Google sign-in IS a launch feature. See the correction note in §1. Item 3 carve-out verified in code — see §3.
method: Apple guideline text + GDPR Art. 17 text/commentary (web sources cited) checked against our code by grep. Every code claim tagged VERIFIED (grep/read) or NEEDS-CHECK.
---

# Apple App Review requirements

> **CORRECTION 2026-08-27:** an earlier version of this doc assessed
> item 1 (Sign in with Apple) as **"very likely NOT required"** because no
> social login existed. **The founder then made Google sign-in a launch
> feature.** Under Guideline 4.8 that makes **Sign in with Apple
> mandatory** — item 1 is now a **submission blocker**, not "not
> applicable". Full scope for both providers:
> `.planning/AUTH-PROVIDER-EXPANSION-2026-08-27.md`. The old assessment
> is struck through in §1 below, kept visible so nobody re-derives it.

Six items from the founder's list, researched against our code. Summary
table first, then the two that need judgement (item 3 hard-delete, item 6
generated policy) in prose, then item-by-item detail.

The headline: **item 1 (Sign in with Apple) is very likely NOT required
for us as the app stands**, item 3's "null fields" tip is **wrong** and
following it would fail *both* regimes, and the real blockers are the
web-side pages (support URL, `/terms`) that are already on the
founder-track list.

---

## Summary table

| # | Requirement | What we have | What's missing | Cost | Submission impact |
|---|---|---|---|---|---|
| 1 | **Sign in with Apple** — mandatory because we now ship **Google sign-in** as a launch feature (Guideline 4.8) | Clerk email + password + 2FA only. No OAuth code yet. Deps (`@clerk/expo`, `expo-apple-authentication`, `expo-auth-session`, `expo-crypto`, `expo-web-browser`) **already installed**. | Google button + SSO flow (mobile); SIWA native sheet + config plugin + **new dev-client build** + compliant button; token revocation on delete; both providers on the Clerk instance (auto-covers web). | Google ~3 d, SIWA ~5–7 d (split across the Apple-enrolment boundary), + ~2 h dashboard/portal. Full breakdown: `AUTH-PROVIDER-EXPANSION-2026-08-27.md`. | **BLOCKS SUBMISSION.** Shipping Google without SIWA = automatic 4.8 rejection. |
| 2 | **Account deletion easy to find in-app**, full delete not deactivation (Guideline 5.1.1(v)) | Deletion lives in `you/settings`, runs a real grace-period → hard-delete cron, with a persistent `DeletionPendingBanner` during the grace window (VERIFIED). | Nothing structural. Possibly a discoverability tweak — reviewers expect it reachable in ~1–2 taps from a clearly-labelled Account/Settings area. | ~0–0.5 day (label/placement check during the `you` redesign) | **Does not block** as built. Low rejection risk if the settings entry is clearly labelled "Изтрий акаунт" / "Delete account" and not buried under sub-menus. |
| 3 | **Deletion should remove personal data** (Apple), **and** satisfy GDPR Art. 17 | Hard-delete cron across ~15 tables + newly-added FK cascades on `user_crystals` / `user_daily_crystals`. `audit_logs` uses `ON DELETE SET NULL`. | Nothing — see the judgement below. The "null fields instead of hard-delete" tip is **incorrect**; our current design is right for both regimes. | £0 (no change). Optional: a documented carve-out for statutory financial-record retention, ~0.5 day of policy writing, no code. | **Does not block.** Following the tip *would* have created a rejection risk (Apple treats "null some fields" as deactivation) and a GDPR gap. |
| 4 | **Paid features disclosed** in App Store description + screenshots (Guideline 2.3.x / 3.1.2) | Nothing yet — no store listing, and the paywall/premium screens are unbuilt. | Store copy + screenshots that show what's gated; in-app subscription terms visible before purchase (3.1.2). | Copy/screenshot work at submission time; **constrains the paywall mockup** — it must clearly show which readings are premium. | **Rejection risk if ignored.** 3.1.2 is actively enforced on subscription apps. Design input, not code. |
| 5 | **Support URL** on stellaeum.com (mandatory App Store Connect field, must resolve to a real page) | Nothing — no support page, and the domain currently serves nothing. | A `/support` page: app name, one-line description, a working contact method (support@ email or form), ≥1 troubleshooting item. A bare `mailto:` is "fragile" and can fail review. | ~0.5 day once Vercel deploys. Blocked on the same Vercel fix as everything else. | **Blocks submission** — it's a required field and Apple checks it resolves. Same class as the `/privacy` 404. |
| 6 | **Terms + Privacy** (Apple requires a privacy URL + EULA; GDPR requires a privacy policy) | `/privacy` route **exists** (VERIFIED). `/terms` does **not** (VERIFIED). No cookie consent. Termly proposed as the generator. | `/terms`; cookie consent; a privacy policy that actually covers birth date + birth time + birth location + payments. | Termly Pro+ ≈ $15/mo (annual). Generated draft ~1 day to wire. **A lawyer review is strongly advised here — see judgement below.** | **Blocks / high rejection risk.** Dead privacy URL = automatic fail; subscription app with no visible terms = common 3.1.2 rejection. |

---

## Item 3 — the judgement: do NOT soften the hard-delete

**The tip is wrong, and there is no real conflict between the two regimes
— they point the same way.**

**What GDPR Art. 17 actually requires:** erasure of personal data.
Multiple sources are explicit that **soft-delete / nulling fields alone
does NOT satisfy erasure** — a soft-deleted row still contains (or can be
recombined into) personal data, and it persists in exports, indexes,
logs, and backups. The compliant pattern is exactly the one we built:
mark deleted + revoke sessions + stop billing → grace period → **hard
delete with CASCADE**.

**What Apple 5.1.1(v) actually requires:** "delete the account along with
their personal data." Apple's own guidance says **offering only to
deactivate or disable an account is insufficient.** A design that just
nulls fields and keeps the row would read to a reviewer as deactivation —
the exact thing 5.1.1(v) rejects.

**So both regimes want a hard delete. Our cron + FK cascades is correct.**
Following the "null fields" tip would have traded a non-existent problem
for two real ones.

**The one legitimate carve-out** — and it is narrow — is data under a
**statutory retention obligation**, which Art. 17(3)(b) exempts from
erasure. In practice that means **financial / transaction records** that
BG and EU tax and accounting law require keeping (commonly 5–10 years;
Germany's HGB is 10, UK HMRC is 6, Bulgaria's Accountancy Act is in the
same range — confirm the exact BG figure with an accountant). Handling:

- **We likely hold none of this ourselves.** Stripe is the record-keeper
  for payments and is a separate controller with its own retention;
  RevenueCat likewise. NEEDS-CHECK: grep confirms `users` rows are
  minimal (`clerk_id` + subscription fields via `ensure-user.ts`), and
  no invoice/line-item table exists in the schema. If that holds, our
  hard-delete has nothing to carve out.
- **If any transaction row is ever kept post-deletion**, it must be
  **pseudonymised** (strip the `user_id` / name link, keep only
  amount / date / VAT / invoice number) and the legal basis documented
  in the privacy policy's retention section. `audit_logs`' existing
  `ON DELETE SET NULL` is already this pattern — audit rows survive
  erasure with a null `user_id`. That is defensible for a security log;
  make the same call deliberately for anything financial rather than by
  default.

**Recommendation:** keep the hard-delete cron and cascades as-is. Do not
implement soft-delete. The only follow-up is a paragraph in the privacy
policy stating what (if anything) is retained after deletion and why —
and confirming with an accountant whether BG law obliges us to keep any
payment record on our side at all, given Stripe already does.

---

## Item 6 — the judgement: a generated policy is a starting point, not the finished artefact here

**Say it plainly: for this app, a purely generated privacy policy is
thin cover, and I would not ship it without a lawyer's pass.**

Reasoning:

- **The data combination is unusually sensitive.** Birth date + exact
  birth time + birth location is precise enough to be effectively a
  unique identifier, and it is the kind of data a generic e-commerce
  template does not contemplate. It is not "special category" data under
  Art. 9 in the strict legal sense (it is not health, biometrics,
  religion, etc.), but a regulator and a reviewer will both look harder
  at an app built entirely around collecting it. The policy needs to name
  this data explicitly, state the lawful basis (consent / contract), the
  retention period, and that it is used to generate AI readings via a
  third-party model provider (OpenRouter) — a cross-border transfer that
  a template will not mention.
- **AI processing disclosure.** Birth data is sent to OpenRouter (and
  onward to whichever model). That is a processor relationship and a
  likely US transfer — it needs a named sub-processor list and a
  transfer mechanism (SCCs). Generated policies do not produce this.
- **Payments.** Stripe (web) and RevenueCat + Apple (mobile) each need
  naming as processors/controllers with links to their policies.
- **Bulgarian.** Termly's multi-language support is documented but the
  sources do **not** confirm Bulgarian specifically (NEEDS-CHECK on
  Termly's language list). The policy must be available in Bulgarian for
  a Bulgarian-market app; an English-only policy is a weak position with
  the CPDP (Bulgaria's DPA).

**Cost picture:** Termly Pro+ is ≈ $15/month billed annually for all
generators + the consent-management platform. That is fine as the
*scaffold* — it will produce a structurally complete draft and handle the
cookie banner. Budget a lawyer review on top (a Bulgarian
data-protection lawyer, a few hours) specifically for the birth-data and
AI-transfer sections. The generated `/terms` (EULA) is lower-risk —
Apple's standard EULA is acceptable if we do not supply our own, so
`/terms` can be lighter than `/privacy`.

**What it blocks:** `/privacy` must resolve (Vercel) and `/terms` must
exist before submission. The lawyer review is not a submission blocker
but is a real legal-exposure item for an app processing this data in the
EU.

---

## Item-by-item detail

### 1. Sign in with Apple — Guideline 4.8

**Now a submission blocker (founder made Google sign-in a launch
feature).** Full scope — Google + SIWA, cost, dependency order, what can
be done before Apple enrolment clears, token revocation, Private Relay
re-verification for three providers, web parity — is its own document:
**`.planning/AUTH-PROVIDER-EXPANSION-2026-08-27.md`**. Summary: deps are
already installed; **Google needs no native build** (browser flow), **SIWA
needs a new dev-client build**; SIWA config + testing is blocked on Apple
enrolment but all client work can start now; web gets both providers
almost free via Clerk's prebuilt components.

~~**Superseded assessment (kept visible):**~~ *4.8 requires SIWA only if
the app offers a third-party/social login. When this doc was first
written, `apps/mobile/app/(public)/` was Clerk email/password + 2FA only
(VERIFIED by grep — no OAuth code), so SIWA was assessed as "not
applicable". That assessment was correct for that state and is void now
that Google sign-in is in scope.*

**User-model impact if SIWA is added later:** our model keys entirely on
`clerk_id` (VERIFIED — every `users` lookup is `.eq('clerk_id', …)`;
every child table keys on `user_id` = the Clerk ID string; nothing keys
on email). The only `email` read in the whole codebase is
`apps/mobile/lib/clerk/displayName.ts:16`, a display-name **fallback**
(`user.primaryEmailAddress?.emailAddress ?? ''`). So Apple Private Relay
(a `@privaterelay.appleid.com` address, or no email at all) **does not
break anything** — worst case a relay-address or empty string shows as a
user's display name until they set one. Cosmetic, fixable in that one
file.

**Extra work SIWA would add to deletion:** if SIWA ships, 5.1.1(v)
requires calling Apple's Sign in with Apple REST API to **revoke the
user's tokens** on account deletion. NEEDS-CHECK whether Clerk does this
automatically on user delete; assume not, and budget the revoke call in
the cleanup cron.

**Recommendation:** decide now whether Google/social sign-in is a launch
feature. If no → SIWA is off the table and this item closes. If yes →
scope SIWA in the same batch, never ship the social button without it.

### 2. Account deletion discoverability — Guideline 5.1.1(v)

**VERIFIED:** deletion is in `you/settings` (there's a
`you/settings.tsx` screen and a `DeletionPendingBanner` component mounted
across all authed screens in `_layout.tsx`). The backend is a real
grace-period → hard-delete cron (`cron/cleanup-deleted-accounts`), not a
deactivation.

**Reviewer expectations (sources: Apple upcoming-requirements notice;
5.1.1(v) forum threads):** reachable easily in-app; full delete, not
deactivate; if any step needs the web, link directly to it; confirmation
steps are allowed. Customer-service-only deletion is allowed **only** for
highly-regulated industries — not us.

**Gap:** none structural. During the `you` redesign, make sure the entry
is a clearly labelled row ("Изтрий акаунт"), not nested under an
ambiguous sub-menu, and that the whole flow completes in-app (it does).

### 3. Deletion nulls vs hard-delete

See the judgement section above. **No code change to the hard-delete
approach. Keep it.**

**Carve-out verified in code 2026-08-27 (was "probable", now confirmed).**
The founder asked: do we hold ANY transaction/payment record our side
that survives account deletion, or is Stripe/RevenueCat the sole
record-keeper? Grepped `cron/cleanup-deleted-accounts` end to end + the
`schema_hardening` migration + the sweep's production `pg_constraint`
dump:

- **`audit_logs` is the one table that survives deletion with
  user-linked content.** Its FK is `ON DELETE SET NULL` (**VERIFIED
  against production `pg_constraint` 2026-08-27** —
  `audit_logs_user_id_users_clerk_id_fk` → `users`, `SET NULL`), and it
  is **not** in the cleanup cron. `payment.invoice_payment_failed`
  payloads carried `stripeCustomerId` / `stripeInvoiceId` /
  `stripeSubscriptionId` and one RevenueCat "unknown app_user_id"
  ignored-event carried a raw Clerk `user_` id in a `user_id = null`
  row — all re-identification handles.
  **FIXED (`edefd47`):** `logAuditEvent` now scrubs the metadata before
  insert — any id-shaped string (`cus_`/`sub_`/`in_`/… / `user_`)
  becomes `prefix_…last4`, recursing into nested objects/arrays. Proven
  against pre-fix code (`test/audit/redact-audit-metadata.test.ts`). New
  rows are de-identified; **pre-existing rows still hold raw ids** — a
  one-off backfill `UPDATE` on `audit_logs` is a follow-up (there are
  ~13 users, so trivially small), or leave it if the accountant answer
  is "prune the payment rows entirely".
- **Everything else is clean — VERIFIED against production
  `pg_constraint` 2026-08-27:** `subscription_quotas_user_id_fkey` →
  `users` is **`ON DELETE CASCADE`** (was inferred, now confirmed 'c') —
  cascades cleanly on the users-row delete; `push_tokens` /
  `push_subscriptions` / `user_crystals` / `user_daily_crystals` are all
  CASCADE → `users` too (and the cron also deletes them explicitly —
  belt and suspenders; note the `user_crystals` FK migration the sweep
  said was "prepared not applied" **is applied in production**).
  `crystal_recommendations` CASCADEs from `charts`. The `users` row
  itself (carrying `stripe_customer_id`) is hard-deleted last.
  `processed_webhook_events` (stripe_event_id + type) and
  `processed_revenuecat_events` (event_id + type) carry **no user
  identifier**; `bg_generation_flags` is explicitly person-free (its own
  comment); `daily_transits` is a global ephemeris cache.

**So the accountant question is now half a code question:**

1. **Code — DONE (`edefd47`).** `logAuditEvent` de-identifies id-shaped
   values before insert. Pre-existing rows may still hold raw ids — a
   one-off `UPDATE` backfill on `audit_logs` (or leave it if the rows get
   pruned per #2).
2. **Policy / accountant:** confirm whether BG tax/accounting law
   requires keeping any payment record on our side *at all* (Stripe and
   Apple already retain theirs as separate controllers). If not, the
   `audit_logs` payment rows can be pruned in the cron too. If yes, they
   are already pseudonymised — document the retention basis in the
   privacy policy.

`subscription_quotas` in the GDPR **export** is a separate, already-known
gap (sweep §5.3 — export omits it); not a deletion issue.

### 4. Paid features disclosed — Guideline 2.3 / 3.1.2

Not code. Two obligations:
- **Store listing:** the description and at least one screenshot must
  make clear which features require the paid subscription (love/career/
  health readings, priority AI). A listing that hides the paywall gets a
  2.3.1 ("app is not as advertised") or 3.1.2 flag.
- **In-app:** subscription price, billing period, and what's included
  must be visible **before** purchase, and links to Terms + Privacy must
  be on the paywall screen itself (3.1.2).

**Design input for the paywall mockup (already the next mockup):** it
must show the gated readings by name and carry visible price + period +
Terms/Privacy links. Fold this into that mockup's requirements.

### 5. Support page — scoped, buildable this week (once Vercel deploys)

**What it is:** a required App Store Connect field that must resolve to a
real, functional page — not a placeholder, not "coming soon", not
password-protected, not a bare `mailto:` (a bare mailto "is fragile and
can fail review" per multiple 2026 support-URL guides).

**Minimum contents:** app name; one-line description; a **working contact
method**; ≥1 troubleshooting entry. In **Bulgarian** (it's a Bulgarian
app).

**Contact method — recommendation, since there's no support inbox yet:**
create **`support@stellaeum.com`**. Do **not** put a personal Gmail in
the App Store Connect support field — it reads as unprofessional and can
draw reviewer scrutiny. Cheapest correct setup: **Cloudflare Email
Routing** (free) forwards `support@stellaeum.com` → the founder's
personal inbox, no mailbox hosting, ~10 minutes — and the domain's DNS
likely needs to be on Cloudflare for Vercel/Clerk anyway. Alternatives:
Zoho Mail free tier, or an alias at the domain registrar. Founder action:
~15 min once the domain DNS is set up.

**The page:** one static Next.js route `/support`, ~half a day, built
once Vercel deploys. Content: app name, one-line BG description,
`support@stellaeum.com`, 3–4 FAQ entries (не мога да вляза / възстановяване
на покупки / изтриване на акаунт / не получавам известия). **Not a Batch
8 design exercise** — a plain, legible page in the existing web styles.

**Blocks:** the Vercel deploy (now gated on the Next.js upgrade). Founder
can create `support@` **now**, independent of everything.

### 6. Terms, Privacy, cookie consent — Termly is the wrong tool here

**Termly does NOT support Bulgarian** (VERIFIED — its consent-manager
language list is Arabic/Danish/Dutch/EN/Finnish/French/German/Greek/
Hungarian/Icelandic/Italian/Norwegian/Polish/Portuguese/Spanish/Swedish;
**no Bulgarian**, and the multi-language *policy* generator uses the same
set and is Pro+ only). An English-only privacy policy + English-only
cookie banner for a Bulgarian consumer app is a real weakness with the
**CPDP** (Bulgaria's DPA) and poor UX. **Recommendation: don't pay for
Termly.**

**`/privacy` — lawyer-gated.** A **Bulgarian-language** policy
drafted/reviewed by a **Bulgarian data-protection lawyer**. **The
scoping brief to hand the lawyer is written:
`.planning/PRIVACY-POLICY-LAWYER-BRIEF-2026-08-27.md`** — Part A is the
standard GDPR section inventory (reconstructed, no Termly), Part B is the
verified account of what the app actually does (data inventory, the exact
OpenRouter payload, `bg_generation_flags`, payments, `audit_logs`
post-scrub, push/Sentry/IP, Кръг third-party birth data), and §15 lists
the 10 decisions the policy's content turns on. **Genuinely gated on the
lawyer, not finishable this week.**

**`/terms` — lighter, can ship faster.** Apple's standard EULA covers
the app-store licence. What must be **ours**: subscription terms (price,
auto-renewal, cancellation — 3.1.2 wants these in-app *and* on web);
acceptable-use; limitation of liability; governing law (Bulgaria); and
an **astrology disclaimer** ("за самопознание и забавление, не е
професионален съвет"). Template + a **short** Bulgarian-lawyer review is
enough — it has no data-processing content, so not the deep review
`/privacy` needs. Buildable within days of the lawyer engagement
starting.

**Cookie consent — likely NOT needed at launch, and it's gated on the
analytics decision (still open).** GDPR requires a consent banner only
for **non-essential** cookies/trackers. Clerk (auth) and Stripe
(checkout) set strictly-necessary cookies that are **exempt**. If the
launch decision is **no third-party analytics** (which fits the
conservative-defaults posture), **no cookie banner is required at all** —
one less vendor, one less integration, one less legal surface. Revisit
only if/when analytics is added. **Recommend: ship with no analytics →
no banner.**

---

## 7. Account linking — exact Clerk setting, and the relay edge

**The good news:** Clerk does email-based account linking **out of the
box, and its default is what we want.** When an OAuth provider returns a
**verified** email matching an existing Clerk user, Clerk **links the
connection to that user and signs them in** (Google always returns
verified; Apple verifies too, including the per-app relay address, which
is stable across sign-ins). An unverified OAuth email triggers a
verification step first, then links.

**Founder actions in the Clerk dashboard (both dev and, later,
production instance):**
1. **User & Authentication → Email, phone, username → Email → "Verify at
   sign-up": ON.** This is the security prerequisite for safe
   email-based linking (an attacker mustn't be able to pre-register an
   unverified email to capture a future OAuth login).
2. **Configure → Authentication → SSO / Social connections → Account
   linking:** confirm it's set to **link on verified email address**
   (Clerk's default). Only a stricter non-default setting would break the
   Google-then-Apple-same-email case.

**When the emails DIFFER — and nothing automatic can fix it.** An Apple
"Hide My Email" user (`abc123@privaterelay.appleid.com`) who later signs
in with Google (`realname@gmail.com`) has **two genuinely different
addresses**. Clerk has no way to know they're the same person →
**two separate Clerk users, two `users` rows, two separate sets of
charts.** Options:
- **Accept it as a known edge and document it.** A user who deliberately
  hides their email from Apple, then later tries a different provider,
  gets a fresh account. Uncommon.
- **Manual merge on request:** Clerk's API can link a second OAuth
  connection to an *already-authenticated* user — so a "Connected
  accounts" screen in `you/settings` (signed-in user adds Google to
  their Apple account, no email match needed) would let a user
  self-serve. Not built; a reasonable future addition, not a launch
  blocker.
- Support can also merge two users manually via Clerk's backend API if
  someone complains.

There is **no way to prevent** the split at sign-in time — the sign-in
screen can't detect that an incoming Google email belongs to the same
person as an existing relay-email account.

---

## 8. What blocks what — the three unowned items

**Finishable this week (no lawyer):**
- **`support@stellaeum.com`** — founder creates it now (Cloudflare Email
  Routing, ~15 min). Independent of everything.
- **The `/support` page** — ~half a day, built once Vercel deploys.
- **Google sign-in** — fully buildable now (no Apple, no lawyer); only
  the Google Cloud OAuth consent screen waits on `/privacy` resolving.
- **SIWA client work** (config plugin, new dev-client build, button UI)
  — buildable now; config + testing wait on Apple enrolment.
- **The `audit_logs` de-identification** — already shipped (`edefd47`).

**Genuinely gated on a lawyer (not this week):**
- **`/privacy`** — needs a Bulgarian data-protection lawyer for a
  Bulgarian-language policy. Termly won't do it (no Bulgarian). This is
  the long pole among the legal items.
- **`/terms`** — lighter: template + a *short* Bulgarian-lawyer review,
  no data-processing content. Days after the lawyer engagement starts,
  not weeks.

**Gated on other decisions:**
- **Cookie consent** — probably not needed at all (no non-essential
  cookies if no third-party analytics). Gated on the still-open
  analytics-vendor decision. Recommend: no analytics at launch → no
  banner.
- **Paywall paid-feature disclosure** (item 4) — a requirement on the
  paywall mockup (the next mockup), not a standalone task.

**Gated on the Vercel deploy** (itself now gated only on the Next.js
15.5.24 upgrade — awaiting founder go-ahead): `/privacy` resolving,
`/terms`, `/support`, the Google Cloud consent screen.

## What needs a founder decision

- ~~Is Google / social sign-in a launch feature?~~ **Ruled: yes.** →
  SIWA mandatory.
- **Engage a Bulgarian data-protection lawyer** for `/privacy` (whole
  policy, in Bulgarian) and a short review of `/terms`. This is the
  critical-path legal item — start it now.
- **Do NOT buy Termly** (no Bulgarian support) — recommendation, needs
  ratification.
- **Analytics at launch: yes/no.** "No" removes the cookie-consent
  requirement entirely.
- **Accountant question:** does BG tax/accounting law require keeping the
  `audit_logs` payment rows (already de-identified) after account
  deletion, given Stripe/Apple retain theirs? If no → prune them in the
  cron.
- **Clerk dashboard:** confirm "Verify at sign-up" ON and account
  linking = "link on verified email" (both instances). See §7.
- **SIWA token-revocation failure handling:** best-effort-and-proceed
  (recommended) vs. revoke-or-defer — ruling needed when SIWA is built.
- **`displayName.ts` relay-host guard** and **Clerk "Connected accounts"
  screen** — both small, both when SIWA lands.
