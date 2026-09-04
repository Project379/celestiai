'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PersonalizedRecommendationSchema,
  RecommendationFeedbackResponseSchema,
  RecommendationsOverviewSchema,
  type PersonalizedRecommendation,
  type RecommendationRerollReason,
  type RecommendationSentiment,
  type RecommendationStatus,
  type RecommendationsOverview,
} from '@stellaeum/core/recommendations/schemas'

function replaceRecommendation(
  overview: RecommendationsOverview,
  recommendation: PersonalizedRecommendation,
): RecommendationsOverview {
  return recommendation.slot === 'daily_movie'
    ? { ...overview, dailyMovie: recommendation }
    : { ...overview, monthlyBook: recommendation }
}

export function useRecommendations(chartId: string | null) {
  const [data, setData] = useState<RecommendationsOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [mutatingDeliveryId, setMutatingDeliveryId] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const query = chartId ? `?chartId=${encodeURIComponent(chartId)}` : ''
      const response = await fetch(`/api/recommendations${query}`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`Recommendations request failed (${response.status})`)
      setData(RecommendationsOverviewSchema.parse(await response.json()))
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)))
    } finally {
      setIsLoading(false)
    }
  }, [chartId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const setFeedback = useCallback(async (
    recommendation: PersonalizedRecommendation,
    status: RecommendationStatus,
    sentiment?: RecommendationSentiment | null,
  ) => {
    setMutatingDeliveryId(recommendation.deliveryId)
    setError(null)
    try {
      const response = await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId: recommendation.deliveryId, status, sentiment }),
      })
      if (!response.ok) throw new Error(`Feedback request failed (${response.status})`)
      const feedback = RecommendationFeedbackResponseSchema.parse(await response.json())
      setData((current) => current
        ? replaceRecommendation(current, {
            ...recommendation,
            status: feedback.status,
            sentiment: feedback.sentiment,
          })
        : current)
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)))
    } finally {
      setMutatingDeliveryId(null)
    }
  }, [])

  const reroll = useCallback(async (
    recommendation: PersonalizedRecommendation,
    reason: RecommendationRerollReason,
  ) => {
    setMutatingDeliveryId(recommendation.deliveryId)
    setError(null)
    try {
      const response = await fetch('/api/recommendations/reroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId: recommendation.deliveryId, reason }),
      })
      if (!response.ok) throw new Error(`Reroll request failed (${response.status})`)
      const replacement = PersonalizedRecommendationSchema.parse(await response.json())
      setData((current) => current ? replaceRecommendation(current, replacement) : current)
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)))
    } finally {
      setMutatingDeliveryId(null)
    }
  }, [])

  return { data, isLoading, error, mutatingDeliveryId, refetch, setFeedback, reroll }
}
