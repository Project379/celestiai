'use client'

import { TopicCard, TOPIC_META, type OracleTopic } from './TopicCard'
import type { SavedReading } from '@/hooks/useOracleReading'

interface TopicCardsProps {
  activeTopic: string | null
  savedReadings: Record<string, SavedReading>
  onTopicSelect: (topic: OracleTopic) => void
  /**
   * Frozen tier definition (2026-09-01): free = one `general` reading for
   * the account lifetime. love / career / health are premium. When false,
   * those three cards render the padlock affordance. The padlock is a
   * hint only — tapping a locked card still calls /api/oracle/generate,
   * which returns `code: 'CAP_REACHED'` + `reason: 'premium_topic'` and
   * the panel shows the conversion surface. The server route is the gate.
   */
  isPremium: boolean
}

const ALL_TOPICS: OracleTopic[] = ['general', 'love', 'career', 'health']

/**
 * Grid of four Oracle topic cards: Личност, Любов, Кариера, Здраве.
 * `general` is always available; the other three are premium (shown
 * locked for free users, per the frozen tier definition).
 */
export function TopicCards({
  activeTopic,
  savedReadings,
  onTopicSelect,
  isPremium,
}: TopicCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ALL_TOPICS.map((topic) => {
        const { label, icon } = TOPIC_META[topic]
        const isActive = activeTopic === topic
        const hasSavedReading = Boolean(savedReadings[topic])
        // A previously-generated reading stays viewable even for a free
        // user whose access has since changed — don't lock a card that
        // has content behind it.
        const isLocked = !isPremium && topic !== 'general' && !hasSavedReading

        return (
          <TopicCard
            key={topic}
            topic={topic}
            label={label}
            icon={icon}
            isLocked={isLocked}
            isActive={isActive}
            hasSavedReading={hasSavedReading}
            onClick={() => onTopicSelect(topic)}
          />
        )
      })}
    </div>
  )
}
