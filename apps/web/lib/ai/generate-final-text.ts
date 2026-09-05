import type { GoogleLanguageModelOptions } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { AI_MODEL, gemini, isUpstreamAiError } from './client'
import { getAIStatusCode, isTransientAIError } from './errors'
import { sanitizeFinalAIOutput } from './final-output'

interface GenerateFinalTextOptions {
  fallbackModel?: string
  maxOutputTokens: number
  prompt: string
  system: string
}

/**
 * STELLAEUM_PLACEHOLDER: THINKING-BUDGET-SPIKE — thinkingLevel: 'low' was
 * a preference, not a hard cap: Gate 9 (2026-09-04, paid tier) measured
 * 1 of 20 calls spending 867 thinking tokens against the
 * maxOutputTokens: 900 ceiling, leaving 18 tokens for the actual answer
 * and throwing AI_NoOutputGeneratedError. thinkingBudget below is the
 * real fix — a numeric hard cap. NOTE: the Gemini API rejects setting
 * both thinkingLevel and thinkingBudget at once ("You can only set only
 * one of thinking budget and thinking level" — hit live on the first
 * re-run attempt), so thinkingLevel is gone, not additive with it. 300
 * chosen from the observed candidatesTokenCount range across the first
 * two Gate 9 runs (311-460): 900 - 300 = 600 tokens guaranteed available
 * for the answer, comfortably above the observed max with margin for a
 * longer reading, while 300 still leaves genuine reasoning room (this
 * is not thinkingBudget: 0 / thinking disabled). errors.ts's
 * isTransientAIError now also treats AI_NoOutputGeneratedError as
 * retryable, as defense in depth for whatever other cause might still
 * produce it.
 *
 * STELLAEUM_PLACEHOLDER: THINKING-BUDGET-NOT-A-CAP — thinkingBudget is
 * NOT a hard cap. Google's own docs for this exact field
 * (ai.google.dev/gemini-api/docs/generate-content/thinking,
 * thinkingConfig.thinkingBudget): "Depending on the prompt, the model
 * might overflow or underflow the token budget." Measured live on this
 * exact config, against the Burgas chart (Gate 9 fixture id 6): 15
 * trials with thinkingBudget: 300 produced thinking spends of 153, 212,
 * 348, 707, and 862 — the last two overflowing by 136% and 187%. Treat
 * 300 as a spend target the model is free to exceed, not a ceiling that
 * bounds worst-case latency/cost/output-token headroom; the retryable-
 * fallback path in isTransientAIError below is a mitigation for a call
 * that overflows badly enough to starve maxOutputTokens, not a fix for
 * the overflow itself. See .planning/PLACEHOLDERS.md THINKING-BUDGET-
 * SPIKE and THINKING-BUDGET-NOT-A-CAP.
 */
export const GEMINI_FINAL_ONLY_OPTIONS = {
  thinkingConfig: {
    thinkingBudget: 300,
    includeThoughts: false,
  },
} satisfies GoogleLanguageModelOptions

const finalTextSchema = z.object({
  content: z
    .string()
    .min(1)
    .describe('Only the polished final Bulgarian text. No analysis, planning, drafts, notes, or commentary.'),
})

interface GoogleUsageMetadata {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  totalTokenCount?: number
}

/**
 * RESOLVED 2026-09-04 (THINKING-TOKEN-COST, .planning/PLACEHOLDERS.md):
 * thinkingLevel: 'low' above still bills thinking tokens as output
 * (Google's pricing page: "output price includes thinking tokens"), so
 * this line reads result.usage and logs the raw Gemini usageMetadata
 * (exact field names, no prompt/response content, no userId) — real
 * per-call cost was reconstructed from 20 Gate 9 calls at ~€0.00265/call,
 * confirming the earlier €0.0022 estimate undershot. Still readable via
 * Vercel Runtime Logs by grepping "[AI usage]" for production numbers.
 */
function logAiUsage(model: string, result: { providerMetadata?: Record<string, unknown> }): void {
  const usage = (result.providerMetadata?.google as { usageMetadata?: GoogleUsageMetadata } | undefined)
    ?.usageMetadata
  console.log('[AI usage]', JSON.stringify({
    model,
    promptTokenCount: usage?.promptTokenCount ?? null,
    candidatesTokenCount: usage?.candidatesTokenCount ?? null,
    thoughtsTokenCount: usage?.thoughtsTokenCount ?? null,
    totalTokenCount: usage?.totalTokenCount ?? null,
  }))
}

/**
 * Makes one primary provider request and, when configured, at most one
 * fallback request after a transient failure. Native structured output keeps
 * final content separate from model reasoning; maxRetries: 0 prevents either
 * model call from multiplying into hidden SDK retries.
 *
 * Ported from change-ai-to-bulgarian-fluent (Petko). callModel's `void
 * result.output` line is NOT part of that port — added 2026-09-04
 * (THINKING-BUDGET-SPIKE) after a live Gate 9 run showed the fallback
 * never actually engaging for a real AI_NoOutputGeneratedError: the `ai`
 * SDK's `.output` is a LAZY GETTER (`ai/dist/index.mjs`'s
 * `GenerateTextResult.get output()`) that throws NoOutputGeneratedError
 * on ACCESS, not a promise rejection from `generateText()` itself — so
 * `await callModel(model)` resolves normally even when structured-output
 * parsing failed, and the throw used to happen only later at
 * `result.output.content` below, OUTSIDE this function's try/catch,
 * where isTransientAIError was never consulted and the error surfaced
 * as a bare 500 with the fallback never attempted. Forcing the getter
 * here, inside callModel, moves the throw inside the try/catch so it's
 * actually classified and retried.
 *
 * The caller (route.ts) wraps this in its OWN two-attempt loop for
 * validation-quality failures — see that file's header comment for the
 * composed retry shape and worst-case call count.
 */
export async function generateFinalText(options: GenerateFinalTextOptions) {
  const { fallbackModel, ...callOptions } = options

  async function callModel(model: string) {
    const result = await generateText({
      model: gemini(model),
      ...callOptions,
      maxRetries: 0,
      output: Output.object({ schema: finalTextSchema }),
      providerOptions: {
        google: GEMINI_FINAL_ONLY_OPTIONS,
      },
    })
    // Log here, BEFORE forcing `.output` below — usage/providerMetadata
    // live on `result` as soon as generateText() resolves, regardless of
    // whether the lazy `.output` getter is about to throw
    // NoOutputGeneratedError. This is the only place a spiking-thinking
    // call's real token cost is observable: NoOutputGeneratedError is a
    // property-access throw over an already-completed response, not a
    // network failure, so `result` (and its usage) exists whether or not
    // the getter access below succeeds. Logging inside callModel also
    // means a primary-then-fallback sequence logs both attempts, not just
    // whichever one ultimately succeeded.
    logAiUsage(model, result)
    void result.output
    return result
  }

  let servedModel = AI_MODEL
  let result
  try {
    result = await callModel(AI_MODEL)
  } catch (primaryError) {
    if (
      !fallbackModel ||
      (!isTransientAIError(primaryError) && !isUpstreamAiError(primaryError))
    ) {
      // The AI SDK's error classes (APICallError, NoOutputGeneratedError,
      // etc.) carry no usage/token data at all — see lib/ai/errors.ts's
      // errorChain and generateText's own error types. When generateText()
      // itself throws before resolving (a genuine upstream/network
      // failure, as opposed to the lazy-getter throw above), that call's
      // token cost is not observable from here or anywhere else client-
      // side; nothing is logged for it.
      throw primaryError
    }

    console.warn('[AI] Primary model unavailable; trying model fallback.', {
      fallbackModel,
      primaryModel: AI_MODEL,
      statusCode: getAIStatusCode(primaryError),
    })
    servedModel = fallbackModel
    result = await callModel(fallbackModel)
  }

  const text = sanitizeFinalAIOutput(result.output.content)
  if (!text) {
    throw new Error('Gemini returned no usable final content.')
  }

  return { model: servedModel, text }
}
