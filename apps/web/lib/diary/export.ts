import type { ManifestEntry } from '@stellaeum/core/diary/types'
import {
  buildDiaryFilename,
  buildDiaryMarkdown,
} from '@stellaeum/core/diary/export'

/**
 * Web wrapper around @stellaeum/core/diary/export's platform-agnostic
 * markdown builders. Web-specific surface = browser file download via
 * Blob + URL.createObjectURL + temporary anchor click. Mobile uses
 * react-native's built-in Share API (apps/mobile/lib/diary/export.ts).
 *
 * The builders themselves (buildDiaryMarkdown, buildDiaryFilename) live
 * in core so both surfaces emit identical markdown — P.4-d lift per
 * D1 mirror discipline.
 */
export function downloadDiaryMarkdown(
  entries: ManifestEntry[],
  now: Date,
): void {
  const markdown = buildDiaryMarkdown(entries, now)
  const filename = buildDiaryFilename(now)
  const blob = new Blob([markdown], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Re-export for consumers that imported buildDiaryMarkdown/Filename from
// this module pre-P.4-d. Direct consumption from @stellaeum/core/diary/
// export is preferred going forward.
export { buildDiaryMarkdown, buildDiaryFilename }
