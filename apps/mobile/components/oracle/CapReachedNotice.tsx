import { Text, View } from 'react-native'

interface CapReachedNoticeProps {
  cap: number
}

/**
 * Free-tier daily-cap surface for the Oracle screen.
 *
 * Mobile-only — text-only notice with no CTA. RevenueCat isn't wired
 * yet and Stripe is web-only, so a button that opens nothing or web
 * checkout would be dead UX (founder ratification, SR 7). Web has dead
 * `LockedTopicTeaser` scaffolding that fails silently on the same 429
 * `CAP_REACHED` response — REVISIT-TRIGGERS logs web parity.
 *
 * Bulgarian copy calibrated via bulgarian-skill (mobile-only surface):
 *  - «четения» matches the established codebase term (server's existing
 *    429 message uses the same form).
 *  - Subject-dropped «Изчерпа…» is natural Bulgarian and stays in the
 *    ти register the rest of the app uses.
 *  - «безплатни» hints at premium without selling it.
 *  - «Звездите ще говорят отново утре» keeps the oracle voice without
 *    stapling on a transactional CTA.
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
          className="h-px flex-1 bg-amber-300/30"
          style={{ maxWidth: 40 }}
        />
        <View
          className="h-1 w-1 bg-amber-300/80"
          style={{
            transform: [{ rotate: '45deg' }],
            shadowColor: 'rgb(251, 191, 36)',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 8,
          }}
        />
        <View
          className="h-px flex-1 bg-amber-300/30"
          style={{ maxWidth: 40 }}
        />
      </View>

      <Text className="text-center text-[15px] font-light leading-7 text-slate-300/90">
        Днес изчерпа {cap} безплатни четения.
      </Text>
      <Text className="mt-2 text-center text-[14px] font-light leading-7 text-slate-400">
        Звездите ще говорят отново утре.
      </Text>
    </View>
  )
}
