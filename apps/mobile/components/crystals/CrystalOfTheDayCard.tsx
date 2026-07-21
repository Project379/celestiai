import { Text, View } from 'react-native'

import { useCrystalOfTheDay } from '@/hooks/useCrystalOfTheDay'
import { CrystalGem, type GemVariant } from './CrystalGem'

/**
 * Кристали hero — today's lunar-phase-driven crystal + streak badge.
 * Mobile port of apps/web/components/crystals/CrystalOfTheDayCard.tsx.
 * Web receives `initialData` from a Server Component; mobile has no SSR
 * equivalent so it calls useCrystalOfTheDay() directly (same hook the
 * dashboard CrystalCard tile already uses). Entry animation (framer-motion
 * gem sway) dropped per data-display discipline.
 */
export function CrystalOfTheDayCard() {
  const { data, isLoading } = useCrystalOfTheDay()

  if (!data) {
    return (
      <View className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6">
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
    <View>
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
        <CrystalGem
          variant={crystal.svg_variant as GemVariant}
          primary={crystal.color_primary}
          secondary={crystal.color_secondary}
          accent={crystal.color_accent}
          size={92}
          seed={crystal.slug}
        />

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
    </View>
  )
}
