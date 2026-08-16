import { Text, View } from 'react-native'

import { PLANET_GLYPHS } from '@stellaeum/astrology/client'

import { GuideSectionHeader } from './GuideSection'

type PlanetKey = keyof typeof PLANET_GLYPHS

type Planet = { glyphKey: PlanetKey; name: string; keyword: string; desc: string }

const PLANET_GROUPS: { label: string; caption: string; planets: Planet[] }[] = [
  {
    label: 'Лични',
    caption: 'Ежедневната ти природа',
    planets: [
      { glyphKey: 'sun', name: 'Слънце', keyword: 'Сила', desc: 'Лидерство, идентичност, жизнена сила' },
      { glyphKey: 'moon', name: 'Луна', keyword: 'Емоция', desc: 'Чувства, интуиция, домашен уют' },
      { glyphKey: 'mercury', name: 'Меркурий', keyword: 'Изразяване', desc: 'Комуникация, мисъл, пътувания' },
      { glyphKey: 'venus', name: 'Венера', keyword: 'Нежност', desc: 'Любов, красота, хармония' },
      { glyphKey: 'mars', name: 'Марс', keyword: 'Действие', desc: 'Страст, енергия, инициативност' },
    ],
  },
  {
    label: 'Социални',
    caption: 'Ролята ти в света',
    planets: [
      { glyphKey: 'jupiter', name: 'Юпитер', keyword: 'Разширяване', desc: 'Растеж, удача, мъдрост' },
      { glyphKey: 'saturn', name: 'Сатурн', keyword: 'Усилие', desc: 'Дисциплина, уроци, структура' },
    ],
  },
  {
    label: 'Трансперсонални',
    caption: 'Дълбоките трансформации',
    planets: [
      { glyphKey: 'uranus', name: 'Уран', keyword: 'Свобода', desc: 'Промяна, иновация, бунт' },
      { glyphKey: 'neptune', name: 'Нептун', keyword: 'Впечатление', desc: 'Духовност, интуиция, мечти' },
      { glyphKey: 'pluto', name: 'Плутон', keyword: 'Промяна', desc: 'Трансформация, карма, мощ' },
    ],
  },
]

/**
 * §III Планетните принципи. Mobile port of AstrologyGuideContent's
 * planets section (lines 285-335) — copy mirrored verbatim. Web's
 * per-planet CelestialIcon SVGs are not present on mobile (P.2-a
 * investigation); PLANET_GLYPHS unicode glyphs substitute, matching the
 * Halt-trigger 5 fallback already applied in AstrologyReference.tsx.
 */
export function GuidePlanetsSection() {
  return (
    <View>
      <GuideSectionHeader numeral="III" eyebrow="Архетипи" title="Планетните принципи" />
      <Text className="mb-8 text-[15px] leading-[1.85] text-slate-300">
        Всяка планета е архетип — носи конкретна енергия и управлява определени сфери от живота.
      </Text>

      <View style={{ gap: 32 }}>
        {PLANET_GROUPS.map((group) => (
          <View key={group.label}>
            <View className="mb-4 flex-row items-baseline" style={{ gap: 12 }}>
              <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-bronze/80">
                {group.label}
              </Text>
              <View className="h-px flex-1 bg-bronze/20" />
              <Text className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-400">
                {group.caption}
              </Text>
            </View>

            <View className="border-t border-white/[0.05]">
              {group.planets.map((planet) => (
                <View
                  key={planet.name}
                  className="flex-row items-start border-b border-white/[0.05] py-3.5"
                  style={{ gap: 14 }}
                >
                  <Text className="mt-0.5 w-6 font-cinzel text-[16px] text-slate-200/85">
                    {PLANET_GLYPHS[planet.glyphKey]}
                  </Text>
                  <View className="flex-1">
                    <View className="mb-0.5 flex-row items-baseline" style={{ gap: 10 }}>
                      <Text className="text-[15px] font-semibold text-slate-100">{planet.name}</Text>
                      <Text className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-bronze/75">
                        {planet.keyword}
                      </Text>
                    </View>
                    <Text className="text-[13px] leading-relaxed text-slate-300/85">{planet.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
