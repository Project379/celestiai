import { Text, View } from 'react-native'

import { GuideSectionHeader } from './GuideSection'

const STEPS = [
  {
    numeral: 'I',
    title: 'Swiss Ephemeris',
    desc: 'Използваме swisseph — индустриалният стандарт в астрологията, базиран на НАСА данни с точност до дъга-секунди.',
  },
  {
    numeral: 'II',
    title: 'Твоите данни',
    desc: 'Въвеждаш точното място, дата и час на раждане — тези три параметъра определят уникалната ти натална карта.',
  },
  {
    numeral: 'III',
    title: 'Изчисляване',
    desc: 'Изчисляваме позициите на 10-те планети, Асцендента и Медиум Цели, домовете по системата Placidus и всички аспекти.',
  },
  {
    numeral: 'IV',
    title: 'AI тълкувания',
    desc: 'Изкуственият интелект синтезира позициите в персонализирани, разбираеми тълкувания на български език.',
  },
] as const

/**
 * §VII Как Stellaeum изчислява твоята карта. Mobile port of
 * AstrologyGuideContent's method section (lines 562-582) — copy mirrored
 * verbatim.
 */
export function GuideMethodSection() {
  return (
    <View>
      <GuideSectionHeader numeral="VII" eyebrow="Метод" title="Как Stellaeum изчислява твоята карта" />
      <View className="border-y border-white/[0.05]">
        {STEPS.map((item, idx) => (
          <View
            key={item.numeral}
            className={`flex-row items-baseline py-4 ${idx === 0 ? '' : 'border-t border-white/[0.05]'}`}
            style={{ gap: 16 }}
          >
            <Text className="w-8 font-cinzel text-[13px] font-bold tracking-[0.18em] text-bronze/80">
              {item.numeral}
            </Text>
            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-slate-100">{item.title}</Text>
              <Text className="mt-1 text-[13.5px] leading-[1.8] text-slate-300/90">{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
