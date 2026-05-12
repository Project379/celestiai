export type RecommendationKind = 'film' | 'book' | 'series' | 'episode' | 'story'

/**
 * One piece of content — a book, a film, a series, an episode, a short story.
 * The three "why" fields are the core of the feature and always render as
 * three labeled paragraphs.
 */
export interface Recommendation {
  id: string
  kind: RecommendationKind
  /** Bulgarian title (what the reader sees on the card). */
  title: string
  /** Widely-recognized English title (original for anglophone works, or
   *  established English translation for others — e.g. "Seven Samurai"). */
  titleEn?: string
  author: string
  year?: number
  durationMinutes?: number
  pages?: number

  /** Short editorial tagline — appears below the title. */
  tagline: string

  /** How this work connects to the user's current sky. */
  howItConnects: string
  /** Why engage with it now specifically. */
  whyNow: string
  /** What it will contribute to the day or month — the felt outcome. */
  whatItGives: string
}

/**
 * A month-long arc, bound to one sun sign. Pairs a book with a film or a
 * series with a book — two complementary pieces under a single theme.
 */
export interface MonthlyArc {
  id: string
  sunSign: string
  /** Short eyebrow theme, e.g. "Импулс и дисциплина". */
  theme: string
  /** One or two sentences framing the month's arc for this sign. */
  themeSummary: string
  /** The longer written piece — always a book. */
  primary: Recommendation
  /** The visual companion — a film or a series. */
  companion: Recommendation
}

export type RecommendationStatus = 'new' | 'saved' | 'consumed'

export interface UserRecommendationState {
  id: string
  status: RecommendationStatus
  updatedAt: string
}
