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

/**
 * Makes one primary provider request and, when configured, at most one
 * fallback request after a transient failure. Native structured output keeps
 * final content separate from model reasoning; maxRetries: 0 prevents either
 * model call from multiplying into hidden SDK retries.
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

    console.warn('[AI] Oracle primary model unavailable; trying model fallback.', {
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
