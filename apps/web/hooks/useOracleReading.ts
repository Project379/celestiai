'use client'

import { useCompletion } from '@ai-sdk/react'
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
 * useOracleReading
 *
 * Client hook that drives the AI reading experience:
 * - Streams a reading via POST /api/oracle/generate using useCompletion
 * - Manages saved readings fetched from GET /api/oracle/readings
 * - Tracks which topic is currently being generated or viewed
 * - Auto-refreshes saved readings when generation completes
 *
 * @param chartId - The chart UUID to generate readings for
 */
export function useOracleReading(chartId: string) {
  const [savedReadings, setSavedReadings] = useState<
    Record<string, SavedReading>
  >({})
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Track previous isLoading to detect transition from true -> false
  const wasLoadingRef = useRef(false)

  const { completion, isLoading, error, stop, complete, setCompletion } =
    useCompletion({
      api: '/api/oracle/generate',
      // Use 'text' protocol to match toTextStreamResponse() on the server
      // AI SDK v6 removed the 'data' stream protocol for useCompletion
      streamProtocol: 'text',
    })

  /**
   * Fetches all saved readings for this chart from the server.
   * Updates savedReadings state as a map keyed by topic.
   */
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

  // Auto-refresh saved readings when generation completes (isLoading: true -> false)
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      // Generation just finished — refresh saved readings from DB
      void fetchSavedReadings()
    }
    wasLoadingRef.current = isLoading
  }, [isLoading, fetchSavedReadings])

  /**
   * Initiates generation of an AI reading for the given topic.
   * Sets the active topic and calls the streaming API.
   *
   * @param topic - Reading topic: 'general' | 'love' | 'career' | 'health'
   * @param regenerate - If true, bypasses cache and regenerates (rate limited to once/day)
   */
  const generateReading = useCallback(
    async (topic: string, regenerate = false) => {
      setActiveTopic(topic)
      setCompletion('')

      try {
        await complete('', {
          body: { chartId, topic, regenerate },
        })
      } catch {
        // Error is surfaced via the `error` state from useCompletion
      }
    },
    [chartId, complete, setCompletion]
  )

  return {
    /** Streaming text from the current generation (resets each call) */
    completion,
    /** True while generation is in progress */
    isLoading,
    /** Error from the streaming API, if any */
    error,
    /** Stop the current generation stream */
    stop,
    /** Saved readings indexed by topic */
    savedReadings,
    /** The topic currently being generated or viewed */
    activeTopic,
    /** Manually set the active topic without triggering generation */
    setActiveTopic,
    /** Error from fetching saved readings, if any */
    fetchError,
    /** Trigger a manual refresh of saved readings from the server */
    fetchSavedReadings,
    /** Generate or regenerate a reading for the given topic */
    generateReading,
  }
}
