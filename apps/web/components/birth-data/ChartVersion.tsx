'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import {
  chartVersionChanged,
  clearAllHoroscopesInBrowser,
  clearChartHoroscopesInBrowser,
  shouldCheckVersion,
} from '@/lib/birth-data/chart-version'

/**
 * The active chart's identity + `birth_data_edited_at` marker, supplied by the
 * protected layout (server data). Hooks that cache anything derived from the
 * chart put `editedAt` in their cache key, so an edit — here or elsewhere —
 * moves every key at once. Default value (outside the provider) is "no chart".
 */
interface ChartVersion {
  chartId: string | null
  editedAt: string | null
}

const ChartVersionContext = createContext<ChartVersion>({ chartId: null, editedAt: null })

export function ChartVersionProvider({
  chartId,
  editedAt,
  children,
}: ChartVersion & { children: React.ReactNode }) {
  const value = useMemo(() => ({ chartId, editedAt }), [chartId, editedAt])
  return <ChartVersionContext.Provider value={value}>{children}</ChartVersionContext.Provider>
}

/** The marker to include in cache keys / effect deps for chart-derived data. */
export function useChartEditedAt(): string | null {
  return useContext(ChartVersionContext).editedAt
}

/**
 * Shared "the chart was just edited here" helper. Sweeps horoscope entries
 * cached under the old marker, then re-renders the server tree (router.refresh),
 * which re-reads the active chart, hands the NEW marker to the provider, and so
 * moves every chart-derived cache key. Server-rendered Кръг / crystals pages
 * recompute on that refresh (lazy recompute server-side).
 */
export function useInvalidateChartDerived(): () => void {
  const router = useRouter()
  const { chartId } = useContext(ChartVersionContext)
  return useCallback(() => {
    if (chartId) clearChartHoroscopesInBrowser(chartId)
    router.refresh()
  }, [router, chartId])
}

/**
 * Cross-device check (replaces "SWR never revalidates"): when the window regains
 * focus or the tab becomes visible, ask the server for the active chart's marker;
 * if it differs from the one this page rendered with, the chart was edited on
 * another device/tab — refresh, which moves every chart-derived cache key.
 * Throttled; failures are silent (a missed check just waits for the next focus).
 */
export function ChartVersionWatcher() {
  const router = useRouter()
  const known = useContext(ChartVersionContext)
  const lastChecked = useRef(0)
  const inFlight = useRef(false)

  const check = useCallback(async () => {
    if (inFlight.current || !shouldCheckVersion(lastChecked.current, Date.now())) return
    inFlight.current = true
    lastChecked.current = Date.now()
    try {
      const res = await fetch('/api/birth-data', { cache: 'no-store' })
      if (!res.ok) return
      const charts = (await res.json()) as Array<{ id: string; birth_data_edited_at: string }>
      const active = charts[0] ?? null // newest first == the active chart
      const latest = { chartId: active?.id ?? null, editedAt: active?.birth_data_edited_at ?? null }
      if (chartVersionChanged(known, latest)) router.refresh()
    } catch {
      // network hiccup — try again on the next focus
    } finally {
      inFlight.current = false
    }
  }, [known, router])

  useEffect(() => {
    const onFocus = () => void check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [check])

  return null
}

/**
 * Clears every cached `daily-horoscope:*` entry when the user is signed out, by
 * whatever path (logout dialog, expired session, another tab). A shared browser
 * must not keep one account's horoscope text for the next. Mounted in the root
 * layout so it exists on public pages too.
 */
export function SignOutCacheSweeper() {
  const { isLoaded, userId } = useAuth()
  useEffect(() => {
    if (isLoaded && !userId) clearAllHoroscopesInBrowser()
  }, [isLoaded, userId])
  return null
}
