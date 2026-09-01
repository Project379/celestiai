import { Text, View } from 'react-native'

import type { CapReachedReason } from '@/hooks/useOracleReading'

interface CapReachedNoticeProps {
  cap: number
  reason?: CapReachedReason
}

/**
 * The Oracle conversion surface for the FREE tier (mobile).
 *
 * Frozen tier definition (2026-09-01): free gets ONE `general` reading for
 * the lifetime of the account; love/career/health and regenerate are
 * premium. Reached via the `code: 'CAP_REACHED'` 429 from
 * /api/oracle/generate, with `reason` in {free_used, premium_topic,
 * premium_regenerate} selecting the copy. `cap` retained for the legacy
 * monthly wording when `reason` is absent.
 *
 * NO CTA BUTTON: the mobile purchase path is the RevenueCat native
 * paywall, which is not built (its own halt-required batch). A button that
 * opened nothing, or bounced to web checkout, would be dead UX. Add the
 * CTA here when the RevenueCat paywall ships. Web's CapReachedNotice
 * already links to /pricing. Tracked in TIER-DEFINITION-2026-09-01.md
 * item 6.
 */
export function CapReachedNotice({ cap, reason }: CapReachedNoticeProps) {
  const copy = ((): { title: string; sub: string } => {
    switch (reason) {
      case 'premium_topic':
        return {
          title: 'Тази тема е част от Премиум.',
          sub: 'Безплатно получаваш едно четене за Личност. Премиум отваря Любов, Кариера и Здраве.',
        }
      case 'premium_regenerate':
        return {
          title: 'Повторното генериране е част от Премиум.',
          sub: 'С Премиум можеш да поискаш ново четене по всяко време.',
        }
      case 'free_used':
        return {
          title: 'Използва безплатното си четене от Оракула.',
          sub: 'Премиум отваря всички теми, повторното генериране и месечни четения.',
        }
      default:
        return {
          title: `Изчерпа ${cap} безплатни четения за момента.`,
          sub: 'Премиум премахва ограничението.',
        }
    }
  })()

  return (
    <View
      className="rounded-2xl border border-white/[0.05] bg-white/[0.015] px-7 py-8"
      accessibilityRole="text"
    >
      <View
        className="mb-4 flex-row items-center justify-center"
        style={{ gap: 12 }}
      >
        <View className="h-px flex-1 bg-bronze/30" style={{ maxWidth: 40 }} />
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
        <View className="h-px flex-1 bg-bronze/30" style={{ maxWidth: 40 }} />
      </View>

      <Text className="text-center text-[15px] font-light leading-7 text-slate-300/90">
        {copy.title}
      </Text>
      <Text className="mt-2 text-center text-[14px] font-light leading-7 text-slate-400">
        {copy.sub}
      </Text>
    </View>
  )
}
