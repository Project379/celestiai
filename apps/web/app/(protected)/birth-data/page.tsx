import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { BirthDataWizard } from '@/components/birth-data/BirthDataWizard'

export const metadata: Metadata = {
  title: 'Рождени данни — Celestia AI',
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
    <div className="mx-auto max-w-4xl py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-100">
          Въведи данните си за раждане
        </h1>
        <p className="mt-2 text-slate-400">
          Тези данни са необходими за точните астрологични изчисления
        </p>
      </div>
      <BirthDataWizard />
    </div>
  )
}
