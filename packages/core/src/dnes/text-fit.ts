import { TEXT_FIT_ADVANCES, TEXT_FIT_UNITS_PER_EM } from './text-fit-table'

/**
 * Does generated text fit N lines on the phone? Used by the server to reject a
 * too-long horoscope part or monthly text BEFORE it is saved, so the app never has
 * to cut a line. Widths are Spectral BG Medium (the widest weight used) summed per
 * glyph with greedy word wrap, no kerning, so it is a slight over-estimate.
 *
 * Numbers (Днес v2, founder spec): content column = screen width - 56px, so
 * 304px on the 360px floor.
 */
export const DNES_FLOOR_COLUMN_PX = 304
/** Keep a margin: platform text layout is not byte-identical to this estimate. */
export const TEXT_FIT_SAFETY = 0.97

export const HOROSCOPE_PART_SIZE_PX = 16
export const HOROSCOPE_PART_MAX_LINES = 2
export const MONTH_TEXT_SIZE_PX = 15
export const MONTH_TEXT_MAX_LINES = 2

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

export function fitsHoroscopePart(text: string): boolean {
  return countWrappedLines(text, HOROSCOPE_PART_SIZE_PX, DNES_FLOOR_COLUMN_PX) <= HOROSCOPE_PART_MAX_LINES
}

export function fitsMonthText(text: string): boolean {
  return countWrappedLines(text, MONTH_TEXT_SIZE_PX, DNES_FLOOR_COLUMN_PX) <= MONTH_TEXT_MAX_LINES
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
