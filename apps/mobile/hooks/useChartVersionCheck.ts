import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import { chartVersionChanged, shouldCheckVersion } from '@stellaeum/core/charts/version'

import { useApiClient } from '@/lib/api/client'
import { invalidateChartDerived } from '@/lib/chartDerived'
import { useFirstChart } from '@/hooks/useFirstChart'

/**
 * Cross-device birth-data edit check (Batch 8 "b"). `staleTime: Infinity` means
 * an edit made on web — or on another phone — never reaches a mobile app that
 * already has the chart cached. When the app returns to the foreground, ask the
 * server for the active chart's `birth_data_edited_at`; if it differs from the
 * one this app is showing, run the shared invalidation (every chart-derived
 * query) — NOT a blanket refetch, which would re-hit horoscope/Oracle/Кръг on
 * every foreground for nothing.
 *
 * Throttled (30 s) and silent on failure: a missed check just waits for the
 * next foreground. Mounted once, in the authed layout.
 */
export function useChartVersionCheck(): void {
  const queryClient = useQueryClient()
  const { apiFetch } = useApiClient()
  const firstChart = useFirstChart()
  const lastChecked = useRef(0)
  const inFlight = useRef(false)

  // The marker this app is currently rendering with (null until the chart loads).
  const knownRef = useRef<{ chartId: string | null; editedAt: string | null }>({ chartId: null, editedAt: null })
  knownRef.current = {
    chartId: firstChart.data?.id ?? null,
    editedAt: firstChart.data?.birth_data_edited_at ?? null,
  }

  useEffect(() => {
    const check = async () => {
      if (inFlight.current || !shouldCheckVersion(lastChecked.current, Date.now())) return
      if (knownRef.current.chartId === null) return // nothing cached yet, nothing to go stale
      inFlight.current = true
      lastChecked.current = Date.now()
      try {
        const raw = await apiFetch('/api/birth-data')
        const first = Array.isArray(raw) && raw.length > 0 ? (raw[0] as { id?: unknown; birth_data_edited_at?: unknown }) : null
        const latest = {
          chartId: typeof first?.id === 'string' ? first.id : null,
          editedAt: typeof first?.birth_data_edited_at === 'string' ? first.birth_data_edited_at : null,
        }
        if (chartVersionChanged(knownRef.current, latest)) {
          await invalidateChartDerived(queryClient)
        }
      } catch {
        // offline / transient — try again on the next foreground
      } finally {
        inFlight.current = false
      }
    }

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check()
    })
    return () => subscription.remove()
  }, [apiFetch, queryClient])
}
