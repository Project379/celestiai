import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

import { useApiClient } from '@/lib/api/client'

function replaceRecommendation(
  overview: RecommendationsOverview,
  recommendation: PersonalizedRecommendation,
): RecommendationsOverview {
  return recommendation.slot === 'daily_movie'
    ? { ...overview, dailyMovie: recommendation }
    : { ...overview, monthlyBook: recommendation }
}

export function useRecommendations(chartId: string | null | undefined) {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()
  const queryKey = ['media-recommendations', chartId ?? null] as const

  const query = useQuery({
    queryKey,
    enabled: chartId !== undefined,
    queryFn: async () => {
      const suffix = chartId ? `?chartId=${encodeURIComponent(chartId)}` : ''
      return RecommendationsOverviewSchema.parse(await apiFetch(`/api/recommendations${suffix}`))
    },
  })

  const feedback = useMutation({
    mutationFn: async (input: {
      recommendation: PersonalizedRecommendation
      status: RecommendationStatus
      sentiment?: RecommendationSentiment | null
    }) => {
      const parsed = RecommendationFeedbackResponseSchema.parse(await apiFetch(
        '/api/recommendations/feedback',
        {
          method: 'POST',
          body: JSON.stringify({
            deliveryId: input.recommendation.deliveryId,
            status: input.status,
            sentiment: input.sentiment,
          }),
        },
      ))
      return { input, parsed }
    },
    onSuccess: ({ input, parsed }) => {
      queryClient.setQueryData<RecommendationsOverview>(queryKey, (current) =>
        current
          ? replaceRecommendation(current, {
              ...input.recommendation,
              status: parsed.status,
              sentiment: parsed.sentiment,
            })
          : current,
      )
    },
  })

  const rerollMutation = useMutation({
    mutationFn: async (input: {
      recommendation: PersonalizedRecommendation
      reason: RecommendationRerollReason
    }) => PersonalizedRecommendationSchema.parse(await apiFetch(
      '/api/recommendations/reroll',
      {
        method: 'POST',
        body: JSON.stringify({
          deliveryId: input.recommendation.deliveryId,
          reason: input.reason,
        }),
      },
    )),
    onSuccess: (replacement) => {
      queryClient.setQueryData<RecommendationsOverview>(queryKey, (current) =>
        current ? replaceRecommendation(current, replacement) : current,
      )
    },
  })

  const setFeedback = useCallback((
    recommendation: PersonalizedRecommendation,
    status: RecommendationStatus,
    sentiment?: RecommendationSentiment | null,
  ) => feedback.mutateAsync({ recommendation, status, sentiment }).catch(() => undefined), [feedback])

  const reroll = useCallback((
    recommendation: PersonalizedRecommendation,
    reason: RecommendationRerollReason,
  ) => rerollMutation.mutateAsync({ recommendation, reason }).catch(() => undefined), [rerollMutation])

  return {
    ...query,
    isLoading: chartId === undefined || query.isLoading,
    error: query.error ?? feedback.error ?? rerollMutation.error,
    setFeedback,
    reroll,
    mutatingDeliveryId:
      (feedback.isPending ? feedback.variables?.recommendation.deliveryId : null)
      ?? (rerollMutation.isPending ? rerollMutation.variables?.recommendation.deliveryId : null)
      ?? null,
    isMutating: feedback.isPending || rerollMutation.isPending,
  }
}
