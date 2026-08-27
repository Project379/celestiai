---
title: Apple App Review requirements — research and scope
status: research only, build nothing. For founder decisions.
created: 2026-08-27
method: Apple guideline text + GDPR Art. 17 text/commentary (web sources cited) checked against our code by grep. Every code claim tagged VERIFIED (grep/read) or NEEDS-CHECK.
---

# Apple App Review requirements

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
| 1 | **Sign in with Apple** — required *only if* the app offers a third-party/social login (Google, Facebook, etc.) as a primary auth method (Guideline 4.8) | Clerk email + password + 2FA only. **No social login anywhere** (VERIFIED — grep of `apps/mobile/app/(public)/` finds no OAuth/`useOAuth`/Google/Apple). | Nothing, *unless* you add Google/social sign-in — then SIWA becomes mandatory | **£0 now.** If social login is added later: ~2–4 days (Clerk SIWA connection + Apple "Sign In with Apple" capability on the App ID + a native button + token-revocation on delete, see item 3) | **Does not block.** Only becomes a rejection risk if social login ships without SIWA alongside it. |
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

**VERIFIED:** `apps/mobile/app/(public)/` has `sign-in.tsx`,
`sign-up.tsx`, `two-factor.tsx`, `verify.tsx` — all Clerk email/password +
2FA. Grep for `oauth`, `OAuth`, `useOAuth`, `apple`, `google`, `strategy`
returns only 2FA second-factor logic. **No social login exists.**

**Rule:** 4.8 requires SIWA (or an equivalent privacy-preserving login)
**only if** the app offers a third-party/social login to create or
authenticate the primary account. An app that uses only its own
account system (which Clerk email/password is, from Apple's view) is
**not** required to offer SIWA. Sources: Apple Developer Forums 4.8
threads; PTKD 4.8 guide.

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

See the judgement section above. **No code change. Keep hard-delete +
cascades.** Optional: a retention-carve-out paragraph in the privacy
policy, and an accountant check on whether BG law obliges us to keep any
payment record on our side (Stripe already retains its own).

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

### 5. Support URL

**Required App Store Connect field.** Must resolve to a real, functional
page — not a placeholder, not "coming soon", not password-protected, not
a bare `mailto:`.

**Minimum contents (sources: multiple 2026 support-URL guides):** app
name; one-line description of what the app does; a working contact
method (a `support@stellaeum.com` address or a form); at least one
troubleshooting entry (e.g. "restore purchases", "can't sign in",
"delete my account"). An email *can* be the contact method but must sit
inside an actual page.

**Cost:** ~half a day once Vercel is live. A single static `/support`
route on the Next.js app. **Blocked on Vercel**, same as `/privacy` and
`/terms`.

### 6. Terms + Privacy via Termly

See the judgement section. Termly Pro+ ≈ $15/mo (annual) is a reasonable
scaffold + cookie-consent platform. `/terms` can lean on Apple's standard
EULA. `/privacy` needs a lawyer pass for the birth-data collection, the
retention period, and the OpenRouter/AI cross-border transfer + named
sub-processors — a generated template will not produce those sections and
they are the legally load-bearing ones for this specific app. Confirm
Termly actually offers Bulgarian (NEEDS-CHECK).

---

## What actually blocks submission, ranked

1. **Support URL** (item 5) and **`/terms` + resolving `/privacy`**
   (item 6) — both blocked on the Vercel deploy, which is already the
   widest blocker on the board.
2. **Paywall discloses paid features** (item 4) — a mockup requirement,
   feeds the next mockup.
3. **Nothing else.** Item 1 is very likely not applicable; item 2 is
   satisfied as built; item 3 is satisfied as built and the tip that
   prompted it is wrong.

## What needs a founder decision

- **Is Google / social sign-in a launch feature?** (decides whether item
  1 exists at all).
- **Lawyer review for the privacy policy** — yes/no, and which
  Bulgarian data-protection lawyer.
- **Accountant question:** does BG tax/accounting law require us to
  retain any payment record on our side after account deletion, given
  Stripe and Apple already retain theirs?
