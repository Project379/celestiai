import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '@stellaeum/astrology/client'
import { pressFeedback } from '@/components/design-system/tokens'

type InnerTab = 'legend' | 'planets' | 'aspects' | 'transits'

/**
 * Карта · Речник — astrology reference dictionary, mobile port of
 * apps/web/components/chart/AstrologyReference.tsx (P.2-b).
 *
 * Four inner tabs (Легенда / Планети / Аспекти / Транзити). All data
 * mirrored verbatim from web per D2 mirror discipline — same planet
 * descriptions, same aspect entries, same transit table, same Legend
 * narrative copy.
 *
 * CelestialIcons (web's per-planet/per-zodiac SVG component) is not
 * present on mobile per P.2-a investigation. Legend tab icon rows use
 * PLANET_GLYPHS + ZODIAC_GLYPHS unicode glyphs from @stellaeum/astrology/
 * client rendered in Cinzel — matches the existing PlanetsList row
 * pattern. Halt-trigger 5 fallback applied.
 *
 * No nested ScrollView — the consumer (chart.tsx) wraps the screen in a
 * single ScrollView that handles the reference content's vertical flow.
 */
export function AstrologyReference() {
  const [activeTab, setActiveTab] = useState<InnerTab>('legend')

  return (
    <View>
      {/* Editorial eyebrow + gradient title — mirrors web's hero block */}
      <View className="mb-7">
        <View className="flex-row items-center" style={{ gap: 10 }}>
          <View className="h-px w-5 bg-slate-300/40" />
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-400">
            Stellaeum · Речник
          </Text>
        </View>
        <Text className="mt-3 text-[22px] font-semibold leading-tight tracking-tight text-slate-100">
          <Text className="font-light text-slate-400">Астрологичен </Text>
          <Text className="font-semibold text-amber-200/95">справочник</Text>
        </Text>
        <Text className="mt-2 text-[13px] font-light leading-[1.75] text-slate-500">
          Планети, аспекти, транзитни влияния и условните знаци на картата.
        </Text>
      </View>

      {/* Tab row — mirrors web ReferenceTab pattern (typographic underline) */}
      <View className="mb-7 flex-row flex-wrap border-b border-white/[0.06]" style={{ gap: 20 }}>
        {INNER_TABS.map((tab) => (
          <ReferenceTab
            key={tab.id}
            active={activeTab === tab.id}
            onPress={() => setActiveTab(tab.id)}
            label={tab.label}
          />
        ))}
      </View>

      {activeTab === 'legend' && <LegendContent />}
      {activeTab === 'planets' && <PlanetsContent />}
      {activeTab === 'aspects' && <AspectsContent />}
      {activeTab === 'transits' && <TransitsContent />}
    </View>
  )
}

interface ReferenceTabProps {
  active: boolean
  onPress: () => void
  label: string
}

function ReferenceTab({ active, onPress, label }: ReferenceTabProps) {
  return (
    <Pressable
      onPress={onPress}
      className="relative pb-2"
      style={({ pressed }) => pressFeedback(pressed)}
    >
      <Text
        className={`font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] ${
          active ? 'text-amber-200' : 'text-slate-400'
        }`}
      >
        {label}
      </Text>
      {active && (
        <View
          className="absolute inset-x-0 h-px bg-amber-400/70"
          style={{ bottom: 0 }}
        />
      )}
    </Pressable>
  )
}

const INNER_TABS: readonly { id: InnerTab; label: string }[] = [
  { id: 'legend', label: 'Легенда' },
  { id: 'planets', label: 'Планети' },
  { id: 'aspects', label: 'Аспекти' },
  { id: 'transits', label: 'Транзити' },
]

/* ─── Legend tab ─── */

const LEGEND_ZODIAC_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo'] as const
const LEGEND_PLANET_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars'] as const

function LegendContent() {
  return (
    <View style={{ gap: 16 }}>
      <Text className="text-[14px] leading-[1.7] text-slate-300/85">
        Наталната карта е кръгова диаграма, показваща точното положение на небесните тела в момента на раждането ви. Чете се отвън навътре: зодиакален пояс, астрологически домове, след това планетите, свързани с цветни линии-аспекти. Запознайте се с всеки елемент по-долу, за да четете картата уверено.
      </Text>

      <View>
        <View className="mb-1.5 flex-row items-center" style={{ gap: 10 }}>
          <View className="flex-row rounded-lg border border-white/[0.05] bg-black/30 px-2 py-1" style={{ gap: 6 }}>
            {LEGEND_ZODIAC_KEYS.map((key) => (
              <Text key={key} className="font-cinzel text-[14px] text-slate-200">
                {ZODIAC_GLYPHS[key]}
              </Text>
            ))}
          </View>
          <Text className="text-[14px] font-medium text-slate-100">Зодиак</Text>
        </View>
        <Text className="text-[13px] leading-[1.7] text-slate-300/80">
          Външният пояс е разделен на 12 зодиакални знака. Всеки знак има уникален характер и енергия. Позицията на планетите в знаците оформя как изразяваме тази енергия в живота.
        </Text>
      </View>

      <View>
        <Text className="mb-1.5 text-[14px] font-medium text-slate-100">Домове</Text>
        <Text className="text-[13px] leading-[1.7] text-slate-300/80">
          12-те дома представляват 12 области от живота: идентичност, финанси, комуникация, дом, творчество, здраве, взаимоотношения, трансформация, мъдрост, кариера, общество, подсъзнание. Домът, в който се намира планета, показва <Text className="text-slate-200/90">където</Text> действа нейната енергия.
        </Text>
      </View>

      <View>
        <View className="mb-1.5 flex-row items-center" style={{ gap: 10 }}>
          <View className="flex-row rounded-lg border border-white/[0.05] bg-black/30 px-2 py-1" style={{ gap: 6 }}>
            {LEGEND_PLANET_KEYS.map((key) => (
              <Text key={key} className="font-cinzel text-[14px] text-slate-200">
                {PLANET_GLYPHS[key]}
              </Text>
            ))}
          </View>
          <Text className="text-[14px] font-medium text-slate-100">Планети</Text>
        </View>
        <Text className="text-[13px] leading-[1.7] text-slate-300/80">
          Всяка планета въплъщава жизнен принцип: Слънце (сила), Луна (емоция), Меркурий (изразяване), Венера (привличане), Марс (действие), Юпитер (разширение), Сатурн (усилие). Техните позиции разкриват характера ви.
        </Text>
      </View>

      <View>
        <Text className="mb-1.5 text-[14px] font-medium text-slate-100">Аспекти</Text>
        <Text className="mb-3 text-[13px] leading-[1.7] text-slate-300/80">
          Линиите в центъра показват ъглови връзки между планетите — как различни части от характера ви работят в синхрон или напрежение.
        </Text>
        <View style={{ gap: 6 }}>
          {ASPECT_LEGEND.map((row) => (
            <View key={row.label} className="flex-row items-start" style={{ gap: 8 }}>
              <View
                className="mt-1.5 h-[3px] w-5 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <Text className="flex-1 text-[12px] leading-[1.65] text-slate-300/80">
                <Text className="text-slate-200/90">{row.label}</Text> — {row.body}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-1.5 text-[14px] font-medium text-slate-100">Аспектни точки</Text>
        <Text className="text-[13px] leading-[1.7] text-slate-300/80">
          Малките цветни точки показват откъде точно започва аспектът за всяка планета. Цветът им съвпада със съответната планета.
        </Text>
      </View>

      <View>
        <View className="mb-1.5 flex-row items-center" style={{ gap: 10 }}>
          <View className="h-6 w-6 items-center justify-center rounded-md border border-red-400/20 bg-black/30">
            <Text className="text-[11px] font-bold text-red-400">R</Text>
          </View>
          <Text className="text-[14px] font-medium text-slate-100">Ретрограден (R)</Text>
        </View>
        <Text className="text-[13px] leading-[1.7] text-slate-300/80">
          Малкото червено „R" до планета означава, че тя е ретроградна — от Земята изглежда сякаш се движи назад. Тази енергия обикновено се проявява по-вътрешно или изисква преосмисляне.
        </Text>
      </View>

      <View className="border-t border-white/[0.06] pt-4 flex-row" style={{ gap: 16 }}>
        <View className="flex-1">
          <View className="mb-1.5 flex-row items-center" style={{ gap: 8 }}>
            <View className="h-1 w-7 rounded-full bg-cyan-400" />
            <Text className="text-[13px] font-medium text-slate-100">Синя линия</Text>
          </View>
          <Text className="text-[11.5px] leading-[1.6] text-slate-300/80">
            Асцендент — вашата <Text className="text-slate-200/90">персона</Text>. Знакът на хоризонта в момента на раждането. Олицетворява вашето Аз, нови начала и начина, по който другите ви виждат на пръв поглед.
          </Text>
        </View>
        <View className="flex-1">
          <View className="mb-1.5 flex-row items-center" style={{ gap: 8 }}>
            <View className="h-1 w-7 rounded-full bg-pink-400" />
            <Text className="text-[13px] font-medium text-slate-100">Розова линия</Text>
          </View>
          <Text className="text-[11.5px] leading-[1.6] text-slate-300/80">
            MC — вашата <Text className="text-slate-200/90">цел</Text>. Най-високата точка в картата. Показва кариера, призвание, амбиции и важните стъпки към реализация в живота.
          </Text>
        </View>
      </View>
    </View>
  )
}

const ASPECT_LEGEND: readonly { label: string; color: string; body: string }[] = [
  { label: 'Тригон (120°)',    color: '#4ade80', body: 'благоприятна връзка, изобилие и подкрепа. Таланти, които текат лесно.' },
  { label: 'Секстил (60°)',    color: '#60a5fa', body: 'мека хармония и подкрепа. Смекчава напреженията, открива възможности.' },
  { label: 'Квадрат (90°)',    color: '#f87171', body: 'напрежение и предизвикателства. Подтиква към действие и растеж.' },
  { label: 'Опозиция (180°)',  color: '#fb923c', body: 'конфронтация и противопоставяне. Баланс постига се чрез напрежение.' },
  { label: 'Съединение (0°)',  color: 'rgba(255,255,255,0.7)', body: 'засилено взаимно влияние. Може да бъде мощна подкрепа или допълнителна тежест.' },
]

/* ─── Planets tab ─── */

const PLANETS_DATA: readonly { name: string; keyword: string; chip: string; description: string }[] = [
  { name: 'Слънце',       keyword: 'сила',        chip: 'bg-amber-500/20 text-amber-300',
    description: 'Концентриране в собствената личност. Лидерство, сила, творчески проекти. Отстояване на Аз-а и личните граници.' },
  { name: 'Луна',         keyword: 'емоция',      chip: 'bg-sky-500/20 text-sky-300',
    description: 'Изострена чувствителност и емоционалност. Вътрешни преживявания, домашни ангажименти. Намиране на вътрешна стабилност.' },
  { name: 'Меркурий',     keyword: 'изразяване',  chip: 'bg-teal-500/20 text-teal-300',
    description: 'Изразяване, комуникация, идеи и планове. Учене, пътуване, подписване на договори. Логика и обективна преценка.' },
  { name: 'Венера',       keyword: 'обич',        chip: 'bg-pink-500/20 text-pink-300',
    description: 'Любов, романтика, приятелство и взаимоотношения. Красота, хармония и просперитет. Силно вътрешно доволство.' },
  { name: 'Марс',         keyword: 'действие',    chip: 'bg-red-500/20 text-red-300',
    description: 'Активност, динамика, сексуална енергия. Сила да отстоим желаното. Работоспособност и страст.' },
  { name: 'Юпитер',       keyword: 'разширение',  chip: 'bg-violet-500/20 text-violet-300',
    description: 'Разширение и нови възможности. Оптимизъм, успех и материализация. Духовност, учене и пътуване.' },
  { name: 'Сатурн',       keyword: 'усилие',      chip: 'bg-slate-400/20 text-slate-300',
    description: 'Налага се търпение и дисциплина. Преминаване през важни уроци и постигане на мъдрост. Дългосрочна структура и успех.' },
  { name: 'Уран',         keyword: 'свобода',     chip: 'bg-cyan-500/20 text-cyan-300',
    description: 'Свобода и разкрепостяване. Нещо изцяло ново и различно. Нови идеи, резки промени, непредвидимост.' },
  { name: 'Нептун',       keyword: 'впечатление', chip: 'bg-indigo-500/20 text-indigo-300',
    description: 'Дълбоки и духовни процеси. Интуиция, вдъхновение и творчество. Любовни взаимоотношения и духовност.' },
  { name: 'Плутон',       keyword: 'промяна',     chip: 'bg-purple-500/20 text-purple-300',
    description: 'Промяна и трансформация. Вътрешно пробуждане и кармата. Мощни процеси и фатални взаимоотношения.' },
  { name: 'Асцендент',    keyword: 'личност',     chip: 'bg-emerald-500/20 text-emerald-300',
    description: 'Нашият Аз и нови начала. Свобода да изразим себе си. Опознаваме и развиваме себе си чрез другите.' },
  { name: 'Медиум Цели',  keyword: 'цел',         chip: 'bg-orange-500/20 text-orange-300',
    description: 'Цел, реализация и кариера. Постижения и израстване в социума. Важни за живота стъпки и успех.' },
]

function PlanetsContent() {
  return (
    <View>
      <Text className="mb-4 text-[13.5px] font-light leading-[1.8] text-slate-400">
        Всяка планета олицетворява конкретен жизнен принцип или архетип — сила, емоция, комуникация и т.н. Знакът, в който стои планетата, показва <Text className="text-slate-200/90">как</Text> изразяваме тази енергия, а домът — <Text className="text-slate-200/90">в коя сфера</Text> от живота тя действа. Заедно тези три фактора изграждат пълния астрологичен портрет на характера.
      </Text>
      {PLANETS_DATA.map((planet, idx) => (
        <View
          key={planet.name}
          className={`px-1 py-4 ${idx === 0 ? '' : 'border-t border-white/[0.06]'}`}
        >
          <View className="mb-1.5 flex-row items-center" style={{ gap: 8 }}>
            <Text className="text-[14px] font-medium text-slate-100">{planet.name}</Text>
            <View className={`ml-auto rounded-full px-2 py-0.5 ${planet.chip}`}>
              <Text className={`font-cinzel text-[9px] font-semibold uppercase tracking-[0.22em] ${planet.chip.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                {planet.keyword}
              </Text>
            </View>
          </View>
          <Text className="text-[13px] font-light leading-[1.75] text-slate-400">{planet.description}</Text>
        </View>
      ))}
    </View>
  )
}

/* ─── Aspects tab ─── */

const ASPECTS_DATA: readonly {
  name: string
  degrees: string
  dotColor: string
  keyword: string
  keywordBg: string
  keywordText: string
  description: string
}[] = [
  {
    name: 'Съединение', degrees: '0°', dotColor: 'rgba(255,255,255,0.8)',
    keyword: 'усилване / натоварване', keywordBg: 'bg-white/10', keywordText: 'text-slate-300',
    description: 'Силно влияние. Ново начало, засаждане семената на бъдещето. При напрежение — провокация стимулираща към ново начало.',
  },
  {
    name: 'Тригон', degrees: '120°', dotColor: '#34d399',
    keyword: 'благоприятен', keywordBg: 'bg-emerald-500/20', keywordText: 'text-emerald-300',
    description: 'Благоприятни развръзки, благоденствие, изобилие. Срещаме правилните хора в точното място и момент.',
  },
  {
    name: 'Секстил', degrees: '60°', dotColor: '#38bdf8',
    keyword: 'подкрепа', keywordBg: 'bg-sky-500/20', keywordText: 'text-sky-300',
    description: 'Мека и балансирана развръзка. Лек подтик за действие. Смекчаване при съществуващо напрежение.',
  },
  {
    name: 'Квадрат', degrees: '90°', dotColor: '#f87171',
    keyword: 'напрежение', keywordBg: 'bg-red-500/20', keywordText: 'text-red-300',
    description: 'Напрежение, стрес, криза. Подтикване към действия. Външни предизвикателства ни карат да предприемем активност.',
  },
  {
    name: 'Опозиция', degrees: '180°', dotColor: '#fb923c',
    keyword: 'конфронтация', keywordBg: 'bg-orange-500/20', keywordText: 'text-orange-300',
    description: 'Конфронтация, противопоставяне. Поставяне на лични граници. Постигане на стабилност чрез напрежение.',
  },
]

function AspectsContent() {
  return (
    <View>
      <Text className="mb-4 text-[13.5px] font-light leading-[1.8] text-slate-400">
        Аспектите са ъгловите разстояния между планетите, измерени по зодиакалния кръг. Те разкриват дали две планети работят в хармония и взаимна подкрепа, или в напрежение и предизвикателство — и по двата начина стимулират нашия растеж. Разбирането на аспектите е ключът към дълбокото тълкуване на всяка карта.
      </Text>
      {ASPECTS_DATA.map((aspect, idx) => (
        <View
          key={aspect.name}
          className={`px-1 py-4 ${idx === 0 ? '' : 'border-t border-white/[0.06]'}`}
        >
          <View className="mb-1.5 flex-row items-center" style={{ gap: 8 }}>
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: aspect.dotColor }}
            />
            <Text className="text-[14px] font-medium text-slate-100">{aspect.name}</Text>
            <Text className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-slate-500">
              {aspect.degrees}
            </Text>
            <View className={`ml-auto rounded-full px-2 py-0.5 ${aspect.keywordBg}`}>
              <Text className={`font-cinzel text-[9px] font-semibold uppercase tracking-[0.22em] ${aspect.keywordText}`}>
                {aspect.keyword}
              </Text>
            </View>
          </View>
          <Text className="text-[13px] font-light leading-[1.75] text-slate-400">{aspect.description}</Text>
        </View>
      ))}
    </View>
  )
}

/* ─── Transits tab ─── */

const TRANSITS_DATA: readonly {
  name: string
  influence: string
  frequency: string
  description: string
  chip: string
}[] = [
  { name: 'Луна',      influence: '±6 часа',         frequency: 'Много бързо',
    description: 'Усилвател на настроението. Краткотрайни емоционални вълни.',
    chip: 'bg-sky-500/20 text-sky-300' },
  { name: 'Слънце',    influence: '±3 дни',          frequency: 'Средно влияние',
    description: 'Активира физически събития. Засилва жизнеността и самоизразяването.',
    chip: 'bg-amber-500/20 text-amber-300' },
  { name: 'Меркурий',  influence: '±1 ден',          frequency: 'Бързо',
    description: 'Идеи и комуникация. Добър за разговори, пътувания и учене.',
    chip: 'bg-teal-500/20 text-teal-300' },
  { name: 'Венера',    influence: '±2 дни',          frequency: 'Бързо и меко',
    description: 'Хармония и баланс. Насърчава отношенията и естетичното удоволствие.',
    chip: 'bg-pink-500/20 text-pink-300' },
  { name: 'Марс',      influence: '±3 дни',          frequency: 'Осезаемо',
    description: 'Активира напрежение или енергия. Стимулира действие и амбиция.',
    chip: 'bg-red-500/20 text-red-300' },
  { name: 'Юпитер',    influence: '±2–3 седмици',    frequency: '1–2 пъти на 12 години',
    description: 'Нови възможности. Носи оптимизъм, разширение и удача.',
    chip: 'bg-violet-500/20 text-violet-300' },
  { name: 'Сатурн',    influence: '±1.5 месеца',     frequency: '1–2 пъти на 28–30 години',
    description: 'Уроци и дисциплина. Изпитва структурата и дългосрочните цели.',
    chip: 'bg-slate-400/20 text-slate-300' },
  { name: 'Уран',      influence: '±1–2 месеца',     frequency: '1–2 пъти в живота',
    description: 'Резки промени. Разрушава старото и открива нов път.',
    chip: 'bg-cyan-500/20 text-cyan-300' },
  { name: 'Нептун',    influence: '±2 месеца',       frequency: '1 път в живота',
    description: 'Духовни процеси. Разтваря граници и задълбочава интуицията.',
    chip: 'bg-indigo-500/20 text-indigo-300' },
  { name: 'Плутон',    influence: '±2 месеца',       frequency: '1 път в живота',
    description: 'Трансформация. Кара дълбоки, необратими промени в живота.',
    chip: 'bg-purple-500/20 text-purple-300' },
]

function TransitsContent() {
  return (
    <View>
      <Text className="mb-4 text-[13.5px] font-light leading-[1.8] text-slate-400">
        Транзитите са текущото движение на планетите и взаимодействието им с фиксираните точки в наталната карта. Бързите планети (Луна, Слънце, Меркурий, Венера, Марс) носят ежедневни и седмични нюанси, докато бавните (Юпитер, Сатурн, Уран, Нептун, Плутон) белязват дългосрочни, понякога животоопределящи периоди. Продължителността и честотата по-долу показват колко дълго и рядко се случва всяко влияние.
      </Text>
      {TRANSITS_DATA.map((transit, idx) => (
        <View
          key={transit.name}
          className={`px-1 py-4 ${idx === 0 ? '' : 'border-t border-white/[0.06]'}`}
        >
          <View className="mb-1.5 flex-row flex-wrap items-center" style={{ gap: 8 }}>
            <Text className="text-[14px] font-medium text-slate-100">{transit.name}</Text>
            <View className={`ml-auto rounded-full px-2 py-0.5 ${transit.chip}`}>
              <Text className={`font-cinzel text-[9px] font-semibold uppercase tracking-[0.22em] ${transit.chip.split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
                {transit.influence}
              </Text>
            </View>
            <View className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5">
              <Text className="font-cinzel text-[9px] uppercase tracking-[0.22em] text-slate-400">
                {transit.frequency}
              </Text>
            </View>
          </View>
          <Text className="text-[13px] font-light leading-[1.75] text-slate-400">{transit.description}</Text>
        </View>
      ))}
    </View>
  )
}
