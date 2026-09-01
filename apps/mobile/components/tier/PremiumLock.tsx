import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'

import { pressFeedback } from '@/components/design-system/tokens'

/**
 * The single free-tier locked-state primitive for mobile (tier item 5).
 * Mirrors apps/web/components/tier/PremiumLock.tsx.
 *
 * No CTA button by default: the mobile purchase path is the RevenueCat
 * native paywall, which does not exist (STELLAEUM_PLACEHOLDER: PAYWALL-MOBILE).
 * Surfaces that already route somewhere sensible (e.g. the crystals gate →
 * /you/premium management screen) pass `onPressCta` + `cta` explicitly.
 */

interface PremiumLockProps {
  title: string
  sub?: string
  cta?: string
  onPressCta?: () => void
  /** `panel` (default) is the bordered card; `bare` drops the chrome. */
  variant?: 'panel' | 'bare'
}

export function PremiumLock({ title, sub, cta, onPressCta, variant = 'panel' }: PremiumLockProps) {
  return (
    <View
      accessibilityRole="text"
      className={
        variant === 'panel'
          ? 'items-center rounded-2xl border border-white/[0.05] bg-white/[0.015] px-7 py-8'
          : 'items-center'
      }
    >
      <View className="mb-4 flex-row items-center justify-center" style={{ gap: 12 }}>
        <View className="h-px flex-1 bg-bronze/30" style={{ maxWidth: 40 }} />
        <LockBadge />
        <View className="h-px flex-1 bg-bronze/30" style={{ maxWidth: 40 }} />
      </View>

      <Text className="text-center text-[15px] font-light leading-7 text-slate-300/90">
        {title}
      </Text>
      {sub ? (
        <Text className="mt-2 text-center text-[14px] font-light leading-7 text-slate-400">
          {sub}
        </Text>
      ) : null}

      {cta && onPressCta ? (
        <Pressable
          onPress={onPressCta}
          className="mt-6 rounded-full border border-bronze/40 bg-bronze/15 px-7 py-3"
          style={({ pressed }) => pressFeedback(pressed)}
        >
          <Text className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-bronze-text">
            {cta}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/**
 * Neutral placeholder shown while the subscription tier is still loading —
 * the third state between "locked" and "unlocked". Callers pass `undefined`
 * for tier-in-flight and render this instead of a padlock or an action, so
 * a premium user never flashes a lock on their own screen.
 */
export function TierGateLoading({ variant = 'pill' }: { variant?: 'pill' | 'block' }) {
  if (variant === 'block') {
    return (
      <View className="items-center rounded-2xl border border-white/[0.05] bg-white/[0.015] px-7 py-8">
        <ActivityIndicator size="small" color="rgba(148, 163, 184, 0.7)" />
      </View>
    )
  }
  return (
    <View className="flex-row items-center rounded-full border border-white/10 bg-black/20 px-4 py-2">
      <ActivityIndicator size="small" color="rgba(148, 163, 184, 0.7)" />
    </View>
  )
}

/** Small padlock glyph — the locked affordance on a tile or list row. */
export function LockBadge({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={1.5} stroke="rgba(252, 211, 77, 0.8)" strokeWidth={1.6} />
      <Path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="rgba(252, 211, 77, 0.8)" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  )
}
