// Continuity-layer + platform-layer tokens — MOBILE-ALPHA-REDESIGN v3.
// See .planning/research/MOBILE_ALPHA_REDESIGN.md §0 for the familiarity
// brief and §0.3 (type scale) for the measured-width validation behind
// every size below — none of these are guesses.
import { Platform } from 'react-native'

export const color = {
  base: '#08060f',
  surface1: '#0f0b1c',
  surface2: '#161029',
  violet: '#8b5cf6',
  violetBorder: 'rgba(139,92,246,0.25)',
  // Bronze — retired amber (Batch 6, 2026-08-16). amber/amberText are gone;
  // every former consumer now reads these two directly. bronzeText corrected
  // from WARM_COOL_AMENDMENT.md's #e0b587 to #d9a06a — the mockups
  // (.planning/design/mockups/*.html, --bronze-hi) are the actual built
  // reference and disagree with the amendment doc's candidate value; the
  // amendment doc itself called bronze's values "candidate, refine against
  // real device render," so the mockup wins.
  bronze: '#b8763e',
  bronzeText: '#d9a06a',
  // Cool instrument accent — scoped to celestial/historic surfaces only
  // (Карта, Astrology Guide), never warm surfaces. Deliberately desaturated
  // steel-blue, NOT the existing Ascendant-line cyan (#22d3ee,
  // NatalWheel.tsx:355) — that cyan is data-viz (air-element/Ascendant
  // semantics per §1.5's own cyan exclusion) and must stay visually
  // distinct from this new brand-accent blue on the same wheel.
  cool: '#5b8fc7',
  coolText: '#bcd6ef',
  // Starlight white — cool-surface "light" role, distinct from the warm
  // neutral `text` below (used everywhere as body/label color).
  starlight: '#f5f7fc',
  // Карта's engraved-plaque line only (mockup `.plaque`, _source-v4.html
  // §КАРТА) — distinct from `coolText` (#bcd6ef), do not merge: the
  // mockup uses this exact value for the Big Three plaque and nothing
  // else, `coolText` is the general cool-surface text role.
  plaqueCool: '#c9def2',
  rose: '#fb7185',
  text: '#e2e8f0',
  muted: '#94a3b8',
  faint: '#64748b',
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const

// Reading-rhythm scale — four genuinely distinct tiers, not a smooth
// gradient of similar-magnitude gaps (the founder's diagnosis: uniform
// spacing prevents grouping since the eye can't tell what belongs
// together). v3's first pass (tight/paragraph/group at 4/20/32) still read
// as too uniform on device — the actual screens mixed those tokens with
// ad hoc untokenized values (8, 18) that landed in between the tiers,
// which is exactly what erases the grouping signal. Revised scale widens
// the gap between adjacent tiers to a consistent ~2x+ jump (4 → 12 → 20 →
// 40) so each tier reads as a distinct decision, not a rounding choice —
// and pushes `group` up from 32 to 40 deliberately: compressing the
// intra-group tiers while expanding the one inter-group tier concentrates
// the screen's whitespace at section boundaries instead of spreading it
// evenly, which is what actually produces visible grouping. Researched
// against Apple News Format's published spec (paragraph spacing ≈ 1x
// font-size, i.e. ~17-18px at 17px body — `paragraph` below matches) and
// general long-form-serif convention:
//   - micro (4px): a label and its own sub-caption directly beneath it —
//     one semantic unit (phase name → "62% осветена · ...").
//   - tight (12px): a large visual element and the text label anchored to
//     it — still one unit, but the element is big enough (a 150px glyph)
//     that `micro` would look like a mistake, not a relationship.
//   - paragraph (20px): between developing paragraphs of the same
//     reading — genuinely larger than `tight`, not just +2px.
//   - group (40px): before content that starts a new beat — the closing
//     line of a reading (the "payoff"), or between major screen sections
//     (masthead → hero, reading → its exit link, section → section).
export const rhythm = {
  micro: 4,
  tight: 12,
  paragraph: 20,
  group: 40,
} as const

export const font = {
  displayRegular: 'PlayfairDisplay-Regular',
  displaySemibold: 'PlayfairDisplay-SemiBold',
  // Roman numerals + Latin-only text ONLY (Cinzel has no Cyrillic glyphs)
  // — scoped to the Astrology Guide surface, not used here.
  cinzel: 'Cinzel-Regular',
  // mockup `--mono: "SFMono-Regular", Consolas, Menlo, monospace` — the
  // date/specimen-label family (`.label-mark`, `.karta-label`). No custom
  // mono font is embedded in this app (only the 8 files in assets/fonts/);
  // this is the system monospace stack, same category of choice the
  // mockup itself made (a system font stack, not a custom face). Platform-
  // specific because RN's generic 'monospace' family name only resolves
  // reliably on Android — iOS needs an explicit named font.
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }) as string,
  body: 'EBGaramond-Regular',
  bodyMedium: 'EBGaramond-Medium',
  bodyItalic: 'EBGaramond-Italic',
} as const

// Type scale, each size validated against the longest real Bulgarian
// string for that slot at 390px width (usable width 350px after 20px
// margins), measured via actual font advance widths, not assumed:
//   - STALE, kept for the record: this comment previously validated a
//     32px `hero` tier for the lunar-phase name at Днес's hero position.
//     Stage 2 doc reconciliation (2026-07-27) corrected that reading
//     against the ratified mockup (_source-v4.html `.phase-mark`): the
//     phase name is a 9.5px tracked eyebrow under the 202px moon, not a
//     second hero competing with the glyph — the moon is the only hero
//     on this screen. `hero` is removed; see `eyebrow` below. The
//     32px-wraps-at-36px measurement itself stays true, it just no
//     longer describes this screen.
//   - "Слънце · Луна · Асцендент" (25 chars, longest combined sign
//     summary): fits at 32px (346px), wraps at 36px+ — same ceiling
//     applies if this string is ever shown as one line.
//   - "Благословена нощ" (17 chars, longest greeting) and "Питай
//     Оракула" fit comfortably up to 44-48px — not size-constrained,
//     but kept small/quiet by design (R1: the hero is the glyph, not a
//     second competing headline).
//   - The FULL greeting line ("{TOD}, {displayName}.") is a different
//     validation, measured directly against PlayfairDisplay-Regular.ttf's
//     real glyph advance widths (opentype.js, not estimated) after
//     getDisplayName made the name slot able to hold a full name, not
//     just a first name. Worst case — "Благословена нощ" (longest TOD)
//     + "Александър Константинов" (a realistic long full name) — measures
//     377px at 17px against the 350px usable width: it DOES wrap to a
//     second line (~108% of budget). This is accepted, not overlooked:
//     the greeting Text has no numberOfLines constraint, wraps gracefully,
//     and doesn't anchor the hero's single-line layout the way the lunar-
//     phase name does — an occasional 2-line wrap for the rare
//     long-name+night-greeting combination is a real but low-severity
//     tradeoff, not a broken layout. Most real combinations (see
//     tokens.ts's own measurement script in the MOBILE_ALPHA_REDESIGN.md
//     §14 record) fit on one line comfortably below 330px.
export const type = {
  sub: { fontFamily: font.displayRegular, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: font.body, fontSize: 17, lineHeight: 27 },
  row: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 21 },
  caption: { fontFamily: font.body, fontSize: 12, lineHeight: 17 },
  // Tracked-caps eyebrow — mockup `.phase-mark` (Днес) and the sibling
  // `.plaque`/`.pedestal span` treatment (Карта). RN has no CSS `em`
  // tracking unit: letterSpacing is absolute px, so `.28em` at 9.5px is
  // computed here (9.5 * 0.28 = 2.66), not eyeballed — flagged per the
  // "flag every unit conversion" rule. R3-reserved on Днес per the doc
  // reconciliation: the one tracked-caps eyebrow use on that screen.
  eyebrow: { fontFamily: font.displayRegular, fontSize: 9.5, letterSpacing: 2.66, lineHeight: 13 },
} as const

// Premium pass, item #1 (2026-07-24) — shared press-feedback primitive.
// Precision audit found exactly one component (NavRow) gave any visual
// confirmation of a tap; everywhere else a Pressable went silent until
// the screen changed. Two axes (opacity + a slight scale) so the signal
// clears the R7 calibration bar (>=2 dimensions) rather than repeating
// the single-degree-step mistake PlanetDetail's first R7 pass made.
// Deliberately does NOT fire haptics — see "Haptics policy" in
// MOBILE_ALPHA_REDESIGN.md: the press primitive is purely visual, and
// haptic calls are wired per meaningful interaction site (see the
// premium-pass haptic map), not auto-fired on every tap in the app —
// auto-firing here is exactly the overuse failure the haptics research
// warned against.
export function pressFeedback(pressed: boolean) {
  return {
    opacity: pressed ? 0.6 : 1,
    transform: [{ scale: pressed ? 0.97 : 1 }],
  }
}
