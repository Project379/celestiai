import { auth } from '@clerk/nextjs/server'
import { buildRelationshipWeatherOverview } from '@/lib/circle/weather'
import { getSpaceById, listSpaceMembers } from '@/lib/circle/service'

export async function GET(
  _req: Request,
  context: { params: Promise<{ relationshipId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    const { relationshipId } = await context.params
    const [space, members] = await Promise.all([
      getSpaceById(relationshipId),
      listSpaceMembers(relationshipId),
    ])

    if (!space) {
      return Response.json({ error: 'Пространството не е намерено.' }, { status: 404 })
    }

    if (!members.some((member) => member.user_id === userId)) {
      return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 403 })
    }

    return Response.json(buildRelationshipWeatherOverview(space.composite_chart_data))
  } catch (error) {
    console.error('[Circle Weather] unhandled error:', error)
    return Response.json({ error: 'Не успяхме да заредим weather слоя.' }, { status: 500 })
  }
}
