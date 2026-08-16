import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { ManifestEntry } from '@stellaeum/core/diary/types'

import { pressFeedback } from '@/components/design-system/tokens'

interface ManifestHistoryProps {
  entries: ManifestEntry[]
  currentDate: string
}

const BG_DATE = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Лунен дневник · Предишни страници — collapsible past entries.
 * Mobile port of apps/web/components/manifest/ManifestHistory.tsx (P.4-c2).
 *
 * Each row: phase name eyebrow + date title + expand caret. Tap toggles
 * the row's expanded state; expanded body renders the three intentions
 * with Roman-numeral markers. No AnimatePresence height animation per
 * HT 8 (data-display screen).
 */
export function ManifestHistory({ entries, currentDate }: ManifestHistoryProps) {
  const past = entries.filter((e) => e.date !== currentDate)

  if (past.length === 0) {
    return (
      <Text className="text-[14px] font-light leading-[1.85] text-slate-400">
        Дневникът ти още е празен. Първата страница ще изглежда точно като празния лист преди новолуние.
      </Text>
    )
  }

  return (
    <View>
      {past.map((entry, idx) => (
        <HistoryItem key={entry.id} entry={entry} isFirst={idx === 0} />
      ))}
    </View>
  )
}

interface HistoryItemProps {
  entry: ManifestEntry
  isFirst: boolean
}

function HistoryItem({ entry, isFirst }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false)
  const formatted = BG_DATE.format(new Date(entry.date))

  return (
    <View className={`py-5 ${isFirst ? '' : 'border-t border-slate-300/[0.06]'}`}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="flex-row items-start justify-between"
        style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 16 })}
      >
        <View className="flex-1">
          <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-bronze/80">
            {entry.phaseName}
          </Text>
          <Text className="mt-1 font-cinzel text-[10.5px] font-medium uppercase tracking-[0.26em] text-slate-300">
            {formatted}
          </Text>
        </View>
        <Text
          className={`mt-1 font-cinzel text-[11px] text-slate-400 ${
            expanded ? 'rotate-180' : ''
          }`}
          style={{
            transform: [{ rotate: expanded ? '180deg' : '0deg' }],
          }}
        >
          ▾
        </Text>
      </Pressable>

      {expanded && (
        <View className="mt-4 border-t border-slate-300/[0.06] pt-4" style={{ gap: 12 }}>
          {entry.intentions.map((intention, i) => (
            <View key={i} className="flex-row" style={{ gap: 12 }}>
              <Text className="mt-1 font-cinzel text-[9px] font-semibold tracking-[0.25em] text-bronze/60">
                {['I', 'II', 'III'][i]}
              </Text>
              <Text className="flex-1 text-[14.5px] font-light leading-[1.8] text-slate-200/95">
                „{intention}“
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
