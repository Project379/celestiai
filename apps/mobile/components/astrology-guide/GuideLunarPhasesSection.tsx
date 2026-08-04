import { Text, View } from 'react-native'

import { GuideSectionHeader } from './GuideSection'

const PHASES = [
  {
    name: 'Новолуние',
    task: 'Постави намерения',
    appearance:
      'Луната е обърната с тъмната си страна към Земята и обикновено не може да бъде видяна, тъй като се намира между Земята и Слънцето. Изключение е случаят при слънчево затъмнение, когато Луната засенчва Слънцето.',
  },
  {
    name: 'Изгряващ полумесец',
    task: 'Изгради импулс',
    appearance:
      'Тънък сребрист полумесец започва да се появява от дясната страна. Първата видима фаза след новолунието, когато Луната започва да расте.',
  },
  {
    name: 'Първа четвърт',
    task: 'Вземи решение',
    appearance: 'Дясната половина от лунната повърхност е осветена.',
  },
  {
    name: 'Растяща луна',
    task: 'Усъвършенствай',
    appearance:
      'Повече от половината лунна повърхност е осветена, но Луната още не е пълна. Осветената част продължава да расте и покрива все по-голяма част от диска. Нарича се още „млада луна", защото наближава пълнолунието.',
  },
  {
    name: 'Пълнолуние',
    task: 'Празнувай и пусни',
    appearance: 'Когато Земята е между Луната и Слънцето. Целият лунен диск е видим, освен при лунно затъмнение.',
  },
  {
    name: 'Намаляваща луна',
    task: 'Благодарност',
    appearance:
      'Луната започва да намалява и осветлението отслабва от дясната страна. Повече от половината лунна повърхност още е видима, но постепенно се смалява. Нарича се още „стара луна".',
  },
  {
    name: 'Последна четвърт',
    task: 'Пусни',
    appearance: 'Лявата половина от лунната повърхност е осветена.',
  },
  {
    name: 'Залязващ полумесец',
    task: 'Почивка',
    appearance:
      'Луната продължава да намалява и оставя тънък сребрист полумесец от лявата страна. Последната видима фаза преди следващото новолуние.',
  },
] as const

/**
 * §VI Лунните фази и манифестация. Mobile port of AstrologyGuideContent's
 * lunar-phases section (lines 429-558) — copy mirrored verbatim, the
 * largest single section in the guide.
 */
export function GuideLunarPhasesSection() {
  return (
    <View>
      <GuideSectionHeader numeral="VI" eyebrow="Ритъм" title="Лунните фази и манифестация" />
      <Text className="mb-8 text-[15px] leading-[1.85] text-slate-200/95">
        Луната завършва пълния си <Text className="text-white">синодичен цикъл за около 29 дни и 12 часа</Text>, от новолуние до новолуние. Този ритъм не е просто астрономичен: той е структуриран енергиен ток, в който всяка фаза ти дава различна задача. <Text className="text-white">Нарастващата половина</Text> изгражда (намерения, действие, усъвършенстване). <Text className="text-white">Намаляващата половина</Text> освобождава (благодарност, пускане, почивка).
      </Text>

      <View className="mb-10 flex-row flex-wrap" style={{ gap: 24 }}>
        <View style={{ flex: 1, minWidth: '45%' }}>
          <View className="mb-3 flex-row items-center" style={{ gap: 10 }}>
            <Text className="text-[15px] text-amber-300/90">☽</Text>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
              Нарастваща половина
            </Text>
          </View>
          <Text className="text-[15px] font-semibold text-slate-100">
            Изграждане, действие, усъвършенстване
          </Text>
          <Text className="mt-2.5 text-[13.5px] leading-[1.8] text-slate-200/90">
            От новолунието до пълнолунието. Сееш намерение, правиш първите стъпки, срещаш препятствия и настройваш курса, докато проектът не достигне връхната си точка.
          </Text>
          <Text className="mt-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-300">
            Около 14 дни и 16 часа
          </Text>
        </View>

        <View style={{ flex: 1, minWidth: '45%' }}>
          <View className="mb-3 flex-row items-center" style={{ gap: 10 }}>
            <Text className="text-[15px] text-indigo-300/90">☾</Text>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-indigo-300/90">
              Намаляваща половина
            </Text>
          </View>
          <Text className="text-[15px] font-semibold text-slate-100">
            Благодарност, пускане, почивка
          </Text>
          <Text className="mt-2.5 text-[13.5px] leading-[1.8] text-slate-200/90">
            От пълнолунието до следващото новолуние. Празнуваш постигнатото, освобождаваш онова, което не работи, приключваш и си почиваш, преди цикълът да започне отново.
          </Text>
          <Text className="mt-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-300">
            Около 14 дни и 16 часа
          </Text>
        </View>
      </View>

      <View className="mb-4 flex-row items-baseline" style={{ gap: 12 }}>
        <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
          Осемте фази
        </Text>
        <View className="h-px flex-1 bg-amber-300/20" />
        <Text className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-300">
          Изглед и насока
        </Text>
      </View>

      <View className="border-t border-white/[0.05]">
        {PHASES.map((phase) => (
          <View
            key={phase.name}
            className="flex-row items-start border-b border-white/[0.05] py-4"
            style={{ gap: 14 }}
          >
            <View className="mt-0.5 h-[26px] w-[26px] items-center justify-center rounded-full border border-amber-300/25 bg-[#0d0b18]">
              <Text className="text-[13px] text-amber-200/90">☾</Text>
            </View>
            <View className="flex-1">
              <View className="mb-1 flex-row flex-wrap items-baseline" style={{ gap: 10 }}>
                <Text className="text-[15px] font-semibold text-slate-100">{phase.name}</Text>
                <Text className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/85">
                  {phase.task}
                </Text>
              </View>
              <Text className="text-[13.5px] leading-[1.8] text-slate-200/95">{phase.appearance}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text className="mt-8 text-[15px] leading-[1.85] text-slate-200/95">
        <Text className="text-white">Stellaeum</Text> изчислява текущата лунна фаза в реално време и я показва на таблото ти, с конкретна насока за манифестация според мястото, където се намира цикълът в момента. На дашборда намираш и пълния манифест за всяка фаза: афирмация, кристал, ритуал и въпрос за дневника.
      </Text>
    </View>
  )
}
