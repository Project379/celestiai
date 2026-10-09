/**
 * Pre-display validation for AI-generated readings (Astrology Phase 2, Part 5).
 *
 * The model is a known-weak Bulgarian placeholder. Phase 1 saw it emit CJK
 * and Hangul fragments ("環ност", "快速ни", "환"), broken openings, and —
 * before Part 3 — fabricated numbers. Nothing inspected the text before it
 * reached the user. This does, in one pass, and it must run to completion
 * on the WHOLE reading, so the caller cannot stream token-by-token.
 *
 * Order of operations:
 *   1. Structural checks on the RAW model text: sentinels balanced, and no
 *      model-authored digits at all (every figure must come from a token).
 *   2. Substitute [pos:|house:|aspect:|tpos:|taspect:] tokens with real
 *      chart values. An unresolved token = the model referenced data not
 *      in the chart -> reject.
 *   3. Post-substitution checks: no token survived; SCRIPT PURITY (the
 *      highest-value check — a non-Bulgarian glyph is unshippable); word
 *      count in range.
 *   4. Strip planet sentinels -> the final display text.
 *
 * On any failure the caller regenerates once, then shows a user-visible
 * error rather than displaying broken output.
 */
import { fillsHoroscopePart, fitsHoroscopePart } from '@stellaeum/core/dnes/text-fit'
import {
  findPlaceholderTokens,
  PlaceholderSubstitutionError,
  stripSentinels,
  substitutePlaceholders,
} from '@stellaeum/core/oracle/planet-parser'

export type ReadingValidationFailure = {
  ok: false
  /** Stable machine code for logs/metrics. */
  code:
    | 'SENTINELS_UNBALANCED'
    | 'MODEL_WROTE_DIGITS'
    | 'UNRESOLVED_PLACEHOLDER'
    | 'PLACEHOLDER_SURVIVED'
    | 'NON_BULGARIAN_SCRIPT'
    | 'WORD_COUNT_OUT_OF_RANGE'
    | 'PARTS_NOT_THREE'
    | 'PART_TOO_LONG'
    | 'DIGITS_IN_TEXT'
    | 'PART_TOO_SHORT'
    | 'LUMINARY_WITHOUT_ARTICLE'
  detail: string
  /** Set only for PART_TOO_SHORT: the reading is valid in every other way, just a little short. */
  content?: string
  text?: string
}
export type ReadingValidationResult =
  | {
      ok: true
      /** Substituted, planet sentinels REMOVED — plain text for spell-check / logging. */
      text: string
      /** Substituted, planet sentinels KEPT — for storage + client cross-highlight. */
      content: string
      wordCount: number
    }
  | ReadingValidationFailure

export interface ValidateReadingOptions {
  /** Inclusive word-count bounds for the final (substituted) text. */
  minWords: number
  maxWords: number
  /**
   * Daily horoscope (Днес v2): the text must be exactly three paragraphs and each must
   * fit two lines of 16px on the 360px floor (packages/core/src/dnes/text-fit.ts), so
   * the phone never has to cut a line.
   */
  threeShortParts?: boolean
}

/**
 * SCRIPT PURITY allowlist. A generated Bulgarian reading may contain:
 *   - Cyrillic                          U+0400..U+04FF
 *   - printable ASCII + tab/newline/CR  U+0009, U+000A, U+000D, U+0020..U+007E
 *     (covers letters used in tokens, digits, spaces, . , : ; ! ? ( ) " ' - / …
 *      and the ASCII apostrophe used as the arc-minute prime)
 *   - a small set of typographic punctuation the codebase deliberately uses:
 *       U+00B0 °   degree sign (from substitution)
 *       U+2014 —   em dash          U+2013 –   en dash
 *       U+2026 …   ellipsis
 *       U+201E „   U+201C "  U+201D "   Bulgarian / curly quotes
 *       U+00AB «   U+00BB »            guillemets
 *       U+00B7 ·   middle dot
 * Everything else — CJK, Hangul, Greek, fullwidth forms, emoji, control
 * chars — is rejected.
 */
const ALLOWED_PUNCT = new Set([
  '°',
  '—',
  '–',
  '…',
  '„',
  '“',
  '”',
  '«',
  '»',
  '·',
])

function firstDisallowedChar(
  text: string,
): { char: string; codePoint: string; context: string } | null {
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i)
    if (cp === undefined) continue
    // Surrogate pair -> definitely outside every allowed range.
    if (cp > 0xffff) {
      return {
        char: String.fromCodePoint(cp),
        codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
        context: text.slice(Math.max(0, i - 20), i + 20),
      }
    }
    const ok =
      cp === 0x09 ||
      cp === 0x0a ||
      cp === 0x0d ||
      (cp >= 0x20 && cp <= 0x7e) ||
      (cp >= 0x0400 && cp <= 0x04ff) ||
      ALLOWED_PUNCT.has(text[i] as string)
    if (!ok) {
      return {
        char: text[i] as string,
        codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
        context: text.slice(Math.max(0, i - 20), i + 20),
      }
    }
  }
  return null
}

/** Count of [planet:KEY] opens and [/planet] closes. */
function sentinelBalance(text: string): { opens: number; closes: number } {
  const opens = (text.match(/\[planet:[a-zA-Z]+\]/g) ?? []).length
  const closes = (text.match(/\[\/planet\]/g) ?? []).length
  return { opens, closes }
}

/**
 * Text with every token / sentinel marker removed, for the "did the model
 * write a figure of its own" check. Tokens carry the only legitimate
 * digits, so what remains must have none.
 */
function stripAllMarkup(text: string): string {
  return text
    .replace(/\[(pos|house|aspect|tpos|taspect):[a-zA-Z][a-zA-Z-]*\]/g, '')
    .replace(/\[planet:[a-zA-Z]+\]/g, '')
    .replace(/\[\/planet\]/g, '')
}

// «Слънце» / «Луна» with no article, at the start of a part or right after a comma: the subject
// position, where Bulgarian needs «Слънцето» / «Луната». («твоето Слънце» is fine: not matched.)
const BARE_LUMINARY_SUBJECT = /(^|,\s*)(Слънце|Луна)(?![\p{L}])/u

function countWords(text: string): number {
  const m = text.trim().match(/\S+/g)
  return m ? m.length : 0
}

/**
 * Validate a raw model reading and return the finished display text.
 *
 * @param rawText  the model's output, tokens and sentinels intact
 * @param placeholderValues  token key -> real value (buildOraclePlaceholderValues
 *                            / buildHoroscopePlaceholderValues)
 */
export function validateReading(
  rawText: string,
  placeholderValues: Record<string, string>,
  opts: ValidateReadingOptions,
): ReadingValidationResult {
  // 1. Structural checks on the raw text.
  const balance = sentinelBalance(rawText)
  if (balance.opens !== balance.closes) {
    return {
      ok: false,
      code: 'SENTINELS_UNBALANCED',
      detail: `${balance.opens} [planet:] open(s) vs ${balance.closes} [/planet] close(s).`,
    }
  }

  const bareText = stripAllMarkup(rawText)
  const digitMatch = bareText.match(/\d[\d°'.,\s-]*/)
  if (digitMatch) {
    const idx = bareText.indexOf(digitMatch[0])
    return {
      ok: false,
      code: 'MODEL_WROTE_DIGITS',
      detail:
        `Model wrote a figure of its own ("${digitMatch[0].trim()}") instead of a token. ` +
        `Context: "...${bareText.slice(Math.max(0, idx - 30), idx + 30).replace(/\s+/g, ' ')}..."`,
    }
  }

  // 2. Substitute placeholders with real values.
  let substituted: string
  try {
    substituted = substitutePlaceholders(rawText, placeholderValues)
  } catch (err) {
    if (err instanceof PlaceholderSubstitutionError) {
      return { ok: false, code: 'UNRESOLVED_PLACEHOLDER', detail: err.message }
    }
    throw err
  }

  // 3a. No token survived. `findPlaceholderTokens` catches well-formed
  //     leftovers; the loose regex also catches malformed ones the strict
  //     grammar skipped (wrong case, stray spaces) so they cannot render
  //     literally to the reader.
  const survivors = findPlaceholderTokens(substituted)
  const looseLeftover = substituted.match(/\[\s*(pos|house|aspect|tpos|taspect)\s*:/i)
  if (survivors.length > 0 || looseLeftover) {
    const shown = survivors.length > 0 ? survivors.slice(0, 5).join(', ') : looseLeftover?.[0]
    return {
      ok: false,
      code: 'PLACEHOLDER_SURVIVED',
      detail: `Unsubstituted or malformed token(s) remain: ${shown}`,
    }
  }

  // 3b. Script purity.
  const bad = firstDisallowedChar(substituted)
  if (bad) {
    return {
      ok: false,
      code: 'NON_BULGARIAN_SCRIPT',
      detail: `Disallowed character ${bad.codePoint} (${JSON.stringify(bad.char)}) near "${bad.context.replace(/\s+/g, ' ')}"`,
    }
  }

  // 4. Strip sentinels for the plain-text view, then word count.
  const text = stripSentinels(substituted)
  const wordCount = countWords(text)
  if (wordCount < opts.minWords || wordCount > opts.maxWords) {
    return {
      ok: false,
      code: 'WORD_COUNT_OUT_OF_RANGE',
      detail: `${wordCount} words; expected ${opts.minWords}-${opts.maxWords}.`,
    }
  }

  if (opts.threeShortParts) {
    // Днес v2 bans numbers: a token that expanded to a figure, or a digit the model wrote.
    if (/\d/.test(text)) {
      return { ok: false, code: 'DIGITS_IN_TEXT', detail: 'The reading contains a digit; the v2 prompt bans numbers.' }
    }
    const parts = text
      .split(/\n\s*\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (parts.length !== 3) {
      return {
        ok: false,
        code: 'PARTS_NOT_THREE',
        detail: `${parts.length} paragraph(s); expected exactly 3 separated by a blank line.`,
      }
    }
    const tooLong = parts.findIndex((p) => !fitsHoroscopePart(p))
    if (tooLong !== -1) {
      return {
        ok: false,
        code: 'PART_TOO_LONG',
        detail: `Paragraph ${tooLong + 1} (${parts[tooLong]!.length} characters) does not fit two lines on a 360px screen.`,
      }
    }
    // Grammar: the Sun and the Moon take the definite article as the subject (Слънцето,
    // Луната). A bare luminary at the start of a part, or right after a comma, is wrong.
    const bare = parts.findIndex((p) => BARE_LUMINARY_SUBJECT.test(p))
    if (bare !== -1) {
      return {
        ok: false,
        code: 'LUMINARY_WITHOUT_ARTICLE',
        detail: `Paragraph ${bare + 1} uses «Слънце» or «Луна» as the subject without the article; write «Слънцето» or «Луната».`,
      }
    }
    // Each part should fill about two full lines, not a line and a bit.
    const tooShort = parts.findIndex((p) => !fillsHoroscopePart(p))
    if (tooShort !== -1) {
      return {
        ok: false,
        code: 'PART_TOO_SHORT',
        detail: `Paragraph ${tooShort + 1} (${parts[tooShort]!.length} characters) is too short: it must fill about two full lines, so write 54 to 62 characters.`,
        content: substituted,
        text,
      }
    }
  }

  return { ok: true, text, content: substituted, wordCount }
}
