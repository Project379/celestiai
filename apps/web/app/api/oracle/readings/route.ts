import {
  requireAppUser,
  requireOwnedChart,
  toErrorResponse,
} from '@/lib/auth/guards'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET(req: Request) {
  try {
    const { userId } = await requireAppUser()
    const url = new URL(req.url)
    const chartId = url.searchParams.get('chartId')

    if (!chartId) {
      return Response.json({ error: 'Missing chartId' }, { status: 400 })
    }

    await requireOwnedChart(userId, chartId, 'id')

    const supabase = createServiceSupabaseClient()
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

    const result = (readings ?? []).map((r) => ({
      topic: r.topic,
      content: r.content,
      generatedAt: r.generated_at,
      expiresAt: r.expires_at,
      teaserContent: r.teaser_content,
    }))

    return Response.json(result)
  } catch (error) {
    return toErrorResponse(error, 'Грешка при обработка на заявката')
  }
}
