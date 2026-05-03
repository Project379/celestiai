# Phase A Sub-Round 1 — Auth Foundation Close Summary

**Opened:** 2026-04-18 (Phase A scaffold + sub-round 1 plan).
**Closed:** 2026-05-03 (sub-round 1.7 founder verification batched + 1.7-fix commits landed).
**Outcome:** Mobile auth state machine is end-to-end functional in Expo Go on real iPhone. User can sign up, verify email, sign in, sign out, and the symmetric (public)/(authed) layout redirects gate every navigation transition correctly. Bulgarian copy across all four auth screens calibrated via `bulgarian-skill` with founder native-speaker review. Supabase mobile client factory wired and ready for the first real RLS-authenticated query in sub-round 2. Deferred items captured in `REVISIT-TRIGGERS.md`.

---

## Commit trail — 22 total commits between 1.0 baseline and 1.7 close

### Implementation commits (11)

| Sub-round | Commit | What |
|---|---|---|
| 1.1 | `4e28be3` | `feat(mobile): phase-a sub-round 1.1 — install Clerk + Supabase deps` |
| 1.2 | `7b5c00d` | `feat(mobile): phase-a sub-round 1.2 — wire ClerkProvider + token cache` |
| 1.3 | `b490fc6` | `feat(mobile): phase-a sub-round 1.3 — route grouping refactor` |
| 1.4a | `3d5fb84` | `feat(mobile): phase-a sub-round 1.4a — sign-in screen + public layout` |
| 1.4b | `730fa4b` | `feat(mobile): phase-a sub-round 1.4b — sign-up + verify screens` |
| 1.4b-fix | `aca9ffb` | `fix(mobile): phase-a sub-round 1.4b — password confirmation on sign-up` |
| 1.4-2fa | `3c7c318` | `feat(mobile): phase-a sub-round 1.4-2fa — sign-in 2FA challenge handling` |
| 1.4c | `e2140ba` | `feat(mobile): phase-a sub-round 1.4c — auth gating with isLoaded guard` |
| 1.4d | `3f6c83c` | `feat(mobile): phase-a sub-round 1.4d — Bulgarian copy calibration via bulgarian-skill` |
| 1.5 | `1c2d704` | `feat(mobile): phase-a sub-round 1.5 — Supabase mobile client factory` |
| 1.6 | `da0e73d` | `feat(mobile): phase-a sub-round 1.6 — you.tsx populated + sign-out` |

### Infrastructure fix commits (7) — sub-round 1.3 verification cycle

These shipped during the four verification round-trips between 1.3 and 1.4a. Each surfaced a distinct scaffold-staleness mechanism documented in drift entries #19–#22.

| Commit | What |
|---|---|
| `264f9d4` | `fix(mobile): allow Metro hierarchical lookup for pnpm sibling resolution` |
| `c90e6b2` | `fix(mobile): remove unused web target from app.json` |
| `802bdb8` | `fix(mobile): install Clerk Expo SDK peers required at bundle time` |
| `5c66691` | `chore(mobile): upgrade Expo SDK 53 → 54 to match Expo Go App Store version` |
| `47b0179` | `fix(mobile): remove broken asset references and stub expo-font plugin` |
| `1140c69` | `fix(mobile): remove explicit react-native-css-interop pin to allow NativeWind transitive resolution` |
| `8cbc43b` | `fix(mobile): re-add react-native-css-interop pin at version matching NativeWind 4.2.3` |

### Sub-round 1.7 close fix commits (3)

Founder verification observations surfaced three polish items batched at sub-round close per the time-efficient workflow.

| Commit | What |
|---|---|
| `c79a5ab` | `fix(mobile): phase-a sub-round 1.7-fix-1 — Излез button visibility` |
| `0f3ada2` | `fix(mobile): phase-a sub-round 1.7-fix-2 — remove signingOut state` |
| `40b80dd` | `fix(mobile): phase-a sub-round 1.7-fix-3 — accessibilityLabel on sign-out` |

### Documentation commit (1)

`docs(mobile): phase-a sub-round 1 close — REVISIT-TRIGGERS items 6/7 + SUB-ROUND-1-CLOSE summary` — bundles this summary, REVISIT-TRIGGERS.md additions for 2FA upgrade and color-contrast audit, and the close trail in a single atomic commit. This is the commit you are reading the summary of.

---

## What shipped — feature surface

### Auth state machine

Symmetric layout redirects gate every navigation transition between (public) and (authed) groups, both directions, both gated on `useAuth().isLoaded` to avoid bounce-on-cold-start during Clerk `tokenCache` hydration.

- `apps/mobile/app/(public)/_layout.tsx` — if `isSignedIn` → `<Redirect href="/" />`
- `apps/mobile/app/(authed)/_layout.tsx` — if `!isSignedIn` → `<Redirect href="/sign-in" />`
- Both `if (!isLoaded) return null` first

The `<Redirect>` component (verified at `apps/mobile/node_modules/expo-router/build/link/Redirect.js:34-43`) wraps `useFocusEffect + router.replace` internally — declarative pattern, matches the documented Clerk + expo-router idiom.

State machine on sign-out: `useClerk().signOut()` → `isSignedIn === false` → `(authed)/_layout` re-renders → `<Redirect href="/sign-in" />` fires → user lands on `/sign-in`. No `router.replace()` calls anywhere in `you.tsx`; the layout owns navigation.

### Auth screens — 4 flows complete

| Screen | Route | Status |
|---|---|---|
| Sign-in | `/sign-in` | Email + password, error mapping, 2FA branch routing on `needs_second_factor` |
| Sign-up | `/sign-up` | Email + password + confirmation, sends 6-digit code on submit |
| Verify | `/verify` | 6-digit email code entry + resend |
| Two-factor | `/two-factor` | TOTP / SMS / backup-code strategies with switch affordances (Clerk paid-feature gated — see REVISIT item 6) |

Bulgarian error mapping covers ~7 Clerk error codes per screen via `ERROR_MESSAGES` records + `getErrorMessage` helpers. Code-mapping refactor to a centralized module deferred (organizational concern).

### Bulgarian copy calibration (1.4d)

Native-speaker pass via `bulgarian-skill` with founder ratification on every change before files were written. Calibrations applied:

- Calque tightening: «Невалиден формат на имейл» → «Невалиден имейл» (and similar for код)
- Register harmonization: «Заяви нов» → «Изпрати нов» (replaces officialese, harmonizes with resend button)
- Cross-screen consistency: «Грешен код за потвърждение» → «Грешен код»
- Action-specific loading-state pattern: «Зареждане» → «Влизане» (mirrors imperative «Влез»); «Изпращане» → «Създаване» (mirrors «Създай»); «Проверка» → «Потвърждаване» (mirrors «Потвърди»)
- UI helper-text period convention: «Минимум 8 символа.» → «Минимум 8 символа» (drop period); «Изпратихме нов код.» → «Изпратихме нов код»
- Word-order tightening: dropped reflexive «си» from TOTP body text

Items kept after explicit founder ratification: 2FA H1 «Потвърди самоличността си» (formal banking/finance register over warmer alternative), demonstrative «Тази парола е твърде често срещана» (over definite-article form). Latin email placeholder `ime@primer.bg` kept (real emails use Latin script).

### Supabase mobile client factory (1.5)

`apps/mobile/lib/supabase/client.ts` mirrors `apps/web/lib/supabase/` directory structure. Hook `useSupabaseClient()` returns a Clerk-authenticated Supabase client via the modern `accessToken()` callback. Template-first JWT pattern matches `apps/web/lib/supabase/server.ts` production path with fallback to default Clerk JWT — works in both Pattern A (Clerk JWT template "supabase" configured) and Pattern B (Supabase third-party-auth integration) dashboard configurations.

Mobile-specific config: `persistSession / autoRefreshToken / detectSessionInUrl` all `false` to suppress AsyncStorage warnings on React Native (Clerk owns auth state, not Supabase). `useMemo` keyed on session — re-creates client only on auth-state change.

### `you.tsx` populated + sign-out (1.6 + 1.7-fix-1/2/3)

Replaces the placeholder with real Clerk `useUser()` data. Display name renders `firstName + lastName`, falls back to email-username, falls back to «Ти». Sign-out button at the bottom of the screen with hairline border + slate-200 text + Cinzel uppercase tracking. `accessibilityRole="button"` and `accessibilityLabel="Излез"` set the precedent for destructive-action a11y coverage.

Email/avatar/Supabase data deferred to sub-round 2.

---

## Sub-round 1.7 verification matrix — founder execution results

Founder ran the full matrix on real iPhone via Expo Go on 2026-05-03.

| Phase | Result |
|---|---|
| A1–A6 (auth state machine) | **PASS** — all redirect tests including cold-start gates |
| B1–B4 (Bulgarian copy) | (Folded into D — visual checks during ordinary use) |
| C1–C3 (Supabase smoke) | **DEFERRED** to sub-round 2 — first real query is the natural smoke surface |
| D1–D5 (you.tsx + sign-out) | **PASS** with three observations → 1.7-fix-1/2/3 commits |
| E1–E3 (cross-cutting) | **PASS** — clean, only Clerk dev-keys informational warning |
| Phase 5 — 2FA flow | **DEFERRED** — Clerk MFA is paid-feature gated on Hobby plan |

Three observations became the 1.7-fix commits:

1. «Излез» button too muted in original slate-500 styling — bumped to hairline border + slate-200 text + generous padding (1.7-fix-1)
2. «Излизане» loading state never visible because `signOut()` resolves faster than React re-renders — removed the `signingOut` state entirely (1.7-fix-2)
3. Accessibility: `accessibilityRole` + `accessibilityLabel` added to sign-out Pressable, setting precedent for destructive actions (1.7-fix-3)

Color-contrast audit and 2FA Clerk upgrade trigger added to `REVISIT-TRIGGERS.md` as items 7 and 6 respectively (decision deferrals, not action items).

---

## Drift entries logged — #19 to #22

Sub-round 1 surfaced four drifts in the scaffold-staleness family, all logged in `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md`:

| # | Surfaced when | Mechanism |
|---|---|---|
| #19 | Sub-round 1.3 verification round-trip 1 | At-scaffold-time misalignment — `metro.config.js` was wrong against pnpm on the day it was committed; symptom was Metro resolution failures for sibling workspace packages |
| #20 | Sub-round 1.3 prep, Posture A peer-deferral refinement | At-install-decision-time misalignment — Posture A applied without checking SDK static-analysis surface; `@clerk/expo` statically analyzes dynamic imports of `expo-apple-authentication`, `expo-web-browser`, `expo-auth-session`, `@clerk/expo-passkeys`, all of which had to be installed as peers even though their runtime features are deferred |
| #21 | Sub-round 1.3 verification round-trip 4 | At-post-scaffold-external-update-time drift — Expo Go on App Store auto-updated to SDK 54 while project was pinned at SDK 53; first surfaced only at first device-test moment, deferred from Apr 18 scaffold to Apr 28 verification because no real-device test happened in between |
| #22 | Sub-round 1.3 verification round-trip 4 (~7-hour bisection) | At-package-bump-time transitive-dep-pin override — NativeWind 4.2.3 + react-native-css-interop 0.1.22 silent mismatch; explicit-pin overrode transitive-exact-pin; className transformations silently failing producing white screen on mobile after SDK upgrade |

Bulgarian calibration in 1.4d did not surface a new drift entry; it shipped clean against the bulgarian-skill reference docs with no spec corrections needed.

---

## Disciplines applied

- **Investigation-before-code on every sub-round** — file reads, type lookups, primary-source verification before proposing implementation. The advisor was consulted at high-uncertainty crossings (auth gating logic shape, JWT pattern selection).
- **Founder ratification before code lands** — every implementation, every Bulgarian copy change, every styling choice surfaced as before/after diff or proposed code shape, founder-approved before files were written. Time-efficient mode preserved this discipline; only verification was batched.
- **Atomic commits per deliverable** — each sub-round = one commit, except where natural seams justified split (1.4a / 1.4b / 1.4-2fa / 1.4c / 1.4d are atomic per concept; 1.4b's split into feature commit + fix commit reflects post-implementation founder feedback).
- **Typecheck green per commit** — `npx tsc --noEmit` from `apps/mobile/` before every commit. No commit shipped with type errors.
- **Conservative-defaults posture preserved** — peer-deferral discipline (Posture A) applied to OAuth providers, passkeys, biometric. Self-flagged uncertainty surfaced rather than silently chosen (e.g., Pattern A vs. B for Supabase JWT, 70%-confidence flags on stylistic calls).
- **Self-flagged surface-scan at sub-round close** — beyond founder's specific observations, scanned for additional polish opportunities; surfaced one (a11y label on sign-out) and explicitly listed what was checked and rejected as scope creep so founder could review the discipline boundary.

---

## What's deferred and where

| Item | Deferred to | Why | Tracker |
|---|---|---|---|
| Biometric auth + EAS Dev Client + TestFlight | Late Phase C / early Phase D | Apple Developer Program enrollment ($99/year) gates this; founder not enrolled yet | REVISIT item 1 |
| Sign in with Apple runtime feature | Phase B+ | Peer installed for bundle compat; no feature request yet | REVISIT item 2 |
| OAuth providers runtime feature (Google, etc.) | Phase B+ | Peer installed for bundle compat; no feature request yet | REVISIT item 3 |
| Passkeys runtime feature | Post-launch | Peer installed for bundle compat; low priority pre-launch | REVISIT item 4 |
| 2FA challenge flow runtime activation | Clerk plan upgrade | Code shipped, paid-feature gated on Hobby plan | REVISIT item 6 |
| Color contrast audit | Phase D pre-launch | Accessibility-vs-brand tension needs product decision | REVISIT item 7 |
| Real Sun · Moon · Rising on `you.tsx` | Sub-round 2+ | Requires chart calculation flow not yet wired | sub-round 2 plan |
| `users` table queries via `useSupabaseClient` | Sub-round 2 | Pattern A vs. B verification will land naturally with first real query | sub-round 2 plan |
| ERROR_MESSAGES centralization | Sub-round 1.7 cleanup or post-launch | Organizational concern, not feature concern | (no separate tracker) |
| SECTIONS rows interactivity in `you.tsx` | Per-section sub-rounds | Routes don't exist yet | sub-round N+ |

---

## Sub-round 1 → sub-round 2 handoff

**Foundation paid down:**
- pnpm + Metro resolution working with hierarchical lookup
- ClerkProvider wired with `expo-secure-store`-backed `tokenCache`
- Route grouping with Slot pass-through, both `(public)` and `(authed)` declared on root Stack
- Expo SDK 54, react-native-css-interop pin-aligned with NativeWind 4.2.3
- All Clerk peer-static-analysis dependencies installed (apple-auth / web-browser / auth-session / passkeys)
- Asset references cleaned, `app.json` scaffold debt resolved

**Auth state machine end-to-end:** sign-up → verify → sign-in → 2FA branch (paid-gated) → authed (tabs) → sign-out → public, with symmetric layout redirects gating every transition.

**Supabase mobile client factory ready** for sub-round 2 first real query — no remaining infrastructure work; just import `useSupabaseClient` and `.from('table').select(...)`.

**Sub-round 2 entry conditions met:**
- All sub-round 1 ratifications closed
- Verification matrix executed and PASSED (with the three documented exceptions: Supabase smoke deferred to first real query, 2FA flow paid-feature deferred, color contrast deferred to Phase D)
- 1.7-fix commits landed and self-consistent
- Drift entries #19–#22 logged with mechanism + lesson + going-forward discipline

**Sub-round 2 expected scope** (per founder roadmap signaling): first real data fetches via `useSupabaseClient`, `packages/api-types/` creation for cross-workspace type sharing, Pattern A/B Supabase JWT verification at runtime via the temporary console.log surfaced in 1.7 verification matrix Phase C.

---

## Branch state at close

`mobile-parallel-test` at the close commit — 22 unpushed commits ahead of last push (`fcb646f` from §8.9 close). Push held for explicit founder command per sub-round 1 close ratification; founder will push tomorrow with fresh review and open sub-round 2 in the next session.
