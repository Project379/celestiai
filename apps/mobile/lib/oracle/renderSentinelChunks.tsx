import { Text } from 'react-native'

import type { parseSentinels } from '@stellaeum/core/oracle/planet-parser'
import { color, font } from '@/components/design-system/tokens'

export type SentinelChunk = ReturnType<typeof parseSentinels>[number]

/**
 * Shared sentinel-chunk renderer — planet mentions render Medium weight in
 * bronze, matching the pattern already shipped on Днес
 * (app/(authed)/(tabs)/index.tsx). Lifted here 2026-08-13 (Batch 2, Oracle
 * parity polish) so Oracle's ReadingBody reuses the exact same treatment
 * instead of reimplementing it — web's own Oracle ReadingStream.tsx does
 * NOT render colored sentinels (checked before porting: it only strips
 * them for cross-highlight detection), so this is mobile reusing an
 * already-decided mobile pattern in a second location, not a web port.
 */
export function renderSentinelChunks(chunks: SentinelChunk[]) {
  return chunks.map((chunk, j) =>
    chunk.planet ? (
      <Text key={j} style={{ color: color.bronzeText, fontFamily: font.bodyMedium }}>
        {chunk.text}
      </Text>
    ) : (
      chunk.text
    ),
  )
}
