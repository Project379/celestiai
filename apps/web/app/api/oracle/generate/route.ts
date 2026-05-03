import { auth } from '@clerk/nextjs/server'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/oracle/prompts'
import { chartToPromptText } from '@/lib/oracle/chart-to-prompt'
import { stripSentinels } from '@/lib/oracle/planet-parser'
import type { ChartData } from '@stellaeum/astrology/client'
import type { ReadingTopic } from '@/lib/oracle/prompts'
import { logAuditEvent } from '@/lib/audit'

/**
 * POST /api/oracle/generate
 * Streams an AI-generated natal chart reading via Gemini.
 *
 * Flow (post 2026-04-20 premium-matrix cap-gate refactor):
 * 1. Auth check
 * 2. Parse & validate body (chartId, topic, regenerate)
 * 3. Upsert user row + read subscription tier
 * 4. Chart ownership verification
 * 5. Cache check - return cached reading without calling Gemini
 *    (cache hits do NOT count against the daily cap)
 * 6. Regeneration rate limit (once per day per chart-topic pair)
 * 7. Daily cap for free tier — Europe/Sofia calendar day, default 3
 *    readings/day, configurable via ORACLE_FREE_MESSAGES_PER_DAY env
 * 8. Load chart calculation data
 * 9. Build prompts from chart data
 * 10. Stream via OpenRouter / Llama
 * 11. onFinish: upsert completed reading into ai_readings
 */
export const maxDuration = 60
const LLAMA_MODEL = 'meta-llama/llama-3.3-70b-instruct'

/**
 * Daily cap for free-tier oracle readings. Premium tier removes the
 * cap entirely. Env override lets the cap change without a code
 * deploy once a production value is chosen.
 */
const ORACLE_FREE_MESSAGES_PER_DAY = Number(
  process.env.ORACLE_FREE_MESSAGES_PER_DAY ?? '3',
)

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const VALID_TOPICS: ReadingTopic[] = ['general', 'love', 'career', 'health']

/**
 * UTC ISO timestamp for the start of today's Europe/Sofia calendar
 * day. Used as the lower bound for counting readings against the
 * free-tier daily cap. Simpler to communicate to users than a
 * rolling 24-hour window.
 */
function sofiaDayStartUtcIso(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Sofia',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  )
  const h = parseInt(parts.hour, 10) % 24
  const m = parseInt(parts.minute, 10)
  const s = parseInt(parts.second, 10)
  const msSinceSofiaMidnight = ((h * 60 + m) * 60 + s) * 1000
  return new Date(now.getTime() - msSinceSofiaMidnight).toISOString()
}

export async function POST(req: Request) {
  // 1. Auth check
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    // 2. Parse and validate body
    const body = await req.json()
    const { chartId, topic, regenerate } = body as {
      chartId?: string
      topic?: string
      regenerate?: boolean
    }

    if (!chartId || typeof chartId !== 'string') {
      return Response.json({ error: 'Невалиден chartId' }, { status: 400 })
    }

    if (!topic || !VALID_TOPICS.includes(topic as ReadingTopic)) {
      return Response.json(
        { error: 'Невалидна тема. Допустими: general, love, career, health' },
        { status: 400 }
      )
    }

    const validatedTopic = topic as ReadingTopic
    const supabase = createServiceSupabaseClient()

    // 3. Upsert user row (default 'free'), read tier. Used for the
    //    cap check in step 7; no topic-level gate anymore.
    await supabase
      .from('users')
      .upsert(
        { clerk_id: userId, subscription_tier: 'free' },
        { onConflict: 'clerk_id', ignoreDuplicates: true },
      )
    const { data: userRow } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('clerk_id', userId)
      .single()
    const tier = userRow?.subscription_tier === 'premium' ? 'premium' : 'free'

    // 4. Chart ownership verification
    const { data: chart, error: chartError } = await supabase
      .from('charts')
      .select('id, user_id')
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      return Response.json({ error: 'Картата не е намерена' }, { status: 404 })
    }

    if (chart.user_id !== userId) {
      return Response.json({ error: 'Неоторизиран достъп' }, { status: 403 })
    }

    // 5. Cache check - return cached reading without calling Gemini
    const now = new Date().toISOString()
    const { data: existingReading } = await supabase
      .from('ai_readings')
      .select('id, content, generated_at, expires_at, last_regenerated_at')
      .eq('chart_id', chartId)
      .eq('topic', validatedTopic)
      .gt('expires_at', now)
      .single()

    if (existingReading && !regenerate) {
      return Response.json({
        content: existingReading.content,
        cached: true,
        generatedAt: existingReading.generated_at,
      })
    }

    // 6. Regeneration rate limit - once per day per chart-topic pair
    if (regenerate && existingReading?.last_regenerated_at) {
      const lastRegen = new Date(existingReading.last_regenerated_at)
      const hoursElapsed =
        (Date.now() - lastRegen.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed < 24) {
        return Response.json(
          { error: 'Можете да регенерирате веднъж на ден' },
          { status: 429 }
        )
      }
    }

    // 7. Daily cap for free tier. Europe/Sofia calendar day. Cache
    //    hits (step 5) skipped this branch already, so the count
    //    reflects actual generations the user triggered today.
    if (tier !== 'premium') {
      const sofiaDayStart = sofiaDayStartUtcIso()
      const { count } = await supabase
        .from('ai_readings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('generated_at', sofiaDayStart)

      if ((count ?? 0) >= ORACLE_FREE_MESSAGES_PER_DAY) {
        return Response.json(
          {
            error: `Достигна дневния лимит от ${ORACLE_FREE_MESSAGES_PER_DAY} четения. Премиум абонаментът премахва ограничението.`,
            code: 'CAP_REACHED',
            cap: ORACLE_FREE_MESSAGES_PER_DAY,
            tier,
          },
          { status: 429 },
        )
      }
    }

    // 8. Load chart calculation data
    const { data: calculation, error: calcError } = await supabase
      .from('chart_calculations')
      .select(
        'planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known'
      )
      .eq('chart_id', chartId)
      .single()

    if (calcError || !calculation) {
      return Response.json(
        { error: 'Натална карта не е изчислена. Моля, изчислете картата първо.' },
        { status: 404 }
      )
    }

    // 8. Build prompts
    const chartData: ChartData = {
      planets: calculation.planet_positions as ChartData['planets'],
      houses: calculation.house_cusps as ChartData['houses'],
      aspects: calculation.aspects as ChartData['aspects'],
      ascendant: calculation.ascendant as ChartData['ascendant'],
      mc: calculation.mc as ChartData['mc'],
      birthTimeKnown: calculation.birth_time_known,
    }

    const systemPrompt = buildSystemPrompt(validatedTopic)
    const chartPromptText = chartToPromptText(chartData)

    // 10. Stream via OpenRouter / meta-llama/llama-3.3-70b-instruct
    const result = streamText({
      model: openrouter(LLAMA_MODEL),
      system: systemPrompt,
      prompt: chartPromptText,
      temperature: 0.85,
      maxOutputTokens: 2000,

      // 10. onFinish: upsert completed reading into ai_readings
      onFinish: async ({ text }) => {
        try {
          const cleanContent = stripSentinels(text)
          const generatedAt = new Date()
          const expiresAt = new Date(generatedAt)
          expiresAt.setDate(expiresAt.getDate() + 7)

          await supabase.from('ai_readings').upsert(
            {
              chart_id: chartId,
              user_id: userId,
              topic: validatedTopic,
              content: cleanContent,
              generated_at: generatedAt.toISOString(),
              expires_at: expiresAt.toISOString(),
              last_regenerated_at: regenerate
                ? generatedAt.toISOString()
                : null,
              model_version: LLAMA_MODEL,
            },
            {
              onConflict: 'chart_id,topic',
            }
          )
        } catch (err) {
          // Log but don't fail - stream already returned to client
          console.error('[Oracle Generate] Failed to save reading:', err)
        }
      },
    })

    logAuditEvent(userId, 'data.ai_reading', { chartId, topic: validatedTopic })

    // Return streaming response - toTextStreamResponse() is the v6 API
    // useCompletion with streamProtocol: 'text' reads this format
    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[Oracle Generate] Unhandled error:', error)
    return Response.json(
      { error: 'Грешка при генериране на четенето' },
      { status: 500 }
    )
  }
}
