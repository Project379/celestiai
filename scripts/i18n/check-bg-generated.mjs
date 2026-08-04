#!/usr/bin/env node
/**
 * Spell-checks arbitrary Bulgarian text (LLM-generated horoscope/Oracle
 * samples) against the same dictionary-bg + allowlist used for static
 * strings. Run manually whenever a prompt changes or you want to sample
 * current model output — NOT wired into CI (generated text doesn't exist
 * at build time).
 *
 * Reads samples from a JSON file passed as the first CLI arg:
 *   [{ "label": "...", "text": "..." }, ...]
 * Prints misspellings per sample plus a combined summary. Exit code is
 * always 0 — a high failure rate here is expected baseline noise from a
 * known-weak-Bulgarian model (see apps/web/lib/ai/client.ts), not a CI
 * gate; report and read, don't fail a build on it.
 *
 * Usage: node scripts/i18n/check-bg-generated.mjs samples.json
 */
import { readFileSync } from 'node:fs'
import { loadSpeller, findMisspellings } from './bg-speller.mjs'

const samplesPath = process.argv[2]
if (!samplesPath) {
  console.error('Usage: node scripts/i18n/check-bg-generated.mjs <samples.json>')
  process.exit(1)
}

const samples = JSON.parse(readFileSync(samplesPath, 'utf8'))
const speller = await loadSpeller()

let totalMisses = 0
for (const s of samples) {
  const misses = findMisspellings(speller, s.text)
  totalMisses += misses.length
  console.log(`${s.label}: ${misses.length ? misses.join(', ') : '(none)'}`)
}
console.log(`\n${samples.length} sample(s) checked, ${totalMisses} unrecognized word(s) total.`)
console.log('Reminder: this checks spelling only. Register, calques, and translated-feel')
console.log('syntax are invisible to this tool and are not what it claims to catch.')
