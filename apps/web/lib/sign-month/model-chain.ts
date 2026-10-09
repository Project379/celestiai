/**
 * The monthly cron's model chain: SIGN_MONTH_MODEL (pro) with its editor pass, then the app's flash
 * model with its editor pass, then nothing (the sign shows its evergreen text).
 *
 * A model is "unavailable" when a generation or editor call THROWS (timeout, 5xx, quota, unknown
 * model, thinking level refused...). A text that merely fails validation is not an outage and is
 * retried inside generateSignMonthText. Once a model has thrown, it is skipped for the rest of the
 * run, so a pro outage costs one failed call, not twelve, and is reported ONCE for the whole run
 * (the caller reads `outages`), not once per sign.
 */
import type { ZodiacSign } from '@stellaeum/astrology/client'

import { generateSignMonthText, type SignMonthResult } from './generate'

/** `undefined` = the app's default model (AI_MODEL, currently gemini-3.7-flash). */
export type ChainModel = string | undefined

export interface ModelOutage {
  model: string
  error: string
}

export interface ModelChain {
  models: ChainModel[]
  /** Models that threw this run, in order, with the first error each. One entry per model. */
  outages: ModelOutage[]
}

export function newModelChain(models: ChainModel[]): ModelChain {
  return { models, outages: [] }
}

const label = (m: ChainModel) => m ?? 'default flash model'

export async function generateWithChain(
  chain: ModelChain,
  sign: ZodiacSign,
  ym: string,
  usedStarts: string[],
): Promise<SignMonthResult> {
  const down = (m: ChainModel) => chain.outages.some((o) => o.model === label(m))
  const last = chain.models.length - 1
  let tried = 0
  for (let i = 0; i <= last; i++) {
    const model = chain.models[i]
    if (down(model)) continue
    tried += 1
    try {
      // Only the last model may use the SDK's silent same-provider fallback (gemini-3.6-flash); a
      // silent swap on the first would hide the very outage we are asked to report.
      return await generateSignMonthText(sign, ym, usedStarts, { model, allowFallback: i === last })
    } catch (err) {
      chain.outages.push({ model: label(model), error: err instanceof Error ? err.message : String(err) })
    }
  }
  return { ok: false, reason: tried === 0 ? 'ALL_MODELS_UNAVAILABLE_EARLIER' : 'ALL_MODELS_UNAVAILABLE', attempts: 0 }
}
