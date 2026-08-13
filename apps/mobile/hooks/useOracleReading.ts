import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as Haptics from 'expo-haptics'

import { ApiError, useApiClient } from '@/lib/api/client'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

export type OracleTopic = 'general' | 'love' | 'career' | 'health'

export interface SavedReading {
  topic: string
  content: string
  generatedAt: string
  expiresAt: string
  teaserContent: string | null
}

interface GenerateResponse {
  content: string
  cached?: boolean
  generatedAt: string
}

interface CapReachedError {
  kind: 'cap-reached'
  cap: number
}

interface GenericGenerationError {
  kind: 'generic'
  message: string
}

export type GenerationError = CapReachedError | GenericGenerationError

export interface CurrentReading {
  content: string
  generatedAt: string
  /** True when this came from a fresh /api/oracle/generate call this session */
  fresh: boolean
}

interface UseOracleReadingOptions {
  /**
   * Fires when a fresh /api/oracle/generate call succeeds for a topic
   * that did not have a saved reading. Does NOT fire on saved-reading
   * cache hits or cap-reached errors. Used by SR 8.3's push permission
   * trigger — the first-ever-successful-Oracle-reading event is the
   * deliberate moment to ask for push permission.
   */
  onFreshGeneration?: () => void
}

/**
 * Mobile hook for the Oracle screen.
 *
 * Mirrors apps/web/hooks/useOracleReading.ts behavior — list saved
 * readings on mount, generate on tap if none saved — but uses
 * /api/oracle/generate?format=json instead of the streaming protocol
 * (SR 7.0b adds the JSON branch; REVISIT-TRIGGERS item 20 logs the
 * mobile streaming polish).
 *
 * Cap-reached state is actively surfaced here. The /api/oracle/generate
 * endpoint returns 429 with body `{ code: 'CAP_REACHED', cap, tier }`
 * when a free-tier user has used up their daily allowance; we map that
 * to `generationError.kind === 'cap-reached'` so the screen can render
 * CapReachedNotice. Web currently fails silently on the same response —
 * see REVISIT-TRIGGERS for web parity follow-up.
 *
 * Pass null chartId to disable the saved-readings query (e.g. while
 * useFirstChart is still resolving).
 */
export function useOracleReading(
  chartId: string | null,
  options?: UseOracleReadingOptions,
) {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()
  const [activeTopic, setActiveTopic] = useState<OracleTopic | null>(null)
  const ffEnabled = useFeatureFlag('oracle')

  const savedReadingsKey = ['oracle-readings', chartId] as const

  const savedReadingsQuery = useQuery({
    queryKey: savedReadingsKey,
    enabled: !!chartId && ffEnabled,
    queryFn: async (): Promise<Record<string, SavedReading>> => {
      const raw = await apiFetch(
        `/api/oracle/readings?chartId=${encodeURIComponent(chartId!)}`,
      )
      const arr = (Array.isArray(raw) ? raw : []) as SavedReading[]
      const byTopic: Record<string, SavedReading> = {}
      for (const r of arr) byTopic[r.topic] = r
      return byTopic
    },
  })

  const generateMutation = useMutation({
    mutationFn: async (vars: {
      topic: OracleTopic
      regenerate?: boolean
    }): Promise<GenerateResponse> => {
      if (!chartId) throw new Error('Missing chartId')
      const raw = await apiFetch('/api/oracle/generate?format=json', {
        method: 'POST',
        body: JSON.stringify({
          chartId,
          topic: vars.topic,
          regenerate: vars.regenerate ?? false,
        }),
      })
      return raw as GenerateResponse
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: savedReadingsKey })
      options?.onFreshGeneration?.()
    },
    onError: (err) => {
      // Cap-reached is an expected, informational state (a soft limit,
      // not a failure) — reserve the error haptic for genuine generation
      // failures so it stays meaningful (Apple HIG: notification haptics
      // signal a completed/failed task, not routine limits).
      const isCapReached = err instanceof ApiError && err.status === 429
      if (!isCapReached) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    },
  })

  const generationError: GenerationError | null = (() => {
    const err = generateMutation.error
    if (!err) return null
    if (err instanceof ApiError && err.status === 429) {
      const body = err.body as
        | { code?: string; cap?: number }
        | null
      if (body?.code === 'CAP_REACHED') {
        return { kind: 'cap-reached', cap: body.cap ?? 3 }
      }
    }
    return {
      kind: 'generic',
      message: 'Грешка при генериране на четенето',
    }
  })()

  const savedReadings = savedReadingsQuery.data ?? {}
  const activeSaved = activeTopic ? savedReadings[activeTopic] : null
  const freshContent =
    generateMutation.data && generateMutation.variables?.topic === activeTopic
      ? generateMutation.data
      : null

  const currentReading: CurrentReading | null = freshContent
    ? {
        content: freshContent.content,
        generatedAt: freshContent.generatedAt,
        fresh: !freshContent.cached,
      }
    : activeSaved
      ? {
          content: activeSaved.content,
          generatedAt: activeSaved.generatedAt,
          fresh: false,
        }
      : null

  // Mirrors web's canRegenerate (apps/web/components/oracle/
  // OraclePanelGlobal.tsx) — a saved reading exists AND at least 24h have
  // passed since it was generated. Ported 2026-08-13, Batch 2.
  const activeSavedForRegenerate = activeTopic ? savedReadingsQuery.data?.[activeTopic] : null
  const canRegenerate = (() => {
    if (!activeTopic || !activeSavedForRegenerate) return false
    const lastGeneratedAt = activeSavedForRegenerate.generatedAt
    if (!lastGeneratedAt) return true
    const hoursSince = (Date.now() - new Date(lastGeneratedAt).getTime()) / (1000 * 60 * 60)
    return hoursSince >= 24
  })()

  const regenerate = () => {
    if (!activeTopic || !canRegenerate) return
    generateMutation.mutate({ topic: activeTopic, regenerate: true })
  }

  const selectTopic = (topic: OracleTopic) => {
    setActiveTopic(topic)
    generateMutation.reset()
    if (savedReadings[topic]) {
      // Saved reading exists — render it directly, no API call.
      return
    }
    if (!ffEnabled) {
      // Kill switch is off; do not fire the AI generation call. Saved
      // readings (if any) still render; new generations no-op.
      return
    }
    generateMutation.mutate({ topic, regenerate: false })
  }

  const clearActiveTopic = () => {
    setActiveTopic(null)
    generateMutation.reset()
  }

  return {
    savedReadings,
    isLoadingSavedReadings: savedReadingsQuery.isLoading,
    savedReadingsError: savedReadingsQuery.error,
    activeTopic,
    selectTopic,
    clearActiveTopic,
    isGenerating: generateMutation.isPending,
    generationError,
    currentReading,
    canRegenerate,
    regenerate,
  }
}
