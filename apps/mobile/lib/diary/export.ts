import { Share } from 'react-native'

import type { ManifestEntry } from '@stellaeum/core/diary/types'
import { buildDiaryMarkdown } from '@stellaeum/core/diary/export'

/**
 * Mobile diary markdown export via react-native's built-in Share API.
 * No new dep (P.4-d Halt-trigger 5 ratification — Option A).
 *
 * Markdown payload passed as `message` to the native share sheet; user
 * routes to Mail / Notes / Files / Drive / etc. The receiving app gets
 * the markdown as plain text and can save / forward / format it.
 *
 * KNOWN LIMITATION: Android's Intent.EXTRA_TEXT has historical truncation
 * around 50-100KB. Filed as REVISIT-43 at P.4 close — trigger is post-
 * soft-launch when first user has >3 months of diary entries OR a support
 * ticket reports truncation. Mitigation path if confirmed: base64 data URL
 * or adopt expo-sharing.
 */
export async function shareDiaryMarkdown(
  entries: ManifestEntry[],
  now: Date = new Date(),
): Promise<void> {
  const markdown = buildDiaryMarkdown(entries, now)
  await Share.share({
    message: markdown,
    title: 'Лунен дневник',
  })
}
