import { auth } from '@clerk/nextjs/server'
import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { chartToPromptText } from '@/lib/oracle/chart-to-prompt'
import type { ChartData } from '@celestia/astrology/client'
import type { ReadingTopic } from '@/lib/oracle/prompts'

/**
 * POST /api/oracle/teaser
 * Generates and caches a short mystical preview for a locked topic.
 *
 * Used to show free-tier users a teaser of what they would unlock.
 * Teasers are cached in teaser_content on the ai_readings row.
 * If the row doesn't exist yet, an empty-content row is created to
 * hold the teaser.
 */

const VALID_TOPICS: ReadingTopic[] = ['general', 'love', 'career', 'health']
const LLAMA_MODEL = 'meta-llama/llama-3.3-70b-instruct'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

export async function POST(req: Request) {
  // Auth check
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { chartId, topic } = body as {
      chartId?: string
      topic?: string
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

    // Verify chart ownership
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

    // Check if teaser already exists — return cached if so
    const { data: existingReading } = await supabase
      .from('ai_readings')
      .select('teaser_content')
      .eq('chart_id', chartId)
      .eq('topic', validatedTopic)
      .single()

    if (existingReading?.teaser_content) {
      return Response.json({ teaserContent: existingReading.teaser_content })
    }

    // Load chart calculation for context
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

    const chartData: ChartData = {
      planets: calculation.planet_positions as ChartData['planets'],
      houses: calculation.house_cusps as ChartData['houses'],
      aspects: calculation.aspects as ChartData['aspects'],
      ascendant: calculation.ascendant as ChartData['ascendant'],
      mc: calculation.mc as ChartData['mc'],
      birthTimeKnown: calculation.birth_time_known,
    }

    const chartPromptText = chartToPromptText(chartData)

    // Generate short teaser with Gemini (non-streaming)
    const topicNameBg =
      validatedTopic === 'general'
        ? 'общ живот'
        : validatedTopic === 'love'
          ? 'любов и отношения'
          : validatedTopic === 'career'
            ? 'кариера и призвание'
            : 'здраве и жизнена сила'

    const { text: teaserText } = await generateText({
      model: openrouter(LLAMA_MODEL),
      system: `Ти си Celestia — мистичен астрологически оракул. Пишеш интригуващи, поетични прогнози на български.`,
      prompt: `Напиши 2-3 изречения на български като мистично астрологическо предзнаменование за "${topicNameBg}" за тази натална карта. Бъди примамлив и загадъчен, но не разкривай конкретни детайли. Целта е да събудиш любопитство.

${chartPromptText}`,
      temperature: 0.9,
      maxOutputTokens: 200,
    })

    // Upsert teaser into ai_readings (create row if needed)
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + 7)

    await supabase.from('ai_readings').upsert(
      {
        chart_id: chartId,
        user_id: userId,
        topic: validatedTopic,
        content: '', // Empty — teaser row, full content not generated yet
        teaser_content: teaserText,
        generated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        model_version: LLAMA_MODEL,
      },
      {
        onConflict: 'chart_id,topic',
        // Only update teaser_content — don't overwrite existing content
        ignoreDuplicates: false,
      }
    )

    return Response.json({ teaserContent: teaserText })
  } catch (error) {
    console.error('[Oracle Teaser] Unhandled error:', error)
    return Response.json(
      { error: 'Грешка при генериране на предварителен преглед' },
      { status: 500 }
    )
  }
}
