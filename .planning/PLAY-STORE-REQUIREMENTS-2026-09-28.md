---
title: Google Play submission requirements — research and scope
status: research only, build nothing. For founder decisions.
created: 2026-09-28
method: Google Play's own Play Console Help / Android Developer docs (fetched directly, quoted) checked against our code by grep/read. Every code claim tagged VERIFIED (grep/read) or NEEDS-CHECK; every external claim tagged VERIFIED (Google's own doc) or INFERRED (secondary source, Google's own doc didn't state it directly).
sibling: .planning/APPLE-REVIEW-REQUIREMENTS-2026-08-27.md (App Store side, same shape)
---

# Google Play submission requirements

Eight research items from the founder's list, researched against Google's
own documentation, then checked against our code. Summary table first,
then item-by-item detail, then the register.

**The headline finding is a correction to an assumption, not a gap:**
CLAUDE.md and prior planning docs describe the mobile app as "Expo SDK
52," but `apps/mobile/package.json` has **`"expo": "~54.0.36"`**
(VERIFIED) — the project was upgraded and the docs went stale. This
matters directly for item 4 (target API level): Expo SDK 54 defaults
`compileSdkVersion`/`targetSdkVersion` to **36** (Android 16), which is
exactly Google's current requirement (effective **already**, as of
2026-08-31 — today is 2026-09-28). Had the app actually still been on
SDK 52 (default target 35), this would be a **live blocker today**, not
a future one. As built, it is not.

**Correction 2026-09-28:** the founder's Google Play Console account
**exists** — Personal, created, currently pending Android device
verification and identity-document review. Everything below that this
doc originally described as blocked on "no account" is actually blocked
on **verification clearing**, not account creation. Corrected in the
summary table (item, was PLAY-CONSOLE-ACCOUNT: "no account exists") and
the register below.

**Real gaps found:** the founder's account is **Personal**, which puts the
12-testers/14-days closed-testing gate in scope; no Play Store listing
assets exist; the account-deletion web pathway is real but not
discoverable at a standalone URL (nested in a `UserMenu` popover); the
Content rating and Data safety questionnaires haven't been filled in
(they can't be, without a Console account) — item 2 and item 3 below
size what those answers should be given what the app actually collects.

---

## Summary table

| # | Requirement | What we have | What's missing | Cost | Submission impact |
|---|---|---|---|---|---|
| 1 | **Listing assets** — icon, feature graphic, screenshots, descriptions | Nothing (VERIFIED — no `fastlane`, no screenshots dir, no store-metadata files anywhere in the repo) | 512×512 icon PNG; 1024×500 feature graphic; ≥2 phone screenshots (320–3840px, JPEG/24-bit PNG); short description ≤80 chars; long description ≤4000 chars; promo video optional | Design + copy work, ~1–2 days once paywall/screens are final | Blocks listing creation, not code |
| 2 | **Content rating (IARC) questionnaire** | Not started (needs a Console account first) | Answers to the questionnaire. Astrology/fortune-telling has **no dedicated IARC category** in any documentation found — the questionnaire is a private/dynamic form Google doesn't publish in full. Likely lands at a low rating (comparable to a general lifestyle app) unless the AI-generated readings touch on categories the questionnaire *does* ask about (sexual content, drugs, gambling, user-generated/UGC text) | ~30 min once a Console account exists | Mandatory before publishing — every app needs an IARC rating |
| 3 | **Data safety form** | Not started (same account blocker). App-side facts are known: Clerk (name/email/user ID), birth date+time+location (own category — no exact IARC/Data-safety bucket, closest is "Personal info → Other info"), Stripe/RevenueCat (payment info, purchase history), PostHog (app activity, **linked to the user** via Clerk-ID `distinctId` — not anonymous) | The form itself, answered accurately against the above | ~1 day to inventory + fill in correctly once account exists | **Inaccurate declarations risk app removal/update-blocking**, enforced by Google, not just review-time rejection — this is a live, ongoing compliance surface, not a one-time gate |
| 4 | **Target API level** | Expo SDK **54.0.36** (VERIFIED, not SDK 52 as CLAUDE.md states) defaults `compileSdkVersion`/`targetSdkVersion` to **36**; `app.json`'s `expo-build-properties` block does not override either (VERIFIED — only `minSdkVersion: 30` and a packaging exclude are set) | Nothing structural. Worth an explicit `compileSdkVersion`/`targetSdkVersion: 36` pin in `app.json` so this doesn't silently regress on a future Expo downgrade or a stale local prebuild | ~15 min, defensive only | **Already compliant.** Google's requirement took effect 2026-08-31 (extension available to 2026-11-01); we're past that date and already meet it |
| 5 | **Subscriptions / auto-renewal / account deletion / permissions** | Paywall (`apps/mobile/app/(authed)/you/premium.tsx`) already implements `PAYWALL_DISCLOSURE.autoRenewal` + `.cancelInstructions` + Terms/Privacy links (VERIFIED); Stripe-path has a real cancel dialog; store-managed (RevenueCat/Play Billing) path shows a "manage subscription" deep-link to the OS subscription center (VERIFIED, `isStoreManaged` branch). Account deletion: in-app on both mobile (`you/settings.tsx` + `useAccountDeletion.ts`, VERIFIED) and web (`apps/web/app/api/gdpr/delete-account/route.ts` + `DataAccountPage.tsx`, VERIFIED) | Google requires **both** an in-app path **and** a discoverable **web-based** path reachable without the app installed. Web-side exists but is **not at a standalone URL** — `DataAccountPage` renders only inside `UserMenu.tsx`'s popover (VERIFIED — only one render site, found by grep), not a linkable page like `/account/delete`. Weak against Google's "prominently featured and easily discoverable" bar | ~0.5 day to expose a direct route, or link the support page to the exact popover-reachable path with instructions | **Real, fixable gap** — not a hard blocker (a logged-in web user *can* find it), but weak against the explicit "discoverable" wording and worth closing before the support page ships |
| 6 | **EU-specific** | The CRD auto-renewal disclosure Google's own Subscriptions policy asks for is the *same* disclosure already built for Apple/GDPR (item 4/6 of the Apple doc, `PAYWALL_DISCLOSURE`/`compliance-copy.ts`) — no separate Google-only EU obligation found beyond what's already tracked. DMA "alternative billing" for EEA is **optional**, not required, and requires business registration to participate — out of scope unless the founder wants to avoid Google's cut | Nothing new — this item resolves by inheriting the Apple-doc's tracked work | n/a | Does not block independently |
| 7 | **Closed testing (12 testers / 14 days)** | No Console account yet, so not started. Founder's account is **Personal** | Google's own page (VERIFIED, fetched directly): this requirement applies to **personal accounts created after 2023-11-13** — an Organization account is exempt. 14 days must be **continuous** per tester; an opt-out then re-opt-in **resets that tester's clock to zero**, it doesn't just pause. Production access is a 3-part form: closed-test recruitment/coverage/feedback summary, target audience + install projections, and what changed based on testing | 12 real testers running the build continuously for 14 days, then the readiness form | **Blocks production release** until satisfied — plan this as a real ~3-week runway (recruit → 14 days → review), not a same-week task |
| 8 | **Common subscription-app rejection reasons** | Cross-checked against our paywall (item 5) — no violation pattern found in what's built | Google's documented patterns (VERIFIED, fetched from the Subscriptions policy directly): monthly-equivalent pricing shown instead of actual charge amount; hidden/obscured trial-to-paid conversion cost or duration; misleading SKU names ("Free Trial" on an auto-renewing plan); missing in-app cancellation path; incomplete localization of price/terms. None of these currently apply based on what's read, but **re-check at final copy pass**, especially BG localization of price strings once real pricing is set | n/a — a review checklist, not a build task | Rejection risk if the final paywall copy drifts from what's implemented today |

---

## Item 2/3 — the judgement: astrology content and AI-generated readings don't map cleanly onto Google's published categories

**Content rating:** Every official Google/IARC page fetched (Play
Console Help "App content" page, "Content ratings" help page) describes
the *existence* of the questionnaire and its consequence (a rating from
multiple regional authorities), but **none publish the actual question
tree** — it's a dynamic form only visible inside Play Console when filling
it out. Secondary sources (Wikipedia's IARC article, industry guides)
converge on the same category list: violence/blood/gore, drugs/alcohol,
crude language/humor, gambling (including *simulated* gambling — treated
the same as real gambling), nudity/sex, and horror/fear themes. **None of
these are "fortune-telling" or "occult" categories** — no source, official
or secondary, describes IARC penalizing astrology/tarot/horoscope content
as a category in itself. **INFERRED, not verified against the actual
question tree:** a horoscope/astrology app answering honestly on every
axis (no violence, no drugs, no gambling mechanics, no UGC/chat between
users) most likely lands at the lowest tier across regional systems
(PEGI 3 / ESRB Everyone-equivalent), the same place a general lifestyle
or wellness app would land. The one thing worth flagging honestly in the
questionnaire (most content-rating forms ask this): whether the app
**references** real-world topics like relationships, sexuality, or health
advice even without depicting them — the AI-generated readings do discuss
relationships and (per the app's own `LLM-GUARDRAILS` placeholder row,
tracked separately in `.planning/PLACEHOLDERS.md`) currently have **zero
content-safety layer**, so an honest answer to "does content reference
mature themes" should account for what the model can actually generate
today, not just what it's prompted to generate.

**AI-generated content policy (separate from content rating):** Google's
AI-Generated Content policy (fetched, `support.google.com/.../14094294`
and `.../17262077`) turns out to be **narrower than the founder's framing
suggested** — the *declaration checkbox* mechanism ("Regulations require
AI-generated content be labeled...") applies to **visual store-listing
assets** (screenshots, promo images/video), not to AI-generated text
served inside the app. The broader conduct policy (no offensive/deceptive
content from genAI apps, user-reporting features for some categories)
scopes its reporting-feature requirement toward chatbot-style apps and
apps generating images/video of real people — **INFERRED, could not find
an explicit scoping threshold statement**, so this needs a direct check
inside Play Console's own compliance questionnaire at submission time
rather than assuming it doesn't apply. Doesn't block anything today; flag
for the actual submission pass.

**Data safety:** the app's real collection surface, read directly rather
than guessed:
- **Personal info:** Clerk auth (name/email/user ID) — standard.
- **Birth date + exact birth time + birth location** — this is the
  distinctive one. Google's Data Safety categories don't have a bucket
  named for this; it decomposes into "Personal info → Other info" (date
  of birth has its own explicit sub-item) plus **Precise location**
  (birth location, one-time entry rather than device GPS, but the
  category is about the *data type*, not the collection mechanism).
- **Payment info / purchase history** via Stripe (web) and RevenueCat
  (mobile) — standard subscription-app declarations.
- **App activity, linked to the user** via PostHog
  (`apps/mobile/lib/analytics/posthog.ts`, VERIFIED) — the bootstrap
  uses the Clerk `distinctId`, so this is **"data linked to you,"** not
  anonymous/aggregated, even though persistence is memory-only and
  there's no autocapture. Declaring this as unlinked/anonymous would be
  the kind of inaccuracy Google's enforcement targets.

None of this blocks development — it blocks *accurately filling in a form
that doesn't exist yet because there's no Console account*. Listed here
so the eventual form-filling starts from a real inventory instead of
guessing under deadline pressure.

---

## Item 7 — the judgement: the 12/14 clock is a scheduling problem, not a technical one

Confirmed directly from Google's own page
(`support.google.com/googleplay/android-developer/answer/14151465`):

> "Google Play requires personal developer accounts created after
> November 13, 2023, to test their apps before those apps are eligible
> for distribution on Google Play."

and, on the reset condition: testers who opt in, test for fewer than 14
days, and opt out **do not count** — a broken streak must restart at
zero for that tester, the 14 days have to be **consecutive**.

The founder's account is Personal (stated), and (per REVENUECAT-PLATFORM-KEYS
and PROD-CREDS in `.planning/PLACEHOLDERS.md`) doesn't exist yet at all —
so this requirement hasn't started its clock and won't until the account
exists and a closed-test track is created with a real build in it. This
is worth sequencing explicitly: **recruit 12 testers → get them opted in
→ hold 14 continuous days → THEN submit the production-access form** —
call it a 3-week minimum runway from "Console account created" to
"eligible for production," independent of and parallel to code work.
**No path to skip this exists on a Personal account** except converting
to an Organization account (requires a D-U-N-S number/business entity —
a separate founder decision, out of scope for this research).

---

## Item-by-item detail

### 1. Listing assets

Confirmed directly from Play Console Help
(`support.google.com/googleplay/android-developer/answer/9866151`):

- **App icon:** 512×512px, 32-bit PNG with alpha, ≤1024KB. 1 required.
- **Feature graphic:** 1024×500px, JPEG or 24-bit PNG (no alpha). 1 required.
- **Phone screenshots:** minimum 2, 320px–3840px on the long edge,
  JPEG/24-bit PNG. 4+ at 1080px+ recommended for promotion.
- **Short description:** ≤80 characters, mandatory.
- **Long description:** ≤4000 characters (VERIFIED via multiple
  consistent secondary sources; Google's own page in this fetch didn't
  state the number explicitly, so tagging this one figure INFERRED
  despite high confidence).
- **Promo video:** optional, YouTube URL.
- Tablet/Wear/TV/Automotive/XR screenshots only apply if those form
  factors are declared supported — see the sibling display-compatibility
  doc for the tablet/foldable decision.

**Audit:** nothing exists in the repo (VERIFIED — no `fastlane/`, no
`store-metadata`, no screenshots directory anywhere). Pure content work,
gated on final screen designs, not a code gap.

### 2. Content rating — see judgement above.

### 3. Data safety — see judgement above.

### 4. Target API level

Confirmed directly (`developer.android.com/google/play/requirements/target-sdk`):
new apps and updates must target **API 36 (Android 16)** as of
**2026-08-31**, with an extension request mechanism available to
**2026-11-01**. Today is 2026-09-28 — the deadline has already passed;
extensions exist for anyone not yet compliant, but we don't need one.

**Audit:** `apps/mobile/package.json` pins `"expo": "~54.0.36"`
(VERIFIED). Expo SDK 54's documented default `compileSdkVersion` /
`targetSdkVersion` is **36** (multiple consistent sources; not fetched
from Expo's own SDK-54 changelog directly in this pass — tagged
INFERRED but high-confidence given consistency and the exact gradle
output quoted by one source). `apps/mobile/app.json`'s
`expo-build-properties` entry (VERIFIED, read directly) sets only
`android.minSdkVersion: 30` and a `packagingOptions.exclude` — **no
explicit `compileSdkVersion`/`targetSdkVersion` override**, so the app
inherits SDK 54's default of 36. Compliant as built.

**One defensive recommendation, not a fix:** pin `compileSdkVersion: 36`
/ `targetSdkVersion: 36` explicitly in the `expo-build-properties` block
rather than relying on an implicit framework default — an Expo
downgrade, or a contributor pinning an older `expo` version to fix an
unrelated dependency conflict, would silently regress this with no
error until Play Console rejects the next upload. Cheap insurance,
~15 minutes.

### 5. Account deletion — the discoverability gap

Confirmed directly (`support.google.com/googleplay/android-developer/answer/13327111`):
apps with account creation must provide **both** an in-app deletion path
**and** a web-based option reachable **even without the app installed**,
"prominently featured and easily discoverable." All associated user data
(not just the account) must be deletable.

**Audit:**
- **In-app (mobile):** `apps/mobile/app/(authed)/you/settings.tsx` +
  `useAccountDeletion.ts` (VERIFIED, files exist and are wired). Backend
  is the real grace-period → hard-delete cron already verified in the
  Apple-doc sibling (§3 there) — same cron serves both platforms.
- **Web:** `apps/web/app/api/gdpr/delete-account/route.ts` (API exists,
  VERIFIED) and `apps/web/components/auth/DataAccountPage.tsx`
  (VERIFIED, contains the UI). **But** grepping every render site of
  `DataAccountPage` in `apps/web` finds exactly one:
  `UserMenu.tsx:180`, inside what a memory note already flags as a
  Clerk popover (`/settings` route was deliberately removed, per prior
  session's memory — `project_web_settings_removed.md`: "SettingsContent
  lives in components/auth/ inside Clerk popover only"). There is **no
  standalone, linkable URL** (e.g. `/account/delete`) a support page or
  Play Store description could point to.

This technically satisfies "a web-based option exists for a logged-in
user," but is weak against Google's explicit "prominently featured and
easily discoverable" wording — a reviewer or a user following a support
link would need to already be signed in and know to open the account
menu, not follow a direct link. **Recommend:** either expose a direct
route that opens straight to the deletion UI (even if it still requires
being logged in) or, at minimum, make sure the support page (already
planned per the Apple-doc sibling, item 5) links to exact,
reproducible instructions for finding it.

### 6. EU-specific — resolves by inheritance

Google's own Subscriptions policy language on auto-renewal disclosure
mirrors the EU Consumer Rights Directive requirement already tracked and
built against for Apple (`PAYWALL_DISCLOSURE` / `compliance-copy.ts`,
the `WITHDRAWAL-COPY` and `AI-ACT-COPY` rows in
`.planning/PLACEHOLDERS.md`). No Google-only additional EU obligation
was found. DMA "alternative billing" (`support.google.com/.../12348241`,
`.../16505463`) is opt-in, requires business registration, and changes
fee structure (7% ongoing for auto-renewing subs vs. Play's standard
cut) — a monetization decision for the founder, not a submission
requirement.

### 7. Closed testing — see judgement above.

### 8. Common subscription-app rejection reasons

Confirmed directly (`support.google.com/googleplay/android-developer/answer/9900533`):
required pre-purchase disclosures are price (actual charge, not a
monthly-equivalent breakdown of an annual charge), billing frequency,
free-trial duration and post-trial cost, auto-renewal terms, whether the
app functions without subscribing, and full localization of price/terms
in the user's language and currency. Cancellation must be reachable via
either the Google Play Subscription Center or a direct in-app path.
Documented violation patterns: hidden/obscured dismiss buttons on offer
screens, monthly-breakdown pricing display, hidden trial-to-paid cost,
misleading SKU names ("Free Trial" applied to an auto-renewing plan),
multi-click flows that accidentally trigger a purchase, one-time
benefits disguised as recurring, missing cancellation links, incomplete
localization.

**Audit against `premium.tsx` (682 lines, read directly):** disclosure
strings (`PAYWALL_DISCLOSURE.autoRenewal`, `.cancelInstructions`),
Terms/Privacy links, a real Stripe cancel-with-reason dialog, and a
store-managed branch (`isStoreManaged`) that shows a "manage
subscription" deep link rather than trying to fake a cancel button for
a Play-Billing subscription. No violation pattern currently visible.
Re-verify at final copy/pricing lock — BG-language price/period strings
specifically, since that's the localization axis Google explicitly
checks and the one most likely to drift silently if pricing changes
late.

---

## Register

| ID | Description | Owner | Blocks | Status |
|---|---|---|---|---|
| PLAY-CONSOLE-ACCOUNT | **Corrected 2026-09-28:** account exists (Personal), pending Android device verification + identity-document review. Everything below is blocked on verification clearing, not account creation | Toni | Everything below | OPEN, verification pending |
| PLAY-CLOSED-TESTING | 12 testers / 14 continuous days required before production access, because the account is Personal (not Organization). Needs 12 real recruited testers and a ~3-week runway; clock resets on any tester's opt-out | Toni | Store submission | OPEN, not started (blocked on PLAY-CONSOLE-ACCOUNT verification) |
| PLAY-LISTING-ASSETS | Icon, feature graphic, ≥2 screenshots, short/long description — none exist in the repo | Toni / design | Store submission | OPEN |
| PLAY-CONTENT-RATING | IARC questionnaire not started — needs verification cleared; likely low-tier rating, but honest answers should account for the zero-content-safety-layer gap already tracked as `LLM-GUARDRAILS` | Toni | Store submission | OPEN, blocked on PLAY-CONSOLE-ACCOUNT verification |
| PLAY-DATA-SAFETY | Data Safety form not started; inventory in item 3 above (Clerk PII, birth date/time/location, Stripe/RevenueCat payment data, PostHog app-activity **linked** to Clerk ID) should be the starting point, not a guess under deadline pressure | Toni / CC | Store submission | OPEN, blocked on PLAY-CONSOLE-ACCOUNT verification |
| PLAY-DELETE-DISCOVERABILITY | RESOLVED 2026-09-28: standalone `/account/delete` route added (`apps/web/app/account/delete/page.tsx`) — public route, works signed-out (explains deletion + links to sign-in with a `redirect_url` back to itself) and signed-in (renders the existing `DataAccountPage`, same GDPR delete path, no second implementation). Both states now also carry a subscription-cancellation warning (Stripe does not auto-cancel on account deletion — VERIFIED, grepped the delete route and hard-delete cron, no Stripe call in either) | CC | Store submission | RESOLVED |
| PLAY-TARGET-SDK-PIN | Defensive only: pin `compileSdkVersion`/`targetSdkVersion: 36` explicitly in `expo-build-properties` rather than relying on Expo SDK 54's implicit default | CC | — | OPEN, low priority |
| PLAY-CLAUDE-MD-DRIFT | CLAUDE.md still says "Expo SDK 52"; installed version is `~54.0.36` (VERIFIED) — doc drift, not a submission item, but worth fixing so future research doesn't re-derive the wrong baseline | CC | — | OPEN, cosmetic |
