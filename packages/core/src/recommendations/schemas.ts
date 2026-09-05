import { z } from 'zod'

export const RecommendationMediaTypeSchema = z.enum(['movie', 'book'])
export const RecommendationSlotSchema = z.enum(['daily_movie', 'monthly_book'])
export const RecommendationStatusSchema = z.enum(['new', 'saved', 'consumed'])
export const RecommendationSentimentSchema = z.enum(['liked', 'okay', 'disliked'])
export const RecommendationRerollReasonSchema = z.enum([
  'already_consumed',
  'not_interested',
  'not_now',
])

export const RecommendationImageSchema = z.object({
  url: z.url(),
  alt: z.string(),
  attribution: z.string().nullable(),
})

export const RecommendationWorkSchema = z.object({
  id: z.uuid(),
  mediaType: RecommendationMediaTypeSchema,
  title: z.string(),
  originalTitle: z.string().nullable(),
  creator: z.string(),
  year: z.number().int().nullable(),
  description: z.string(),
  tagline: z.string(),
  durationMinutes: z.number().int().positive().nullable(),
  pages: z.number().int().positive().nullable(),
  genres: z.array(z.string()),
  image: RecommendationImageSchema.nullable(),
  sourceUrl: z.url().nullable(),
})

export const RecommendationExplanationSchema = z.object({
  howItConnects: z.string(),
  whyNow: z.string(),
  whatItGives: z.string(),
})

export const PersonalizedRecommendationSchema = z.object({
  deliveryId: z.uuid(),
  slot: RecommendationSlotSchema,
  periodKey: z.string(),
  rerollsRemaining: z.number().int().min(0).max(1),
  work: RecommendationWorkSchema,
  status: RecommendationStatusSchema,
  sentiment: RecommendationSentimentSchema.nullable(),
  explanation: RecommendationExplanationSchema,
  /**
   * Tier item 4: true when this slot's `explanation` was withheld server-side
   * for a free-tier user (see getRecommendationsOverview). The client's own
   * `locked` prop on RecommendationCard is a rendering hint only — this is
   * the field that reflects what the server actually sent.
   */
  locked: z.boolean(),
})

export const RecommendationsOverviewSchema = z.object({
  dailyMovie: PersonalizedRecommendationSchema.nullable(),
  monthlyBook: PersonalizedRecommendationSchema.nullable(),
  generatedAt: z.iso.datetime(),
  personalization: z.object({
    sunSign: z.string().nullable(),
    lunarPhase: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
})

export const RecommendationFeedbackRequestSchema = z
  .object({
    deliveryId: z.uuid(),
    status: RecommendationStatusSchema,
    sentiment: RecommendationSentimentSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.sentiment != null && value.status !== 'consumed') {
      context.addIssue({
        code: 'custom',
        path: ['sentiment'],
        message: 'Sentiment can only be set for consumed works.',
      })
    }
  })

export const RecommendationRerollRequestSchema = z.object({
  deliveryId: z.uuid(),
  reason: RecommendationRerollReasonSchema,
})

export const RecommendationFeedbackResponseSchema = z.object({
  workId: z.uuid(),
  status: RecommendationStatusSchema,
  sentiment: RecommendationSentimentSchema.nullable(),
})

export type RecommendationMediaType = z.infer<typeof RecommendationMediaTypeSchema>
export type RecommendationSlot = z.infer<typeof RecommendationSlotSchema>
export type RecommendationStatus = z.infer<typeof RecommendationStatusSchema>
export type RecommendationSentiment = z.infer<typeof RecommendationSentimentSchema>
export type RecommendationRerollReason = z.infer<typeof RecommendationRerollReasonSchema>
export type RecommendationWork = z.infer<typeof RecommendationWorkSchema>
export type RecommendationExplanation = z.infer<typeof RecommendationExplanationSchema>
export type PersonalizedRecommendation = z.infer<typeof PersonalizedRecommendationSchema>
export type RecommendationsOverview = z.infer<typeof RecommendationsOverviewSchema>
export type RecommendationFeedbackRequest = z.infer<typeof RecommendationFeedbackRequestSchema>
export type RecommendationRerollRequest = z.infer<typeof RecommendationRerollRequestSchema>
export type RecommendationFeedbackResponse = z.infer<typeof RecommendationFeedbackResponseSchema>

