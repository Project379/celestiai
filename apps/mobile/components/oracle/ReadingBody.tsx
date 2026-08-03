import { Text, View } from 'react-native'

import { stripSentinels } from '@stellaeum/core/oracle/planet-parser'

interface ReadingBodyProps {
  /** Raw LLM output (may contain [planet:KEY]…[/planet] sentinels) */
  content: string
  /** Cosmetic header date — when the reading was generated */
  generatedAt?: string
}

/**
 * Reading content renderer. Strips planet sentinels to plain text and
 * splits on double newline into paragraphs.
 *
 * Mirrors the saved-reading rendering block in apps/web/components/oracle/
 * OraclePanelGlobal.tsx (lines around 268-275). No streaming cursor — SR
 * 7 ships JSON-only via /api/oracle/generate?format=json (REVISIT-22 logs
 * the streaming + colored-sentinel polish).
 */
export function ReadingBody({ content, generatedAt }: ReadingBodyProps) {
  const paragraphs = stripSentinels(content)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <View>
      {generatedAt && (
        <Text className="mb-4 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          {formatGeneratedAt(generatedAt)}
        </Text>
      )}
      <View style={{ gap: 18 }}>
        {paragraphs.map((paragraph, index) => (
          <Text
            key={index}
            className="text-[15px] font-light leading-7 text-slate-300/90"
          >
            {paragraph}
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
