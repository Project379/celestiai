import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

/**
 * City search API endpoint
 * Returns Bulgarian cities matching the search query
 *
 * SEC-17: Protected with auth.protect()
 */

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
})

export async function GET(request: Request) {
  // Protect route - returns 404 if not authenticated (SEC-17)
  await auth.protect()

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const parseResult = searchSchema.safeParse({
    q: searchParams.get('q'),
    limit: searchParams.get('limit'),
  })

  if (!parseResult.success) {
    return Response.json(
      { error: 'Invalid query parameters', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { q, limit } = parseResult.data

  try {
    const supabase = await createServerSupabaseClient()

    // Search cities by name (Bulgarian) or name_ascii (Latin) using ILIKE
    // Order: cities first, then towns, then villages, then alphabetically
    const { data, error } = await supabase
      .from('bulgarian_cities')
      .select('id, name, oblast, type, latitude, longitude')
      .or(`name.ilike.%${q}%,name_ascii.ilike.%${q}%`)
      .order('type', { ascending: true }) // 'city' < 'town' < 'village' alphabetically
      .order('name', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('City search error:', error)
      return Response.json(
        { error: 'Failed to search cities' },
        { status: 500 }
      )
    }

    // Re-sort to ensure proper type ordering (city > town > village)
    const typeOrder = { city: 0, town: 1, village: 2 }
    const sortedData = [...(data || [])].sort((a, b) => {
      const typeComparison =
        (typeOrder[a.type as keyof typeof typeOrder] ?? 3) -
        (typeOrder[b.type as keyof typeof typeOrder] ?? 3)
      if (typeComparison !== 0) return typeComparison
      return a.name.localeCompare(b.name, 'bg')
    })

    return Response.json(sortedData)
  } catch (error) {
    console.error('City search error:', error)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
