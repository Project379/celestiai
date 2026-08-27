// Shared Bulgarian spell-checking core — used by both:
//   - scripts/check-bg-static-strings.mjs (CI, source-code Cyrillic literals)
//   - scripts/i18n/check-bg-generated.mjs (ad hoc, LLM sample output)
//
// Backed by `dictionary-bg` (wooorm/dictionaries, actively maintained
// Hunspell-format Bulgarian dictionary) + `nspell`. This checks SPELLING
// only — real Bulgarian words used in an unnatural way, translated-feel
// syntax, or register problems are invisible to this and are not what it
// claims to catch. See docs/i18n note (bg-spellcheck README) for the
// explicit "what this cannot catch" statement.
import dictionary from 'dictionary-bg'
import nspell from 'nspell'

import { BG_ALLOWLIST } from './bg-allowlist.data.mjs'

// The allowlist was `readFileSync('bg-allowlist.txt')` at module scope
// until 2026-08-27. When webpack bundles this file for the Next.js server
// build it freezes `import.meta.url` to the BUILD machine's absolute path,
// so the runtime read became `readFileSync('C:/Users/.../bg-allowlist.txt')`
// and 500'd in production (ENOENT on Vercel's Linux fs). A bundled data
// module has no filesystem access and nothing to trace. See
// COMPLETION-TRACKER.md §0.7 and VERIFICATION-SURFACE-GAPS.md #7.
const ALLOWLIST = new Set(BG_ALLOWLIST)

// "по-" (comparative: по-долу, по-силна, по-малко) and "най-" (superlative:
// най-добра, най-силен) + adjective/adverb are productive Bulgarian
// degree constructions, not fixed dictionary entries — a general-purpose
// dictionary will never have every possible по-X/най-X form, so this is a
// structural exclusion (a grammatical PATTERN is always valid), not a
// per-word judgment call about whether a specific string is correct
// Bulgarian. Individually allowlisting each one is whack-a-mole; match the
// pattern instead.
const DEGREE_COMPARATIVE_RE = /^(по|По|най|Най)-[а-яА-Я]+$/

// dictionary-bg v2 is ESM and exports `{aff, dic}` directly (no callback,
// unlike the old v1-era dictionary packages some nspell examples still
// show) — nspell accepts that shape as-is.
let speller = null

export async function loadSpeller() {
  if (!speller) speller = nspell(dictionary)
  return speller
}

// General word tokenizer (any-script letters + internal hyphen/apostrophe),
// NOT a Cyrillic-only character class — a mixed-script garbled token like
// "сеiyan" (Cyrillic followed directly by Latin, no word boundary between
// them) must be tested as ONE token, not split at the script boundary and
// have only its Cyrillic half checked. Splitting on script boundaries was
// the original approach and it silently let exactly this failure mode
// through — confirmed against a real generated sample.
const WORD_RE = /[\p{L}](?:[\p{L}'’-]*[\p{L}])?/gu
const HAS_CYRILLIC_RE = /[Ѐ-ӿ]/

export function extractCyrillicWords(text) {
  const all = text.match(WORD_RE) ?? []
  // Keep any token that contains at least one Cyrillic letter — this
  // includes pure-Cyrillic words AND mixed-script garble, but skips
  // pure-Latin tokens (planet sentinel keys, code identifiers) entirely.
  return all.filter((w) => HAS_CYRILLIC_RE.test(w))
}

// Returns only the words the dictionary does NOT recognize, deduped per
// call (same word failing twice in one string is reported once).
export function findMisspellings(speller, text) {
  const words = extractCyrillicWords(text)
  const seen = new Set()
  const misses = []
  for (const word of words) {
    if (seen.has(word)) continue
    seen.add(word)
    if (ALLOWLIST.has(word)) continue
    if (DEGREE_COMPARATIVE_RE.test(word)) continue
    if (!speller.correct(word)) misses.push(word)
  }
  return misses
}
