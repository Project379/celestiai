# Stellaeum — Glyph Family & Card-Back Designer Brief

Standalone brief. You do not need access to the codebase to execute this — everything you need to draw and export is below. Where a term is app-specific (viewBox, stroke tinting), it's explained inline.

**Scope of this brief:** 28 line-art glyphs (planets, zodiac signs, aspect marks) plus one card-back pattern. Moon-phase assets were considered and are **out of scope for now** — do not draw moon phases as part of this brief.

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

**What it's for:** a single reusable pattern shown on the "unrevealed" face of any card in the app (e.g. a crystal or oracle-style card before the user has revealed its content). One asset, reused everywhere a card is face-down.

**Requirements:**
- **Symmetrical** — the pattern should look correct and intentional under at least 180° rotation (ideally full radial or mirror symmetry both axes). A face-down card is shown in a fixed orientation in this app, but symmetry avoids any "this looks upside down" read and keeps the mark feeling considered rather than arbitrary.
- **Concealing, not teasing.** This is the single most important constraint: the pattern must not suggest, outline, or hint at what's underneath. No silhouette, no partial reveal, no imagery that reads as "a shape is hiding here." It should read purely as ornament/pattern — a closed, abstract, geometric or mandala-like motif, not a picture of anything.
- **Drawn once, reused everywhere.** Don't design variants per card type — one pattern serves every card's unrevealed state across the whole app.
- **Same "hand" as the glyph family** (§3): same stroke-width discipline, same round caps/joins, same restraint (no shading, no color). It should feel like it belongs to the same object as the 28 glyphs, not like a separate illustration commission.
- **No lettering, no text, no monogram.** Do not embed any words, initials, or roman-numeral-style text in the pattern — this includes decorative Latin mottos or single-letter monograms. (Practical reason: this app has a font in its system that only supports Latin characters, not the Cyrillic alphabet the app's copy is written in — a text-bearing asset risks being unusable or inconsistent with the rest of the product's language. Simplest fix: no text at all.)
- **Format:** same as §4 — SVG, path-only, single color (app-tinted), no circles/ellipses/gradients/filters. It does not need to fit the 24×24 viewBox (it's a card-filling pattern, not a small glyph) — use a square viewBox sized to your working geometry (e.g. `0 0 200 200`) and note the viewBox dimensions you used in the filename or an accompanying note, e.g. `card-back.svg` with viewBox `0 0 200 200`.
- **Smallest render size:** cards can appear fairly small in list/grid views. Apply the same legibility discipline as §5 — check the pattern still reads (not just "looks like noise") at roughly 80–100px square, since that's a plausible smallest on-screen size for a card.

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
- [ ] Path-only SVG, stated viewBox
- [ ] Symmetrical
- [ ] No figurative silhouette or hint of card content
- [ ] No text/lettering
- [ ] Same stroke/hand discipline as the glyph set
- [ ] Legible as a pattern (not noise) at ~80–100px

Deliver all 29 files (28 glyphs + 1 card-back) in a single folder, flat (no subfolders needed), using the exact filenames in §4/§7.
