import { AI_MODEL, ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'
import { GEMINI_THINKING_LEVEL, SMOKE_AI_TIMEOUT_MS, generateFinalText } from '@/lib/ai/generate-final-text'

/**
 * The smoke AI probe (GET /api/smoke, check "ai").
 *
 * Deliberately English and trivial — it verifies the provider / model / SDK /
 * structured-output path is alive, not Bulgarian fluency (that is Gate 9's job). A
 * Bulgarian prompt here would also add literals to the check:bg-lint-baseline ratchet
 * for no benefit.
 *
 * It FAILS when the fallback model served the probe (2026-10-07). Before, the probe
 * logged "<model> → ok" only into the detail string and the smoke script printed just
 * "ai:ok", so a silently failing or slow PRIMARY model passed as green while the
 * fallback answered. A fallback answer is exactly the condition this probe exists to
 * catch. The probe also uses SHORT timeouts (SMOKE_AI_TIMEOUT_MS each) so the whole
 * probe stays under the smoke client's 45 s limit even when both models are slow.
 */
export async function checkAi(): Promise<string> {
  const { model, text } = await generateFinalText({
    system: 'Reply with exactly the word "ok" and nothing else.',
    prompt: 'Say: ok',
    maxOutputTokens: 200,
    fallbackModel: ORACLE_FALLBACK_MODEL,
    thinkingLevel: GEMINI_THINKING_LEVEL.smoke,
    timeoutMs: { primary: SMOKE_AI_TIMEOUT_MS, fallback: SMOKE_AI_TIMEOUT_MS },
  })
  if (!text || text.trim().length === 0) {
    throw new Error('generateFinalText returned empty text')
  }
  if (model !== AI_MODEL) {
    throw new Error(
      `the FALLBACK model served the AI probe (${model}; primary is ${AI_MODEL}) — the primary is failing or slow. This is not a green.`,
    )
  }
  return `${model} (primary) → ${text.trim().slice(0, 48)}`
}
