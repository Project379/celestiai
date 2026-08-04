# Warm/Cool Redesign — Build Plan (planning only, no code)

**Status: DRAFT as of authoring (2026-07-25), since overtaken by real builds — correction 2026-08-03.** Converts the thirteen approved screen designs (`.planning/design/` artifacts, see `WARM_COOL_AMENDMENT.md` and `BUILD_VERIFICATION_GUARDS.md`) into a phased engineering plan. "Nothing in this document has been built" stopped being true the same week it was written: `CtaPanel.tsx` (`apps/mobile/components/design-system/CtaPanel.tsx`) is a real, shipped RN component with a five-round dated device-pass bugfix changelog running 2026-07-25 through 2026-07-28 (Android shadow fallback, Pressable style bug, ember positioning, glow clipping). Treat this doc's phase/sequence framing as historical context for what was planned, not as a live "not built yet" status — check the actual component tree for current build state instead of this line.

**A note on epistemic status, throughout this doc:** every LOC number is `[estimate]`. Every Stream P item status is sourced from `.planning/research/MOBILE_ALPHA_REDESIGN.md` §7 (dated 2026-07-22) and `phase-a-mobile-scaffold/REVISIT-TRIGGERS.md` — the most recent records found; anything not confirmed there is marked `[unverified]` rather than assumed current.

---

## 0. Why phased this way

Every prior mockup→device transition in this project revealed a real gap: the moon's fonts and brightness only showed their true state as a static browser render (not device); the Днес spine/text overlap only surfaced once real content lengths were tested; the Ритъм ignition point's vertical bug only appeared once animation and centering transforms actually interacted. There is no reason to expect the mockup→React-Native transition is exceptional. Phase 0 exists to spend the cheapest possible amount of engineering time finding out where *this* transition's gaps are, on the two screens that carry the most shared risk, before committing to the other eleven.

---

## 1. PHASE 0 — Foundation

**Goal:** every screen's shared machinery exists, is proven on-device on Днес (warm) and Карта (cool), and is provably reusable — not just "should reuse," verified by actually using it twice with two different temperatures before scaling to eleven more screens.

### 1.1 Token migration — two parts, not one

The 61-file amber audit (`WARM_COOL_AMENDMENT.md` §3) undercounted the real mechanical surface on first pass — it's not one swap:

| Part | What it is | Why it's separate |
|---|---|---|
| **1.1a — token file** | Add `bronze`/`bronzeText`/`cool`/`coolText`/`starlight` to `tokens.ts` (already done, staged in an earlier pass — verify still current), retire `amber`/`amberText` once 1.1b clears | Trivial, ~10-20 LOC |
| **1.1b — Tailwind class migration** | ~35 of the 61 files use Tailwind utility classes (`text-amber-300`, `bg-amber-300/5`, `border-amber-300/40`, etc.) which **do not inherit from `tokens.ts`** — each needs its own edit, file by file | This is the actual bulk of the migration; treating it as "the token file changed, done" is exactly the kind of undercounting the calibration caveat (§6) warns about |
| **1.1c — literal-value strays** | `index.tsx:363`'s `#fcd34d` (horoscope planet-mention color) and `MoonGlyph.tsx`'s default `outlineColor="rgba(251,191,36,0.4)"` are not caught by a `color.amber`/`fbbf24` grep | Small (2 sites) but silent if skipped — grep won't find them |

**Sequencing:** 1.1a lands first (mechanical, irreversible per the existing "bronze added, amber untouched" discipline from Stage 1). 1.1b is scoped as its own tracked pass, file-by-file, not folded into screen-by-screen work — it touches auth/wizard/manifest/crystals files that aren't otherwise being redesigned yet, so bundling it into Phase 1 screen work would make those screens' LOC estimates lie.

### 1.2 AmbientBackground — extend, don't rebuild

Already built and wired at the tab-root shell (prior session). Phase 0 work here is narrower than "build the starfield" — it's:
- Parameterize the corner-wash gradient by a `temperature: 'warm' | 'cool' | 'neutral'` prop (currently hardcoded violet+amber corners) so Днес/Карта/future screens each get the correct wash without a second component.
- **Frame-rate risk, and how it's actually measured (not asserted):** mount the dev client with React Native's Perf Monitor overlay (or Flipper's FPS graph) visible, scroll Днес with the ambient layer + graticule-resolve + ember-breathe all live simultaneously, and read the UI-thread FPS during (a) initial mount/resolve, (b) idle breathing, (c) scroll. The risk is stacking three independent Reanimated shared-value groups (starfield twinkle, ignite/ember breathing, resolve-on-mount) on one screen at once — cheap individually, unverified in combination. This is a device measurement, not a code review; Phase 0's job is to have the combined case running on Днес specifically so this can be checked before Ритъм (which is the screen that stacks the most: cool graticule + warm ignition + ambient, per the "both" temperature) is built.

### 1.3 Motion character — the highest premium-vs-synthetic risk, scoped as its own deliverable

Three primitives, each independently small in code, each unverifiable except on-device:
- **Resolve-into-focus** (one-shot opacity/scale ramp on mount) — already proven in `NatalWheel`'s graticule (Stage 1). Phase 0 generalizes it into a small shared hook (`useResolveIn(durationMs)`) so Guide's tablet, the wizard's star, and any future hero don't each hand-roll their own `useSharedValue`/`withTiming` pair.
- **Breathing** (continuous low-amplitude opacity/scale loop) — already proven on `MoonGlyph`'s glow. Generalize similarly (`useBreathe(durationMs, range)`), and **bake in the Guard 3 lesson**: any consumer that also needs `translate`-based centering must combine both in the same animated-style object, never layer a bare-`scale` animated style on a separately-centered element. Document this in the hook's own comment, since it's exactly the class of bug that shipped once already (in the mockup, not in code — but the code hook is where it would recur).
- **The invitation glow** (a static or slow radial-gradient bloom behind the invitation primitive, §1.5) — cheapest of the three, mostly a styling concern, not a new animation primitive.

**This is real, not skippable, risk:** a CSS keyframe reads as "premium" or "synthetic" very differently from the same easing curve running as a native-thread Reanimated animation on an actual OLED panel. Phase 0's device pass is where this gets judged — no amount of further mockup work substitutes for it.

### 1.4 Navbar — build the designed object

From `redesign-final.html`'s navbar section: violet horizon hairline, dark upward fade (no fill/panel), the five real glyph paths (already extracted from `TabIcons.tsx` — reuse those exact `d` attributes, don't redraw), dim-at-rest/starlight-when-active, and a single violet-lit point as the active indicator (not bronze — cross-temperature neutrality, per the ratified reasoning). Replaces the current `_layout.tsx` tab bar wholesale — this is a real component swap, not additive.

### 1.5 Two shared primitives, extracted now so eleven screens don't each reinvent them

- **Invitation primitive**: `CtaPanel.tsx` already exists (Stage 1) — Surface2 panel + leading sigil + single line, no box border/pill. Phase 0 work is confirming it matches the "lit phrase + ember, no container" language from the full redesign (the Surface2 panel is a *fitting* per the ratified bronze reading, which is consistent — but verify the sigil-as-ember read is strong enough once real bronze light values land from 1.1).
- **Eye-lead line primitive**: does not exist yet. Extract Днес's fixed spine-body/payoff-block pattern (Guard 1) into a small shared component (e.g., `LeadLine`) that takes children for the "led" content and a separate slot for the "stepped-forward" content, so the geometric bounding (spine's wrapper contains only what it leads through, never what it leads to) is enforced by the component's own structure — not something each of Ритъм/Guide/future screens has to remember to get right independently. This is the direct fix for "the risk is general" from Guard 1.

### 1.6 ScreenShell — extend to universal now, not per-screen later

**Decision needed, priced both ways:** `ScreenShell` currently wraps only `index.tsx` and `chart.tsx`. Eleven more screens need navbar clearance + ambient transparency + the correct temperature wash. Two options:
- **(a) Extend `ScreenShell` to accept a `temperature` prop and become the universal per-screen wrapper**, adopted by all thirteen screens. One real refactor (~40-60 LOC to the component itself) + a small per-screen adoption cost (~5-10 LOC × 11 screens not currently using it ≈ 55-110 LOC) = **~100-170 LOC total**, done once in Phase 0.
- **(b) Leave `ScreenShell` as-is and give each new screen its own bottom-padding/transparency wiring.** Cheaper-looking per screen (~10-15 LOC each) but pays the "is this screen's shell correct" question eleven separate times, with eleven separate chances to get the safe-area math wrong (this is exactly the mechanism Guard 1 flags for the navbar specifically).

**Recommendation: (a).** It's priced almost the same in total and removes eleven repeated judgment calls in favor of one. Flagged here for ratification rather than decided unilaterally, since it changes a shipped, shared component's contract.

### 1.7 Proof screens

Днес (warm) and Карта (cool) are rebuilt using every Phase 0 primitive above — not a second mockup pass, the real screens. This is deliberately the same pair used for the Stage-1 wiring pass, so this phase is validating the *full* machinery (motion + navbar + shell + tokens together), not re-proving what Stage 1 already confirmed in isolation.

### HALT — device pass

Founder reviews: token migration correctness (spot-check a few of the ~35 migrated files, not just the two proof screens), AmbientBackground frame rate under the combined load described in §1.2, the three motion primitives' actual feel, the navbar's temperature-neutrality on both screens, and whether `LeadLine`/`CtaPanel` read as intended once real bronze/cool values are live. **If the machinery doesn't feel right here, it's caught having touched two screens' worth of adoption, not eleven's.**

---

## 2. Asset dependency map

Every screen renders in **two waves**: **code-complete** (placeholder heroes: today's CSS/SVG moon, Unicode planet/aspect glyphs, no card-back treatment) and **asset-complete** (designer's illustrated assets dropped in). The two waves are independent — code-complete does not wait on the designer's free-time schedule.

### 2.1 The glyph interface — must be unified in Phase 0, not deferred

This is the one place a "later swap" promise requires code changes *now*, not just a plan to make changes later. Currently there are **two different render paths** for glyphs:

| Source | Shape | Consumers |
|---|---|---|
| `PLANET_GLYPHS`, `ASPECT_GLYPH` | `Record<string, string>` — Unicode characters, rendered via `<SvgText>`/`<Text>` | `NatalWheel.tsx`, `index.tsx` (reading anchor row), `PlanetsList.tsx`, `AspectsList.tsx`, `PlanetDetail.tsx`, `BigThreeCards.tsx`, `NatalWheelLegend.tsx`, `AstrologyReference.tsx` |
| `ZODIAC_GLYPH_PATHS` | `Record<ZodiacSign, readonly string[]>` — SVG path `d` strings, rendered via `<Path>` in a 24×24 viewBox | `NatalWheel.tsx`'s zodiac ring only |

**If planets/aspects stay on the Unicode/`<SvgText>` path through Phase 1 and only get converted when the designer's SVGs land, that "swap" is a re-wire of eight call sites, not a one-line change.** The fix is to unify the interface in Phase 0: define `PLANET_GLYPH_PATHS`/`ASPECT_GLYPH_PATHS` in the same `Record<Key, readonly string[]>` shape as `ZODIAC_GLYPH_PATHS` **now**, with placeholder path data (simple geometric approximations of the Unicode symbols, or — cheaper — a thin wrapper that renders the current Unicode glyph inside a `<SvgText>` behind the *same component interface* other call sites use, e.g. a `<GlyphMark planet="mars" />` component that internally picks Unicode-now/path-later). Either way, **the swap point is the component's internal implementation, not its call sites** — build that component in Phase 0, wire all eight call sites to it once, and the designer's 28 real assets become a data-file change plus one internal branch removed, not eight file edits.

### 2.2 Moon — the slot already exists in shipped code

`MoonGlyph.tsx`'s `ClipPath`/two-disk terminator math is the mask; the designer's illustrated moon face drops inside that same clip as a new fill layer, with the `outlineColor` prop and the terminator math entirely untouched. No new slot needs building — this is the cleanest asset-swap point in the whole map.

**Descope note:** the founder previously said "scrap the moon phase assets for now" (moon-phase question, prior session). That means the CSS/SVG-gradient moon built in the design pass is very plausibly the **long-term hero**, not a placeholder — the illustrated-moon path is a *possible* future, not a pending deliverable on any timeline. Don't build Phase 0/1 around an assumption that it's coming.

### 2.3 Card-back — does not exist in code yet, needs a placeholder built

No current component renders a face-down/unrevealed card state (checked: `CrystalCard.tsx`, `CrystalOfTheDayCard.tsx`, `CrystalGridTile.tsx` all render revealed content). The designer brief (`DESIGNER_BRIEF_ASSETS.md`) specifies one symmetrical, concealing SVG pattern, single color, app-tinted. Phase 1's crystals screen needs a placeholder now — a simple code-drawn abstract pattern (e.g., a tinted radial/geometric motif, matching the "no figurative silhouette" rule) behind a `CardBack` component whose only contract is "renders one tinted SVG, full-bleed on the card" — so the designer's real pattern is a single asset swap into that same component later.

### 2.4 Full map by screen

| Screen | Code-drawable now | Blocked on designer assets |
|---|---|---|
| Днес | Moon (CSS/SVG), spine, invitation, reading | — (moon may never be asset-blocked, see §2.2) |
| Карта | Instrument rim/face/graticule (CSS/SVG), Big Three plaque | 12 zodiac + 11 planet + 5 aspect glyphs (currently Unicode/partial-path; unified interface lands in Phase 0, real art drops in later) |
| Оракул | Ember, reading, ask-line | — |
| Guide | Tablet, Cinzel numerals (already real font) | Same glyph set as Карта, wherever Guide references a planet/sign inline |
| Ритъм | Track, beam, ignite reading, upcoming list | Same glyph set, if the track ever labels transits by planet glyph rather than name |
| Ти | Seal medallion (CSS), plaque | Sun-sign glyph etched in the seal (same glyph set) |
| Кръг | Two orbs | — |
| Crystals | Gem hero (CSS `clip-path`), bead strand | Card-back pattern (§2.3) for any collection/grid view showing unrevealed crystals |
| Recommendations | Ember list | — |
| Lunar diary | Mini moon, page | — |
| Settings | Plain rows | — |
| Wizard | Star, ring, input line | — |
| Auth | Starfield only | — |

---

## 3. PHASE 1+ — Screen rollout

Sequenced by temperature-group (so a group's Phase 0 adoption compounds within it) **and** by the Stream P collision (§4) — Ти is pulled forward ahead of its "natural" warm-group position because P.9 depends on it.

### Phase 1a — Ти, then Оракул

| | Ти | Оракул |
|---|---|---|
| Reuses | `ScreenShell` (temp=warm), `CtaPanel`→reveal-thread variant, navbar | `ScreenShell` (temp=warm), `LeadLine`, `CtaPanel`-style ask-line, ember breathing hook |
| Screen-specific | Seal medallion component (new, small) | Ember-as-hero sizing (grown instance of the shared ember, not a new primitive), ask-line-as-input wiring to real Oracle send action |
| Asset-blocked | Sun-sign glyph in seal (§2.4) | — |
| LOC `[estimate]` | 50-80 | 60-90 |
| Guards | Navbar clearance (uses `ScreenShell`, should inherit); longest real name/placement string — pull from `getDisplayName`/sign-name sources, don't assume | Longest real oracle-answer paragraph length — pull from `apps/web/lib/horoscope/prompts.ts`-equivalent oracle prompt spec if one exists; `LeadLine` bounding (§1.5) removes the overlap risk class by construction |

**Why Ти first:** P.9 (read-only subscription view) and the premium surface live under `you/premium.tsx` — part of Ти's screen family. Building P.9 against the *old* design and redesigning Ти afterward means reworking P.9's UI once the new shell/tokens land. Redesigning Ти first means P.9 is built once, correctly, on the new system.

### Phase 1b — Guide, then Ритъм

| | Guide | Ритъм |
|---|---|---|
| Reuses | `ScreenShell` (temp=cool), `useResolveIn` (tablet fade-in), Cinzel numeral styling | `ScreenShell` (temp=both — needs the extension noted below), `useResolveIn` + `useBreathe` combined correctly (Guard 3's lesson, directly exercised here), `LeadLine`, navbar |
| Screen-specific | Tablet component (new), Roman-numeral-as-nav interaction (new, small) | Track/beam/ignite composition (new); this is the screen most likely to surface a *second* motion-stacking issue per §1.3, since it's the one screen combining a cool resolve-in with a warm breathe on the same element cluster |
| Asset-blocked | Inline glyph references, if any (§2.4) | Same, if transits ever show a planet glyph inline |
| LOC `[estimate]` | 90-150 (was 120-180 across 7 files in the earlier estimate — narrowed here to the one representative section shown in the mockup; the other 6 `Guide*Section.tsx` files each get a smaller adoption pass once the tablet component exists, not a full rebuild) | 90-140 |
| Guards | Longest real Guide-entry-body text (guide copy is likely the single longest-running text in the app — pull actual longest section body before sizing the tablet) | **Ритъм's own bottom-safe-area clearance is unverified** — `rhythm.tsx` doesn't use `ScreenShell` today (flagged in Stage 1); Phase 1b is where this actually gets fixed, via §1.6's shell extension, not deferred again |

### Phase 1c — Кръг, crystals, recommendations, lunar diary

Lower risk, lower priority within the warm group — mostly composition of Phase 0/1a primitives (ember, orb, gem, bead-strand as small new leaf components).

| Screen | Reuses | Screen-specific (new) | Asset-blocked | LOC `[estimate]` |
|---|---|---|---|---|
| Кръг | `ScreenShell` (warm), navbar | Orb pair (new, small) | — | 40-70 |
| Crystals | `ScreenShell` (warm), ember/bead visual language | Gem hero (`clip-path`), bead strand | Card-back (§2.3) | 60-100 |
| Recommendations | `ScreenShell` (warm), `LeadLine`-adjacent ember list | Ember-list component (new, small) | — | 40-70 |
| Lunar diary | `ScreenShell` (warm), mini-moon (small variant of `MoonGlyph` — verify it accepts a size prop already, it does) | Dateline composition | — | 40-70 |

**Guard for all four:** none currently render inside `ScreenShell`, so this phase is also where they each pay the shell-adoption cost priced in §1.6.

### Phase 1d — Settings, Wizard, Auth (neutral/utility)

Lowest design risk — deliberately no hero, reuses the least Phase 0 motion machinery (Settings has none; Wizard reuses the star/ember minimally; Auth reuses only the starfield + invitation-glow language). Can run **in parallel** with Phase 1a-c, or after, without blocking anything else — nothing in Stream P depends on these three.

| Screen | LOC `[estimate]` | Note |
|---|---|---|
| Settings | 20-40 | Plain rows are the *correct* convention here (per the design notes) — cheapest screen in the set |
| Wizard (4 screens + StepIndicator + TimePicker + CitySearch) | 60-100 mechanical + design TBD per screen | Existing Cinzel-on-Cyrillic bug (REVISIT-42) is still open on these exact files — bundle its fix into this pass since it's the same surface, not a separate future trip |
| Auth (sign-in/up, verify, two-factor) | 20-40 | Mechanical token swap mostly; the "lit enter word" is a smaller instance of `CtaPanel`'s language |

---

## 4. Stream P — one unified sequence

**The collision, stated plainly:** P.9/P.11/P.15 build the premium/subscription surface on `you/premium.tsx`, which is part of the Ти screen family in the redesign. If P.9 builds against the current design and Ти is redesigned afterward, P.9's UI gets reworked once already. Putting Ти's redesign before P.9 avoids that.

| Order | Item | Depends on | Runs in parallel with |
|---|---|---|---|
| 1 | Phase 0 (foundation) | — | — |
| 2 | Ти redesign (Phase 1a) | Phase 0 | P.15 non-sandbox work, P.16 (both design-independent) |
| 3 | **P.9** (read-only subscription view) | Ти redesign landed | Оракул redesign (Phase 1a cont.) |
| 4 | **P.11** (pricing surface) | P.9 + P.15 (non-sandbox) | Guide/Ритъм redesign (Phase 1b) |
| 5 | Phase 1b (Guide, Ритъм) | Phase 0 | P.11 wrap-up |
| 6 | Phase 1c (Кръг, crystals, recs, diary) | Phase 0 | **P.13** (telemetry) — depends on "surfaces existing," which by this point they do |
| 7 | Phase 1d (Settings, Wizard, Auth) | Phase 0 | Can run anytime from step 1 onward; shown here for narrative order only |
| 8 | **P.17/SR9** (EAS/TestFlight/biometric) | Apple Developer enrollment (external, founder action — see below) | — |
| 9 | **P.18** (soft-launch gate, docs-only) | Everything above + P.17/SR9 | — |

**P.15 sandbox testing and P.17/SR9/P.18 are all blocked on Apple Developer enrollment**, which per the most recent record found (`REVISIT-TRIGGERS.md`, 2026-07-22 addendum) was still not started, roughly two months past its internal target. This has zero code dependency and is pure calendar time once begun — **it should restart today, in parallel with Phase 0**, independent of every other line in this table, since it's already the longest pole regardless of how the redesign sequencing goes.

**P.16** (push infra) is backend-only and gated on REVISIT-47, not on the redesign or Apple enrollment — genuinely parallel to everything, any time.

---

## 5. Rule formalizations this build makes permanent

- **R4, re-amended** (full text in `WARM_COOL_AMENDMENT.md` §5): accent color reserved per-screen-temperature — bronze on warm, cool-token on cool, violet never a competing accent, Ритъм the sole both-temperature exception.
- **§160's "continuity layer unchanged"** is superseded as scoped in the amendment doc — Phase 0's token migration is the actual mechanical execution of that supersession.
- **R7's ≥2-dimension/≥1-categorical bar** is now enforced structurally by the `LeadLine` primitive (§1.5) rather than left to each screen's own judgment.
- **Guard 3's animation-composition lesson** (never layer a bare-`scale` animated style on a separately-`translate`-centered element) is written into `useBreathe`'s own code comment (§1.3), not just this planning doc — so it survives past whoever reads this file.

---

## 6. Total LOC estimate, with the calibration caveat corrected

**Correction to the founder's framing:** the actual historical figure (`phase-b-mobile-parity/HANDOFF-2026-05-09.md`, "Phase B LOC estimate calibration") is that feature work ran **over** its opening locks — **~25-30% over for small sub-rounds (~150-200 LOC), ~30-70% over for large sub-rounds (~500-1000 LOC)** — not under. (One sub-round, P.8, landed 31% *under* its own re-projection — the exception, not the pattern.) Using "under" would understate the risk this history actually shows; the estimates below should be read as floors likely to run 25-70% over in practice, scaled by sub-round size, per that same document.

| Bucket | Raw estimate (LOC) | Likely actual, applying the correction |
|---|---|---|
| Phase 0 (tokens 1.1a/c + Ambient extend + motion hooks + navbar + primitives + shell extension) | ~430-670 | ~540-1050 |
| Phase 1a (Ти, Оракул) | ~110-170 | ~140-270 |
| Phase 1b (Guide, Ритъм) | ~180-290 | ~230-460 |
| Phase 1c (Кръг, crystals, recs, diary) | ~180-310 | ~230-490 |
| Phase 1d (Settings, Wizard, Auth) | ~100-180 | ~125-290 |
| **Total code-drawable** | **~1000-1620** | **~1265-2560** |
| 1.1b (Tailwind class migration, ~35 files) | ~100-200 (mechanical, lower over-run risk — lift-like, not feature-like) | ~100-230 |

**Asset-blocked scope is not LOC** — it's designer time (28 glyphs, 1 card-back pattern, per the designer brief) plus, per screen, one internal swap once each asset lands (bounded by the unified glyph interface in §2.1 and the existing `ClipPath` slot in §2.2 — expected to be small per-swap, not separately estimated here since it's not engineering-schedule-relevant until the designer delivers).

---

## 7. Revert safety

Same discipline as the Stage 1 wiring pass: each phase (0, 1a, 1b, 1c, 1d) lands as its own commit, TS-green, with a side-by-side artifact against the prior state before being called done, independently revertible. Phase 0's primitives are additive (new files/hooks) except the navbar swap and the `ScreenShell` extension, which are the two genuinely irreversible-without-a-revert changes in that phase — flagged so the founder's device pass specifically exercises those two before Phase 1 begins.

---

## 8. What's not decided yet, listed rather than assumed

- §1.6's `ScreenShell` extension — recommended, not decided.
- Whether the tab bar's active-indicator ever needs a per-tab temperature read (deferred question from the design pass, still open).
- Guide's 6 remaining section files' exact adoption cost (priced as "smaller than a full rebuild," not itemized per file).
- Real longest-string data for Кръг/crystals/recommendations/diary/wizard/auth copy — flagged in Guard 1, still needs pulling from source before those screens are sized precisely.

**HALT.** This is the plan for founder ratification. No code changes accompany this document.
