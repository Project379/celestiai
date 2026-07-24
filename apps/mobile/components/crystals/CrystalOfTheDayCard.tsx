import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { useCrystalOfTheDay } from '@/hooks/useCrystalOfTheDay'
import { useDailyReveal } from '@/hooks/useDailyReveal'
import { color, space } from '@/components/design-system/tokens'
import { usePressLift } from '@/components/design-system/usePressLift'
import { CrystalGem, type GemVariant } from './CrystalGem'

/**
 * Кристали hero — today's lunar-phase-driven crystal + streak badge.
 * Mobile port of apps/web/components/crystals/CrystalOfTheDayCard.tsx.
 * Web receives `initialData` from a Server Component; mobile has no SSR
 * equivalent so it calls useCrystalOfTheDay() directly (same hook the
 * dashboard CrystalCard tile already uses).
 *
 * Premium-pass proof surface (2026-07-24, MOBILE_ALPHA_REDESIGN.md §24)
 * — this was a static, unpressable `View` with its entry animation
 * explicitly dropped per HT8's data-display discipline. It's the
 * research's recommended proof because it's structurally a tarot pull
 * (a daily draw, concealed until disclosed) rather than a list item,
 * which is what justifies the narrow HT8 REVEAL exception it now uses
 * (see HANDOFF-2026-05-09.md) — a mechanic, not a frequency, argument.
 * Full treatment: Surface1 panel + hairline (§4.2/§1.3's existing
 * tonal-card recipe, no new decorated element), press-scale + lift via
 * the shared `usePressLift` (same primitive as CrystalGridTile), the
 * gem itself lifts and rotates off the same press progress (Balatro's
 * escalation pattern — card lifts, its content lifts further), a Rigid
 * impact haptic on release (the "arrived" moment), and a once-daily
 * reveal entrance keyed to the API's own `today` field via
 * `useDailyReveal` — verified not to re-fire on remount/nav-back within
 * the same day, which is the exact cost HT8 exists to prevent.
 */
export function CrystalOfTheDayCard() {
  const { data, isLoading } = useCrystalOfTheDay()
  const { liftStyle, onPressIn, onPressOut, progress } = usePressLift()
  const shouldReveal = useDailyReveal(data?.today)

  // Defaults to already-visible (1) so the far more common case — the
  // card has already revealed today, e.g. a remount from navigating
  // back — never flickers through a hidden frame first. Only the
  // genuine once-a-day reveal explicitly resets to 0 before animating.
  const revealProgress = useSharedValue(1)
  useEffect(() => {
    if (shouldReveal) {
      revealProgress.value = 0
      revealProgress.value = withTiming(1, {
        duration: 500,
        easing: Easing.bezier(0.22, 0.68, 0.35, 1),
      })
    }
  }, [shouldReveal, revealProgress])

  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [
      { translateY: interpolate(revealProgress.value, [0, 1], [10, 0]) },
      { scale: interpolate(revealProgress.value, [0, 1], [0.97, 1]) },
    ],
  }))

  const gemStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.06]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, -3])}deg` },
    ],
  }))

  const handlePressOut = () => {
    onPressOut()
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
  }

  if (!data) {
    return (
      <View
        style={{
          borderRadius: 16,
          backgroundColor: color.surface1,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          paddingHorizontal: space.xl,
          paddingVertical: space['2xl'],
        }}
      >
        <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
          Камък на деня
        </Text>
        <Text className="mt-3 text-[14px] font-light text-slate-500">
          {isLoading ? 'Призоваваме камъка...' : 'В момента не можем да призовем камъка.'}
        </Text>
      </View>
    )
  }

  const { crystal, streak, isPremium, collectedToday } = data
  const description =
    crystal.description_bg ?? crystal.description_en.split('. ').slice(0, 2).join('. ') + '.'

  return (
    <Animated.View style={revealStyle}>
      <Pressable onPressIn={onPressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            {
              borderRadius: 16,
              backgroundColor: color.surface1,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              paddingHorizontal: space.xl,
              paddingVertical: space['2xl'],
            },
            liftStyle,
          ]}
        >
          <View className="mb-5 flex-row items-center justify-between" style={{ gap: 12 }}>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300/90">
              Камък на деня
            </Text>
            {streak && streak.current > 0 && (
              <View className="flex-row items-center rounded-full border border-amber-300/30 bg-amber-400/[0.06] px-3 py-1" style={{ gap: 6 }}>
                <View className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.28em] text-amber-200">
                  {streak.current === 1 ? '1 ден' : `${streak.current} поредни дни`}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-start" style={{ gap: 20 }}>
            <Animated.View style={gemStyle}>
              <CrystalGem
                variant={crystal.svg_variant as GemVariant}
                primary={crystal.color_primary}
                secondary={crystal.color_secondary}
                accent={crystal.color_accent}
                size={92}
                seed={crystal.slug}
              />
            </Animated.View>

            <View className="min-w-0 flex-1 pt-1">
              <Text className="text-[20px] font-semibold leading-tight text-slate-100">
                {crystal.name_bg ?? crystal.name_en}
              </Text>
              <Text className="mt-1.5 font-cinzel text-[10px] font-medium uppercase tracking-[0.32em] text-slate-300/90">
                {crystal.tagline_bg ?? crystal.tagline_en}
              </Text>
              <Text className="mt-3 text-[14px] font-light leading-[1.75] text-slate-300/95">
                {description}
              </Text>

              {isPremium && collectedToday && (
                <View className="mt-4 flex-row items-center self-start rounded-full border border-amber-300/30 bg-amber-400/[0.06] px-3.5 py-1.5" style={{ gap: 8 }}>
                  <View className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                  <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.3em] text-amber-200">
                    Събран днес
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}
