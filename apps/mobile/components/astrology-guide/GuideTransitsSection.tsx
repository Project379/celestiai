import { Text, View } from 'react-native'

import { PLANET_GLYPHS } from '@stellaeum/astrology/client'

import { GuideSectionHeader } from './GuideSection'

/**
 * §V Транзитите. Mobile port of AstrologyGuideContent's transits section
 * (lines 377-425) — copy mirrored verbatim. Web's per-planet CelestialIcon
 * SVGs substituted with PLANET_GLYPHS unicode (Halt-trigger 5 precedent).
 */
export function GuideTransitsSection() {
  return (
    <View>
      <GuideSectionHeader numeral="V" eyebrow="Време" title="Транзитите" />
      <Text className="mb-8 text-[15px] leading-[1.85] text-slate-300/90">
        Транзитите са <Text className="text-slate-100">текущото движение на планетите</Text> и начинът, по който те взаимодействат с позициите от наталната ти карта. Именно транзитите обясняват защо определени периоди от живота ни носят нов старт, изпитания или прозрения.
      </Text>

      <View className="flex-row flex-wrap" style={{ gap: 24 }}>
        <View style={{ flex: 1, minWidth: '45%' }}>
          <View className="mb-3 flex-row items-center" style={{ gap: 10 }}>
            <Text className="text-[15px] text-amber-300/90">{PLANET_GLYPHS.sun}</Text>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
              Бързи планети
            </Text>
          </View>
          <Text className="text-[15px] font-semibold text-slate-100">
            Луна, Слънце, Меркурий, Венера, Марс
          </Text>
          <Text className="mt-2.5 text-[13.5px] leading-[1.8] text-slate-300/90">
            Носят ежедневни и седмични влияния — настроения, комуникация, малки предизвикателства.
          </Text>
          <Text className="mt-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Цикъл · дни — месеци
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: '45%' }}>
          <View className="mb-3 flex-row items-center" style={{ gap: 10 }}>
            <Text className="text-[15px] text-indigo-300/90">{PLANET_GLYPHS.saturn}</Text>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-indigo-300/80">
              Бавни планети
            </Text>
          </View>
          <Text className="text-[15px] font-semibold text-slate-100">
            Юпитер, Сатурн, Уран, Нептун, Плутон
          </Text>
          <Text className="mt-2.5 text-[13.5px] leading-[1.8] text-slate-300/90">
            Белязват дългосрочни промени — смяна на кариера, дълбоки трансформации, жизнени уроци.
          </Text>
          <Text className="mt-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-400">
            Цикъл · години — десетилетия
          </Text>
        </View>
      </View>

      <Text className="mt-8 text-[15px] leading-[1.85] text-slate-300/90">
        <Text className="text-slate-100">Stellaeum</Text> изчислява транзитите в реално време и ги съпоставя с наталната ти карта — за да знаеш какви небесни влияния действат върху теб точно сега и как да ги използваш в своя полза.
      </Text>
    </View>
  )
}
