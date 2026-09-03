/**
 * Planet sentinel parser and stripper — shared between web (Oracle reading
 * stream + saved-reading rendering) and mobile (Oracle screen + daily
 * horoscope hook). Lifted from apps/web/lib/oracle/planet-parser.ts during
 * SR 7.0a; mobile previously inlined a duplicate `stripPlanetSentinels`
 * regex inside apps/mobile/hooks/useDailyHoroscope.ts.
 *
 * Sentinel format: [planet:KEY]Bulgarian planet name[/planet]
 * Example: [planet:mars]Марс[/planet]
 *
 * Planet keys (English lowercase):
 * sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune, pluto
 *
 * IMPORTANT: Each function creates a fresh RegExp instance to avoid
 * JavaScript's stateful lastIndex bug with the 'g' flag on reused regexes.
 */

/**
 * Extracts all planet keys mentioned in sentinel markers within the text.
 *
 * @param text - Text potentially containing [planet:KEY]...[/planet] markers
 * @returns Array of unique planet keys found (e.g. ['sun', 'mars', 'moon'])
 *
 * @example
 * extractPlanetMentions('[planet:mars]Марс[/planet] и [planet:sun]Слънце[/planet]')
 * // => ['mars', 'sun']
 */
export function extractPlanetMentions(text: string): string[] {
  const sentinelRegex = /\[planet:(\w+)\]([\s\S]*?)\[\/planet\]/g
  const keys: string[] = []

  let match: RegExpExecArray | null
  while ((match = sentinelRegex.exec(text)) !== null) {
    const key = match[1]
    if (key && !keys.includes(key)) {
      keys.push(key)
    }
  }

  return keys
}

/**
 * Removes sentinel markers from text, keeping only the inner Bulgarian text.
 * Non-sentinel text is passed through unchanged.
 *
 * @param text - Text potentially containing [planet:KEY]...[/planet] markers
 * @returns Text with all sentinel markers removed, inner text preserved
 *
 * @example
 * stripSentinels('[planet:mars]Марс[/planet] в Скорпион')
 * // => 'Марс в Скорпион'
 */
export function stripSentinels(text: string): string {
  const sentinelRegex = /\[planet:(\w+)\]([\s\S]*?)\[\/planet\]/g
  return text.replace(sentinelRegex, (_match, _key, innerText: string) => innerText)
}

/**
 * Deterministic-injection placeholder tokens (Astrology Phase 2, Part 3).
 *
 * The LLM is a known-weak placeholder that cannot be trusted to transcribe
 * numbers from its prompt — Phase 1 found degree citation UNSTABLE
 * run-to-run, so it cannot even be regression-tested. Instead of asking
 * the model to copy figures, we forbid it from writing any figure and make
 * it emit a token; we substitute the real value from `chartData` here,
 * server-side, before the reading is shown.
 *
 * Token grammar (case-sensitive keys):
 *   [pos:KEY]        natal position  -> "24°06' Близнаци"     KEY: planet | asc | mc
 *   [house:KEY]      natal house     -> "дом 9"               KEY: planet
 *   [aspect:A-B]     natal aspect    -> "тригон (орб 2.3°)"   A,B: planet, order-insensitive
 *   [tpos:KEY]       transit position (daily horoscope only)  KEY: planet
 *   [taspect:T-N]    transit->natal aspect (horoscope only), T then N
 *
 * A token whose value is not supplied is a bug in the value map or a
 * hallucinated reference by the model — either way it throws. It never
 * substitutes an empty string.
 */
const PLACEHOLDER_RE = /\[(pos|house|aspect|tpos|taspect):([a-zA-Z][a-zA-Z-]*)\]/g

export class PlaceholderSubstitutionError extends Error {
  constructor(
    message: string,
    readonly token: string,
  ) {
    super(message)
    this.name = 'PlaceholderSubstitutionError'
  }
}

/**
 * Canonical map key for a token. The planet portion is lowercased so the
 * model's casing does not matter (`[pos:Sun]`, `[pos:sun]`, `[pos:northNode]`
 * all normalise). `aspect:` / `taspect:` pair keys are hyphen-split; the
 * order-insensitive `aspect:` kind is additionally sorted so
 * `[aspect:moon-sun]` and `[aspect:sun-moon]` resolve to one entry.
 */
export function placeholderKey(kind: string, rawKey: string): string {
  const lowered = rawKey.toLowerCase()
  if (kind === 'aspect') {
    const parts = lowered.split('-')
    if (parts.length === 2) {
      return `aspect:${[...parts].sort().join('-')}`
    }
  }
  return `${kind}:${lowered}`
}

/**
 * Replace every [pos:|house:|aspect:|tpos:|taspect:] token in `text` with
 * its value from `values` (keyed as `placeholderKey` produces). Planet
 * sentinels ([planet:KEY]…[/planet]) are left untouched — run
 * `stripSentinels` after this. Throws `PlaceholderSubstitutionError` on any
 * token with no value.
 */
export function substitutePlaceholders(
  text: string,
  values: Record<string, string>,
): string {
  const re = new RegExp(PLACEHOLDER_RE.source, 'g')
  return text.replace(re, (match, kind: string, rawKey: string) => {
    const key = placeholderKey(kind, rawKey)
    const value = values[key]
    if (value === undefined || value === '') {
      throw new PlaceholderSubstitutionError(
        `Unresolved placeholder ${match} (key "${key}") — the model referenced ` +
          `data not in the chart, or the value map is incomplete.`,
        match,
      )
    }
    return value
  })
}

/**
 * List the placeholder tokens present in `text`, as raw `match` strings.
 * Used by the pre-display validator to confirm none survive substitution.
 */
export function findPlaceholderTokens(text: string): string[] {
  const re = new RegExp(PLACEHOLDER_RE.source, 'g')
  const found: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m[0] !== undefined) found.push(m[0])
  }
  return found
}

/**
 * One parsed chunk from `parseSentinels`. Either a plain text run (no
 * `planet`) or a planet mention (`planet` = lowercase English key, `text`
 * = the Bulgarian inner text that was between the markers).
 */
export interface ParsedSentinel {
  text: string
  planet?: string
}

/**
 * Parses text containing [planet:KEY]...[/planet] sentinel markers into a
 * flat array of chunks in document order. Each chunk is either plain text
 * (`planet` undefined) or a planet mention (`planet` set to the lowercase
 * English key).
 *
 * Consumers map planet keys to their own presentation: web uses Tailwind
 * className strings via a per-surface PLANET_COLORS map; mobile uses hex
 * values for inline `style.color` since NativeWind's class scanner can't
 * see dynamic className concatenations.
 *
 * @param text - Text potentially containing [planet:KEY]...[/planet] markers
 * @returns Array of ParsedSentinel chunks. Empty for empty input.
 *
 * @example
 * parseSentinels('[planet:mars]Марс[/planet] в Скорпион')
 * // => [{ text: 'Марс', planet: 'mars' }, { text: ' в Скорпион' }]
 */
export function parseSentinels(text: string): ParsedSentinel[] {
  const sentinelRegex = /\[planet:(\w+)\]([\s\S]*?)\[\/planet\]/g
  const chunks: ParsedSentinel[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = sentinelRegex.exec(text)) !== null) {
    const matchStart = match.index
    if (matchStart > lastIndex) {
      chunks.push({ text: text.slice(lastIndex, matchStart) })
    }
    chunks.push({
      text: match[2] ?? '',
      planet: match[1] ?? '',
    })
    lastIndex = sentinelRegex.lastIndex
  }

  if (lastIndex < text.length) {
    chunks.push({ text: text.slice(lastIndex) })
  }

  return chunks
}
