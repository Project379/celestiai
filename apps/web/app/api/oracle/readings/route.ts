import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * GET /api/oracle/readings?chartId=<uuid>
 * Returns all non-expired AI readings for a given chart.
 *
 * Requires authentication. Returns empty array if no readings exist
 * (not 404) — callers use this to decide whether to prompt generation.
 */
export async function GET(req: Request) {
  // Auth check
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const chartId = url.searchParams.get('chartId')

    if (!chartId) {
      return Response.json({ error: 'Липсва chartId параметър' }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()

    // Verify chart ownership before returning readings
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

    // Fetch all non-expired readings for this chart
    const now = new Date().toISOString()
    const { data: readings, error: readingsError } = await supabase
      .from('ai_readings')
      .select('topic, content, generated_at, expires_at, teaser_content')
      .eq('chart_id', chartId)
      .gt('expires_at', now)

    if (readingsError) {
      console.error('[Oracle Readings] Failed to fetch readings:', readingsError)
      return Response.json(
        { error: 'Грешка при извличане на четенията' },
        { status: 500 }
      )
    }

    // Return array (empty if no readings exist)
    const result = (readings ?? []).map((r) => ({
      topic: r.topic,
      content: r.content,
      generatedAt: r.generated_at,
      expiresAt: r.expires_at,
      teaserContent: r.teaser_content,
    }))

    return Response.json(result)
  } catch (error) {
    console.error('[Oracle Readings] Unhandled error:', error)
    return Response.json(
      { error: 'Грешка при обработка на заявката' },
      { status: 500 }
    )
  }
}
