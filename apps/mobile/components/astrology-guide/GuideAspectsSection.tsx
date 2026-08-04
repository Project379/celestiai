import { Text, View } from 'react-native'

import { GuideSectionHeader } from './GuideSection'

const ASPECTS = [
  {
    name: 'Съединение',
    degrees: '0°',
    keyword: 'Засилване',
    tint: 'text-violet-300',
    desc: 'Две планети на едно място — енергията им се слива и се усилва, нови начала.',
  },
  {
    name: 'Секстил',
    degrees: '60°',
    keyword: 'Подкрепа',
    tint: 'text-cyan-300',
    desc: 'Мека хармония, лек подтик за действие — само трябва да протегнеш ръка.',
  },
  {
    name: 'Квадрат',
    degrees: '90°',
    keyword: 'Напрежение',
    tint: 'text-amber-300',
    desc: 'Предизвикателство и триене — но именно те ни тласкат напред и ни изграждат.',
  },
  {
    name: 'Тригон',
    degrees: '120°',
    keyword: 'Благодат',
    tint: 'text-emerald-300',
    desc: 'Благоприятни развръзки, изобилие, правилните хора се появяват естествено.',
  },
  {
    name: 'Опозиция',
    degrees: '180°',
    keyword: 'Баланс',
    tint: 'text-rose-300',
    desc: 'Противопоставяне между два принципа — пътят е да намериш средната точка.',
  },
] as const

/**
 * §IV Аспектите. Mobile port of AstrologyGuideContent's aspects section
 * (lines 339-373) — copy mirrored verbatim.
 */
export function GuideAspectsSection() {
  return (
    <View>
      <GuideSectionHeader numeral="IV" eyebrow="Геометрия" title="Аспектите" />
      <Text className="mb-8 text-[15px] leading-[1.85] text-slate-300">
        Аспектите са ъглите между планетите — те описват как различните принципи в теб разговарят помежду си.
      </Text>

      <View className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
        {ASPECTS.map((aspect) => (
          <View key={aspect.name} className="flex-row items-baseline py-4" style={{ gap: 16 }}>
            <Text className={`w-14 text-[1.5rem] font-light leading-none tracking-tight ${aspect.tint}`}>
              {aspect.degrees}
            </Text>
            <View style={{ width: 108 }}>
              <Text className="text-[15px] font-semibold text-slate-100">{aspect.name}</Text>
              <Text className={`mt-0.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] ${aspect.tint}`}>
                {aspect.keyword}
              </Text>
            </View>
            <Text className="flex-1 text-[13px] leading-relaxed text-slate-300/85">{aspect.desc}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
