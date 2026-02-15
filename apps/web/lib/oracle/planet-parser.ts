/**
 * Planet sentinel parser and stripper
 *
 * Utilities for working with [planet:KEY]...[/planet] sentinel markers
 * that the AI embeds in generated readings. These markers enable
 * cross-highlighting between the reading text and the natal wheel.
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
  // Create a fresh RegExp each call to avoid stateful lastIndex issues
  // Use [\s\S]*? instead of .*? with 's' flag for ES2017 compatibility
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
  // Create a fresh RegExp each call to avoid stateful lastIndex issues
  // Use [\s\S]*? instead of .*? with 's' flag for ES2017 compatibility
  const sentinelRegex = /\[planet:(\w+)\]([\s\S]*?)\[\/planet\]/g
  return text.replace(sentinelRegex, (_match, _key, innerText: string) => innerText)
}
