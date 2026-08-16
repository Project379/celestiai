import { Text, View } from 'react-native'

interface CapReachedNoticeProps {
  cap: number
}

/**
 * Free-tier monthly-cap surface for the Oracle screen.
 *
 * Text-only notice with no CTA — RevenueCat isn't wired yet and Stripe
 * is web-only, so a button that opens nothing or web checkout would be
 * dead UX (founder ratification, SR 7). Web parity ported in B.0f-2-fix-1
 * (apps/web/components/oracle/CapReachedNotice.tsx) — REVISIT-23 closed.
 *
 * Bulgarian copy unified across web and mobile per B.0f-2-fix-1
 * Variant 2 ratification (2026-05-10):
 *  - Verb-first «Изчерпа…» reads naturally when the time frame isn't
 *    the topic; «за този месец» trailing matches the new monthly cap
 *    (subscription_quotas, B.0f-1).
 *  - «идния месец» is slightly literary; fits the oracle voice paired
 *    with «Звездите ще говорят».
 *  - «безплатни» hints at premium without selling it.
 *  - No transactional CTA — the upgrade path lands when RevenueCat ships
 *    in P.15.
 */
export function CapReachedNotice({ cap }: CapReachedNoticeProps) {
  return (
    <View
      className="rounded-2xl border border-white/[0.05] bg-white/[0.015] px-7 py-8"
      accessibilityRole="text"
    >
      <View
        className="mb-4 flex-row items-center justify-center"
        style={{ gap: 12 }}
      >
        <View
          className="h-px flex-1 bg-bronze/30"
          style={{ maxWidth: 40 }}
        />
        <View
          className="h-1 w-1 bg-bronze/80"
          style={{
            transform: [{ rotate: '45deg' }],
            shadowColor: 'rgb(184, 118, 62)',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 8,
          }}
        />
        <View
          className="h-px flex-1 bg-bronze/30"
          style={{ maxWidth: 40 }}
        />
      </View>

      <Text className="text-center text-[15px] font-light leading-7 text-slate-300/90">
        Изчерпа {cap} безплатни четения за този месец.
      </Text>
      <Text className="mt-2 text-center text-[14px] font-light leading-7 text-slate-400">
        Звездите ще говорят отново идния месец.
      </Text>
    </View>
  )
}
