# Stellaeum — Glyph Family & Card-Back Designer Brief

Standalone brief. You do not need access to the codebase to execute this — everything you need to draw and export is below. Where a term is app-specific (viewBox, stroke tinting), it's explained inline.

**Scope of this brief:** 28 line-art glyphs (planets, zodiac signs, aspect marks), one card-back pattern (now also used for a planet-tap tarot-flip animation on the chart wheel — §7), and a redraw of the 5 navbar/tab-bar marks (§9). Moon-phase assets were considered and are **out of scope for now** — do not draw moon phases as part of this brief.

---

## 0. Asset audit — 2026-08-29

Full-codebase check of what needs a designer versus what's already shipped or code-drawn. **Verified against the running code, not inferred.**

| Item | Status | Evidence | If MISSING |
|---|---|---|---|
| App icon (iOS/Android) | **MISSING** | `apps/mobile/app.json` has no `icon`/`adaptiveIcon` field at all; Android `mipmap-*/ic_launcher.webp` are the unbuilt RN template default; no `ios/` icon set generated | Needs a designer — original brand mark, see §1a below |
| Favicon | **MISSING** | `apps/web/app/layout.tsx` metadata has no `icons`; no `favicon.*`/`icon.*` anywhere under `apps/web` | Derives from app icon once it exists — no separate commission |
| OG/social share image | **MISSING** | `layout.tsx`'s `openGraph` block has no `images`; no `opengraph-image.tsx` | Code-buildable (`@vercel/og` template using wordmark + brand colors) once a wordmark exists — not an illustration task |
| 12 zodiac glyphs | **SHIPPED** | `packages/core/src/charts/glyphs.ts` (`ZODIAC_GLYPH_PATHS`) — path-only, single source shared by web `CelestialIcons.tsx` and mobile `NatalWheel.tsx` | — |
| 11 planet glyphs + North Node | **SHIPPED on web, PLACEHOLDER on mobile wheel** | Web: `apps/web/components/icons/CelestialIcons.tsx` has hand-coded SVG for all 11 planets + North Node, in the same 1.5px/round-cap hand as the zodiac set, used across `NatalWheel.tsx`, `PlanetDetail.tsx`, `Dashboard`, etc. Mobile: `apps/mobile/components/chart/NatalWheel.tsx:427-479` renders `PLANET_GLYPHS` — a Unicode character (☉☽☿♀♂...) — with an explicit code comment: *"Planet glyph — Unicode placeholder for the designer glyph asset (not yet landed)."* Web's `AspectsList.tsx` also uses the Unicode form for compact text rows. | **Not a designer task.** The web SVG components already establish "one hand" for all 11 — port them into a shared path-only constant (`PLANET_GLYPH_PATHS`, same pattern as `ZODIAC_GLYPH_PATHS`) so mobile's wheel and both platforms' text rows consume the same drawn glyph instead of a Unicode fallback. This is dev work, not an illustration commission. |
| 5 aspect marks | **PLACEHOLDER everywhere** | `packages/core/src/charts/sections.ts` (`ASPECT_GLYPH`) is Unicode (☌ ⚹ □ △ ☍); no SVG equivalent exists anywhere in the codebase | **Not a designer task.** These are geometrically trivial (circle+dot, triangle, square, two triangles, circle+line) — draw them in the same file/pattern as the planet port above, in the same sitting. |
| Retrograde marker | **SHIPPED / not an asset** | `apps/web/components/chart/NatalWheel.tsx:442-455` — a plain "R" in Cinzel, D3-drawn text, not a glyph | — |
| 5 navbar/tab-bar marks | **SHIPPED / not an asset** | `apps/mobile/components/design-system/TabIcons.tsx` — hand-coded SVG, explicitly tuned for tab-bar scale and "founder-reviewed at real scale before wiring in" (see `.planning/research/MOBILE_ALPHA_REDESIGN.md §14`) | — |
| Moon phase art | **SHIPPED / not an asset** | `apps/mobile/components/dashboard/MoonGlyph.tsx` — code-drawn, confirms the founder's reference point | — |
| Notification icon | **PLACEHOLDER** | `apps/mobile/assets/notification-icon.png` (96×96) exists and is wired via `expo-notifications` plugin in `app.json`, but nothing in the repo indicates it's a considered mark rather than a generic bell/glyph | Once the app icon/brand mark exists, this is a simple monochrome-silhouette derivation (Android notification icons must be flat white-on-transparent) — code/export task, not a fresh commission |
| Chart wheel: house dividers | **SHIPPED / not an asset** | `apps/web/components/chart/NatalWheel.tsx:276-310` — D3-drawn cusp lines + number labels | — |
| Chart wheel: aspect lines | **SHIPPED / not an asset** | Same file, `:335-359` — D3-drawn lines between planet positions | — |
| Chart wheel: degree markers | **NOT PRESENT / not currently a feature** | No degree-tick code found on either platform's wheel; only house cusps and sign boundaries are drawn | If ever added, code-drawable (evenly spaced tick lines) — no designer needed |
| Premium/locked indicator | **SHIPPED / not an asset** | `apps/web/components/oracle/TopicCard.tsx:98-111` — inline padlock `<path>`, code-drawn | — |
| Store assets (iOS/Play screenshots, feature graphic) | **MISSING** | No `fastlane/`, `store-assets/`, or screenshots folder anywhere in the repo | Screenshots themselves come from the running app, not illustration. The caption/frame layout around them is a design-layout task, not a commission — and is only worth doing once the app is near submission. Not urgent. |
| Card-back pattern | **MISSING** (unchanged from below) | No `card-back`/`CardBack` reference anywhere in `apps/` or `packages/` | Genuinely needs a designer — see §7 |

**Bottom line at first pass:** 23 of the 28 marks (12 zodiac + 11 planets) already exist in one consistent hand in `CelestialIcons.tsx`, and could be ported to mobile as a dev task rather than commissioned. **Founder ruling 2026-08-29: commission the full 28-glyph set anyway.** The code-drawn versions stay live as the fallback everywhere until the designer set lands — they are not being ripped out, just superseded once real assets exist. §1–§8 below stand as originally scoped.

**Why these assets are safe to commission despite Batch 8 (the app's UI redesign) being an active, iterative, founder-gated phase — screens keep getting rebuilt from mockups one at a time, see `.planning/COMPLETION-TRACKER.md` "Batch 8 — UI phase":** every glyph, the card-back, and the navbar marks below are viewBox-normalized, single-color, path-only, and **app-tinted at render time, not colored by the designer** (§6) — none of them encode a color, a screen layout, or a surrounding chrome decision that Batch 8 could invalidate. A glyph drawn today keeps rendering correctly whatever a future mockup does to the screen around it. The one item in this doc that *is* palette- and identity-sensitive is the app icon (§1a) — it was checked directly against the current, stable `DESIGN-LANGUAGE-REFERENCE.md` palette, which Batch 8 mockups also build from (no token drift found, see COMPLETION-TRACKER's Batch 8 section), so it's on solid ground too.

---

## 1a. App icon / brand mark — the one genuinely new designer item

**What it's for:** the iOS/Android home-screen icon and the base mark everything else (favicon, notification-icon monochrome variant, OG image, future store graphics) gets derived from. Currently unset — `app.json` has no `icon` field, so builds ship whatever Expo's template default is.

- **Style:** consistent with the existing celestial glyph family (§3) and the dark/violet/bronze/cool palette in `DESIGN-LANGUAGE-REFERENCE.md` — this should look like it belongs to the same object as the 28 glyphs and the navbar marks, not a separate illustration.
- **Format:** one master 1024×1024 PNG, no transparency required for iOS (square, iOS applies its own corner mask) but Android needs the **adaptive icon** split — a separate foreground layer (centered mark, safe zone ~66% of a 108×108dp canvas) and a background layer (solid or simple pattern fill), per Android adaptive-icon spec.
- **Deliverables:** `icon-master.png` (1024×1024), `icon-adaptive-foreground.png`, `icon-adaptive-background.png` (or a flat background color hex if it's a solid fill — simplest option).
- **Do not** submit a scene, mascot, or illustrated character — matches the "no decorative illustration" restraint already established for the rest of the product (empty states use a CTA primitive, not illustration; see `DESIGN-RESEARCH-2026-08-27.md §C.5`). A single considered glyph or monogram-style mark, not a picture.

---

## 0. What this is for

Stellaeum is a Bulgarian-market astrology app with a dark, near-black, mystical-but-restrained visual language (violet + a warm bronze as the two primary accent colors, plus a cool steel-blue reserved for celestial/data surfaces — corrected 2026-08-16, was "amber" — everything else near-black/off-white). Right now, 12 of these 28 marks (the zodiac signs) already exist as hand-drawn line art in the app. The other 16 (planets + aspect marks) are currently rendered using standard Unicode astrological symbols in a system font — a placeholder, not a designed mark. This brief replaces all 28 with one consistent hand, drawn by you, so the whole family reads as one considered object instead of "12 designed + 16 borrowed."

---

## 1. The complete list — all 28 marks

### Planets (11)
1. Sun
2. Moon
3. Mercury
4. Venus
5. Mars
6. Jupiter
7. Saturn
8. Uranus
9. Neptune
10. Pluto
11. North Node (lunar node — the "head" symbol, not a planet astronomically, but treated as one glyph in this system)

### Zodiac signs (12) — REDRAW to match new planets/aspects, don't just keep the old set
12. Aries
13. Taurus
14. Gemini
15. Cancer
16. Leo
17. Virgo
18. Libra
19. Scorpio
20. Sagittarius
21. Capricorn
22. Aquarius
23. Pisces

### Aspect marks (5)
24. Conjunction
25. Sextile
26. Square
27. Trine
28. Opposition

**Why redraw the zodiac signs too, even though they already exist:** the existing 12 were drawn as a standalone set at one point in the past. If you draw 16 new marks in your own hand and leave the old 12 as-is, the family will look like two hands stitched together — which is the exact failure this brief exists to prevent. Treat all 28 as one commission, drawn in one sitting in one style, even though 12 of them will look similar to what's already there.

---

## 2. Reference material

The founder has a separate art-direction artifact (starfield/nebula palette study, moon-glyph proof, and concept sketches for this glyph family) from an earlier design pass — **ask the founder to forward that artifact alongside this brief.** It shows the palette these glyphs will be tinted with and the general "hand" the founder responded to. This document does not reproduce it.

In lieu of that artifact, the concrete style anchor is section 3 below and the **existing zodiac line art**, which the founder has already approved and shipped. If you have app access or screenshots, look at the zodiac ring on the "Карта" (Chart) tab — that is the closest live example of "correct" for this family. Match its weight and register; do not match its exact geometry for the 12 signs (redraw them, per §1).

---

## 3. Stroke weight, hand, and "one family, one hand"

- **Line art only.** No fills, no gradients, no shading. Every glyph is built from open or closed strokes.
- **Stroke width:** exactly **1.5 units** in a 24×24 coordinate space, for every glyph, every path, no exceptions. (See §4 for what "units" means practically.)
- **Line ends:** round caps, round joins, on every path, every glyph. No square or miter corners anywhere in the set.
- **Weight-to-size ratio:** because every glyph shares the same 24×24 box and the same 1.5-unit stroke, the *ratio* of stroke to glyph is already consistent as long as you don't scale individual glyphs smaller/larger within their own box to "make room." A few marks (Sun, Moon) are naturally simpler than others (Capricorn, Scorpio) — let the simple ones have generous empty space around a small mark rather than blowing the mark up to fill the box. Consistency of stroke weight matters far more than consistent "ink coverage" per glyph.
- **No decorative flourishes, no serifs, no calligraphic thick/thin variation.** The existing zodiac set is built from plain arcs and straight/curved strokes at a constant width — match that plainness. This is a functional sign system, not an illustration.
- **"One hand across the family" means, concretely:** if you laid all 28 glyphs out in a grid, no single glyph should look like it came from a different pass — same stroke width, same corner treatment, same level of geometric simplification, same visual density. A designer or engineer should not be able to sort the 28 into "old vs. new" by eye once you're done (including the redrawn zodiac 12).

---

## 4. Deliverable format

- **File type:** SVG, one file per glyph.
- **viewBox:** `0 0 24 24` exactly, for every file — no exceptions, no per-glyph custom canvas sizes.
- **Path data only.** Build each glyph from `<path d="...">` elements. **Do not use `<circle>`, `<ellipse>`, `<rect>`, gradients, filters, masks, `<style>` blocks, CSS classes, embedded fonts, or `<image>`/raster references.** If a shape is naturally a circle (e.g. the Sun's disk, the loop in Venus), draw it as a path using arc commands (`A`) rather than a `<circle>` element — the app's rendering pipeline consumes raw path strings and cannot parse SVG primitives other than paths. (The existing zodiac set was already built this way — every circle in it was converted to two arc commands for exactly this reason. Follow that precedent.)
- **Single path per glyph where the geometry allows it** — i.e. don't split one continuous stroke into multiple `<path>` elements for no reason. Multiple paths per glyph are fine and expected where the glyph is genuinely made of separate strokes (e.g. Gemini's two verticals + two horizontals, or Sagittarius's arrow + shaft). Don't merge genuinely separate strokes into one compound path just to hit "one path" — clarity of the source geometry matters more than a raw path count.
- **No color.** Every path should have no `fill` attribute (or `fill="none"`) and no explicit `stroke` color — or if your tooling requires a stroke color to preview correctly, use plain black (`#000000`) as a placeholder. The app strips/ignores any color you include and applies its own color at render time (see §6). Do not submit full-color illustration for any of these 28 — they are all single-color line marks.
- **Naming convention:**
  - Planets: `glyph-sun.svg`, `glyph-moon.svg`, `glyph-mercury.svg`, `glyph-venus.svg`, `glyph-mars.svg`, `glyph-jupiter.svg`, `glyph-saturn.svg`, `glyph-uranus.svg`, `glyph-neptune.svg`, `glyph-pluto.svg`, `glyph-north-node.svg`
  - Zodiac: `glyph-aries.svg`, `glyph-taurus.svg`, `glyph-gemini.svg`, `glyph-cancer.svg`, `glyph-leo.svg`, `glyph-virgo.svg`, `glyph-libra.svg`, `glyph-scorpio.svg`, `glyph-sagittarius.svg`, `glyph-capricorn.svg`, `glyph-aquarius.svg`, `glyph-pisces.svg`
  - Aspects: `aspect-conjunction.svg`, `aspect-sextile.svg`, `aspect-square.svg`, `aspect-trine.svg`, `aspect-opposition.svg`

---

## 5. Smallest render size — legibility test

These glyphs render at multiple sizes across the app. The smallest is the one that matters for drawing decisions:

- **Smallest real render size: ~14–19px** (on a chart wheel where the glyph occupies roughly 1/18th of the wheel's diameter). Some contexts go slightly smaller (down to ~13px for planet marks specifically).
- **Test at 16px.** Export or preview each glyph at 16×16px (not 24×24 — that's the drawing canvas, not a render size) and check: do any two strokes that are meant to read as separate lines visually merge into a blob? Does any enclosed counter-space (e.g. the loop of Venus, the circle in Leo) fill in solid instead of reading as a ring?
- **Rule of thumb:** at a 1.5-unit stroke width in a 24-unit box shown at 16px, one viewBox unit ≈ 0.67 physical pixels. Any gap or counter-space you draw narrower than ~3 units (≈2px at 16px) risks disappearing at render size. Simplify geometry rather than relying on fine detail that only reads at the 24px drawing size.
- Larger render contexts exist too (a hero/detail view, notably larger than 16px) — those are not the constraint; if it survives 16px, it survives everywhere larger.

---

## 6. Palette constraints — why there's no color instruction above

These render inside the app's own color system, not with colors you choose. The app takes your single-color line art and tints it at render time — sometimes the app's primary warm accent, sometimes a muted gray, sometimes the current text color, depending on context (e.g. an active vs. inactive state). This is why §4 says no fills and no meaningful stroke color: whatever color you leave in the file will very likely be discarded or overridden by the app, so don't spend time color-matching against a palette you don't have final reference for. Draw everything as if it will render as a plain outline in variable colors, because it will.

---

## 7. Card-back

**What it's for:** a single reusable pattern shown on the "unrevealed" face of any card in the app. Two consumers as of 2026-08-29:
1. Existing use: a crystal or oracle-style card before the user has revealed its content.
2. **New (founder ruling 2026-08-29): tapping a planet on the natal chart wheel triggers a tarot-style flip animation** — the planet's detail card rotates in from its back face to its front face (which shows the planet's dynamic reading content, built in-app from live data, not a designer asset) to reveal it. This card-back is the "unrevealed" face for that flip.

One asset, reused everywhere a card is face-down — do not design a separate variant for the new chart-flip use case.

**Aspect ratio — not yet locked, design for portrait.** The existing crystal/oracle cards are wide content cards, not a fixed tarot shape, and the chart-flip card's exact dimensions aren't built yet. Draw the pattern to read well in a **portrait tarot-like frame (roughly 2:3 to 5:8, taller than wide)** rather than assuming square — that's the shape the new flip feature implies and the safer bet for "looks like a card" across both consumers. Symmetry (below) should still hold under 180° rotation in that portrait frame, not just as a square tile.

**Requirements:**
- **Symmetrical** — the pattern should look correct and intentional under at least 180° rotation (ideally full radial or mirror symmetry both axes). A face-down card is shown in a fixed orientation in this app, but symmetry avoids any "this looks upside down" read and keeps the mark feeling considered rather than arbitrary.
- **Concealing, not teasing.** This is the single most important constraint: the pattern must not suggest, outline, or hint at what's underneath. No silhouette, no partial reveal, no imagery that reads as "a shape is hiding here." It should read purely as ornament/pattern — a closed, abstract, geometric or mandala-like motif, not a picture of anything.
- **Drawn once, reused everywhere.** Don't design variants per card type — one pattern serves every card's unrevealed state across the whole app.
- **Same "hand" as the glyph family** (§3): same stroke-width discipline, same round caps/joins, same restraint (no shading, no color). It should feel like it belongs to the same object as the 28 glyphs, not like a separate illustration commission.
- **No lettering, no text, no monogram.** Do not embed any words, initials, or roman-numeral-style text in the pattern — this includes decorative Latin mottos or single-letter monograms. (Practical reason: this app has a font in its system that only supports Latin characters, not the Cyrillic alphabet the app's copy is written in — a text-bearing asset risks being unusable or inconsistent with the rest of the product's language. Simplest fix: no text at all.)
- **Format:** same as §4 — SVG, path-only, single color (app-tinted), no circles/ellipses/gradients/filters. It does not need to fit the 24×24 viewBox (it's a card-filling pattern, not a small glyph) — use a portrait viewBox sized to your working geometry (e.g. `0 0 200 320`, roughly a 5:8 ratio) and note the viewBox dimensions you used in the filename or an accompanying note, e.g. `card-back.svg` with viewBox `0 0 200 320`.
- **Smallest render size:** cards can appear fairly small in list/grid views, and the chart-flip card may render small on a phone screen mid-animation. Apply the same legibility discipline as §5 — check the pattern still reads (not just "looks like noise") at roughly 80px wide / 130px tall, a plausible smallest on-screen size for a portrait card.

---

## 9. Navbar / tab-bar marks — redraw pass

**What it's for:** the 5 bottom-navigation icons (Днес/sun, Карта/wheel, Кръг/two circles, Ритъм/pulse, Ти/person). These already exist as founder-approved, shipped code-drawn SVG (`apps/mobile/components/design-system/TabIcons.tsx`, matching `.planning/design/mockups/navbar-v4.html` exactly) and are functioning correctly in production. **Founder ruling 2026-08-29: commission a professional redraw of these 5 in the same hand as the glyph family anyway** — this is a fidelity upgrade, not a functional or geometric change.

- **Match the existing geometry and meaning, refine the hand.** Do not redesign what each icon represents or swap metaphors (e.g. don't turn Кръг's two overlapping circles into something else) — these 5 concepts and their rough silhouettes are locked. What's wanted is the same considered hand as the other 28 marks applied to these 5, not a reinterpretation.
- **Reference geometry** (current shipped paths, for your starting point — viewBox `0 0 24 24` each):
  - Днес (sun): circle + 8 radiating ticks
  - Карта (wheel): circle + crosshair ticks at compass points
  - Кръг (circle): two overlapping circles (Venn)
  - Ритъм (pulse): a single EKG-style zigzag line
  - Ти (person): circle (head) + shoulders arc
- **Stroke weight differs from §3 on purpose — keep it that way.** These render at tab-bar scale (~18–24px), thicker than the hero-scale glyphs (**1.7 units**, not 1.5) so they don't turn to mush at that size. Same round caps/joins, same no-fill/no-color rules as §3/§4/§6 otherwise.
- **Format, naming, delivery:** same rules as §4 (path-only, no primitives, app-tinted, no color). Filenames: `nav-today.svg`, `nav-chart.svg`, `nav-circle.svg`, `nav-rhythm.svg`, `nav-you.svg`.
- **Test at 18px**, not 16px — that's this set's real smallest render size, tighter than the hero glyphs in §5.

---

## 8. Delivery checklist

For each of the 28 glyphs:
- [ ] `viewBox="0 0 24 24"`
- [ ] Only `<path>` elements (no circle/ellipse/rect/gradient/filter/style/image)
- [ ] Stroke width 1.5 (or drawn at proportional equivalent if your tool works in different units — state your working unit if not 1-to-1 with the viewBox)
- [ ] Round linecap + round linejoin on every path
- [ ] No fill, no meaningful color
- [ ] Legible at 16px render size (test before submitting)
- [ ] Correctly named per §4's list

For the card-back:
- [ ] Path-only SVG, stated portrait viewBox (e.g. `0 0 200 320`)
- [ ] Symmetrical under 180° rotation in that portrait frame
- [ ] No figurative silhouette or hint of card content
- [ ] No text/lettering
- [ ] Same stroke/hand discipline as the glyph set
- [ ] Legible as a pattern (not noise) at ~80×130px

For the 5 navbar marks:
- [ ] `viewBox="0 0 24 24"`
- [ ] Only `<path>` elements
- [ ] Stroke width 1.7 (not 1.5 — see §9)
- [ ] Round linecap + round linejoin
- [ ] No fill, no meaningful color
- [ ] Same concept/silhouette as the shipped icons (§9) — refined hand, not a redesign
- [ ] Legible at 18px render size
- [ ] Correctly named per §9's list

Deliver all 35 files (28 glyphs + 1 card-back + 5 navbar marks) in a single folder, flat (no subfolders needed), using the exact filenames in §4/§7/§9.
