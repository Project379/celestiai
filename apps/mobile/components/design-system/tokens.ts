// Continuity-layer + platform-layer tokens — MOBILE-ALPHA-REDESIGN v3.
// See .planning/research/MOBILE_ALPHA_REDESIGN.md §0 for the familiarity
// brief and §0.3 (type scale) for the measured-width validation behind
// every size below — none of these are guesses.

export const color = {
  base: '#08060f',
  surface1: '#0f0b1c',
  surface2: '#161029',
  violet: '#8b5cf6',
  violetBorder: 'rgba(139,92,246,0.25)',
  amber: '#fbbf24',
  amberText: '#fde68a',
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
  body: 'EBGaramond-Regular',
  bodyMedium: 'EBGaramond-Medium',
  bodyItalic: 'EBGaramond-Italic',
} as const

// Type scale, each size validated against the longest real Bulgarian
// string for that slot at 390px width (usable width 350px after 20px
// margins), measured via actual font advance widths, not assumed:
//   - "Изгряващ полумесец" / "Залязващ полумесец" (19 chars, longest
//     lunar-phase name): fits one line at 32px (~324-329px), WRAPS at
//     36px+ (364-371px) — this is the exact failure v2 shipped at 40px
//     (405-412px). 32px is the validated ceiling for this slot.
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
  hero: { fontFamily: font.displaySemibold, fontSize: 32, lineHeight: 38 },
  sub: { fontFamily: font.displayRegular, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: font.body, fontSize: 17, lineHeight: 27 },
  row: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 21 },
  caption: { fontFamily: font.body, fontSize: 12, lineHeight: 17 },
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
