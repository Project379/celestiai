---
title: Batched dev-client build — env prep, profile, command, test sequence
created: 2026-09-10
status: pre-build brief. Nothing here has run. Epistemic tags per feedback_epistemic_tagging.
supersedes-context: ANDROID-PREVIEW-TEST-CHECKLIST.md (that was build #6, --profile preview, 2026-08)
---

# Batched dev-client build

One build folding every native-affecting change that has landed since
build #6 (`--profile preview` APK, ~2026-08-12). No binary has been cut
since.

## 0. Scope — this is an Android-only build

`[verified]` Apple Developer Program enrolment is **not started** — it is
next week's money step (SYSTEM-MAP §965, COMPLETION-TRACKER L2842). The
`development` profile has `ios.simulator: false`, so an iOS build needs
provisioning profiles, which need the paid membership. `--platform ios`
and `--platform all` both fail at credential generation.

**Build `--platform android` only.** Consequences for the test list:

- **"Sign in with Apple renders" cannot be tested on this build.** SIWA
  is an iOS-only native sheet/button. Your own docs already predicted
  this ("SIWA sits UNTESTED for however long enrolment takes",
  COMPLETION-TRACKER L2553). The SIWA Phase A config (plugin +
  `ios.usesAppleSignIn`) is correctly in `app.json` and will simply ride
  along inert in the Android binary.
- A Simulator build (`"simulator": true`, unsigned, no membership needed)
  *could* verify the `AppleAuthenticationButton` renders + localizes,
  since that native view does not depend on the entitlement. But your dev
  machine is win32 and no iOS build has ever been attempted here — absent
  Mac access this path is closed too. Not recommended now; noted for
  completeness.

## 1. Native changes folded into this build

Since build #6, all unbuilt:

| Change | Commit | Platform surface |
|---|---|---|
| SIWA Phase A: `expo-apple-authentication` plugin + `ios.usesAppleSignIn: true` | de3a91a (Sep 1) | iOS entitlements — inert on Android |
| Device-support floor: `ios.deploymentTarget 17.0`, `android.minSdkVersion 30` | 2a3a33d (Sep 3) | **Android: minSdk 30 → excludes anything below Android 11.** Fine for the API 37 AVD; flag if an older physical device is in rotation |
| `posthog-react-native@^4.66.3` added | ae1e05a (Sep 3) | New autolinked dep — must be in the binary |
| Profile change itself: build #6 was `preview` (no dev client); this is `developmentClient: true` | eas.json (unchanged, but never built) | Different binary — includes expo-dev-client + dev menu regardless of the above |

`react-native-purchases` native module was already in build #6. The
Phase 2 paywall (`usePaywall.ts`, `PaywallSection`) is pure JS on top of
it — **no new native surface from the paywall work itself.**

## 2. Two pre-build blockers you own — fix before spending the build

### 2a. `REVENUECAT_WEBHOOK_SECRET` is not set in Vercel production
`[verified]` PLACEHOLDERS `RC-WEBHOOK-SECRET` (OPEN). Until it is set —
and set to the **same** value as the Test Store signing secret in
`apps/mobile/.env.local` (`a8yftqpc…`, updated 2026-09-08) — every
RevenueCat event makes `/api/webhooks/revenuecat` fail closed (HTTP 500 +
Sentry `fatal`), `users.subscription_tier` never flips, and the paywall's
activation poll (`usePaywall.ts`) always times out. **This reads as a
client bug but is a missing env var.** Test items 3 and 4 (webhook lands
/ tier flips, premium unlocks) are dead until this is done.

Set it in: Vercel → project → Settings → Environment Variables →
Production, then redeploy. Get the value from RevenueCat Dashboard →
Project Settings → Webhooks → your integration → HMAC signing secret.

### 2b. EAS env-var scoping — the build #5 dead-app risk
`[verified]` `apps/mobile/.env.local` is gitignored (`.gitignore:5`
`.env*.local`). **The cloud build never sees it.** Every real value in it
right now — `EXPO_PUBLIC_WEB_APP_URL`, both PostHog vars, both RevenueCat
keys, `EXPO_PUBLIC_SENTRY_DSN` — is worth nothing to this build unless it
is in the EAS environment.

`[inferred]` Every `eas env:set` recorded in the docs was "before build
#6", which was `--profile preview`. Those values most plausibly live in
the **preview** EAS environment. This build uses the **development**
profile, and `eas.json` declares no explicit `"environment"` key on any
profile. **A var in `preview` is invisible to a `development`-profile
build.** So the CLERK / SENTRY_DSN / REVENUECAT_ANDROID values you might
assume are "already there" may be entirely absent for this build — the
exact shape of the build #5 instant-crash.

**Do this, don't reason about it:**
```bash
eas env:list --environment development
eas env:list --environment preview
```
Diff them. Confirm which environment the `development` profile resolves
to (add an explicit `"environment": "development"` to
`eas.json → build.development` if it is ambiguous). Two caveats:
- Sensitive/secret-visibility vars do **not** print their value —
  "eyeball every value" only works for plaintext ones. Anything
  secret-typed: re-`eas env:set` it to be certain.
- `EXPO_PUBLIC_APP_VARIANT` must **not** be in EAS env — it comes from
  `eas.json → build.development.env` (`"development"`). Flag and delete it
  if it is already there.

## 3. Every env var the build needs

`EXPO_PUBLIC_*` vars are inlined into the JS bundle at build time. They
must be in the EAS `development` environment (or `eas.json`). Nothing
here is read from `.env.local` by the cloud build.

| Var | Read by | Required? | Source | Expected EAS status `[inferred]` | Set to |
|---|---|---|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `@clerk/expo` init — **app crashes on launch if missing/placeholder** (build #5) | **YES, hard** | EAS env | set before build #6, probably in `preview` env — verify it is in `development` | keep `pk_test_…` (dev instance) — see §5 |
| `EXPO_PUBLIC_API_BASE` | `lib/api/client.ts` — throws "Missing EXPO_PUBLIC_API_BASE" if unset | **YES, hard** | EAS env | prior builds baked `http://10.0.2.2:3000`; verify + almost certainly change — see §4 note | the HTTPS Vercel deployment URL (recommended), or `http://10.0.2.2:3000` for emulator-only |
| `EXPO_PUBLIC_APP_VARIANT` | RevenueCat key-shape guard (ERR-MOB-RC-007), only fires when `=== 'production'` | auto | `eas.json → build.development.env` → `"development"` | must NOT be in EAS env | nothing — leave it to eas.json |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | `RevenueCatProvider` | YES for purchase test | EAS env | real Test Store key set before the Aug Android build — verify it is in `development` env | RevenueCat **Test Store** key (`test_…`) — same value as the iOS var pre-cutover (ERR-MOB-RC-006 now allows equal `test_…` keys) |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | `RevenueCatProvider` (both keys read regardless of platform; ERR-MOB-RC-006 compares them) | not exercised on Android, but set it so the var is not empty | EAS env | `[inferred]` never set — iOS never built | the **same** `test_…` Test Store key as the Android var — there is no `appl_…` key until platform apps exist (REVENUECAT-PLATFORM-KEYS); ERR-MOB-RC-006 now allows equal `test_…` keys |
| `EXPO_PUBLIC_WEB_APP_URL` | `lib/config/webAppUrl.ts` — placeholder guard hides the "subscribe on web" CTA; logs ERR-MOB-WEBURL-001 | soft (CTA hidden without it) | EAS env | `[inferred]` **missing** (COMPLETION-TRACKER L3005, PLACEHOLDERS APP-URL-MOBILE OPEN) | the Vercel deployment origin, no trailing slash |
| `EXPO_PUBLIC_SENTRY_DSN` | `lib/monitoring/sentry.ts` — `if (dsn)` guard, no-ops if unset | soft (no crash reporting without it) | EAS env | set before build #6, probably `preview` env; PLACEHOLDERS EAS-SENTRY-DSN still OPEN/unconfirmed | mobile Sentry DSN (currently shares web's project — a separate mobile project is a founder action, not a blocker) |
| `EXPO_PUBLIC_POSTHOG_KEY` | `lib/analytics/posthog.ts` — logs "analytics disabled" + returns null if missing | soft (no analytics without it) | EAS env | `[inferred]` **missing** — PostHog RN added Sep 3, after the last build | PostHog project key (same project as web) |
| `EXPO_PUBLIC_POSTHOG_HOST` | same | soft | EAS env | `[inferred]` **missing** | PostHog EU ingest host |
| `EXPO_PUBLIC_FF_DAILY_HOROSCOPE` / `_FF_ORACLE` / `_FF_PUSH` | feature-flag reads | no — default **enabled** when unset | — | leave unset | nothing — do not add, do not chase an absent one |

**Build-time-only Sentry vars** (`SENTRY_AUTH_TOKEN` / `SENTRY_ORG` /
`SENTRY_PROJECT` / `SENTRY_DISABLE_AUTO_UPLOAD`): `[inferred]`
`SENTRY_DISABLE_AUTO_UPLOAD` is already in EAS env (HANDOFF-CC-2026-08-11,
VERIFICATION-SURFACE-GAPS L111). Org/project are not configured, so source
maps do not upload — a captured crash arrives with a **minified** stack.
Expected, not a failure. Not a build blocker.

### §4 note — `EXPO_PUBLIC_API_BASE` and cleartext
`withEmulatorLoopbackCleartext.js` is scoped to the literal string
`10.0.2.2`. On a **physical Android device** against
`http://192.168.x.x:3000`, Android blocks cleartext HTTP and every API
call dies — `adb logcat` shows `CLEARTEXT communication ... not
permitted`. Separately, RevenueCat cannot POST a webhook to a LAN IP at
all. **Both problems disappear if `EXPO_PUBLIC_API_BASE` points at the
HTTPS Vercel deployment and the RevenueCat webhook points at the same
host.** The emulator + `10.0.2.2` route still works for the app itself but
leaves the webhook (test items 3–4) unreachable.

## 4. Profile: `development`

`eas.json` has three profiles. Use **`development`** because:

- It is the only one with `developmentClient: true` — produces a
  dev-client binary (native code baked, JS bundle reloadable over the
  network via the dev menu). That is the point of a "dev client": iterate
  the paywall JS without a 20-minute rebuild each time.
- `distribution: internal` — installable by URL/QR, no store submission.
- `env.EXPO_PUBLIC_APP_VARIANT: "development"` — the RevenueCat
  key-shape guard (ERR-MOB-RC-007) only hard-flags on `"production"`, so a
  Test Store key does not trip it. Correct for this build.

Not `preview` (no dev client — you would rebuild for every JS change).
Not `production` (store signing, autoIncrement, needs enrolment).

## 5. Production Clerk key — hold it, do not put it in this build

Keep `pk_test_…` (the dev instance). Reasons:

- The entire test sequence needs a signed-in user with an existing DB row
  and a tier to flip. The Clerk **production instance is separate and
  orphans existing users** — switching now means the test accounts
  vanish.
- Every social connection (Google, and later Apple) must be **re-created
  on the production instance** with production OAuth credentials before
  anyone can sign in there at all (AUTH-PROVIDER-EXPANSION §5).
- It belongs in the **credentials cutover**, alongside the production
  Google OAuth client and the Apple keys — one coordinated switch, not
  piecemeal in a test build.

## 6. Build command — do not run yet

After §2a and §2b are done:

```bash
cd apps/mobile
eas build --profile development --platform android
```

Expect: ~15–25 min queued + build. Output is an installable `.apk`
(dev-client). EAS prints a URL/QR — install directly on the AVD or a
physical device (`adb install <file>` also works). First launch shows the
dev-client launcher; point it at your Metro bundler
(`pnpm --filter mobile start`) or a published update.

Post-enrolment, the same build for both platforms becomes
`eas build --profile development --platform all`.

## 7. Test sequence — in order, with the config-vs-code tell at each step

Run `pnpm --filter web dev` (or use the Vercel deploy) and start
`adb logcat *:S ReactNativeJS:V AndroidRuntime:E` **before** launching.

1. **Launch + sign in.** App opens to the dark splash, no white flash,
   real app name. Sign in with an existing `pk_test_` account.
   - *Fail — instant crash:* an `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
     placeholder/missing in the `development` EAS env (config, §2b). This
     is the build #5 failure.
   - *Fail — city autocomplete / any API call hangs:* `adb logcat` for
     `CLEARTEXT ... not permitted` (config — API_BASE is plain HTTP on a
     physical device, §4 note) vs. a network error (API_BASE wrong or web
     not running).

2. **Offerings load — two packages, correct prices.** Open
   `/you/premium`. `useOfferings` calls `Purchases.getOfferings()` and
   maps `offerings.current.availablePackages`.
   - *Fail — error string `No current RevenueCat offering / no available
     packages`:* config — no offering marked **current** in the
     RevenueCat dashboard, or no products attached. Not code.
   - *Fail — only one package, or wrong `packageType`:* dashboard offering
     is missing the monthly or annual package.
   - *Prices:* come from `product.priceString`, formatted by RevenueCat
     from the Test Store product's configured price + currency (no real
     store locale involved). `6,99 €` vs `€6.99` is a **format**
     difference, not a failure. A wrong *number* against the frozen
     **€6.99 monthly / €59.99 annual** is a Test Store product-price
     config issue in the RevenueCat dashboard, not code.
   - *Fail — `[RevenueCat] isConfigured() -> false` in logcat, or
     ERR-MOB-RC-001/002:* the Android API key is missing or still a
     `REPLACE_WITH_` placeholder in EAS env (config).

3. **Purchase completes.** We are on RevenueCat's **Test Store** (virtual
   — no Play Console, no App Store Connect, no Google/Apple account).
   Tap a package → the SDK does **not** invoke a native store sheet;
   instead RevenueCat renders its own **Test Store modal** showing the
   product metadata with buttons to simulate a **successful** purchase, a
   **failed** purchase, or **cancel**. Tap the success button → hook goes
   `purchasing → activating`. **Any signed-in user can purchase — no
   designated tester account** (optionally restrictable by user ID in the
   dashboard's Sandbox Testing Access settings, which we have not set).
   - *"Did the sheet appear?"* = the RevenueCat-rendered modal with the
     three simulate buttons. If a **native Google Play** dialog appears
     instead, the app is running with a `goog_…` production key, not the
     `test_…` Test Store key — wrong key in the EAS env (config).
   - *Fail — no modal at all, or ERR-MOB-RC-008 on tap:* the tapped
     package's product is not attached to the current offering in the
     RevenueCat dashboard, or the product identifier is malformed
     (config — all in the RevenueCat dashboard).
   - *`cancelled` state after dismissing the modal:* **not an error** —
     by design.

4. **Webhook lands and the tier flips.** After the purchase the hook
   polls `/api/stripe/subscription` (fast: 6×3s, then slow: 12×6s) until
   the server reports `tier === 'premium'`.
   - *Fail — always ends at `activation-timeout`, and the RevenueCat
     webhook log / Vercel log shows HTTP 500 + Sentry `fatal` on
     `/api/webhooks/revenuecat`:* `REVENUECAT_WEBHOOK_SECRET` missing or
     mismatched in Vercel prod (config, §2a).
   - *Fail — webhook returns a clean 2xx but tier still does not flip:*
     now it is a handler question — look at `handleRevenueCatEvent` /
     the `users` row update. Check the RevenueCat dashboard shows the
     purchase under your **Clerk userId** (logcat:
     `[RevenueCat][VERIFY] logIn() succeeded — Clerk userId="…"`), not an
     anonymous `$RCAnonymousID`.
   - *Fail — webhook never arrives at all:* RevenueCat webhook URL points
     at a LAN IP / localhost it cannot reach (config, §4 note).

5. **Premium unlocks across the app.** Once step 4 flips, the
   `/you/premium` branch unmounts and premium UI renders. Check a gated
   surface — Кръг locked affordances, crystals grid, recommendations
   monthly arc, Oracle cap.
   - *Fail — UI still locked but API calls 403 with
     `code: PREMIUM_REQUIRED`:* the DB tier did not actually flip (really
     a step-4 failure).
   - *Fail — UI unlocked but one screen still shows a padlock:* client —
     a `useSubscription` consumer not re-reading, or a three-state
     loading gap. Code.

6. **Restore purchases.** `/you/premium` → restore. `restore()` calls
   `Purchases.restorePurchases()` and checks
   `customerInfo.entitlements.active['premium']`.
   - *The entitlement identifier is hardcoded as `premium`.* If the
     RevenueCat dashboard entitlement is named anything else, restore
     **always returns `'none'`** and step 4 also never activates — with
     no error anywhere. **Verify that identifier in the dashboard before
     testing.** Config.
   - *`'none'` shown as "nothing to restore" for a real subscriber:*
     entitlement-identifier mismatch (above) or the purchase was never
     associated with this Clerk user (step 4 identity check).
   - *`'cancelled'` / `'error'`:* discriminated correctly — a cancel is
     not "nothing to restore".

7. **Sign in with Apple renders.** **NOT TESTABLE ON THIS BUILD** — see
   §0. Deferred to Phase B (post Apple enrolment). The config is present
   and correct; it needs an iOS binary.

8. **PostHog events arrive.** Exercise the five instrumented events
   (signup, birth data, chart view, free Oracle, subscription). Check the
   PostHog project (EU host).
   - *Fail — logcat shows `[PostHog] Missing EXPO_PUBLIC_POSTHOG_KEY /
     EXPO_PUBLIC_POSTHOG_HOST — analytics disabled.`:* config — the vars
     are not in the `development` EAS env (expected until §2b is done —
     these were added after the last build).
   - *Fail — no such log line, client initialised, but no events in the
     dashboard:* code / event-wiring question, or wrong host region.
   - *More than five event types showing up:* a regression — the plain
     client is deliberately used to avoid autocapture / lifecycle events.

9. **Sentry (opportunistic).** If anything crashes, check the Sentry
   dashboard. An event with a **minified** stack = DSN works, source-map
   upload not configured (expected — `SENTRY_ORG`/`PROJECT` unset). **No
   event at all** = `EXPO_PUBLIC_SENTRY_DSN` missing from the
   `development` EAS env (config).
