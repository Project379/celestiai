'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BirthDataWizard } from '@/components/birth-data'

interface ChartData {
  id: string
  name: string
  birth_date: string
}

export default function BirthDataPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    const checkExistingData = async () => {
      try {
        const response = await fetch('/api/birth-data')
        if (response.ok) {
          const data: ChartData[] = await response.json()
          if (data && data.length > 0) {
            // User already has birth data, redirect to dashboard
            setHasData(true)
            router.replace('/dashboard')
            return
          }
        }
      } catch (error) {
        console.error('Error checking birth data:', error)
      } finally {
        setLoading(false)
      }
    }

    checkExistingData()
  }, [router])

  if (loading || hasData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Зареждане...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-100">
          Въведете данните си за раждане
        </h1>
        <p className="mt-2 text-slate-400">
          Тези данни са необходими за точните астрологични изчисления
        </p>
      </div>

      {/* Wizard */}
      <BirthDataWizard />
    </div>
  )
}
