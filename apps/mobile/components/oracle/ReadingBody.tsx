import { Text, View } from 'react-native'

import { parseSentinels } from '@stellaeum/core/oracle/planet-parser'
import { renderSentinelChunks } from '@/lib/oracle/renderSentinelChunks'

interface ReadingBodyProps {
  /** Raw LLM output (may contain [planet:KEY]…[/planet] sentinels) */
  content: string
  /** Cosmetic header date — when the reading was generated */
  generatedAt?: string
}

/**
 * Reading content renderer, split on double newline into paragraphs.
 *
 * Mirrors the saved-reading rendering block in apps/web/components/oracle/
 * OraclePanelGlobal.tsx. No streaming cursor — mobile ships JSON-only via
 * /api/oracle/generate?format=json; React Native's fetch has no
 * ReadableStream-body support (no polyfill installed in this app), so
 * porting web's streaming reader isn't a straightforward port — see
 * COMPLETION-TRACKER.md Batch 2 for why this stays unbuilt rather than
 * being force-fit.
 *
 * Planet-sentinel rendering (2026-08-13, Batch 2): switched from
 * stripSentinels (plain text) to parseSentinels + renderSentinelChunks,
 * the same bronze-highlight treatment already shipped on Днес
 * (index.tsx) — reused, not reimplemented. Note this is NOT a web port:
 * web's own ReadingStream.tsx strips sentinels too and never renders
 * per-planet color despite the parity doc's Section 6.2 claiming
 * otherwise (checked before porting, doc was stale on this point).
 */
export function ReadingBody({ content, generatedAt }: ReadingBodyProps) {
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => parseSentinels(p))

  return (
    <View>
      {generatedAt && (
        <Text className="mb-4 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {formatGeneratedAt(generatedAt)}
        </Text>
      )}
      <View style={{ gap: 18 }}>
        {paragraphs.map((chunks, index) => (
          <Text
            key={index}
            className="text-[15px] font-light leading-7 text-slate-300/90"
          >
            {renderSentinelChunks(chunks)}
          </Text>
        ))}
      </View>
    </View>
  )
}

/**
 * Format a generated-at ISO timestamp as a Bulgarian-locale long-form
 * date (e.g. «8 май 2026 г.»). Mirrors web's
 * `new Date(...).toLocaleDateString('bg-BG', { day, month, year })`
 * call in OraclePanelGlobal.tsx header.
 */
function formatGeneratedAt(iso: string): string {
  try {
    const fmt = new Intl.DateTimeFormat('bg-BG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    return fmt.format(new Date(iso))
  } catch {
    return ''
  }
}
