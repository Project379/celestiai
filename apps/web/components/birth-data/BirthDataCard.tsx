'use client'

import { useState } from 'react'
import { EditBirthDataDialog } from './EditBirthDataDialog'
import type { ChartRow } from '@/lib/types/chart'

interface BirthDataCardProps {
  chart: ChartRow
  onUpdate: () => void
}

const TIME_RANGE_LABELS: Record<string, string> = {
  morning: 'Сутрин (06:00-12:00)',
  afternoon: 'Следобед (12:00-18:00)',
  evening: 'Вечер (18:00-24:00)',
  night: 'Нощ (00:00-06:00)',
}

export function BirthDataCard({ chart, onUpdate }: BirthDataCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)

  // Format date for display (DD.MM.YYYY Bulgarian format)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}.${month}.${year}`
  }

  // Get time display
  const getTimeDisplay = () => {
    if (chart.birth_time_known && chart.birth_time) {
      return chart.birth_time
    }
    if (!chart.birth_time_known && chart.approximate_time_range) {
      return TIME_RANGE_LABELS[chart.approximate_time_range] || chart.approximate_time_range
    }
    return 'Неизвестно'
  }

  const handleEditClose = () => {
    setIsEditOpen(false)
  }

  const handleEditSuccess = () => {
    setIsEditOpen(false)
    onUpdate()
  }

  return (
    <>
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <svg
                className="h-5 w-5 text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-slate-200">{chart.name}</h3>
              <p className="text-xs text-slate-500">Данни за раждане</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            Редактирай
          </button>
        </div>

        {/* Birth data details */}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-400">Дата:</dt>
            <dd className="text-slate-200">{formatDate(chart.birth_date)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Час:</dt>
            <dd className="text-slate-200">{getTimeDisplay()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Място:</dt>
            <dd className="text-slate-200">{chart.city_name}</dd>
          </div>
        </dl>
      </div>

      {/* Edit dialog */}
      <EditBirthDataDialog
        isOpen={isEditOpen}
        onClose={handleEditClose}
        onSuccess={handleEditSuccess}
        chart={chart}
      />
    </>
  )
}
