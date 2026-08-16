# Continuity-layer amendment — warm/cool zoning + source-quality mapping

**Status: PROOF ONLY for the wider redesign (motion, navbar, ScreenShell, per-screen zoning) — still not rolled out.** The token-migration slice of this doc (§1's `bronze`/`bronzeText` rows, §3) is the exception: it shipped as Batch 6, 2026-08-16 — see `COMPLETION-TRACKER.md`. Supersedes the "continuity layer unchanged" clause of `.planning/research/MOBILE_ALPHA_REDESIGN.md` §4 (line 160) as scoped below. Everything else in that document holds. Halt for founder review after this document + the two proof renders.

---

## 1. The amended token set

Added to `apps/mobile/components/design-system/tokens.ts` (additive only — nothing removed, nothing migrated, no consumer changed):

| Token | Value | Role |
|---|---|---|
| `bronze` | `#b8763e` | Replaces amber's accent role, globally, once migrated. **Confirmed** — matches every committed mockup's `--bronze` and the value actually shipped. |
| `bronzeText` | `#d9a06a` | Bronze's "amberText"-equivalent (labels/text on dark ground). **Corrected 2026-08-16 (Batch 6)** from this doc's original candidate value `#e0b587`, which this row itself flagged as provisional and never confirmed against a device render. The mockups (`.planning/design/mockups/*.html`, `--bronze-hi`) are the actual built reference and use `#d9a06a` on every text/label role that value covers — `tokens.ts` now matches. See `COMPLETION-TRACKER.md`'s Batch 6 section for the full divergence writeup, and its "mockup vs. tokens.ts" rule for how this should be handled if it recurs. |
| `cool` | `#5b8fc7` | New. Instrument accent — Карта, Astrology Guide, other celestial/historic surfaces only. Never on warm surfaces. |
| `coolText` | `#bcd6ef` | Cool's text-on-dark equivalent. |
| `starlight` | `#f5f7fc` | New. Cool-surface "light" role — distinct from `color.text` (`#e2e8f0`, a warm-neutral slate used everywhere as body/label color). |
| `amber` / `amberText` | **deleted** | Migration fired — Batch 6, 2026-08-16. Retired from `tokens.ts` and `tailwind.config.js` (`amber-stellaeum`); every consumer repointed to `bronze`/`bronzeText`. This row described the pre-migration state — see `COMPLETION-TRACKER.md`'s Batch 6 section for what actually shipped. |
| `violet` | unchanged | Re-confirmed as ambient **ground**, not a competing accent — see R4 re-amendment (§5). |

**Why `cool` is `#5b8fc7`, not a saturated cyan/blue:** `NatalWheel.tsx:355` already draws the Ascendant line in `#22d3ee` — cyan, excluded from the continuity layer in §1.5 specifically because it's data-viz (air-element/Ascendant semantics), not brand. Карта is the cool proof surface, so the new instrument accent sits inches from that existing cyan line. `#5b8fc7` is a desaturated steel-blue (hue ~209°) chosen to sit clearly apart from `#22d3ee` (hue ~187°, fully saturated) so the two don't read as "the same blue, drawn twice" — one is a chart-data marker, the other is the instrument-frame accent. **Open item, not fully closed**: this needs a real side-by-side check on the actual wheel (not just a swatch comparison) before being called final — flagged, not resolved by this document alone.

---

## 2. Source → quality mapping (stated per surface, not as a mood board)

| Reference | ONE quality taken | Where | NOT taken |
|---|---|---|---|
| Assassin's Creed / Animus | Reverence; an instrument resolving into focus; reading something that predates you | Карта's wheel-entry motion (one-shot resolve on mount — see §7), Astrology Guide | HUD chrome, graticule density, scan-lines, corner brackets, any color scheme applied wholesale |
| Apple Weather | Atmospheric depth behind content, one dominant hero, quiet supporting data | Every screen (unchanged — this was already the standing reference, R1–R7) | — |
| The Witcher | Material/patina — aged, considered, weight and history | Warm surfaces, where bronze lives | Carved-frame UI chrome, literal medieval ornament |
| Balatro | Objects with weight that respond to touch | Card-shaped elements (already partly shipped via press-lift) | Lo-fi CRT/pixel treatment |
| Premium tarot | Card-backs, reveal moments, sense of drawing something concealed | Card-back pattern (see the separate designer brief), any future reveal-state UI | Literal tarot iconography |

**The test applied to every treatment below:** if it could be screenshotted and captioned "the Assassin's Creed thing," it's wrong. Each proposal below states its source line explicitly for this reason.

---

## 3. Amber retirement — audit, not migration

A grep for `amber|fbbf24|fcd34d|fde68a` (case-insensitive) across `apps/mobile` returns **61 files** — not the 12-file figure from the earlier bronze-as-addition proposal, which only caught `color.amber`/hex-literal usage and missed Tailwind's `amber-300`/`amber-200`/`amber-100` utility classes used throughout auth, wizard, oracle, manifest, and crystal surfaces. The real migration surface is roughly 5x larger than previously scoped. Full file list:

```
apps/mobile/tailwind.config.js
apps/mobile/components/design-system/tokens.ts
apps/mobile/components/design-system/NavRow.tsx
apps/mobile/components/design-system/States.tsx
apps/mobile/components/design-system/usePressLift.ts
apps/mobile/components/design-system/AmbientBackground.tsx
apps/mobile/app/(authed)/(tabs)/_layout.tsx
apps/mobile/app/(authed)/(tabs)/index.tsx
apps/mobile/app/(authed)/(tabs)/rhythm.tsx
apps/mobile/app/(authed)/(tabs)/circle.tsx
apps/mobile/app/(authed)/_layout.tsx
apps/mobile/app/(authed)/oracle.tsx
apps/mobile/app/(authed)/you/guide.tsx
apps/mobile/app/(authed)/wizard/_layout.tsx
apps/mobile/app/(authed)/wizard/date.tsx
apps/mobile/app/(authed)/wizard/time.tsx
apps/mobile/app/(authed)/wizard/location.tsx
apps/mobile/app/(authed)/wizard/confirm.tsx
apps/mobile/app/(public)/sign-in.tsx
apps/mobile/app/(public)/sign-up.tsx
apps/mobile/app/(public)/verify.tsx
apps/mobile/app/(public)/two-factor.tsx
apps/mobile/components/wizard/StepIndicator.tsx
apps/mobile/components/wizard/TimePicker.tsx
apps/mobile/components/wizard/CitySearch.tsx
apps/mobile/components/dashboard/MoonGlyph.tsx
apps/mobile/components/dashboard/LunarPhaseCard.tsx
apps/mobile/components/oracle/TopicCards.tsx
apps/mobile/components/oracle/CapReachedNotice.tsx
apps/mobile/components/OracleEntry.tsx
apps/mobile/components/chart/NatalWheel.tsx
apps/mobile/components/chart/NatalWheelLegend.tsx
apps/mobile/components/chart/PlanetsList.tsx
apps/mobile/components/chart/PlanetDetail.tsx
apps/mobile/components/chart/AspectsList.tsx
apps/mobile/components/chart/HousesList.tsx
apps/mobile/components/chart/BigThreeCards.tsx
apps/mobile/components/chart/AstrologyReference.tsx
apps/mobile/components/chart/WheelArrivalContainer.tsx
apps/mobile/components/crystals/CrystalOfTheDayCard.tsx
apps/mobile/components/crystals/CrystalGridTile.tsx
apps/mobile/components/crystals/CrystalDetailPanel.tsx
apps/mobile/components/crystals/CrystalCollectionContent.tsx
apps/mobile/components/crystals/DailyStreakPanel.tsx
apps/mobile/components/CrystalCard.tsx
apps/mobile/components/stories/RecommendationCard.tsx
apps/mobile/components/stories/StoriesContent.tsx
apps/mobile/components/manifest/ManifestHistory.tsx
apps/mobile/components/manifest/ManifestEntryForm.tsx
apps/mobile/components/manifest/ManifestDiaryContent.tsx
apps/mobile/components/horoscope/TransitOverviewCard.tsx
apps/mobile/components/settings/DeletionPendingBanner.tsx
apps/mobile/components/astrology-guide/GuideSection.tsx
apps/mobile/components/astrology-guide/GuideLunarPhasesSection.tsx
apps/mobile/components/astrology-guide/GuideTransitsSection.tsx
apps/mobile/components/astrology-guide/GuideAspectsSection.tsx
apps/mobile/components/astrology-guide/GuidePlanetsSection.tsx
apps/mobile/components/astrology-guide/GuideMethodSection.tsx
apps/mobile/components/astrology-guide/GuidePrinciplesSection.tsx
apps/mobile/components/astrology-guide/GuideHistorySection.tsx
```

**Bucket check — is any of this data-viz semantic rather than brand accent, the way cyan was excluded in §1.5?** Checked `PLANET_COLORS`/element-tint mapping directly: fire = rose, earth = emerald, air = cyan (`#22d3ee`), water = violet. **Amber does not appear in the element-color mapping anywhere** — its uses in `NatalWheel.tsx`, `PlanetDetail.tsx`, `BigThreeCards.tsx`, `AstrologyReference.tsx`, `NatalWheelLegend.tsx` are accent/state usages (selection, CTA, active affordance), not chart-data semantics. **Conclusion: no bucket-split needed.** Every file above is bucket A (brand accent → migrate to bronze eventually). This is a genuine difference from cyan's case, not an oversight — stated explicitly since the founder's own precedent (§1.5) was "check before assuming," not "assume the same exclusion applies twice."

**Not executed in this pass.** This is a list for planning the migration, not a diff. Two files carry outsized risk and should be sequenced first when migration does fire: `AmbientBackground.tsx` (the amber corner-wash gradient built two rounds ago — trivial one-line swap) and `tokens.ts`/`tailwind.config.js` (the source of truth others inherit from, so migrating them first and re-running this same grep confirms whether Tailwind class usages actually pick up a token change or need per-file edits — Tailwind's `amber-300` etc. are framework utility classes, not this app's token, so **they will not update automatically** when `color.amber` changes; each of the ~35 files using `text-amber-*`/`bg-amber-*`/`border-amber-*` needs its own edit, not just a token-file change).

---

## 4. Two proof surfaces — rendered

See the published HTML artifact (companion to this document) for the actual 390px side-by-side renders: warm (Днес), cool (Карта), and combined (Ритъм). Summary of what each demonstrates and its source→quality line:

**Warm — Днес.**
- CTA redesign ("Попитай Оракула"): moves from plain amber-text NavRow to a **Surface2 tonal panel** (`color.surface2` + hairline border — the app's own existing elevation tier, permitted as reuse per R7 calibration §210, not new decorative chrome) **plus** a small leading bronze sigil mark replacing the trailing chevron used everywhere else on the screen. Two axes: **containment** (categorical — bare row → contained panel) and **position/iconography register** (categorical — trailing universal chevron → a leading, surface-specific mark). Source: Witcher's material/patina quality (the panel reads as an inset, worn tablet, not a UI card) + Weather's "one hero, quiet everything else" (the panel is the only contained element on the screen).
- Eye-leading: a warm radial tint (bronze, very low opacity) grows almost imperceptibly stronger from the hero glyph toward the CTA panel at scroll-bottom — the "glow" itself points toward the payoff rather than the payoff needing a label to announce itself. Source: Apple Weather's ambient-gradient-as-hero-support quality.

**Cool — Карта.**
- Chip switcher (Essence/Details/Aspects/Houses) redesign: from a plain segmented control to a **bracket-framed** control — thin cool-blue corner ticks (reticle brackets, not a filled pill) appear around the switcher, brightening on press. Two axes: **containment shape** (categorical — brackets are a different containment family from the warm panel's solid tonal fill, so warm and cool read as two tunings of the same idea, not the same shape recolored) and **state-driven color** (categorical — neutral hairline at rest, cool-lit only on press/active, not a permanent tint). Source: Animus's "instrument resolving into focus" quality, rendered as a framing device, explicitly not as HUD chrome (no scan-lines, no corner-bracket density, no read-out chrome).
- Eye-leading: the wheel's outer ring gains a thin cool hairline "graticule" tick set (reusing the existing tick geometry already on the wheel border, per §3.1's ADA-winner precedent of concentrating richness in one focal visualization) that very subtly resolves from 0→full opacity over ~400ms on mount — the one-shot "instrument focusing" moment. Source: Animus, motion only, no new chrome added to the wheel itself.

**Combined — Ритъм.**
- The transit list (cool: historical/celestial data being read) sits inside the same screen as the "today's active transit" callout (warm: the present-tense answer). The callout uses the warm Surface2+bronze-sigil treatment from Днес verbatim (reused, not reinvented — same object appearing in a different room); the list rows around it use the cool hairline treatment from Карта verbatim. Neither is diluted to "meet in the middle" — the point proven is that two fully-committed temperatures can share a screen and still read as one family, because both inherit the same base, violet ground, type, spacing, and motion character. This is the hardest cohesion test in the brief and the one the render must be judged against most critically.
- **Mechanical note**: `rhythm.tsx` does not use `ScreenShell` (only `index.tsx`/`chart.tsx` do) — the transparent-background wiring from the earlier `AmbientBackground` pass does not automatically extend here. If Ритъм is rolled out for real later, it needs its own transparency wiring, not inherited free. Flagged, not fixed, since this is proof-only.
- The moon glyph appears on both Днес (hero) and Ритъм (`LunarPhaseCard`, smaller) — its current gold/amber hairline outline (`rgba(251,191,36,0.4)` in `MoonGlyph.tsx`) is one visual object with two call sites; a bronze migration lands on both at once, by construction, not as two separate fixes.

---

## 5. R-rule conflicts — explicit supersessions

The amendment directly contradicts the following, all now superseded as stated:

| Doc reference | Original text | Superseded by |
|---|---|---|
| §160 (continuity layer) | "Continuity layer unchanged: palette (`#08060f` / `#8b5cf6` / `#fbbf24`)" | Palette is reopened. Base and violet-as-ground hold; amber is retired (pending migration), replaced by bronze (warm) + a new cool token (celestial surfaces). |
| §174–176 (**R4**) | "Accent color reserved for 1–2 functional roles per screen... amber marks exactly one role per screen... violet stays structural" | **R4 re-amended below.** |
| §254 (Button primitive) | "one variant carries the amber accent (primary)" | Primary CTA color depends on surface temperature: bronze on warm surfaces, cool-blue framing (not a filled CTA color) on cool surfaces. |
| §256 (TabSwitcher) | "amber underline on active only" | Tab bar spans both temperatures (it's shared chrome, present on every tab) — proposal: tab bar keeps a **single neutral-to-bronze** active treatment regardless of which tab's content is warm or cool, since the tab bar itself is not "a surface" in the zoning sense, it's the connective chrome between surfaces. Stated as an open call for the founder, not resolved unilaterally here — the alternative (tab icon recolors per the destination screen's temperature) was considered and rejected in this pass because it would make the tab bar itself feel like it's switching identity five times, undermining the "one continuous world" requirement. |
| §289 (v1/v2 comparison table) | "Amber on: exactly one role... never both stacked" | Historical record of a past decision — not amended, just no longer the live rule; left as-is since it's a comparison table, not a standing rule. |

**R4 — re-amended:**

> Accent color is reserved for 1–2 functional roles per screen, **scoped to the screen's assigned temperature.** Warm surfaces (Днес, Оракул): bronze marks exactly one role (the primary CTA, or the single active/live-status indicator) — never both stacked, never alongside cool. Cool surfaces (Карта, Astrology Guide): the cool token marks exactly one role (instrument-framing/state on interactive controls) — it does not fill a CTA the way bronze does; cool is a framing/state accent, not a "press this" color, which is itself a deliberate difference in *how* the two temperatures signal interactivity (see §6). Violet remains structural ground on every screen regardless of temperature — never a competing accent, never assigned a functional role. A screen never mixes bronze and cool as two simultaneous accents **except** Ритъм, which is the one screen explicitly built to hold both at once (§4's combined case) — every other screen picks one temperature and stays there.

---

## 6. "Obvious but quiet" + eye-leading — how each proposal clears the R7 categorical bar

Per §208 (R7 calibration): every lead/payoff or affordance signal must differ from its surroundings on **≥2 dimensions, ≥1 categorical**. Stated per proposal above, collected here for the checklist:

| Proposal | Dimension 1 | Dimension 2 | Categorical? |
|---|---|---|---|
| Днес CTA panel | Containment (bare row → Surface2 panel) | Position/register of the tap-mark (trailing chevron → leading sigil) | Yes, both |
| Карта bracket switcher | Containment shape (pill/segmented → reticle brackets) | Color activation (static neutral → cool-lit on press, state-driven) | Yes, both |
| Днес eye-leading glow | Position (gradient origin tracks toward CTA, not fixed) | — (this one is closer to a degree move; flagged as the weakest of the four, see below) | Partially |
| Карта wheel graticule resolve | Motion (0→full opacity one-shot) | Position (new tick layer, additive to existing ring) | Yes, both |

**Self-critique, stated rather than hidden:** the Днес "growing glow" is the one proposal that leans on a degree axis (opacity gradient strengthening) more than a categorical one — exactly the failure mode §206 documents (PlanetDetail's first landing). It's kept in the proof because it's cheap and additive, but it should **not** be treated as carrying the "eye-leading" requirement on its own — the CTA panel's containment shift is the real categorical signal on that screen; the glow is atmosphere, not the mechanism. Flagged explicitly so it isn't miscounted as a second R7-grade lever the way Growth's earlier weight-step was.

---

## 7. Rollout estimate (if this amendment is ratified)

| Surface | Temperature | What's mechanical | What's design work | Est. LOC |
|---|---|---|---|---|
| Днес | Warm | Token swap (amber→bronze) on existing elements | CTA panel redesign, glow tuning | ~60–90 |
| Оракул | Warm | Token swap | CTA/affordance pass consistent with Днес | ~40–70 |
| Карта | Cool | Token swap on non-element-color amber usages | Bracket switcher, graticule resolve motion | ~90–140 |
| Astrology Guide | Cool | Token swap (7 section files) | Consistent cool-framing pass, likely lighter per-file since content is mostly text | ~120–180 across 7 files |
| Ритъм | Both | `ScreenShell`-equivalent transparency wiring (new, doesn't inherit) | Combined-case composition, verified per §4 | ~70–110 |
| Wizard (4 screens + StepIndicator + TimePicker + CitySearch) | Neutral→warm at completion | Token swap only, likely — wizard is onboarding, not a "reading" surface; **temperature assignment not yet decided for wizard, flagged as an open item** | — | ~40 mechanical, TBD design |
| Auth (sign-in/up, verify, two-factor) | Neutral | Token swap only — plausibly amber→bronze with no other change, since these aren't zoned surfaces | — | ~20 mechanical |
| Crystals / manifest / stories / oracle topic cards / settings | Mostly warm (present-tense, user-facing) but not audited per-surface here | Token swap | Case-by-case, likely light | Not estimated — out of this proof's scope |

**Total rough order of magnitude**: roughly 400–650 LOC of design work concentrated in Днес/Карта/Ритъм/Guide, plus a genuinely mechanical token-swap pass across the other ~40 files that is real effort (Tailwind classes don't inherit from `tokens.ts`, per §3) but not design judgment. This is an estimate for planning purposes, not a commitment — no rollout occurs from this document.

---

## 8. Performance — stated as a budget analysis, not a measurement

No device or simulator is available in this environment, so this is a static analysis of what's proposed, not a measured frame rate.

- **Wheel graticule resolve** (Карта): one-shot, mount-only, single shared opacity value, reusing existing tick geometry (no new SVG nodes beyond what's already drawn for the ring). Negligible ongoing cost — it animates once and then holds a static value.
- **Bracket switcher press-state**: single shared value per control instance (typically one switcher per screen), driven by existing press events, not a continuous loop.
- **Днес glow**: a static or very-slowly-shifting gradient stop, not a continuous high-frequency animation — comparable cost to the existing `ScreenShell` ambient glow already shipping today.
- **Combined with the existing `AmbientBackground`** (48 stars, 4 shared twinkle values, already shipped): none of the above proposals add a continuous per-frame cost class that doesn't already exist on these screens today — they add one-shot or state-driven values, not new twinkle-style loops. Total shared-value count across a screen showing both the ambient background and one of these proposals: ~5–6, still well inside a "handful of shared values" budget, not 40+.

**Skia — not justified.** The instrument-resolve motion (opacity ramp + existing geometry) and the bracket switcher's press-state color shift are both expressible as plain `react-native-svg` + Reanimated `useAnimatedProps`, the same mechanism already used by `AmbientBackground` and `MoonGlyph`. Neither needs pixel-level compositing, blur, or shader work that would require Skia. If a later round wants a genuine "shimmer sweeping across a resolving surface" effect (a gradient mask moving across the wheel), that specific effect would be the trigger to revisit Skia — not requested here, and not built here.

---

## 8.5 CTA sigil-alignment fix (founder-flagged, 2026-07-25)

**Diagnosis, confirmed against the actual CSS, not assumed:** the panel's `align-items:center` centered the sigil against the *combined height of both text lines* (label + hint), not the primary label — so on the two-line Днес instance it visually anchored to the gap between the lines, reading as off-center. This is the standard leading-icon-vs-multi-line-label mismatch.

**Second finding, checked against the real source rather than the mockup:** production `apps/mobile/app/(authed)/(tabs)/index.tsx` renders «Питай Оракула» via `NavRow` with **no `hint` prop at all** — the subtitle in the first proof render («за повече за днешния прочит») was invented for the mockup, not sourced copy.

**Resolution, applied per instance rather than uniformly:**
- **Днес CTA → dropped the hint, single line.** It didn't carry information a first-time user needs, it doesn't exist in the real app today, and cutting it removes the alignment bug at its root instead of patching around it — also the more "guide, don't hand-hold" reading of the label per the founder's own framing.
- **Ритъм callout → kept its second line, fixed alignment instead.** Its subtitle ("Венера квадрат Сатурн — напрежение в близките връзки") is the actual transit and its meaning — real data, not an explanation of the tap — so dropping it would be a real information loss. Fix: `align-items:flex-start` + a small compensating offset on the sigil, so it optically centers on line 1 specifically rather than the block.

**Scope, stated plainly (as of this entry, 2026-07-25):** this panel (`.cta-panel`/`.sigil`) is proof-only CSS, not a real RN component. It is distinct from the shipped `NavRow` — `NavRow` has no leading icon, so it was never exposed to this bug (the "Кръг" row's existing hint is fine as-is). If this panel becomes a real shared primitive during rollout, it needs both the single-line default and a `two-line` modifier built in from the start, so the two current usages (and any future one) don't each need their own alignment hack.

**Correction 2026-08-03:** it did become a real shared primitive — `CtaPanel.tsx` (`apps/mobile/components/design-system/CtaPanel.tsx`) is a shipped RN component, not proof-only CSS, with a dated five-round device-pass fix history (2026-07-25 through 2026-07-28: Android shadow fallback, Pressable style bug, ember positioning, glow clipping). This section's "proof-only" framing describes this entry's own moment in time, not current state.

Both fixes are shown side by side (before / option-a / recommended) in the companion artifact.

---

## 9. What this document does not do

- Does not migrate any of the 61 audited files.
- Does not wire any new token into a live screen.
- Does not resolve the tab-bar temperature question (§5) — left open for the founder.
- Does not finalize the `cool` vs. `#22d3ee` distinction beyond a hue-separation argument — a real render check against the live wheel is still owed.
- Does not touch wizard/auth/crystals/manifest temperature assignment.

**HALT.** Founder reviews the token amendment and the two (three, including the combined case) proof renders before anything above becomes a real branch of work.
