'use client'

import { useState } from 'react'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

const PLANET_ICONS = ['sun', 'moon', 'mercury', 'venus', 'mars']
const ZODIAC_ICONS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo']

type InnerTab = 'planets' | 'aspects' | 'transits' | 'legend'

const PLANETS = [
  {
    name: 'Слънце',
    keyword: 'сила',
    color: 'bg-amber-500/20 text-amber-300',
    description:
      'Концентриране в собствената личност. Лидерство, сила, творчески проекти. Отстояване на Аз-а и личните граници.',
  },
  {
    name: 'Луна',
    keyword: 'емоция',
    color: 'bg-sky-500/20 text-sky-300',
    description:
      'Изострена чувствителност и емоционалност. Вътрешни преживявания, домашни ангажименти. Намиране на вътрешна стабилност.',
  },
  {
    name: 'Меркурий',
    keyword: 'изразяване',
    color: 'bg-teal-500/20 text-teal-300',
    description:
      'Изразяване, комуникация, идеи и планове. Учене, пътуване, подписване на договори. Логика и обективна преценка.',
  },
  {
    name: 'Венера',
    keyword: 'обич',
    color: 'bg-pink-500/20 text-pink-300',
    description:
      'Любов, романтика, приятелство и взаимоотношения. Красота, хармония и просперитет. Силно вътрешно доволство.',
  },
  {
    name: 'Марс',
    keyword: 'действие',
    color: 'bg-red-500/20 text-red-300',
    description:
      'Активност, динамика, сексуална енергия. Сила да отстоим желаното. Работоспособност и страст.',
  },
  {
    name: 'Юпитер',
    keyword: 'разширение',
    color: 'bg-violet-500/20 text-violet-300',
    description:
      'Разширение и нови възможности. Оптимизъм, успех и материализация. Духовност, учене и пътуване.',
  },
  {
    name: 'Сатурн',
    keyword: 'усилие',
    color: 'bg-slate-400/20 text-slate-300',
    description:
      'Налага се търпение и дисциплина. Преминаване през важни уроци и постигане на мъдрост. Дългосрочна структура и успех.',
  },
  {
    name: 'Уран',
    keyword: 'свобода',
    color: 'bg-cyan-500/20 text-cyan-300',
    description:
      'Свобода и разкрепостяване. Нещо изцяло ново и различно. Нови идеи, резки промени, непредвидимост.',
  },
  {
    name: 'Нептун',
    keyword: 'впечатление',
    color: 'bg-indigo-500/20 text-indigo-300',
    description:
      'Дълбоки и духовни процеси. Интуиция, вдъхновение и творчество. Любовни взаимоотношения и духовност.',
  },
  {
    name: 'Плутон',
    keyword: 'промяна',
    color: 'bg-purple-500/20 text-purple-300',
    description:
      'Промяна и трансформация. Вътрешно пробуждане и кармата. Мощни процеси и фатални взаимоотношения.',
  },
  {
    name: 'Асцендент',
    keyword: 'личност',
    color: 'bg-emerald-500/20 text-emerald-300',
    description:
      'Нашият Аз и нови начала. Свобода да изразим себе си. Опознаваме и развиваме себе си чрез другите.',
  },
  {
    name: 'Медиум Цели',
    keyword: 'цел',
    color: 'bg-orange-500/20 text-orange-300',
    description:
      'Цел, реализация и кариера. Постижения и израстване в социума. Важни за живота стъпки и успех.',
  },
]

const ASPECTS = [
  {
    name: 'Съвпад',
    degrees: '0°',
    dotColor: 'bg-white/80',
    keyword: 'усилване / натоварване',
    keywordColor: 'bg-white/10 text-slate-300',
    description:
      'Силно влияние. Ново начало, засаждане семената на бъдещето. При напрежение — провокация стимулираща към ново начало.',
  },
  {
    name: 'Тригон',
    degrees: '120°',
    dotColor: 'bg-emerald-400',
    keyword: 'благоприятен',
    keywordColor: 'bg-emerald-500/20 text-emerald-300',
    description:
      'Благоприятни развръзки, благоденствие, изобилие. Срещаме правилните хора в точното място и момент.',
  },
  {
    name: 'Секстил',
    degrees: '60°',
    dotColor: 'bg-sky-400',
    keyword: 'подкрепа',
    keywordColor: 'bg-sky-500/20 text-sky-300',
    description:
      'Мека и балансирана развръзка. Лек подтик за действие. Смекчаване при съществуващо напрежение.',
  },
  {
    name: 'Квадрат',
    degrees: '90°',
    dotColor: 'bg-red-400',
    keyword: 'напрежение',
    keywordColor: 'bg-red-500/20 text-red-300',
    description:
      'Напрежение, стрес, криза. Подтикване към действия. Външни предизвикателства ни карат да предприемем активност.',
  },
  {
    name: 'Опозиция',
    degrees: '180°',
    dotColor: 'bg-orange-400',
    keyword: 'конфронтация',
    keywordColor: 'bg-orange-500/20 text-orange-300',
    description:
      'Конфронтация, противопоставяне. Поставяне на лични граници. Постигане на стабилност чрез напрежение.',
  },
]

const TRANSITS = [
  {
    name: 'Луна',
    influence: '±6 часа',
    frequency: 'Много бързо',
    description: 'Усилвател на настроението. Краткотрайни емоционални вълни.',
    color: 'bg-sky-500/20 text-sky-300',
  },
  {
    name: 'Слънце',
    influence: '±3 дни',
    frequency: 'Средно влияние',
    description: 'Активира физически събития. Засилва жизнеността и самоизразяването.',
    color: 'bg-amber-500/20 text-amber-300',
  },
  {
    name: 'Меркурий',
    influence: '±1 ден',
    frequency: 'Бързо',
    description: 'Идеи и комуникация. Добър за разговори, пътувания и учене.',
    color: 'bg-teal-500/20 text-teal-300',
  },
  {
    name: 'Венера',
    influence: '±2 дни',
    frequency: 'Бързо и меко',
    description: 'Хармония и баланс. Насърчава отношенията и естетичното удоволствие.',
    color: 'bg-pink-500/20 text-pink-300',
  },
  {
    name: 'Марс',
    influence: '±3 дни',
    frequency: 'Осезаемо',
    description: 'Активира напрежение или енергия. Стимулира действие и амбиция.',
    color: 'bg-red-500/20 text-red-300',
  },
  {
    name: 'Юпитер',
    influence: '±2–3 седмици',
    frequency: '1–2 пъти на 12 години',
    description: 'Нови възможности. Носи оптимизъм, разширение и удача.',
    color: 'bg-violet-500/20 text-violet-300',
  },
  {
    name: 'Сатурн',
    influence: '±1.5 месеца',
    frequency: '1–2 пъти на 28–30 години',
    description: 'Уроци и дисциплина. Изпитва структурата и дългосрочните цели.',
    color: 'bg-slate-400/20 text-slate-300',
  },
  {
    name: 'Уран',
    influence: '±1–2 месеца',
    frequency: '1–2 пъти в живота',
    description: 'Резки промени. Разрушава старото и открива нов път.',
    color: 'bg-cyan-500/20 text-cyan-300',
  },
  {
    name: 'Нептун',
    influence: '±2 месеца',
    frequency: '1 път в живота',
    description: 'Духовни процеси. Разтваря граници и задълбочава интуицията.',
    color: 'bg-indigo-500/20 text-indigo-300',
  },
  {
    name: 'Плутон',
    influence: '±2 месеца',
    frequency: '1 път в живота',
    description: 'Трансформация. Кара дълбоки, необратими промени в живота.',
    color: 'bg-purple-500/20 text-purple-300',
  },
]

const TABS: { id: InnerTab; label: string }[] = [
  { id: 'legend', label: 'Легенда' },
  { id: 'planets', label: 'Планети' },
  { id: 'aspects', label: 'Аспекти' },
  { id: 'transits', label: 'Транзити' },
]

export function AstrologyReference() {
  const [activeTab, setActiveTab] = useState<InnerTab>('legend')

  return (
    <div className="relative rounded-xl border border-white/[0.04] bg-black/[0.15] p-5">
      {/* Top gold hairline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent"
      />

      {/* Header */}
      <div className="mb-5">
        <p className="mb-1.5 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-slate-500">
          Celestia · Речник
        </p>
        <h2 className="font-display text-lg font-semibold tracking-tight text-slate-100">
          Астрологичен <span className="font-light italic text-slate-400">справочник</span>
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500/75">
          Планети, аспекти, транзитни влияния и условните знаци на картата.
        </p>
      </div>

      {/* Inner tab switcher */}
      <div className="mb-5 flex gap-1 rounded-lg border border-white/[0.05] bg-black/20 p-1 backdrop-blur-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'border border-violet-400/[0.18] bg-violet-500/[0.12] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Planets tab */}
      {activeTab === 'planets' && (
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          <p className="mb-3 text-sm leading-relaxed text-slate-400/80">
            Всяка планета олицетворява конкретен жизнен принцип или архетип — сила, емоция, комуникация и т.н. Знакът, в който стои планетата, показва <span className="text-slate-200/90">как</span> изразяваме тази енергия, а домът — <span className="text-slate-200/90">в коя сфера</span> от живота тя действа. Заедно тези три фактора изграждат пълния астрологичен портрет на характера.
          </p>
          {PLANETS.map((planet) => (
            <div
              key={planet.name}
              className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-medium text-slate-100">{planet.name}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${planet.color}`}
                >
                  {planet.keyword}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-400/80">{planet.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Aspects tab */}
      {activeTab === 'aspects' && (
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          <p className="mb-3 text-sm leading-relaxed text-slate-400/80">
            Аспектите са ъгловите разстояния между планетите, измерени по зодиакалния кръг. Те разкриват дали две планети работят в хармония и взаимна подкрепа, или в напрежение и предизвикателство — и по двата начина стимулират нашия растеж. Разбирането на аспектите е ключът към дълбокото тълкуване на всяка карта.
          </p>
          {ASPECTS.map((aspect) => (
            <div
              key={aspect.name}
              className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${aspect.dotColor}`}
                />
                <span className="font-medium text-slate-100">{aspect.name}</span>
                <span className="text-xs text-slate-500/75">{aspect.degrees}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${aspect.keywordColor}`}
                >
                  {aspect.keyword}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-400/80">{aspect.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Legend tab */}
      {activeTab === 'legend' && (
        <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1 text-sm text-slate-300">
          <p className="mb-1 text-sm leading-relaxed text-slate-400/80">
            Наталната карта е кръгова диаграма, показваща точното положение на небесните тела в момента на раждането ви. Чете се отвън навътре: зодиакален пояс, астрологически домове, след това планетите, свързани с цветни линии-аспекти. Запознайте се с всеки елемент по-долу, за да четете картата уверено.
          </p>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex gap-1 rounded-lg border border-white/[0.05] bg-black/[0.3] px-2 py-1 text-slate-200">
                {ZODIAC_ICONS.map(name => <CelestialIcon key={name} name={name} size={18} />)}
              </span>
              <p className="font-medium text-slate-100">Зодиак</p>
            </div>
            <p className="text-slate-400/80">
              Външният пояс е разделен на 12 зодиакални знака. Всеки знак има уникален характер и енергия. Позицията на планетите в знаците оформя как изразяваме тази енергия в живота.
            </p>
          </div>

          <div>
            <p className="mb-1 font-medium text-slate-100">Домове</p>
            <p className="text-slate-400/80">
              12-те дома представляват 12 области от живота: идентичност, финанси, комуникация, дом, творчество, здраве, взаимоотношения, трансформация, мъдрост, кариера, общество, подсъзнание. Домът, в който се намира планета, показва <span className="italic text-slate-200/90">където</span> действа нейната енергия.
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex gap-1 rounded-lg border border-white/[0.05] bg-black/[0.3] px-2 py-1 text-slate-200">
                {PLANET_ICONS.map(name => <CelestialIcon key={name} name={name} size={18} />)}
              </span>
              <p className="font-medium text-slate-100">Планети</p>
            </div>
            <p className="text-slate-400/80">
              Всяка планета въплъщава жизнен принцип: Слънце (сила), Луна (емоция), Меркурий (изразяване), Венера (привличане), Марс (действие), Юпитер (разширение), Сатурн (усилие). Техните позиции разкриват характера ви.
            </p>
          </div>

          <div>
            <p className="mb-1.5 font-medium text-slate-100">Аспекти</p>
            <p className="mb-2 text-slate-400/80">
              Линиите в центъра показват ъглови връзки между планетите — как различни части от характера ви работят в синхрон или напрежение.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-5 shrink-0 rounded-full bg-green-400" />
                <p className="text-xs text-slate-400/80"><span className="text-slate-200/90">Тригон (120°)</span> — благоприятна връзка, изобилие и подкрепа. Таланти, които текат лесно.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-5 shrink-0 rounded-full bg-blue-400" />
                <p className="text-xs text-slate-400/80"><span className="text-slate-200/90">Секстил (60°)</span> — мека хармония и подкрепа. Смекчава напреженията, открива възможности.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-5 shrink-0 rounded-full bg-red-400" />
                <p className="text-xs text-slate-400/80"><span className="text-slate-200/90">Квадрат (90°)</span> — напрежение и предизвикателства. Подтиква към действие и растеж.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-5 shrink-0 rounded-full bg-orange-400" />
                <p className="text-xs text-slate-400/80"><span className="text-slate-200/90">Опозиция (180°)</span> — конфронтация и противопоставяне. Баланс постига се чрез напрежение.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-1 h-2 w-5 shrink-0 rounded-full bg-white/70" />
                <p className="text-xs text-slate-400/80"><span className="text-slate-200/90">Съвпад (0°)</span> — засилено взаимно влияние. Може да бъде мощна подкрепа или допълнителна тежест.</p>
              </div>
            </div>
          </div>

          <div>
            <p className="font-medium text-slate-100">Аспектни точки</p>
            <p className="text-slate-400/80">
              Малките цветни точки показват откъде точно започва аспектът за всяка планета. Цветът им съвпада със съответната планета.
            </p>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-400/20 bg-black/[0.3] text-xs font-bold text-red-400">
                R
              </span>
              <p className="font-medium text-slate-100">Ретрограден (R)</p>
            </div>
            <p className="text-slate-400/80">
              Малкото червено „R" до планета означава, че тя е ретроградна – от Земята изглежда сякаш се движи назад. Тази енергия обикновено се проявява по-вътрешно или изисква преосмисляне.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/[0.04] bg-black/[0.2] p-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-3 w-8 rounded-full bg-cyan-400" />
                <span className="font-medium text-slate-100">Синя линия</span>
              </div>
              <p className="text-xs text-slate-400/80">
                Асцендент — вашата <span className="text-slate-200/90">персона</span>. Знакът на хоризонта в момента на раждането. Олицетворява вашето Аз, нови начала и начина, по който другите ви виждат на пръв поглед.
              </p>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-3 w-8 rounded-full bg-pink-400" />
                <span className="font-medium text-slate-100">Розова линия</span>
              </div>
              <p className="text-xs text-slate-400/80">
                MC — вашата <span className="text-slate-200/90">цел</span>. Най-високата точка в картата. Показва кариера, призвание, амбиции и важните стъпки към реализация в живота.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transits tab */}
      {activeTab === 'transits' && (
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          <p className="mb-3 text-sm leading-relaxed text-slate-400/80">
            Транзитите са текущото движение на планетите и взаимодействието им с фиксираните точки в наталната карта. Бързите планети (Луна, Слънце, Меркурий, Венера, Марс) носят ежедневни и седмични нюанси, докато бавните (Юпитер, Сатурн, Уран, Нептун, Плутон) белязват дългосрочни, понякога животоопределящи периоди. Продължителността и честотата по-долу показват колко дълго и рядко се случва всяко влияние.
          </p>
          {TRANSITS.map((transit) => (
            <div
              key={transit.name}
              className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3"
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-100">{transit.name}</span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${transit.color}`}
                >
                  {transit.influence}
                </span>
                <span className="rounded-full border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-400/80">
                  {transit.frequency}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-400/80">{transit.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
