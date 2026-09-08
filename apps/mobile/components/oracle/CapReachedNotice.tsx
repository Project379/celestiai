import { useRouter } from 'expo-router'

import type { CapReachedReason } from '@/hooks/useOracleReading'
import { PremiumLock } from '@/components/tier/PremiumLock'
import { hapticSelect } from '@/lib/haptics'
import { ORACLE_CAP_COPY, oracleCapLegacy } from '@/lib/tier/locked-copy'
import { PAYWALL } from '@/lib/tier/subscription-copy'

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
 * CTA (Phase 2): "Отключи Премиум" → /you/premium, where the RevenueCat
 * paywall now lives. The server route stays the gate — this is just the
 * path to the purchase screen.
 */
export function CapReachedNotice({ cap, reason }: CapReachedNoticeProps) {
  const router = useRouter()
  const copy = reason ? ORACLE_CAP_COPY[reason] : oracleCapLegacy(cap)

  return (
    <PremiumLock
      title={copy.title}
      sub={copy.sub}
      cta={PAYWALL.unlockCta}
      onPressCta={() => {
        hapticSelect()
        router.push('/you/premium')
      }}
    />
  )
}
