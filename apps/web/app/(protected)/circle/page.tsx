import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { CircleHub } from '@/components/circle/CircleHub'
import { getCircleDashboardData } from '@/lib/circle/service'

export const metadata: Metadata = {
  title: 'Кръг',
  description: 'Споделена астрологична връзка, синстрия и compatibility профил за двама.',
}

export default async function CirclePage() {
  const { userId } = await auth()
  const data = userId ? await getCircleDashboardData(userId) : null

  if (!data) {
    return null
  }

  return <CircleHub data={data} />
}
