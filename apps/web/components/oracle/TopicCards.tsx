'use client'

import { TopicCard, TOPIC_META, type OracleTopic } from './TopicCard'
import type { SavedReading } from '@/hooks/useOracleReading'

interface TopicCardsProps {
  activeTopic: string | null
  savedReadings: Record<string, SavedReading>
  onTopicSelect: (topic: OracleTopic) => void
}

const ALL_TOPICS: OracleTopic[] = ['general', 'love', 'career', 'health']

/**
 * Grid of four Oracle topic cards: Личност, Любов, Кариера, Здраве.
 *
 * All topics are available to any authed user. Free tier is gated by
 * a daily message cap (ORACLE_FREE_MESSAGES_PER_DAY, Europe/Sofia
 * calendar day), enforced server-side at /api/oracle/generate rather
 * than per-topic lock icons on the card grid. Cap-reached surfacing
 * happens in the generate flow, not here.
 */
export function TopicCards({
  activeTopic,
  savedReadings,
  onTopicSelect,
}: TopicCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ALL_TOPICS.map((topic) => {
        const { label, icon } = TOPIC_META[topic]
        const isActive = activeTopic === topic
        const hasSavedReading = Boolean(savedReadings[topic])

        return (
          <TopicCard
            key={topic}
            topic={topic}
            label={label}
            icon={icon}
            isLocked={false}
            isActive={isActive}
            hasSavedReading={hasSavedReading}
            onClick={() => onTopicSelect(topic)}
          />
        )
      })}
    </div>
  )
}
