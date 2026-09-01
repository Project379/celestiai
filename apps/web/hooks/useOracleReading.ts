'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Shape of a saved AI reading returned from GET /api/oracle/readings
 */
export interface SavedReading {
  topic: string
  content: string
  generatedAt: string
  expiresAt: string
  teaserContent: string | null
}

/**
 * `reason` (frozen tier definition 2026-09-01) tells the conversion
 * surface which copy to show. Absent = the legacy monthly-cap wording.
 * `free_used` = the one free lifetime reading is spent; `premium_topic` =
 * love/career/health tapped by a free user; `premium_regenerate` = a free
 * user hit the regenerate button.
 */
export type CapReachedReason =
  | 'free_used'
  | 'premium_topic'
  | 'premium_regenerate'

interface CapReachedError {
  kind: 'cap-reached'
  cap: number
  reason?: CapReachedReason
}

interface GenericGenerationError {
  kind: 'generic'
  message: string
}

export type GenerationError = CapReachedError | GenericGenerationError

/**
 * useOracleReading
 *
 * Client hook driving the Oracle reading experience on web. Mirrors
 * apps/mobile/hooks/useOracleReading.ts in shape — manual fetch +
 * structured generationError mapping — so the cap-reached 429 from
 * /api/oracle/generate ({ code: 'CAP_REACHED', cap }) flows through
 * to a typed `generationError.kind === 'cap-reached'` that the panel
 * renders via <CapReachedNotice />.
 *
 * Replaces the prior @ai-sdk/react useCompletion path (B.0f-2-fix-1
 * 2026-05-10) — useCompletion's error.message format depends on the
 * SDK version and isn't reliably parseable for structured 429 bodies,
 * so we read the response status manually and switch between JSON
 * (error path) and ReadableStream (success path) based on status.
 *
 * @param chartId - The chart UUID to generate readings for
 */
export function useOracleReading(chartId: string) {
  const [savedReadings, setSavedReadings] = useState<
    Record<string, SavedReading>
  >({})
  const [activeTopic, setActiveTopicState] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [completion, setCompletion] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [generationError, setGenerationError] = useState<GenerationError | null>(
    null,
  )

  const abortRef = useRef<AbortController | null>(null)
  const wasLoadingRef = useRef(false)

  /**
   * Auto-clears generationError on topic transitions so the cap-reached
   * notice for topic A doesn't leak into topic B's saved-reading view.
   * Existing behavior of setActiveTopic preserved aside from this.
   */
  const setActiveTopic = useCallback((topic: string | null) => {
    setActiveTopicState(topic)
    setGenerationError(null)
  }, [])

  const fetchSavedReadings = useCallback(async () => {
    if (!chartId) return

    try {
      setFetchError(null)
      const res = await fetch(
        `/api/oracle/readings?chartId=${encodeURIComponent(chartId)}`
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFetchError(data.error ?? 'Грешка при зареждане на четенията')
        return
      }

      const readings: SavedReading[] = await res.json()
      const byTopic: Record<string, SavedReading> = {}
      for (const reading of readings) {
        byTopic[reading.topic] = reading
      }
      setSavedReadings(byTopic)
    } catch {
      setFetchError('Грешка при зареждане на четенията')
    }
  }, [chartId])

  // Fetch saved readings on mount
  useEffect(() => {
    void fetchSavedReadings()
  }, [fetchSavedReadings])

  // Auto-refresh saved readings when generation completes (true → false)
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      void fetchSavedReadings()
    }
    wasLoadingRef.current = isLoading
  }, [isLoading, fetchSavedReadings])

  /**
   * Aborts any in-flight stream. Stops the loading spinner without
   * surfacing the abort as an error.
   */
  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsLoading(false)
  }, [])

  /**
   * Initiates generation of an AI reading for the given topic. Manual
   * fetch + ReadableStream pattern — non-200 responses are parsed as
   * JSON for structured error mapping (cap-reached vs generic), 200
   * responses are consumed chunk-by-chunk into the completion state.
   *
   * @param topic - Reading topic: 'general' | 'love' | 'career' | 'health'
   * @param regenerate - If true, bypasses cache + cap (rate-limited 24h/topic)
   */
  const generateReading = useCallback(
    async (topic: string, regenerate = false) => {
      // Cancel any in-flight stream before starting a new one.
      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller

      setActiveTopicState(topic)
      setCompletion('')
      setGenerationError(null)
      setIsLoading(true)

      try {
        const res = await fetch('/api/oracle/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId, topic, regenerate }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          if (res.status === 429 && data?.code === 'CAP_REACHED') {
            setGenerationError({
              kind: 'cap-reached',
              cap: typeof data.cap === 'number' ? data.cap : 3,
              reason: data?.reason as CapReachedReason | undefined,
            })
          } else {
            setGenerationError({
              kind: 'generic',
              message:
                typeof data?.error === 'string'
                  ? data.error
                  : 'Грешка при генериране на четенето',
            })
          }
          return
        }

        if (!res.body) {
          throw new Error('Empty response body from /api/oracle/generate')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        // ReadableStream consumer — mirrors useCompletion's text-protocol
        // streaming behavior so ReadingStream renders chunk-by-chunk.
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          setCompletion(accumulated)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User clicked stop — don't surface as a user-facing error.
          return
        }
        console.error('[useOracleReading] generation failed:', err)
        setGenerationError({
          kind: 'generic',
          message: 'Грешка при генериране на четенето',
        })
      } finally {
        setIsLoading(false)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [chartId],
  )

  return {
    /** Streaming text from the current generation (resets each call) */
    completion,
    /** True while generation is in progress */
    isLoading,
    /** Structured generation error: cap-reached or generic */
    generationError,
    /** Stop the current generation stream */
    stop,
    /** Saved readings indexed by topic */
    savedReadings,
    /** The topic currently being generated or viewed */
    activeTopic,
    /** Manually set the active topic; auto-clears generationError */
    setActiveTopic,
    /** Error from fetching saved readings, if any */
    fetchError,
    /** Trigger a manual refresh of saved readings from the server */
    fetchSavedReadings,
    /** Generate or regenerate a reading for the given topic */
    generateReading,
  }
}
