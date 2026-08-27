---
title: Auth provider expansion — Google Sign-In + Sign in with Apple
status: investigation only, build nothing. Founder decision 2026-08-27: Google IS a launch feature, so SIWA is MANDATORY (Guideline 4.8) and this is a submission blocker.
created: 2026-08-27
---

# Google Sign-In + Sign in with Apple — scope

Founder reversed the earlier "no social login at launch" call: **Google
sign-in is a launch feature.** Under App Store Guideline 4.8 that makes
**Sign in with Apple mandatory alongside it** — not optional. Both are now
on the critical path with the support page and `/terms`.

**The single most useful finding:** the dependencies are **already
installed** — `@clerk/expo@3.2.4`, `expo-apple-authentication@~8.0.8`,
`expo-auth-session@~7.0.11`, `expo-crypto`, `expo-web-browser` are all in
`apps/mobile/package.json` (VERIFIED). No new npm packages. And the two
providers split cleanly on effort: **Google needs no native build; Apple
does.**

---

## 1. Google Sign-In via Clerk on Expo

**Mechanism:** Clerk's OAuth on Expo uses the **browser-redirect flow**
(`useSSO()` / `startSSOFlow({ strategy: 'oauth_google' })` from
`@clerk/expo`), which opens an `ASWebAuthenticationSession` /
Custom Tab via `expo-web-browser` + `expo-auth-session`. **No native
Google SDK, no `@react-native-google-signin`.**

| Question | Answer |
|---|---|
| **Native module / new dev-client build?** | **No.** The browser-redirect flow runs in the current dev-client build and even in Expo Go. Your testing loop is unchanged for Google. |
| **Clerk dashboard** | Enable the **Google** social connection. Development can use Clerk's **shared dev OAuth credentials** (zero Google Cloud setup). **Production requires your own Google OAuth client** (Client ID + secret pasted into Clerk). |
| **Google Cloud Console** (production only) | Create a project → **OAuth consent screen** (app name, logo, support email, **homepage URL**, **privacy-policy URL**) → **OAuth 2.0 Client ID** (type: Web application; redirect URI is Clerk's, given in the Clerk dashboard). Basic `email`+`profile` scopes are non-sensitive → **no Google verification review** (that delay only hits sensitive/restricted scopes). |
| **Blocked on Apple enrolment?** | **No.** Entirely independent. |
| **Blocked on anything of ours?** | The OAuth consent screen needs a **resolving privacy-policy URL** → ties to the Vercel / `/privacy` deploy. Dev works without it. |
| **Client code** | Mobile: add a "Продължи с Google" button wired to `startSSOFlow`, handle the returned `createdSessionId`, `setActive()`. ~1 screen's worth. Web: Clerk's prebuilt `<SignIn/>`/`<SignUp/>` (already used at `app/(auth)/sign-{in,up}/[[...]]`) **auto-renders the Google button once the connection is enabled** — near-zero web work. |

**Cost:** ~1–2 days mobile (button + SSO flow + Bulgarian error mapping +
the account-linking edge below), ~0 days web (config only), plus ~1 hour
Google Cloud once `/privacy` resolves.

---

## 2. Sign in with Apple

**Mechanism — and this is where it diverges from Google.** Apple's
Guideline 4.8 + Human Interface Guidelines require the **native**
"Sign in with Apple" sheet on iOS (`AppleAuthentication.signInAsync()`
from `expo-apple-authentication`), not a browser redirect. A
browser-based `oauth_apple` flow is technically possible through Clerk but
is a **rejection risk** on iOS. So the compliant path is: native Apple
sheet → hand the returned identity token to Clerk
(`signIn.create({ strategy: 'oauth_token_apple', token })` /
`useSSO` with the native token).

| Question | Answer |
|---|---|
| **Native module / new dev-client build?** | **YES.** `expo-apple-authentication` is installed but **not wired** — it's absent from `app.json`'s `plugins` and there's no `ios.usesAppleSignIn` (VERIFIED). Adding the config plugin + `ios.usesAppleSignIn: true` changes native iOS config → **a new dev-client build is required.** This changes your testing loop: you cannot test SIWA on the current build. |
| **Apple Developer prerequisites — which are blocked on enrolment** | **All of them.** (a) The **"Sign In with Apple" capability** on the App ID (`com.stellaeum.app`) — Developer portal, needs enrolment. (b) A **Services ID**, an **Apple private key (.p8)** with the Sign in with Apple scope, the **Key ID** and **Team ID** — all Developer portal, all need enrolment. Clerk's Apple connection needs the Services ID + .p8 + Key ID + Team ID pasted in. **SIWA cannot be configured end-to-end until Apple enrolment clears.** |
| **What can be done *before* enrolment** | The client code, the `expo-apple-authentication` config plugin, `app.json` (`ios.usesAppleSignIn`, entitlement), the new dev-client build, and the mobile + web button UI. It just can't be *tested* against a real Apple sign-in until the capability + keys exist. |
| **The button — Apple's exact asset, or can we style it?** | Apple requires the button to **follow its spec** (one of the approved label texts, the approved corner radius range, black / white / white-outline styles, minimum size, correct locale) but you do **not** have to use a literal image asset — `expo-apple-authentication` ships `<AppleAuthentication.AppleAuthenticationButton>` which renders the compliant native button and is what Apple expects to see. You may pick style/label/cornerRadius within the allowed range; you may **not** restyle it into the app's bronze/serif design language. It is the one screen element that is deliberately not ours. Web: Clerk's prebuilt component renders a compliant Apple button automatically. |
| **Blocked on anything of ours?** | The new dev-client build; and the same Clerk-production reconfiguration as everything else. |

**Cost:** ~2–4 days mobile (config plugin + new build + native sheet
integration + token handoff to Clerk + button + errors), ~0 web (Clerk
prebuilt), plus ~1–2 hours Developer-portal + Clerk-dashboard config
**once enrolment clears**.

---

## 3. Token revocation on account deletion

**The requirement (Guideline 5.1.1(v)):** when a SIWA user deletes their
account, the app must call Apple's token-revocation endpoint
(`POST https://appleid.apple.com/auth/revoke`) with the user's Apple
refresh token and the app's client-secret JWT.

**Does Clerk do it?** **No — assume it's our responsibility** (NEEDS-CHECK
against current Clerk docs, but Clerk historically does not auto-revoke
third-party provider tokens on `users.deleteUser()`). Clerk *stores* the
Apple tokens and exposes them via
`clerkClient.users.getUserOauthAccessToken(userId, 'apple')`.

**What it means for `cron/cleanup-deleted-accounts`:** before
`clerk.users.deleteUser(clerkId)` (currently the second-to-last step),
add: *if the user has an Apple OAuth connection*, fetch the token from
Clerk and POST it to Apple's revoke endpoint with a signed client-secret
JWT (built from the same .p8 / Key ID / Team ID / Services ID as the
sign-in config).

**Failure handling — this needs a founder ruling.** The cron hard-deletes
and its per-user `try/catch` stops before the Clerk/users-row delete on
any throw (the retry-anchor design). Two options:

- **(a) Best-effort revoke, log-and-proceed.** If Apple's revoke call
  fails, log to Sentry and continue the deletion. Consequence: a failed
  revoke means the Apple token lives until it naturally expires (Apple
  refresh tokens are long-lived). Imperfect, but it keeps the GDPR
  guarantee that deletion always completes.
- **(b) Revoke-or-defer.** If the revoke fails, throw — the per-user
  catch leaves the `users` row, tomorrow's run retries. Consequence: a
  persistently-failing Apple API blocks that user's deletion
  **indefinitely**, which is itself an Art. 17 violation.

**Recommendation: (a).** Deletion completing is the stronger obligation;
Apple's guidance accepts that revocation can fail. Pair it with a Sentry
alert so repeated failures are visible. This is a real decision, not a
default — flag for ratification when SIWA is built.

**Extra dependency:** the revoke call needs the Apple client-secret JWT
signing to live server-side (the .p8 as an env var / secret on Vercel).
One more secret to add to `turbo.json`'s `build.env` and the Vercel
project when SIWA ships.

---

## 4. Private Relay — re-verified for three providers

Earlier finding (one provider): `clerk_id` keying holds, nothing keys on
email, the one email read is a guarded display-name fallback. **Re-checked
for email/password + Google + Apple:**

| Scenario | Effect |
|---|---|
| Google user | Real email, always present. No issue. |
| Apple user, email shared | Real email. No issue. |
| Apple user, "Hide My Email" | Clerk receives `xxxxxxxx@privaterelay.appleid.com` — a **real, deliverable, app-unique** address (Apple forwards mail). Won't collide with anything. |
| Apple user, hidden email **and** no name | `getDisplayName` (`apps/mobile/lib/clerk/displayName.ts`) resolves: `firstName lastName` → **email username** → `'Ти'`. It would show the relay hash (`xxxxxxxx`) as the name. **Cosmetic bug** — fix: when the email host is `privaterelay.appleid.com`, skip the username step and use the `'Ти'` placeholder. One-line change, do it when SIWA lands. |
| **Account linking** | User signs up with Google (`a@gmail.com`), later uses SIWA and Apple returns the same verified `a@gmail.com`. Clerk **auto-links to the existing user and signs them in** — this is the wanted behaviour and it is **automatic and unconfigurable**. Clerk's current docs: email-based linking "is always on" with "no dashboard setting to enable or disable" it (source: `guides/configure/auth-strategies/social-connections/account-linking`). ~~Must set Clerk's "account linking" to link on verified email~~ — **corrected 2026-08-27: there is no such setting.** The only real prerequisite is "Verify at sign-up" ON (already done), so a pre-registered unverified email can't hijack a future OAuth login. Nothing to configure on dev or production. |

**Nothing keys on email or assumes it's unique in our code** (VERIFIED —
grep). Clerk enforces intra-instance email uniqueness itself. The only
code touch is the `displayName.ts` relay-host guard.

---

## 5. Web parity

**Yes — web needs both providers, and mostly gets them for free.**

- Clerk **social connections are per-instance, not per-app.** Enabling
  Google + Apple in the Clerk dashboard turns them on for **both**
  `@clerk/nextjs` (web) and `@clerk/expo` (mobile) at once. Shared config.
- Web **UI is near-zero work**: `app/(auth)/sign-{in,up}/[[...]]` use
  Clerk's prebuilt `<SignIn/>` / `<SignUp/>`, which **auto-render the
  Google and Apple buttons** once the connections exist. Mobile is custom
  UI → buttons added by hand.
- **Cross-platform login works** because it's one Clerk user: sign up
  with Google on mobile → "Continue with Google" on web signs into the
  same account.
- **The failure mode to avoid:** a user who signs up with Google on
  mobile and never sets a password **cannot** log into web unless web
  shows the Google button. So web must ship the social buttons **in the
  same release** as mobile, not later. With Clerk's prebuilt components
  that's automatic — just don't hide them.
- **Production instance:** all social connections must be **re-created on
  the Clerk production instance** with production OAuth credentials
  (compounds the existing Clerk-production work in
  `TECHNICAL-SWEEP-2026-08-26.md` §2.3).

---

## 6. Cost and dependency order

### Can do now (before Apple enrolment)

| Task | Est. | Blocked on |
|---|---|---|
| Google: Clerk dashboard connection (dev shared creds) | 15 min | — |
| Google: mobile "Continue with Google" button + `startSSOFlow` + errors | 1–2 d | — |
| ~~Google: account-linking setting in Clerk~~ — **no setting exists**, linking is always on (see §4) | 0 | — |
| Google: web — confirm prebuilt buttons render (config only) | 0.5 d | — |
| Google Cloud: OAuth consent screen + Web client (production creds) | 1 h | resolving `/privacy` URL (Vercel) |
| SIWA: `expo-apple-authentication` config plugin + `app.json` (`usesAppleSignIn`, entitlement) | 0.5 d | — |
| SIWA: **new dev-client build** | build time | the config-plugin change above |
| SIWA: mobile native Apple sheet + token handoff + compliant button | 2–3 d | the new build (to test) |
| `displayName.ts` relay-host guard | 15 min | — |
| Web: confirm Apple button renders (Clerk prebuilt) | 0.25 d | — |

### Blocked on Apple Developer enrolment

| Task | Est. | Note |
|---|---|---|
| "Sign In with Apple" capability on App ID `com.stellaeum.app` | 15 min | Developer portal |
| Services ID + Apple private key (.p8) + Key ID + Team ID | 30 min | Developer portal |
| Clerk dashboard: Apple connection (paste the above) | 15 min | needs the .p8 |
| End-to-end SIWA test on the new dev-client build | 0.5 d | needs capability + keys live |
| Token-revocation-on-delete in the cleanup cron + client-secret JWT signing + the .p8 as a Vercel secret | 1–1.5 d | needs the .p8; also a founder ruling on failure handling (§3) |

### Blocked on Clerk production instance (already a known separate item)

- Re-create Google + Apple connections on the production instance with
  production OAuth credentials.
- Re-verify account-linking on production.

### Critical-path summary

- **Google is fully shippable without Apple** — the only external
  dependency is the Google Cloud OAuth consent screen, which needs
  `/privacy` to resolve (Vercel).
- **SIWA client work (plugin, build, UI, button) can all be done now**;
  only the *configuration and testing* wait on enrolment.
- **The new dev-client build is the thing that changes the founder's
  testing loop** — flag it before starting SIWA client work so it's
  expected, not a surprise.
- Token revocation is ~1.5 d and needs the .p8 (enrolment) plus a
  failure-handling ruling.

**Total rough cost:** Google ~3 d, SIWA ~5–7 d (split across the
enrolment boundary), + ~2 h of dashboard/portal config. On the critical
path alongside the support page and `/terms`.
