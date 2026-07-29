import { createServiceSupabaseClient } from '@/lib/supabase/service'
// Reuses the exact CLI checker (same dictionary, same allowlist, same
// mixed-script tokenizer) instead of porting the logic — one source of
// truth for "what counts as a flagged word." loadSpeller() memoizes the
// parsed Hunspell dictionary at module scope, so this only pays parse cost
// on a cold serverless start, not on every call.
import { loadSpeller, findMisspellings } from '../../../../scripts/i18n/bg-speller.mjs'

export type GenerationSource = 'horoscope' | 'oracle'

/**
 * Astrological conditions the generation depended on — no chartId, userId,
 * or anything that ties a row to a person. bg_generation_flags is a debug
 * table, not a user-data table.
 */
export type GenerationConditions = Record<string, unknown>

/**
 * Observes generated Bulgarian text for non-words (typos, garbled/mixed-
 * script tokens) and records one row per generation for a real per-day
 * failure rate. Does NOT block, retry, or rewrite anything — call this
 * fire-and-forget (`void checkAndLogGeneration(...)`) after the response has
 * already been returned/streamed to the client. A failure in this function
 * must never affect generation; all errors are swallowed after logging.
 */
export async function checkAndLogGeneration({
  source,
  model,
  text,
  conditions,
}: {
  source: GenerationSource
  model: string
  text: string
  conditions: GenerationConditions
}): Promise<void> {
  try {
    const speller = await loadSpeller()
    const flagged = findMisspellings(speller, text) as string[]

    const supabase = createServiceSupabaseClient()
    await supabase.from('bg_generation_flags').insert({
      source,
      model,
      flagged_words: flagged,
      flagged_count: flagged.length,
      // Clean generations are already cached in ai_readings/daily_horoscopes —
      // only store text here when there's something to look at.
      generated_text: flagged.length > 0 ? text : null,
      input_conditions: conditions,
    })
  } catch (err) {
    console.error('[check-bg-output] Failed to log generation flags:', err)
  }
}
