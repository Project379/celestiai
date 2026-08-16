import { Text, View } from 'react-native'

import { GuideSectionHeader } from './GuideSection'

/**
 * §I История на астрологията. Mobile port of AstrologyGuideContent's
 * history section (apps/web/components/astrology-guide/AstrologyGuideContent.tsx
 * lines 220-244) — copy mirrored verbatim.
 */
export function GuideHistorySection() {
  return (
    <View>
      <GuideSectionHeader numeral="I" eyebrow="Произход" title="История на астрологията" />
      <View style={{ gap: 14 }}>
        <Text className="text-[15px] leading-[1.85] text-slate-300/90">
          Астрологията е една от <Text className="text-slate-100">най-древните науки в историята на човечеството</Text> — датира от над 4 000 години. Зародила се в Месопотамия (Вавилон), където свещениците наблюдавали небето, за да предсказват реколтите и съдбата на царете.
        </Text>
        <Text className="text-[15px] leading-[1.85] text-slate-300/90">
          Оттам знанието преминало към египтяните, после към гърците и римляните, които го обогатили с философия и математика. Хипократ прилагал астрологията в медицината, а Птолемей написал <Text className="italic text-slate-200">Тетрабиблос</Text> — наръчник, използван и до днес.
        </Text>
        <Text className="text-[15px] leading-[1.85] text-slate-300/90">
          По времето на Ренесанса астрологията се завърнала в Европа след средновековния застой, преплитайки се с алхимия и натурфилософия. Модерната западна астрология използва <Text className="text-slate-100">Тропическия зодиак</Text>, основан на сезоните, а не на физическото положение на съзвездията.
        </Text>
      </View>

      <View className="mt-8 border-l border-bronze/40 pl-5">
        <Text className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.36em] text-bronze/80">
          Stellaeum
        </Text>
        <Text className="text-[15px] font-light leading-[1.8] text-slate-200/95">
          Използваме <Text className="font-medium text-slate-100">Swiss Ephemeris</Text> — най-прецизните астрономически изчисления в света, разработени от Astrodienst и базирани на НАСА данни.
        </Text>
      </View>
    </View>
  )
}
