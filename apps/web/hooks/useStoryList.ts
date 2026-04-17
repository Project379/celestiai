'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  RecommendationStatus,
  UserRecommendationState,
} from '@/lib/stories/types'

const STORAGE_KEY = 'celestia.stories.state.v1'

/**
 * Backend-swap boundary. Today: localStorage. Tomorrow: Supabase.
 * The UI reads a map keyed by recommendation id; the backend will return
 * the same shape.
 */
export function useStoryList() {
  const [state, setState] = useState<Record<string, UserRecommendationState>>({})
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, UserRecommendationState>
        if (parsed && typeof parsed === 'object') setState(parsed)
      }
    } catch {
      // corrupted — ignore
    }
    setIsLoaded(true)
  }, [])

  const persist = (next: Record<string, UserRecommendationState>) => {
    setState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // quota — silent
    }
  }

  const setStatus = useCallback(
    (id: string, status: RecommendationStatus) => {
      persist({
        ...state,
        [id]: { id, status, updatedAt: new Date().toISOString() },
      })
    },
    [state],
  )

  const getStatus = useCallback(
    (id: string): RecommendationStatus => state[id]?.status ?? 'new',
    [state],
  )

  return { state, isLoaded, setStatus, getStatus }
}
