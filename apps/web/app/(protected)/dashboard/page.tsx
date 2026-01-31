import { auth, currentUser } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { UserMenu } from '../../../components/auth/UserMenu'
import { SessionExpiryModal } from '../../../components/auth/SessionExpiryModal'
import { DashboardContent } from '../../../components/dashboard/DashboardContent'

interface ChartData {
  id: string
  name: string
  birth_date: string
  birth_time_known: boolean
  birth_time: string | null
  approximate_time_range: string | null
  city_name: string
  latitude: number
  longitude: number
  city_id: string | null
}

export default async function DashboardPage() {
  // Middleware already protects this route, but we get user info here
  const { userId } = await auth()
  const user = await currentUser()
  const firstName = user?.firstName || 'Потребител'

  // Fetch user's birth data
  let birthChart: ChartData | null = null
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from('charts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data) {
      birthChart = data as ChartData
    }
  } catch (error) {
    // No birth data or error fetching - birthChart stays null
    console.error('Error fetching birth chart:', error)
  }

  return (
    <>
      {/* Session expiry modal (client component) */}
      <SessionExpiryModal />

      {/* User menu in header slot */}
      <div className="fixed right-4 top-4 z-50 sm:right-8">
        <UserMenu />
      </div>

      {/* Dashboard content */}
      <DashboardContent
        firstName={firstName}
        userId={userId}
        initialBirthChart={birthChart}
      />
    </>
  )
}
