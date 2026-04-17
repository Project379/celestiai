import { auth } from '@clerk/nextjs/server'
import type { Metadata } from 'next'
import { getCachedLatestChart } from '@/lib/supabase/queries'
import type { ChartRow } from '@/lib/types/chart'
import { StoriesContent } from '@/components/stories/StoriesContent'

export const metadata: Metadata = {
  title: 'Препоръки',
  description: 'Дневни и месечни препоръки за книги, филми и сериали, водени от лунната фаза и слънчевия ти знак.',
}

/**
 * Matches the Bulgarian sun sign mapping used on the dashboard. Duplicated
 * intentionally — two callers is not an abstraction; three would be.
 */
function getSunSign(birthDate: string): string {
  const d = new Date(birthDate)
  const m = d.getMonth() + 1
  const day = d.getDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'Овен'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'Телец'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'Близнаци'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'Рак'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'Лъв'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'Дева'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'Везни'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'Скорпион'
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'Стрелец'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'Козирог'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'Водолей'
  return 'Риби'
}

export default async function RecommendationsPage() {
  const { userId } = await auth()
  let sunSign: string | null = null
  if (userId) {
    try {
      const chart = (await getCachedLatestChart(userId)) as ChartRow | null
      if (chart?.birth_date) {
        sunSign = getSunSign(chart.birth_date)
      }
    } catch {
      // ignore — renders monthly-missing state
    }
  }

  return (
    <div className="px-4 pb-16 pt-8 sm:px-6">
      <StoriesContent sunSign={sunSign} />
    </div>
  )
}
