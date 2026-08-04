import type { ManifestEntry } from './types'

/**
 * Diary markdown export — platform-agnostic builders shared by web and
 * mobile. Lifted from apps/web/lib/diary/export.ts at P.4-d per the
 * D1 mirror discipline so both surfaces produce identical markdown.
 *
 * Format is stable and deliberately narrow — kept in sync with the
 * form's Roman-numeral intention numbering (romanize() in
 * ManifestEntryForm.tsx) and the history surface's date formatting
 * (ManifestHistory.tsx). The per-entry header uses U+00B7 MIDDLE DOT
 * as the separator — NOT U+2022 BULLET or U+2014 EM DASH. Similar-
 * looking codepoints render inconsistently across markdown consumers
 * (GitHub, VSCode preview, Obsidian, Bear, plain-text); the middot is
 * universally stable. Typed as an explicit escape here so it cannot
 * silently drift via copy-paste.
 *
 * UTF-8 BOM (U+FEFF) is prepended so Windows / Excel tooling treats
 * the file as UTF-8 on open. Constructed via String.fromCharCode(0xfeff)
 * rather than a literal invisible glyph — the glyph is zero-width and
 * can be silently stripped by editors / tooling; ASCII source that
 * evaluates to U+FEFF at runtime is immune to that class of drift.
 *
 * §8.6 refs: .planning/phases/08-diary-persistence/00-PLAN.md §8.6.
 */

const MIDDLE_DOT = '·'
const BOM = String.fromCharCode(0xfeff)

const BG_DATE_LONG = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/**
 * Format a Bulgarian long-form date, ensuring the "г." year suffix is
 * present. Standard bg-BG ICU output includes "г." on most runtimes
 * (e.g., "22 април 2026 г."), but normalise defensively so the export
 * register stays consistent even on environments that strip it.
 */
function formatBgLongDate(date: Date): string {
  const raw = BG_DATE_LONG.format(date)
  return raw.endsWith('г.') ? raw : `${raw} г.`
}

export function buildDiaryMarkdown(
  entries: ManifestEntry[],
  exportedAt: Date,
): string {
  const title = '# Лунен дневник'
  const exportLine = `Изтеглен на ${formatBgLongDate(exportedAt)}`

  const body = entries
    .map(entry => {
      const dateStr = formatBgLongDate(new Date(entry.date))
      const [i1, i2, i3] = entry.intentions
      return [
        '---',
        '',
        `## ${dateStr} ${MIDDLE_DOT} ${entry.phaseName}`,
        '',
        `I. ${i1}`,
        `II. ${i2}`,
        `III. ${i3}`,
        '',
      ].join('\n')
    })
    .join('\n')

  return `${BOM}${title}\n\n${exportLine}\n\n${body}`
}

/**
 * stellaeum-дневник-YYYY-MM-DD.md — YYYY-MM-DD is today's local calendar
 * day, consistent with isoDate() in ManifestDiaryContent per §A2 sealing
 * (user's lived day, not Europe/Sofia server time).
 */
export function buildDiaryFilename(today: Date): string {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `stellaeum-дневник-${y}-${m}-${d}.md`
}
