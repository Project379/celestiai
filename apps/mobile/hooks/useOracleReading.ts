import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { ApiError, useApiClient } from '@/lib/api/client'

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
export function useOracleReading(chartId: string | null) {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()
  const [activeTopic, setActiveTopic] = useState<OracleTopic | null>(null)

  const savedReadingsKey = ['oracle-readings', chartId] as const

  const savedReadingsQuery = useQuery({
    queryKey: savedReadingsKey,
    enabled: !!chartId,
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

  const selectTopic = (topic: OracleTopic) => {
    setActiveTopic(topic)
    generateMutation.reset()
    if (savedReadings[topic]) {
      // Saved reading exists — render it directly, no API call.
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
  }
}
