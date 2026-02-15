'use client'

import { TopicCard, TOPIC_META, type OracleTopic } from './TopicCard'
import type { SavedReading } from '@/hooks/useOracleReading'

interface TopicCardsProps {
  subscriptionTier: 'free' | 'premium'
  activeTopic: string | null
  savedReadings: Record<string, SavedReading>
  onTopicSelect: (topic: OracleTopic) => void
  onLockedTopicTap: (topic: OracleTopic) => void
}

const PREMIUM_TOPICS: OracleTopic[] = ['love', 'career', 'health']
const ALL_TOPICS: OracleTopic[] = ['general', 'love', 'career', 'health']

/**
 * Grid of four Oracle topic cards: Личност, Любов, Кариера, Здраве.
 *
 * Free tier: love/career/health show locked state.
 * Locked tap fires onLockedTopicTap instead of onTopicSelect.
 */
export function TopicCards({
  subscriptionTier,
  activeTopic,
  savedReadings,
  onTopicSelect,
  onLockedTopicTap,
}: TopicCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ALL_TOPICS.map((topic) => {
        const { label, icon } = TOPIC_META[topic]
        const isLocked =
          subscriptionTier === 'free' && PREMIUM_TOPICS.includes(topic)
        const isActive = activeTopic === topic
        const hasSavedReading = Boolean(savedReadings[topic])

        return (
          <TopicCard
            key={topic}
            topic={topic}
            label={label}
            icon={icon}
            isLocked={isLocked}
            isActive={isActive}
            hasSavedReading={hasSavedReading}
            onClick={() => {
              if (isLocked) {
                onLockedTopicTap(topic)
              } else {
                onTopicSelect(topic)
              }
            }}
          />
        )
      })}
    </div>
  )
}
