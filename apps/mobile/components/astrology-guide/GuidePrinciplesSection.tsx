import { Text, View } from 'react-native'

import { GuideSectionHeader } from './GuideSection'

const COUNTS = [
  { count: '10', label: 'планети', desc: 'Всяка — архетипен принцип.' },
  { count: '12', label: 'знака', desc: 'Стилът и тонът на израза.' },
  { count: '12', label: 'дома', desc: 'Сферите на живота.' },
] as const

/**
 * §II Как работи астрологията? Mobile port of AstrologyGuideContent's
 * principles section (lines 248-281) — copy mirrored verbatim.
 */
export function GuidePrinciplesSection() {
  return (
    <View>
      <GuideSectionHeader numeral="II" eyebrow="Принципи" title="Как работи астрологията?" />
      <Text className="text-[15px] leading-[1.85] text-slate-300/90">
        Астрологията изучава <Text className="text-slate-100">символичната връзка</Text> между положението на небесните тела и събитията и качествата, проявени на Земята. Тя не твърди причинно-следствена връзка, а работи с архетипни паралели — <Text className="italic text-slate-200">„Горе, каквото и долу“</Text>.
      </Text>

      <View className="mt-8 flex-row flex-wrap" style={{ gap: 20 }}>
        {COUNTS.map((item) => (
          <View key={item.label} style={{ minWidth: '28%' }}>
            <Text className="text-[2rem] font-light leading-none tracking-tight text-slate-100">
              {item.count}
              <Text className="ml-1.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/70">
                {' '}{item.label}
              </Text>
            </Text>
            <Text className="mt-2 text-[13px] leading-relaxed text-slate-300/85">{item.desc}</Text>
          </View>
        ))}
      </View>

      <Text className="mt-8 text-[15px] leading-[1.85] text-slate-300/90">
        <Text className="text-slate-100">Наталната карта</Text> е „моментна снимка“ на небето в секундата на твоето раждане. Аспектите (ъглите между планетите) разкриват как различните части от твоята личност работят заедно — в хармония или в напрежение. Транзитите пък показват как движещите се планети <Text className="italic text-slate-200">сега</Text> взаимодействат с твоята натална карта.
      </Text>
    </View>
  )
}
