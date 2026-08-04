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
