import { auth } from '@clerk/nextjs/server'
import { createPublicSupabaseClient } from '@/lib/supabase/public'
import { toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit, getRequestIp } from '@/lib/rate-limit'

/**
 * City search API endpoint
 * Returns Bulgarian cities matching the search query
 *
 * SEC-17: Protected with auth() check returning JSON 401 for unauthenticated requests
 * Note: Uses public Supabase client since cities are public reference data
 */

export async function GET(request: Request) {
  // Check authentication - return JSON error if not authenticated (SEC-17)
  const { userId } = await auth()
  if (!userId) {
    return Response.json(
      { error: 'Сесията ти изтече. Влез отново.' },
      { status: 401 }
    )
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limitParam = searchParams.get('limit')
  const limit = limitParam ? parseInt(limitParam, 10) : 20

  // Validate query
  if (!query || query.length < 1) {
    return Response.json(
      { error: 'Въведи поне 1 символ' },
      { status: 400 }
    )
  }

  if (query.length > 100) {
    return Response.json(
      { error: 'Заявката е твърде дълга' },
      { status: 400 }
    )
  }

  try {
    await assertRateLimit({
      key: `cities-search:${userId}:${getRequestIp(request)}`,
      limit: 60,
      windowMs: 60_000,
    })

    const supabase = createPublicSupabaseClient()

    // Search cities by name (Bulgarian) or name_ascii (Latin) using ILIKE
    const { data, error } = await supabase
      .from('bulgarian_cities')
      .select('id, name, oblast, type, latitude, longitude')
      .or(`name.ilike.%${query}%,name_ascii.ilike.%${query}%`)
      .order('type', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('City search error:', error)
      return Response.json(
        { error: 'Грешка при търсене' },
        { status: 500 }
      )
    }

    // Re-sort to ensure proper type ordering (city > town > village)
    const typeOrder: Record<string, number> = { city: 0, town: 1, village: 2 }
    const sortedData = [...(data || [])].sort((a, b) => {
      const typeComparison = (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3)
      if (typeComparison !== 0) return typeComparison
      return a.name.localeCompare(b.name, 'bg')
    })

    return Response.json(sortedData, {
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    return toErrorResponse(error, 'Вътрешна грешка')
  }
}
