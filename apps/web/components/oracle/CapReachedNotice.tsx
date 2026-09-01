import type { CapReachedReason } from '@/hooks/useOracleReading'
import { PremiumLock } from '@/components/tier/PremiumLock'
import { ORACLE_CAP_COPY, oracleCapLegacy } from '@/lib/tier/locked-copy'

interface CapReachedNoticeProps {
  cap: number
  reason?: CapReachedReason
}

/**
 * The Oracle conversion surface for the FREE tier. A thin caller of the
 * shared PremiumLock primitive (tier item 5) — it only maps the server's
 * `reason` to the right copy branch:
 *   - free_used            — the one free reading is spent
 *   - premium_topic        — a free user tapped love / career / health
 *   - premium_regenerate   — a free user hit "Ново четене"
 *   - (no reason)          — legacy monthly-cap wording, keyed off `cap`
 *
 * The reason-branched wording lives in @/lib/tier/locked-copy
 * (ORACLE_CAP_COPY / oracleCapLegacy) and is unchanged from the two
 * founder review passes — see scripts/i18n/check-bg-lint-baseline.mjs.
 */
export function CapReachedNotice({ cap, reason }: CapReachedNoticeProps) {
  const copy = reason ? ORACLE_CAP_COPY[reason] : oracleCapLegacy(cap)

  return <PremiumLock title={copy.title} sub={copy.sub} />
}
