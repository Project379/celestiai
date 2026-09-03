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

export const GEMINI_FINAL_ONLY_OPTIONS = {
  thinkingConfig: {
    thinkingLevel: 'low',
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
 * STELLAEUM_PLACEHOLDER: THINKING-TOKEN-COST — thinkingLevel: 'low' above
 * still bills thinking tokens as output (Google's pricing page: "output
 * price includes thinking tokens"), and until this log line existed
 * nothing ever read result.usage — real per-call cost was unmeasured. Logs
 * the raw Gemini usageMetadata (exact field names, no prompt/response
 * content, no userId) so real cost can be reconstructed from Vercel's
 * Runtime Logs by grepping "[AI usage]". See .planning/PLACEHOLDERS.md.
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
 * Ported from change-ai-to-bulgarian-fluent (Petko), unchanged in
 * implementation. The caller (route.ts) wraps this in its OWN two-attempt
 * loop for validation-quality failures — see that file's header comment for
 * the composed retry shape and worst-case call count.
 */
export async function generateFinalText(options: GenerateFinalTextOptions) {
  const { fallbackModel, ...callOptions } = options

  async function callModel(model: string) {
    return generateText({
      model: gemini(model),
      ...callOptions,
      maxRetries: 0,
      output: Output.object({ schema: finalTextSchema }),
      providerOptions: {
        google: GEMINI_FINAL_ONLY_OPTIONS,
      },
    })
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

  logAiUsage(servedModel, result)

  const text = sanitizeFinalAIOutput(result.output.content)
  if (!text) {
    throw new Error('Gemini returned no usable final content.')
  }

  return { model: servedModel, text }
}
