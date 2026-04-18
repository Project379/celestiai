'use client'

import { useEffect, useState } from 'react'
import { DashboardTile } from './DashboardTile'

interface TodayCrystalResponse {
  crystal: {
    name_bg: string | null
    name_en: string
    tagline_bg: string | null
    tagline_en: string
  }
}

/**
 * Днес bento tile — today's lunar-phase crystal. Lightweight fetch of
 * /api/crystals/today; taps through to /crystals for the full experience.
 */
export function CrystalTile() {
  const [data, setData] = useState<TodayCrystalResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/crystals/today')
        if (!res.ok) return
        const json = (await res.json()) as TodayCrystalResponse
        if (!cancelled) setData(json)
      } catch {
        /* silent — tile stays on placeholder */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const name = data?.crystal?.name_bg || data?.crystal?.name_en || '—'
  const tagline = data?.crystal?.tagline_bg || data?.crystal?.tagline_en || 'днешният камък'

  return (
    <DashboardTile
      href="/you/crystals"
      eyebrow="Кристал"
      title={name}
      hint={tagline}
      accent="amber"
    />
  )
}
