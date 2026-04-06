import { auth } from '@clerk/nextjs/server'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/oracle/prompts'
import { chartToPromptText } from '@/lib/oracle/chart-to-prompt'
import { stripSentinels } from '@/lib/oracle/planet-parser'
import type { ChartData } from '@celestia/astrology/client'
import type { ReadingTopic } from '@/lib/oracle/prompts'
import { logAuditEvent } from '@/lib/audit'

/**
 * POST /api/oracle/generate
 * Streams an AI-generated natal chart reading via Gemini.
 *
 * Flow:
 * 1. Auth check
 * 2. Parse & validate body (chartId, topic, regenerate)
 * 3. Subscription tier gate (premium topics require premium tier)
 * 4. Chart ownership verification
 * 5. Cache check — return cached reading without calling Gemini
 * 6. Regeneration rate limit (once per day per chart-topic pair)
 * 7. Load chart calculation data
 * 8. Build prompts from chart data
 * 9. Stream via Gemini gemini-2.5-flash
 * 10. onFinish: upsert completed reading into ai_readings
 */
export const maxDuration = 60
const LLAMA_MODEL = 'meta-llama/llama-3.3-70b-instruct'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

const VALID_TOPICS: ReadingTopic[] = ['general', 'love', 'career', 'health']
const PREMIUM_TOPICS: ReadingTopic[] = ['love', 'career', 'health']

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

    // 3. Subscription tier check — upsert user row if missing (default 'free')
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .upsert(
        { clerk_id: userId, subscription_tier: 'free' },
        { onConflict: 'clerk_id', ignoreDuplicates: true }
      )
      .select('subscription_tier')
      .single()

    if (userError || !userRow) {
      // Fallback: attempt plain select in case upsert returned nothing
      const { data: existingUser } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('clerk_id', userId)
        .single()

      const tier = existingUser?.subscription_tier ?? 'free'
      if (PREMIUM_TOPICS.includes(validatedTopic) && tier !== 'premium') {
        return Response.json(
          { error: 'Изисква се Premium абонамент', code: 'PREMIUM_REQUIRED' },
          { status: 403 }
        )
      }
    } else {
      const tier = userRow.subscription_tier
      if (PREMIUM_TOPICS.includes(validatedTopic) && tier !== 'premium') {
        return Response.json(
          { error: 'Изисква се Premium абонамент', code: 'PREMIUM_REQUIRED' },
          { status: 403 }
        )
      }
    }

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

    // 5. Cache check — return cached reading without calling Gemini
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

    // 6. Regeneration rate limit — once per day per chart-topic pair
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

    // 7. Load chart calculation data
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

    // 9. Stream via Gemini gemini-2.5-flash
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
          // Log but don't fail — stream already returned to client
          console.error('[Oracle Generate] Failed to save reading:', err)
        }
      },
    })

    logAuditEvent(userId, 'data.ai_reading', { chartId, topic: validatedTopic })

    // Return streaming response — toTextStreamResponse() is the v6 API
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
