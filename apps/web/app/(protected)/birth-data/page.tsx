import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { BirthDataWizard } from '@/components/birth-data/BirthDataWizard'

export const metadata: Metadata = {
  title: 'Рождени данни - Celestia AI',
  description: 'Въведи данните си за раждане за точни астрологични изчисления',
}

export default async function BirthDataPage() {
  const { userId } = await auth()

  let hasChart = false
  if (userId) {
    try {
      const supabase = createServiceSupabaseClient()
      const { data } = await supabase
        .from('charts')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
      hasChart = !!data && data.length > 0
    } catch (error) {
      console.error('Error checking birth data:', error)
    }
  }

  if (hasChart) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 text-center sm:mb-12">
        <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
          Начало
        </p>
        <h1 className="font-display text-[2rem] leading-[1.15] tracking-tight sm:text-[2.5rem]">
          <span className="font-light text-slate-400">Въведи </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent">
            рождените си данни
          </span>
        </h1>
        <p className="mx-auto mt-3 max-w-md font-display text-[15px] font-light leading-relaxed text-slate-500">
          Точната дата, час и място определят всяко небесно влияние в картата ти.
        </p>
      </div>
      <BirthDataWizard />
    </div>
  )
}
