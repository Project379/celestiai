import { TEXT_FIT_ADVANCES, TEXT_FIT_UNITS_PER_EM } from './text-fit-table'

/**
 * Does generated text fit N lines on the phone? Used by the server to reject a
 * too-long horoscope part or monthly text BEFORE it is saved, so the app never has
 * to cut a line. Widths are Spectral BG Medium (the widest weight used) summed per
 * glyph with greedy word wrap, no kerning, so it is a slight over-estimate.
 *
 * Numbers (Днес v2, founder spec): content column = screen width - 56px, so
 * 304px on the 360px floor. The horoscope levels inset their text 6px each side
 * (LEVEL_TEXT_INSET in apps/mobile/lib/dnes/layout.ts), so the measured column is 292.
 */
export const DNES_FLOOR_COLUMN_PX = 292
/** The month page is not inset: its text uses the full content column. */
export const DNES_MONTH_COLUMN_PX = 304
/** Keep a margin: platform text layout is not byte-identical to this estimate. */
export const TEXT_FIT_SAFETY = 0.97

export const HOROSCOPE_PART_SIZE_PX = 16
export const HOROSCOPE_PART_MAX_LINES = 2
export const MONTH_TEXT_SIZE_PX = 15
// Three lines: the founder's tone examples are two sentences of about 100 characters. The month
// page drops its glyph when the swipe band is short, so three lines always fit (see SummaryPager).
export const MONTH_TEXT_MAX_LINES = 3

function advance(ch: string, sizePx: number): number {
  const units = TEXT_FIT_ADVANCES[ch.codePointAt(0) ?? 0]
  // Unknown glyph: assume half an em, which is wider than a typical letter.
  return ((units ?? TEXT_FIT_UNITS_PER_EM * 0.5) * sizePx) / TEXT_FIT_UNITS_PER_EM
}

/** Number of lines `text` wraps to at the given size and column width. */
export function countWrappedLines(text: string, sizePx: number, columnPx: number): number {
  const limit = columnPx * TEXT_FIT_SAFETY
  const space = advance(' ', sizePx)
  let lines = 1
  let cur = 0
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue
    let w = 0
    for (const ch of word) w += advance(ch, sizePx)
    if (cur === 0) cur = w
    else if (cur + space + w <= limit) cur += space + w
    else {
      lines += 1
      cur = w
    }
  }
  return lines
}

/**
 * How full is the text, in lines: 1.0 = one full line, 1.5 = a full line and a half, 2.0 = two
 * full lines. Same measure as countWrappedLines, so lines = ceil(fill) except for a short last line.
 */
export function wrappedFill(text: string, sizePx: number, columnPx: number): number {
  const limit = columnPx * TEXT_FIT_SAFETY
  const space = advance(' ', sizePx)
  let lines = 1
  let cur = 0
  for (const word of text.trim().split(/\s+/)) {
    if (!word) continue
    let w = 0
    for (const ch of word) w += advance(ch, sizePx)
    if (cur === 0) cur = w
    else if (cur + space + w <= limit) cur += space + w
    else {
      lines += 1
      cur = w
    }
  }
  return lines - 1 + cur / limit
}

/**
 * Minimum fill for a Днес horoscope part: the parts should read as two FULL lines, not a line
 * and a bit. Measured with the font table on the 360px floor: about 50 to 66 characters. (1.65 was tried first;
 * the model could not hit it reliably, 1.55 still reads as two lines, not a line and a bit.)
 */
export const HOROSCOPE_PART_MIN_FILL = 1.55

export function fitsHoroscopePart(text: string): boolean {
  return countWrappedLines(text, HOROSCOPE_PART_SIZE_PX, DNES_FLOOR_COLUMN_PX) <= HOROSCOPE_PART_MAX_LINES
}

/** A generated part that fits two lines AND fills them (see HOROSCOPE_PART_MIN_FILL). */
export function fillsHoroscopePart(text: string): boolean {
  return (
    fitsHoroscopePart(text) &&
    wrappedFill(text, HOROSCOPE_PART_SIZE_PX, DNES_FLOOR_COLUMN_PX) >= HOROSCOPE_PART_MIN_FILL
  )
}

export function fitsMonthText(text: string): boolean {
  return countWrappedLines(text, MONTH_TEXT_SIZE_PX, DNES_MONTH_COLUMN_PX) <= MONTH_TEXT_MAX_LINES
}

/**
 * Is stored horoscope content already in the Днес v2 shape: exactly three paragraphs, each
 * fitting two lines on the 360px floor, and no digits (the v2 prompt bans numbers).
 * The server uses it to decide whether a row needs `?upgrade=1`; the app uses it to ask.
 */
export function isNewFormatHoroscope(content: string): boolean {
  const parts = content
    .replace(/\[\/?planet(?::[a-zA-Z]+)?\]/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  return parts.length === 3 && parts.every((p) => fitsHoroscopePart(p) && !/\d/.test(p))
}
