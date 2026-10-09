// Днес v2 vertical budget. One screen, no scroll: everything above the nav must
// fit, and the Oracle exit is a fixed slot that never moves or shrinks.
//
// The numbers here are the single source for both the components and the fit
// test (test/dnes-layout.test.ts), so a style change that breaks the fit fails CI.
// Heights follow the approved mocks (.planning/design/dnes/) at 384x832.
//
// If it does not fit, things give way in this order (founder rule):
//   1. shrink the swipe band, 2. tighten the spacing between levels, 3. the levels scroll
//   inside their slot (a part is never cut). The Oracle exit and the nav never change.

export const TAB_BAR_BASE_HEIGHT = 56
/** Gap between the Oracle exit's bottom edge and the real tab bar's top edge. */
export const ORACLE_GAP_ABOVE_NAV = 14
export const ORACLE_MIN_HEIGHT = 48
export const PAGE_PADDING_X = 28

// Largest the system font scale may grow this screen's text. The screen is fixed (no page
// scroll) with a pinned exit, so unbounded scaling would crowd the exit. Founder accepted 1.2
// for now; it is on the pre-launch accessibility check (register: A11Y-FONT-SCALE-CAP-DNES).
export const DNES_MAX_FONT_SCALE = 1.2

export const LEVEL_LINE_HEIGHT = 25
export const LEVEL_LABEL_HEIGHT = 18
const HEADING_HEIGHT = 21
// 12/17. The sentence needs ~307px in Spectral BG (measured on the emulator). The line is allowed
// to bleed DISCLOSURE_BLEED px past the content column on each side (still 8px+ from the screen
// edge at 360), so it is one line when column + 2*bleed >= 307, otherwise two.
const DISCLOSURE_LINE = 17
export const DISCLOSURE_BLEED = 10
export const DISCLOSURE_ONE_LINE_MIN_WIDTH = 307 - 2 * DISCLOSURE_BLEED
/** Horizontal inset of the level text inside the content column (keeps the first line off the edge).
    packages/core/src/dnes/text-fit.ts measures against column - 2 * this. */
export const LEVEL_TEXT_INSET = 6
const MASTHEAD_HEIGHT = 26
// 19px dot row (7px dot + glow, 12px of hit slop is outside layout) + 2px above
const DOTS_BLOCK = 21
const HORIZON_HEIGHT = 20
// Measured on the Android emulator (DNES_FIT probe in DnesV2Screen): the real stack is
// ~1px taller than the sum above (text box rounding). Added so
// the budget matches what is painted; re-measure if the layout changes.
const MEASURED_EXTRA = 1
/** Spare px a chosen tier must keep, so font rounding on other devices cannot touch the exit. */
export const SAFETY = 8

export interface DnesMetrics {
  tier: 0 | 1 | 2 | 3
  swipeH: number
  topPad: number
  mastheadGap: number
  horizonMargin: number
  headingMargin: number
  firstLevelGap: number
  connectorH: number
  connectorGapBefore: number
  connectorGapAfter: number
  /** Smaller sign halos / crystal on the shrunk swipe band. */
  compact: boolean
}

const REGULAR: Omit<DnesMetrics, 'tier' | 'swipeH' | 'compact'> = {
  topPad: 16,
  mastheadGap: 20,
  horizonMargin: 18,
  headingMargin: 20,
  firstLevelGap: 14,
  connectorH: 18,
  connectorGapBefore: 10,
  connectorGapAfter: 8,
}

const TIGHT: Omit<DnesMetrics, 'tier' | 'swipeH' | 'compact'> = {
  topPad: 8,
  mastheadGap: 14,
  horizonMargin: 10,
  headingMargin: 12,
  firstLevelGap: 10,
  connectorH: 12,
  connectorGapBefore: 6,
  connectorGapAfter: 4,
}

const TIERS: DnesMetrics[] = [
  { tier: 0, swipeH: 156, compact: false, ...REGULAR },
  { tier: 1, swipeH: 136, compact: true, ...REGULAR },
  { tier: 2, swipeH: 136, compact: true, ...TIGHT },
  { tier: 3, swipeH: 124, compact: true, ...TIGHT },
]

/** Bottom of the content stack, from the top of the screen area (below the status bar). */
export function contentBottom(m: DnesMetrics, contentW = 328): number {
  const disclosureH = DISCLOSURE_LINE * (contentW >= DISCLOSURE_ONE_LINE_MIN_WIDTH ? 1 : 2)
  const body = LEVEL_LINE_HEIGHT * 2
  const level = LEVEL_LABEL_HEIGHT + 6 + body
  const joint = m.connectorGapBefore + m.connectorH + m.connectorGapAfter
  return (
    m.topPad +
    MASTHEAD_HEIGHT +
    m.mastheadGap +
    m.swipeH +
    DOTS_BLOCK +
    m.horizonMargin +
    HORIZON_HEIGHT +
    m.headingMargin +
    HEADING_HEIGHT +
    m.firstLevelGap +
    level +
    (joint + level) * 2 +
    10 +
    disclosureH +
    MEASURED_EXTRA
  )
}

/** Height of masthead + swipe + dots + horizon (the part above the horoscope slot), as budgeted. */
export function topStackHeight(m: DnesMetrics): number {
  return m.topPad + MASTHEAD_HEIGHT + m.mastheadGap + m.swipeH + DOTS_BLOCK + m.horizonMargin + HORIZON_HEIGHT
}

/** Top edge of the Oracle exit, same coordinate space as `contentBottom`. */
export function oracleTop(screenH: number, insetBottom: number): number {
  return screenH - (TAB_BAR_BASE_HEIGHT + insetBottom) - ORACLE_GAP_ABOVE_NAV - ORACLE_MIN_HEIGHT
}

/**
 * Picks the least-shrunk tier whose worst-case stack still clears the Oracle
 * exit. `screenH` is the usable height below the status bar (window height minus
 * the top inset). Returns slack in px (>= 0 means it fits).
 */
export function dnesMetrics(
  screenH: number,
  insetBottom: number,
  contentW = 328,
): { metrics: DnesMetrics; slack: number } {
  const limit = oracleTop(screenH, insetBottom)
  let chosen = TIERS[TIERS.length - 1]!
  for (const t of TIERS) {
    if (contentBottom(t, contentW) + SAFETY <= limit) {
      chosen = t
      break
    }
  }
  return { metrics: chosen, slack: limit - contentBottom(chosen, contentW) }
}
