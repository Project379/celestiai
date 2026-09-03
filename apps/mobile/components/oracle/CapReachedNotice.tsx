import type { CapReachedReason } from '@/hooks/useOracleReading'
import { PremiumLock } from '@/components/tier/PremiumLock'
import { ORACLE_CAP_COPY, oracleCapLegacy } from '@/lib/tier/locked-copy'

interface CapReachedNoticeProps {
  cap: number
  reason?: CapReachedReason
}

/**
 * The Oracle conversion surface for the FREE tier (mobile). A thin caller
 * of the shared PremiumLock primitive (tier item 5) — maps the server's
 * `reason` to the copy branch in @/lib/tier/locked-copy. Wording unchanged
 * from the two founder review passes.
 *
 * NO CTA: PremiumLock renders no button unless given one, and this surface
 * deliberately gives none — the mobile purchase path is the RevenueCat
 * native paywall, which does not exist.
 *
 * STELLAEUM_PLACEHOLDER: PAYWALL-MOBILE — the missing CTA here is the
 * visible edge of it: no RevenueCat native paywall exists, so there is no
 * subscribe path anywhere in the mobile app. See .planning/PLACEHOLDERS.md.
 */
export function CapReachedNotice({ cap, reason }: CapReachedNoticeProps) {
  const copy = reason ? ORACLE_CAP_COPY[reason] : oracleCapLegacy(cap)

  return <PremiumLock title={copy.title} sub={copy.sub} />
}
