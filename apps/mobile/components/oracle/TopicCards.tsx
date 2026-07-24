import { Pressable, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { pressFeedback } from '@/components/design-system/tokens'
import type { OracleTopic, SavedReading } from '@/hooks/useOracleReading'

/**
 * Mobile port of apps/web/components/oracle/TopicCards.tsx (post 2026-04-20
 * cap-gate refactor: all topics unlocked for all authed users; the daily
 * cap is enforced server-side at /api/oracle/generate). 2×2 grid mirrors
 * the <640px breakpoint layout web users see on phones.
 *
 * Topic icons port web's solid-fill SVG glyphs from TopicCard.tsx
 * TOPIC_META, rendered via react-native-svg. Bulgarian labels mirror
 * web verbatim.
 */

interface TopicMeta {
  label: string
  iconPaths: { d: string; fillRule?: 'evenodd' | 'nonzero' }[]
  /** ViewBox is fixed at 0 0 20 20 to match web's source paths. */
}

const TOPIC_META: Record<OracleTopic, TopicMeta> = {
  general: {
    label: 'Личност',
    iconPaths: [
      {
        d: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z',
      },
    ],
  },
  love: {
    label: 'Любов',
    iconPaths: [
      {
        d: 'M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z',
        fillRule: 'evenodd',
      },
    ],
  },
  career: {
    label: 'Кариера',
    iconPaths: [
      {
        d: 'M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z',
        fillRule: 'evenodd',
      },
      { d: 'M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z' },
    ],
  },
  health: {
    label: 'Здраве',
    iconPaths: [
      {
        d: 'M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z',
        fillRule: 'evenodd',
      },
    ],
  },
}

const ALL_TOPICS: OracleTopic[] = ['general', 'love', 'career', 'health']

interface TopicCardProps {
  topic: OracleTopic
  isActive: boolean
  hasSavedReading: boolean
  onPress: () => void
}

function TopicCard({ topic, isActive, hasSavedReading, onPress }: TopicCardProps) {
  const meta = TOPIC_META[topic]
  const iconColor = isActive ? '#fde68a' : 'rgba(196, 181, 253, 0.85)'

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${meta.label}${hasSavedReading ? ' (записано)' : ''}`}
      style={({ pressed }) => ({
        ...pressFeedback(pressed),
        flex: 1,
        ...(isActive && {
          shadowColor: 'rgb(167, 139, 250)',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 6,
        }),
      })}
      className={`relative items-center justify-center rounded-2xl border px-4 py-5 ${
        isActive
          ? 'border-amber-300/45 bg-violet-stellaeum/[0.08]'
          : 'border-white/[0.06] bg-white/[0.015]'
      }`}
    >
      {isActive && (
        <View
          className="absolute h-1 w-1 bg-amber-300/80"
          style={{
            top: 12,
            left: 12,
            transform: [{ rotate: '45deg' }],
            shadowColor: 'rgb(251, 191, 36)',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 6,
          }}
        />
      )}

      <View
        className="h-9 w-9 items-center justify-center"
        style={{ marginBottom: 10 }}
      >
        <Svg width={20} height={20} viewBox="0 0 20 20">
          {meta.iconPaths.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              fill={iconColor}
              fillRule={p.fillRule ?? 'nonzero'}
            />
          ))}
        </Svg>
      </View>

      <Text
        className={`font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] ${
          isActive ? 'text-white' : 'text-slate-400'
        }`}
      >
        {meta.label}
      </Text>

      {hasSavedReading && !isActive && (
        <View
          className="absolute h-1 w-1 bg-amber-300/85"
          style={{
            top: 10,
            right: 10,
            transform: [{ rotate: '45deg' }],
            shadowColor: 'rgb(251, 191, 36)',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.55,
            shadowRadius: 5,
          }}
        />
      )}
    </Pressable>
  )
}

interface TopicCardsProps {
  activeTopic: OracleTopic | null
  savedReadings: Record<string, SavedReading>
  onTopicSelect: (topic: OracleTopic) => void
}

export function TopicCards({
  activeTopic,
  savedReadings,
  onTopicSelect,
}: TopicCardsProps) {
  const rows: OracleTopic[][] = [
    [ALL_TOPICS[0], ALL_TOPICS[1]],
    [ALL_TOPICS[2], ALL_TOPICS[3]],
  ]

  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={{ gap: 12, flexDirection: 'row' }}>
          {row.map((topic) => (
            <TopicCard
              key={topic}
              topic={topic}
              isActive={activeTopic === topic}
              hasSavedReading={Boolean(savedReadings[topic])}
              onPress={() => onTopicSelect(topic)}
            />
          ))}
        </View>
      ))}
    </View>
  )
}
