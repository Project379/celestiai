/**
 * Shared Bulgarian grammar helpers for composed sentences.
 *
 * Consolidates logic that was previously copy-pasted per call site
 * (see .planning/i18n/BG_COMPOSED_STRINGS.md for the audit that found each
 * duplicate): preposition elision, adjective/pronoun gender agreement, and
 * ordinal formatting. Any new composed string that inserts a planet, aspect,
 * or sign name into a sentence should route through these instead of
 * hand-rolling the rule again.
 */

export type BgGender = 'masc' | 'fem' | 'neut'

/**
 * в -> във before в-/ф-initial words, с -> със before с-/з-initial words.
 * Case-insensitive on the first letter (Cyrillic).
 */
export function bgPrep(prep: 'в' | 'с', nextWord: string): string {
  if (prep === 'в') return /^[вВфФ]/.test(nextWord) ? 'във' : 'в'
  return /^[сСзЗ]/.test(nextWord) ? 'със' : 'с'
}

interface BgAdjectiveForms {
  masc: string
  fem: string
  neut: string
}

/** Selects the gender-agreeing form of a pre-declined adjective. */
export function agreeAdjective(forms: BgAdjectiveForms, gender: BgGender): string {
  return forms[gender]
}

/** "натален" (natal, as attached to a planet name). */
export const NATAL_ADJ: BgAdjectiveForms = {
  masc: 'натален',
  fem: 'натална',
  neut: 'натално',
}

/** "точен" (exact, as attached to an aspect name). */
export const EXACT_ADJ: BgAdjectiveForms = {
  masc: 'точен',
  fem: 'точна',
  neut: 'точно',
}

/** "ретрограден" (retrograde, as attached to a planet name). */
export const RETROGRADE_ADJ: BgAdjectiveForms = {
  masc: 'ретрограден',
  fem: 'ретроградна',
  neut: 'ретроградно',
}

/** "Транзитен" (transiting, as attached to a planet name, capitalized as a line label). */
export const TRANSITING_ADJ: BgAdjectiveForms = {
  masc: 'Транзитен',
  fem: 'Транзитна',
  neut: 'Транзитно',
}

/** "твоя"/"твоята"/"твоето" — postpositive possessive, e.g. "с твоя натален X". */
export const YOUR_POSSESSIVE: BgAdjectiveForms = {
  masc: 'твоя',
  fem: 'твоята',
  neut: 'твоето',
}

/**
 * Clitic accusative pronoun ("го"/"я") agreeing with the referent's gender.
 * Masculine and neuter both take "го" in this position.
 */
export function agreeAccusativePronoun(gender: BgGender): string {
  return gender === 'fem' ? 'я' : 'го'
}

/**
 * Bulgarian pluralization: singular exactly at count === 1, plural for
 * everything else (including 0) — no Russian-style tens declension.
 * Returns the word form only; the caller composes it with the count.
 * Same rule `formatDaysHours` applies inline for day/hour counts.
 */
export function pluralizeBg(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

const ORDINAL_SUFFIX_EXCEPTIONS: Record<number, string> = {
  1: 'ви',
  2: 'ри',
  3: 'ти',
  4: 'ти',
}

/**
 * Bulgarian ordinal suffix for 1-12 (house numbers). 1st-4th are irregular
 * (-ви, -ри, -ти, -ти); 5th-12th regularly take -и.
 */
export function ordinalBg(n: number): string {
  const suffix = ORDINAL_SUFFIX_EXCEPTIONS[n] ?? 'и'
  return `${n}-${suffix}`
}

export { formatDaysHours } from './format-days-hours'
