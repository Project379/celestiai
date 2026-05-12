import { Text, View } from 'react-native'

import type { ManifestEntry } from '@stellaeum/core/diary/types'

interface ManifestHistoryProps {
  entries: ManifestEntry[]
  currentDate: string
}

/**
 * STUB — full implementation lands at P.4-c2 (Halt-trigger 4 split).
 * Keeps ManifestDiaryContent's import resolvable + TS green at P.4-c1.
 */
export function ManifestHistory(_props: ManifestHistoryProps) {
  return (
    <View>
      <Text className="text-[13px] text-slate-500">
        Дневникът зарежда предишните страници…
      </Text>
    </View>
  )
}
