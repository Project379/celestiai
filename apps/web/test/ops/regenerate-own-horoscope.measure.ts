/**
 * ONE-OFF, founder-requested (2026-10-09): regenerate the founder's OWN horoscope for today
 * with the Днес v2 prompt, so the new screen can be reviewed with real new-format text.
 * NOT part of check:all. Makes live Gemini calls and writes ONE row (the given account's chart
 * for today) in production daily_horoscopes. It writes nothing else.
 *
 *   OWN_CLERK_ID=user_... pnpm --filter @stellaeum/web run measure:own-horoscope
 *
 * The old content is saved to OWN_BACKUP (default: next to this file's run, printed) first.
 * It runs the same pieces as POST /api/horoscope/generate (transits, prompt builder, validator,
 * retry note) with the v2 prompt forced on, WITHOUT turning FF_DNES_V2_SERVER on anywhere.
 */
import { writeFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import type { PlanetPosition } from '@stellaeum/astrology/client'
import { calculateDailyTransits, calculateTransitAspects } from '@stellaeum/astrology'

import { ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'
import { GEMINI_THINKING_LEVEL, generateFinalText } from '@/lib/ai/generate-final-text'
import { validateReading } from '@/lib/ai/validate-reading'
import { buildDnesV2Prompt } from '@/lib/horoscope/prompts'
import { buildTransitOverview } from '@/lib/horoscope/transit-analysis'
import { buildHoroscopePlaceholderValues, transitAndNatalToPromptText } from '@/lib/horoscope/transit-to-prompt'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

describe('regenerate own horoscope (one-off)', () => {
  it('replaces today\'s row for OWN_CLERK_ID with a v2 reading', async () => {
    const userId = process.env.OWN_CLERK_ID
    if (!userId) throw new Error('Set OWN_CLERK_ID')
    const supabase = createServiceSupabaseClient()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Sofia' }).format(new Date())

    const { data: chart } = await supabase.from('charts').select('id, user_id').eq('user_id', userId).limit(1).single()
    if (!chart) throw new Error('No chart for that account')

    const { data: old } = await supabase.from('daily_horoscopes').select('content').eq('chart_id', chart.id).eq('date', today).maybeSingle()
    if (old?.content) {
      const backup = process.env.OWN_BACKUP ?? 'horoscope-backup.txt'
      writeFileSync(backup, old.content, 'utf8')
      console.info('[old row saved to]', backup, `(${old.content.length} chars)`)
    }

    const { data: calculation } = await supabase
      .from('chart_calculations')
      .select('planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known')
      .eq('chart_id', chart.id)
      .single()
    if (!calculation) throw new Error('No chart calculation')

    const transitPlanets = calculateDailyTransits(new Date()).planets as Omit<PlanetPosition, 'house'>[]
    const transitAspects = calculateTransitAspects({ date: today, planets: transitPlanets }, calculation.planet_positions as PlanetPosition[])
    const overview = buildTransitOverview(calculation, new Date())
    const promptText = transitAndNatalToPromptText(transitPlanets, calculation, transitAspects, overview)
    const values = buildHoroscopePlaceholderValues(transitPlanets, calculation, transitAspects)

    let note = ''
    // Like the route: a reading valid in every way but a little short is served if every try only failed on length.
    let shortButValid: { content: string; text: string; model: string } | null = null
    for (let attempt = 1; attempt <= 5; attempt++) {
      const { model, text } = await generateFinalText({
        system: buildDnesV2Prompt(),
        prompt: promptText + note,
        maxOutputTokens: 3000,
        fallbackModel: ORACLE_FALLBACK_MODEL,
        thinkingLevel: GEMINI_THINKING_LEVEL.horoscope,
      })
      const v = validateReading(text, values, { minWords: 15, maxWords: 45, threeShortParts: true })
      if (!v.ok) {
        console.info(`[attempt ${attempt}] rejected: ${v.code}: ${v.detail}`)
        console.info(text.split(/\r?\n/).filter(Boolean).join(' / '))
        shortButValid = v.code === 'PART_TOO_SHORT' && v.content ? { content: v.content, text: v.text ?? '', model } : null
        note = `\n\nYour previous answer was rejected: ${v.detail} Write exactly 3 paragraphs separated by one blank line, each ONE sentence of 8 to 10 words (54 to 62 characters, about 58), with no digits, and Слънцето/Луната with the article when they are the subject.`
        continue
      }
      const { error } = await supabase
        .from('daily_horoscopes')
        .upsert(
          { chart_id: chart.id, user_id: userId, date: today, content: v.content, model_version: model, generated_at: new Date().toISOString() },
          { onConflict: 'chart_id,date' },
        )
      if (error) throw new Error(`save failed: ${error.message}`)
      console.info(`[saved] attempt ${attempt}, model ${model}\n${v.text}`)
      return
    }
    if (shortButValid) {
      const { error } = await supabase
        .from('daily_horoscopes')
        .upsert(
          { chart_id: chart.id, user_id: userId, date: today, content: shortButValid.content, model_version: shortButValid.model, generated_at: new Date().toISOString() },
          { onConflict: 'chart_id,date' },
        )
      if (error) throw new Error(`save failed: ${error.message}`)
      console.info(`[saved short-but-valid] model ${shortButValid.model}
${shortButValid.text}`)
      return
    }
    throw new Error('No valid reading after 5 attempts; the old row is untouched')
  })
})
