---
title: Device Pass — Batches 1, 4, 5, 6
status: checklist for founder execution, not automatable — nothing since Днес/Карта's original device pass has run on a device
created: 2026-08-16
---

# Device pass — Batches 1, 4, 5, 6

Nothing shipped since the original Днес/Карта device pass has ever run on a
device. This covers all four batches in one walkthrough, ordered the way a
real user would actually move through the app, not grouped by batch — so
findings surface in the order they'd actually surface, and a Batch 6 token
regression on a Batch 4 screen doesn't get missed because it's filed under
the wrong batch.

**Record findings as you go**, against the step that produced them, with a
screenshot/screen-recording where the finding is visual. A "looks off" note
without a screenshot is much harder to act on later — screen state, not just
prose, is the useful artifact here.

---

## 0. Environment — read this before opening either surface

Two surfaces, genuinely different native environments, not two skins on the
same thing:

| | Android emulator (Pixel 8, API 37.1) | iPhone 12 Pro Max (Expo Go) |
|---|---|---|
| Build | Real native dev client — this app's actual compiled code | Expo Go's own pre-built shell app — loads this app's JS, but Expo Go's native modules, not this app's |
| `EXPO_PUBLIC_API_BASE` | **Must be `http://10.0.2.2:3000`** | **Must be your machine's real LAN IP**, e.g. `http://192.168.1.4:3000` (already the value in `.env.local` — confirm it's still current before starting; if your machine's IP changed, update it) |
| Why the split | `10.0.2.2` is the emulator's documented alias for the host loopback — the ONLY domain this app's Android manifest whitelists for cleartext HTTP (`plugins/withEmulatorLoopbackCleartext.js`, scoped to that exact domain, not a blanket cleartext-allowed flag). A LAN IP is not on that whitelist — plain HTTP to it will be blocked by Android's default cleartext policy even though the emulator can technically route there. | A physical device has no loopback alias to the host — it needs the real LAN IP, over the same WiFi as your dev machine. Expo Go's own shell app permits cleartext HTTP for dev servers by default (no config in this repo controls that — it's Expo Go's own Info.plist, not this app's). |

**They cannot run off one shared value simultaneously.** `EXPO_PUBLIC_API_BASE`
is read once when Metro serves the bundle — whichever value is in
`.env.local` (or overridden) at that moment is what every connected client
gets, for as long as that Metro process runs. Two practical options:

- **Sequential (simplest for a one-time pass):** test one surface fully,
  change the env var, restart `expo start`, test the other.
- **Simultaneous, if you want it:** leave `.env.local` at the LAN IP
  (Expo Go's value) and launch the Android session with an inline override
  instead of editing the file: `EXPO_PUBLIC_API_BASE=http://10.0.2.2:3000 npx expo start --dev-client` in one terminal, plain `npx expo start` in another for Expo Go. Two Metro instances, two ports, no file edits either way.

This is a JS-bundle env var, not a compiled-in native value — changing it
and restarting `expo start` is enough, no rebuild of the Android dev client
needed.

**Corrected 2026-08-16 — `apps/mobile/.env.local` had a real RevenueCat
Test Store key sitting in `apps/web/.env.local` instead, where Metro never
reads it.** Copied into `apps/mobile/.env.local` (same value for both
`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `_ANDROID_API_KEY`, matching
web's file exactly — it's a shared Test Store key, not per-platform).
**`ERR-MOB-RC-002` should NOT fire on either surface now.** If it does,
that's a real finding — it means the key isn't reaching the running app
(stale Metro cache serving the old bundle is the most likely cause; restart
`expo start` after this env change, a JS-only change doesn't need a native
rebuild).

**What you should see instead, confirming success rather than inferring
it from an absence of errors** (all in Metro/Logcat/device console,
`RevenueCatProvider.tsx`'s own explicit verification logging):
- `[RevenueCat] configure() called for platform "ios"` (or `"android"`) —
  logged right after `Purchases.configure()` is called, on both surfaces.
- `[RevenueCat] isConfigured() -> true` — a read-back of the SDK's own
  internal state, not just "the function call didn't throw." If this logs
  `false`, that's a real finding even with no error thrown.
- After sign-in, `[RevenueCat][VERIFY] logIn() succeeded — Clerk
  userId="...", created=...` — confirms the Clerk↔RevenueCat identity link
  actually completed. Cross-check that same userId appears under this
  exact ID in the RevenueCat dashboard.

**Expected divergence between surfaces — native SDK vs. Expo Go's shim,
don't chase a difference here on its own:** Expo Go loads RevenueCat's own
**Browser Mode** shim (its own module-load-time log, `"Expo Go app
detected. Using RevenueCat in Browser Mode."`, fires before this
component even mounts) — a mock, not the real SDK. The Android dev client
is a real native build and loads the actual native RevenueCat SDK against
this Test Store key instead. **If something errors on Android but works
cleanly in Expo Go (or vice versa), that's expected surface divergence,
not a bug to chase** — note it, but the two paths are genuinely different
code underneath, not the same thing running on two devices.

**Expected failures — do not chase these, they're the correct outcome, not bugs:**
- **iPhone (Expo Go) only:** `ERR-MOB-PUSH-005` the first time you complete
  an Oracle reading (see step 6) — `getExpoPushTokenAsync` rejects on Expo
  Go by design; it needs the Dev Client. The in-app permission *prompt*
  itself should still work correctly (it's a standard OS API) — only the
  token fetch after granting is expected to fail.
- **Android emulator only:** push token registration silently no-ops with
  just a Sentry breadcrumb (`Device.isDevice` is `false` on an emulator) —
  you won't see an error at all here, which is correct, not a gap in
  coverage.
- The `/you/premium` free-state "subscribe on web" CTA rendering **nothing**
  — see step 7. Confirm it's cleanly absent, not present-but-broken.

---

## 1. Launch → sign in → wizard (Batch 1: infinite-loop fix) — BOTH

**What to do:** cold-launch the app, sign in (or create an account), complete
the birth-data wizard (date → time → location → confirm), tap calculate.

**Correct:** after confirm, the app settles on the chart/dashboard — no
repeated network activity, no flicker back to a loading or wizard state.

**Finding:** any visible loop back into the wizard, a spinner that doesn't
resolve, or (if you have dev tools open) repeated `/api/birth-data` requests
after the initial save. This was Batch 1's fix (`wizard/confirm.tsx` seeding
the `['first-chart']` query cache from the POST response) — a regression
here means that fix didn't actually hold.

---

## 2. Chart tab → tap a planet, watch frame rate (Batch 1: perf fix) — BOTH, but treat Android as primary since it's a real native build (Expo Go's JS-only execution won't show true native frame-rate behavior as reliably)

**What to do:** open Карта (chart tab). Tap a planet glyph on the wheel.
Watch frame rate for at least 15-20 seconds after the tap, not just the
instant after. Tap several different planets in sequence, don't just tap
once and stop.

**Correct:** a brief re-render on tap, then frame rate recovers to normal
(60fps on a modern device/emulator) and *stays* recovered.

**Finding — and this is the one to look at hardest:** does frame rate
**recover**, or does it **stay low (~30fps) until you force-quit**? The
memo fix that shipped (`WheelStaticLayers`/`PlanetGems` split in
`NatalWheel.tsx`) narrows the *cost* of each tap but does not explain a
*sticky* degradation that persists across taps and doesn't recover — that
symptom points at something accumulating (an animated-value or worklet
leak), most likely in `WheelArrivalContainer.tsx`, not at the memo fix
being wrong.

**If it stays low — do not propose a new hypothesis, capture this instead:**
1. **Android (primary):** Android Studio's GPU rendering profiler
   (`adb shell dumpsys gfxinfo <package> framestats`, or the on-device
   Developer Options → Profile GPU Rendering overlay) — capture a trace
   spanning: app cold-launch → chart tab open → 5-6 sequential planet taps
   → 20 seconds idle after the last tap. The idle window after the last tap
   is what tells us whether it's decaying or flat-lined.
2. **React DevTools Profiler** (works on either surface): record a profile
   session covering the same sequence, with "Record why each component
   rendered" enabled. If `WheelArrivalContainer` (or anything inside it)
   keeps re-rendering or re-scheduling after the tap sequence ends with no
   further user input, that's the leak signature.
3. Send both captures over, don't summarize them into "it's slow" — the
   raw frame timeline is what distinguishes "decaying" from "instantly bad
   and staying bad," which point at different bugs.

---

## 3. Днес — Batch 6 tokens + 360px layout — BOTH for the walkthrough, Android for the 360px-specific layout check (360 logical px is Android's number; note whatever iPhone's rendered width shows for comparison, but the 360px claim is Android's)

**What to do:** land on Днес after the wizard. Look at, in order: the phase
name / illumination line, the moon glyph, the "Питай Оракула" invitation
line and its glow (this is `CtaPanel`/`LeadLine` — see below), the sign-quip
line, the daily horoscope block.

**Batch 6 (amber→bronze) check — do this first, before anything else on
this screen:** `CtaPanel.tsx` and `LeadLine.tsx` are the two components with
a five-round dated device-approval history from before this batch. This
batch changed `bronzeText` from `#e0b587` to `#d9a06a` (correcting it to
match the committed mockups, which the amendment doc's own value never
actually confirmed against a device render). **Correct:** the "Питай
Оракула" invitation text and glow should still read as warm bronze/gold —
compare directly against whatever prior screenshot or memory you have of
the approved render. **Finding:** if the text now reads noticeably paler,
more washed-out, or shifted toward a different hue than what you approved
before — that's the value correction showing up as a real visual change,
not a bug, but it needs your explicit sign-off since it touches an
already-approved surface.

**360px layout check:**
- The phase name / illumination subLabel line (`"62% осветена · до
  пълнолуние: 4д 3ч"`-shaped text) — does it wrap awkwardly, truncate, or
  overflow its container at this width?
- The moon glyph and its halo — does the halo clip against the screen edge
  or another element?

**Finding:** any wrap/clip/overflow here is real — this width is narrower
than anything the design has been checked against before, so a problem here
isn't an emulator artifact, it's an unverified layout claim finally getting
tested.

---

## 4. Карта — planet-tap perf (already covered in step 2), Batch 6 tokens, 360px layout — BOTH

**What to do:** stay on Карта. Look at the Big Three row (`Plaque.tsx`) and
the "Детайли" pedestal (`Pedestal.tsx`) specifically — both consume
`CtaPanel`/`LeadLine`, same bronzeText-value question as step 3.

**360px layout check:** the Big Three columns (Слънце/Луна/Асцендент) —
do all three fit on one line at this width, or does the layout the app was
designed against assume more horizontal room than 360px actually gives it?

**Finding:** column wrap, text truncation, or the columns visibly
compressing/overlapping. Same standing rule as step 3 — this is the
narrowest width anything here has run at, so a real problem is a real
finding, not noise.

---

## 5. Кръг — full functional walkthrough (Batch 4) — BOTH

Every screen here was ported from web and has never been seen rendered at
all, on any surface. Walk the whole flow, not just the hub.

**What to do, in order:**
1. Open Кръг (tab). Confirm the Connections/Crush surface toggle renders
   and switches cleanly.
2. **Crush side:** tap "+ Нов профил", fill the saved-profile form
   (`SavedProfileForm.tsx` — reuses the wizard's own date/time/city
   pickers), save. Confirm it appears in the list, select it, confirm the
   compatibility report generates/displays (`SavedProfileDetailPanel.tsx`).
   Delete it, confirm removal.
3. **Connections side:** create an invite (`circle/new-connection.tsx`),
   confirm the share action works (this hands off to a share sheet or
   clipboard — confirm something happens, not a silent no-op). Cancel an
   invite, confirm it disappears from pending.
4. If you can accept an invite from a second identity/device: confirm the
   connection space appears (`ConnectionSpaceDetailPanel.tsx`) with
   members, weather, domain scores, and the latest report preview.
   Generate/regenerate a report. Archive the space, confirm it moves out of
   the active list.
5. Check the empty states (ratified §12.2 cards) render correctly when
   there's nothing in either list yet — this is the state a genuinely new
   user sees first, worth checking even though it's "nothing," since an
   empty state that renders wrong is still a finding.

**Correct:** every action above resolves to a visible state change (list
updates, panel shows new content, error toast on a deliberate failure case)
— no dead taps, no infinite spinners, no crashes.

**Finding:** anything that doesn't resolve, any layout that's clearly
broken (not just "not redesigned yet" — Кръг's screens are explicitly
**not** design-approved, they match web's structure, not Днес/Карта's
language, per Batch 4's own ruling; that's expected and not a finding by
itself). A finding here is functional breakage, not "this doesn't look like
the rest of the app."

---

## 6. Ти → Premium — all four subscription states + all three entry points (Batch 5) — BOTH

**Entry points — confirm all three land on the real screen, not a stub:**
1. You-tab menu → "Премиум" row.
2. Crystals tab, if not premium → `PremiumGate` → tap through.
3. Кръг → a saved-profile teaser card (locked/premium-gated state) → the
   "Отключи пълния прочит" CTA.

**Subscription states — you likely can't produce all four with one real
account, so this is about confirming the states render correctly given
whatever your test account's actual state is, and reading the code-level
state logic as a sanity check against what you see (not a substitute for
seeing it):** loading, error+retry, free (and the expired-subscription
variant, same branch), active, cancelling.

**Free-state CTA — expected to be invisible, confirm invisible, not
broken-looking:** the "Абонирай се на stellaeum.com" button + caption
should not render at all in the free-state branch, since
`EXPO_PUBLIC_WEB_APP_URL` is still the `REPLACE_WITH_` placeholder.
**Correct:** the free-state screen looks complete and intentional *without*
that button — no empty gap, no broken layout where the button should be.
**Finding:** if there's a visible hole, misaligned spacing, or any sign the
screen was laid out assuming the button would be there.

---

## 7. Wrap-up — cross-cutting

- Did anything from steps 1-6 also surface a Batch 6 token issue you didn't
  already note under that step? Bronze should read as warm/gold throughout;
  anything reading amber, or anything that reads oddly cool/washed where it
  shouldn't, is worth a note even outside CtaPanel/LeadLine specifically.
- Any Bulgarian text that clips, wraps badly, or overflows anywhere you
  weren't specifically told to check — note it, even off-script. This pass
  is the first time real device font rendering has met this copy at these
  widths.
- General crash/freeze/unresponsive-UI anywhere — always a finding
  regardless of which batch it traces to.

**NavRow — not a fix, a watch-item.** This is unverified, not known-broken —
`NavRow.tsx` is working shipped code and is not being touched. Its actual
footprint is narrower than "used across settings-style rows" — grepped, its
only real consumer is `States.tsx`'s accent-toned CTA row (the button shown
in an empty/error state), not a general list-row primitive. It uses the same
function-style `Pressable` `style` prop pattern that silently dropped
`flexDirection: 'row'` on three sibling primitives (`CtaPanel`, `Pedestal`,
`Plaque`) the same day, and was never itself audited for the same bug.
**What a failure would look like, concretely, if you land on any empty/error
state with a CTA button (Кръг's empty states in step 5 are the most likely
place):** the label text and the trailing `›` chevron stacking vertically
instead of sitting side-by-side in a row, or the row's height/alignment
looking visibly wrong compared to `you.tsx`'s own menu rows (which don't use
this component at all, so they're not at risk the same way and make a good
side-by-side comparison if both are on screen). If it renders as a normal
horizontal row with the chevron trailing on the right and responds to taps
correctly, it's fine — the pattern being unaudited doesn't mean it's broken,
only that nobody's confirmed it isn't.

---

## After this pass

Findings feed back into whichever batch they trace to (1, 4, 5, or 6) —
none of those are marked device-verified in `COMPLETION-TRACKER.md` until
this pass closes them out explicitly, batch by batch.
