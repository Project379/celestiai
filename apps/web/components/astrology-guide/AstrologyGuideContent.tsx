'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ComponentProps } from 'react'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

type IconName = ComponentProps<typeof CelestialIcon>['name']

/**
 * Editorial fade-up with blur - same motion language as the dashboard.
 * Pass `custom` index to stagger.
 */
const fadeUp = {
  hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.62,
      delay: i * 0.05,
      ease: [0.22, 0.68, 0.35, 1] as const,
    },
  }),
}

/* ─── Data ────────────────────────────────────────────────────────── */

type Planet = { iconName: IconName; name: string; keyword: string; desc: string }

const planetGroups: { label: string; caption: string; planets: Planet[] }[] = [
  {
    label: 'Лични',
    caption: 'Ежедневната ти природа',
    planets: [
      { iconName: 'sun',     name: 'Слънце',   keyword: 'Сила',        desc: 'Лидерство, идентичност, жизнена сила' },
      { iconName: 'moon',    name: 'Луна',     keyword: 'Емоция',      desc: 'Чувства, интуиция, домашен уют' },
      { iconName: 'mercury', name: 'Меркурий', keyword: 'Изразяване',  desc: 'Комуникация, мисъл, пътувания' },
      { iconName: 'venus',   name: 'Венера',   keyword: 'Нежност',     desc: 'Любов, красота, хармония' },
      { iconName: 'mars',    name: 'Марс',     keyword: 'Действие',    desc: 'Страст, енергия, инициативност' },
    ],
  },
  {
    label: 'Социални',
    caption: 'Ролята ти в света',
    planets: [
      { iconName: 'jupiter', name: 'Юпитер', keyword: 'Разширяване', desc: 'Растеж, удача, мъдрост' },
      { iconName: 'saturn',  name: 'Сатурн', keyword: 'Усилие',      desc: 'Дисциплина, уроци, структура' },
    ],
  },
  {
    label: 'Трансперсонални',
    caption: 'Дълбоките трансформации',
    planets: [
      { iconName: 'uranus',  name: 'Уран',    keyword: 'Свобода',     desc: 'Промяна, иновация, бунт' },
      { iconName: 'neptune', name: 'Нептун',  keyword: 'Впечатление', desc: 'Духовност, интуиция, мечти' },
      { iconName: 'pluto',   name: 'Плутон',  keyword: 'Промяна',     desc: 'Трансформация, карма, мощ' },
    ],
  },
]

const aspects = [
  {
    name: 'Съединение',
    degrees: '0°',
    keyword: 'Засилване',
    tint: 'text-violet-300',
    desc: 'Две планети на едно място - енергията им се слива и се усилва, нови начала.',
  },
  {
    name: 'Секстил',
    degrees: '60°',
    keyword: 'Подкрепа',
    tint: 'text-cyan-300',
    desc: 'Мека хармония, лек подтик за действие - само трябва да протегнеш ръка.',
  },
  {
    name: 'Квадрат',
    degrees: '90°',
    keyword: 'Напрежение',
    tint: 'text-amber-300',
    desc: 'Предизвикателство и триене - но именно те ни тласкат напред и ни изграждат.',
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
    desc: 'Противопоставяне между два принципа - пътят е да намериш средната точка.',
  },
]

const calculationSteps = [
  {
    numeral: 'I',
    title: 'Swiss Ephemeris',
    desc: 'Използваме swisseph - индустриалният стандарт в астрологията, базиран на НАСА данни с точност до дъга-секунди.',
  },
  {
    numeral: 'II',
    title: 'Твоите данни',
    desc: 'Въвеждаш точното място, дата и час на раждане - тези три параметъра определят уникалната ти натална карта.',
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
]

/* ─── Small pieces ────────────────────────────────────────────────── */

function SectionMark({ numeral, eyebrow, title }: { numeral: string; eyebrow: string; title: string }) {
  return (
    <header className="mb-8">
      <p className="mb-4 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em]">
        <span className="text-amber-300/80">{numeral}</span>
        <span aria-hidden className="h-px w-8 bg-gradient-to-r from-amber-300/60 to-transparent" />
        <span className="text-slate-400">{eyebrow}</span>
      </p>
      <h2 className="font-display text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-[2rem]">
        {title}
      </h2>
    </header>
  )
}

function Divider() {
  return (
    <div className="my-16 flex items-center justify-center gap-4" aria-hidden>
      <span className="h-px flex-1 max-w-[9rem] bg-gradient-to-r from-transparent via-slate-300/15 to-amber-300/35" />
      <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
      <span className="h-px flex-1 max-w-[9rem] bg-gradient-to-l from-transparent via-slate-300/15 to-amber-300/35" />
    </div>
  )
}

function Section({
  children,
  index,
  className = '',
}: {
  children: React.ReactNode
  index: number
  className?: string
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
      custom={index}
      className={className}
    >
      {children}
    </motion.section>
  )
}

/* ─── Page ────────────────────────────────────────────────────────── */

export function AstrologyGuideContent() {
  return (
    <div className="relative mx-auto max-w-3xl">
      {/* Ambient atmosphere - scattered across the scroll */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-violet-500/[0.08] blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[28%] -z-10 h-[380px] w-[380px] rounded-full bg-amber-500/[0.05] blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-[70%] -z-10 h-[360px] w-[360px] rounded-full bg-violet-500/[0.06] blur-[100px]"
      />

      {/* ── Hero ──────────────────────────────────────────── */}
      <motion.header
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-16 sm:mb-20"
      >
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-400">
          Ръководство
        </p>
        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 text-[2.125rem] leading-[1.1] tracking-tight sm:text-[2.75rem]">
          <span className="font-light text-slate-300">Какво е</span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent drop-shadow-[0_0_28px_rgba(251,191,36,0.18)]">
            астрологията?
          </span>
        </h1>
        <p className="mt-6 max-w-xl font-display text-[17px] font-light leading-[1.85] text-slate-300 sm:text-[18px]">
          Пътеводител от древните вавилонски звездочетци до прецизните алгоритми,
          с които Stellaeum изчислява твоята натална карта.
        </p>
        <div className="mt-7 flex items-center gap-3">
          <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="h-px w-48 bg-gradient-to-r from-amber-300/50 via-slate-300/20 to-transparent" />
        </div>
      </motion.header>

      {/* ── I · History ──────────────────────────────────── */}
      <Section index={1}>
        <SectionMark numeral="I" eyebrow="Произход" title="История на астрологията" />
        <div className="max-w-2xl space-y-5 text-[16px] leading-[1.85] text-slate-300/90">
          <p>
            Астрологията е една от <span className="text-slate-100">най-древните науки в историята на човечеството</span> - датира от над 4 000 години. Зародила се в Месопотамия (Вавилон), където свещениците наблюдавали небето, за да предсказват реколтите и съдбата на царете.
          </p>
          <p>
            Оттам знанието преминало към египтяните, после към гърците и римляните, които го обогатили с философия и математика. Хипократ прилагал астрологията в медицината, а Птолемей написал <em className="text-slate-200">Тетрабиблос</em> - наръчник, използван и до днес.
          </p>
          <p>
            По времето на Ренесанса астрологията се завърнала в Европа след средновековния застой, преплитайки се с алхимия и натурфилософия. Модерната западна астрология използва <span className="text-slate-100">Тропическия зодиак</span>, основан на сезоните, а не на физическото положение на съзвездията.
          </p>
        </div>

        {/* Editorial pull-quote - the one callout we preserve */}
        <figure className="mt-10 max-w-2xl border-l border-amber-300/40 pl-6">
          <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.36em] text-amber-300/80">
            Stellaeum
          </p>
          <blockquote className="font-display text-[17px] font-light leading-[1.8] text-slate-200/95">
            Използваме <span className="font-medium text-slate-100">Swiss Ephemeris</span> - най-прецизните астрономически изчисления в света, разработени от Astrodienst и базирани на НАСА данни.
          </blockquote>
        </figure>
      </Section>

      <Divider />

      {/* ── II · Principles ──────────────────────────────── */}
      <Section index={2}>
        <SectionMark numeral="II" eyebrow="Принципи" title="Как работи астрологията?" />
        <div className="max-w-2xl space-y-5 text-[16px] leading-[1.85] text-slate-300/90">
          <p>
            Астрологията изучава <span className="text-slate-100">символичната връзка</span> между положението на небесните тела и събитията и качествата, проявени на Земята. Тя не твърди причинно-следствена връзка, а работи с архетипни паралели - <em className="text-slate-200">„Горе, каквото и долу"</em>.
          </p>
        </div>

        {/* Tripartite editorial - no cards, just rhythm */}
        <div className="mt-10 grid max-w-2xl gap-x-10 gap-y-7 sm:grid-cols-3">
          {[
            { count: '10', label: 'планети',  desc: 'Всяка - архетипен принцип.' },
            { count: '12', label: 'знака',    desc: 'Стилът и тонът на израза.' },
            { count: '12', label: 'дома',     desc: 'Сферите на живота.' },
          ].map((item) => (
            <div key={item.label}>
              <p className="font-display text-[2.5rem] font-light leading-none tracking-tight text-slate-100">
                {item.count}
                <span className="ml-1.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-300/70 align-middle">
                  {item.label}
                </span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-[16px] leading-[1.85] text-slate-300/90">
          <span className="text-slate-100">Наталната карта</span> е „моментна снимка" на небето в секундата на твоето раждане. Аспектите (ъглите между планетите) разкриват как различните части от твоята личност работят заедно - в хармония или в напрежение. Транзитите пък показват как движещите се планети <em className="text-slate-200">сега</em> взаимодействат с твоята натална карта.
        </p>
      </Section>

      <Divider />

      {/* ── III · Planets ────────────────────────────────── */}
      <Section index={3}>
        <SectionMark numeral="III" eyebrow="Архетипи" title="Планетните принципи" />
        <p className="mb-10 max-w-2xl text-[16px] leading-[1.85] text-slate-300">
          Всяка планета е архетип - носи конкретна енергия и управлява определени сфери от живота.
        </p>

        <div className="space-y-12">
          {planetGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-5 flex items-baseline gap-4">
                <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/80">
                  {group.label}
                </p>
                <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-amber-300/30 via-slate-300/10 to-transparent" />
                <p className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-400">
                  {group.caption}
                </p>
              </div>

              <dl className="grid gap-x-10 border-t border-white/[0.05] sm:grid-cols-2">
                {group.planets.map((planet) => (
                  <div
                    key={planet.name}
                    className="flex items-start gap-4 border-b border-white/[0.05] py-4"
                  >
                    <CelestialIcon
                      name={planet.iconName}
                      size={22}
                      className="mt-1 shrink-0 text-slate-200/85"
                    />
                    <div className="flex-1">
                      <div className="mb-0.5 flex items-baseline gap-3">
                        <dt className="font-display text-[17px] font-semibold text-slate-100">
                          {planet.name}
                        </dt>
                        <span className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/75">
                          {planet.keyword}
                        </span>
                      </div>
                      <dd className="text-[13.5px] leading-relaxed text-slate-300/85">
                        {planet.desc}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Section>

      <Divider />

      {/* ── IV · Aspects ─────────────────────────────────── */}
      <Section index={4}>
        <SectionMark numeral="IV" eyebrow="Геометрия" title="Аспектите" />
        <p className="mb-10 max-w-2xl text-[16px] leading-[1.85] text-slate-300">
          Аспектите са ъглите между планетите - те описват как различните принципи в теб разговарят помежду си.
        </p>

        <ul className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
          {aspects.map((aspect) => (
            <li
              key={aspect.name}
              className="group grid grid-cols-[5rem_1fr] items-baseline gap-x-6 py-5 transition-colors hover:bg-white/[0.015] sm:grid-cols-[5rem_10rem_1fr]"
            >
              <span
                className={`font-display text-[1.75rem] font-light leading-none tracking-tight tabular-nums ${aspect.tint}`}
              >
                {aspect.degrees}
              </span>
              <div className="col-span-1 sm:col-span-1">
                <p className="font-display text-[17px] font-semibold text-slate-100">
                  {aspect.name}
                </p>
                <p
                  className={`mt-0.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] ${aspect.tint}`}
                >
                  {aspect.keyword}
                </p>
              </div>
              <p className="col-span-2 mt-2 text-[14px] leading-relaxed text-slate-300/85 sm:col-span-1 sm:mt-0 sm:text-[14.5px]">
                {aspect.desc}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Divider />

      {/* ── V · Transits ─────────────────────────────────── */}
      <Section index={5}>
        <SectionMark numeral="V" eyebrow="Време" title="Транзитите" />
        <p className="mb-10 max-w-2xl text-[16px] leading-[1.85] text-slate-300/90">
          Транзитите са <span className="text-slate-100">текущото движение на планетите</span> и начинът, по който те взаимодействат с позициите от наталната ти карта. Именно транзитите обясняват защо определени периоди от живота ни носят нов старт, изпитания или прозрения.
        </p>

        <div className="grid gap-y-10 sm:grid-cols-2 sm:gap-x-12 sm:divide-x sm:divide-white/[0.06]">
          <div className="sm:pr-6">
            <div className="mb-3 flex items-center gap-3">
              <CelestialIcon name="sun" size={18} className="text-amber-300/90" />
              <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
                Бързи планети
              </p>
            </div>
            <p className="font-display text-[17px] font-semibold text-slate-100">
              Луна, Слънце, Меркурий, Венера, Марс
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.8] text-slate-300/90">
              Носят ежедневни и седмични влияния - настроения, комуникация, малки предизвикателства.
            </p>
            <p className="mt-4 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              Цикъл · дни - месеци
            </p>
          </div>

          <div className="sm:pl-6">
            <div className="mb-3 flex items-center gap-3">
              <CelestialIcon name="saturn" size={18} className="text-indigo-300/90" />
              <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-indigo-300/80">
                Бавни планети
              </p>
            </div>
            <p className="font-display text-[17px] font-semibold text-slate-100">
              Юпитер, Сатурн, Уран, Нептун, Плутон
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.8] text-slate-300/90">
              Белязват дългосрочни промени - смяна на кариера, дълбоки трансформации, жизнени уроци.
            </p>
            <p className="mt-4 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              Цикъл · години - десетилетия
            </p>
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-[16px] leading-[1.85] text-slate-300/90">
          <span className="text-slate-100">Stellaeum</span> изчислява транзитите в реално време и ги съпоставя с наталната ти карта - за да знаеш какви небесни влияния действат върху теб точно сега и как да ги използваш в своя полза.
        </p>
      </Section>

      <Divider />

      {/* ── VI · Lunar phases ────────────────────────────── */}
      <Section index={6}>
        <SectionMark numeral="VI" eyebrow="Ритъм" title="Лунните фази и манифестация" />
        <p className="mb-10 max-w-2xl text-[16px] leading-[1.85] text-slate-200/95">
          Луната завършва пълния си <span className="text-white">синодичен цикъл за около 29 дни и 12 часа</span>, от новолуние до новолуние. Този ритъм не е просто астрономичен: той е структуриран енергиен ток, в който всяка фаза ти дава различна задача. <span className="text-white">Нарастващата половина</span> изгражда (намерения, действие, усъвършенстване). <span className="text-white">Намаляващата половина</span> освобождава (благодарност, пускане, почивка).
        </p>

        <div className="mb-12 grid gap-y-10 sm:grid-cols-2 sm:gap-x-12 sm:divide-x sm:divide-white/[0.06]">
          <div className="sm:pr-6">
            <div className="mb-3 flex items-center gap-3">
              <span aria-hidden className="text-[18px] text-amber-300/90">☽</span>
              <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
                Нарастваща половина
              </p>
            </div>
            <p className="font-display text-[17px] font-semibold text-slate-100">
              Изграждане, действие, усъвършенстване
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.8] text-slate-200/90">
              От новолунието до пълнолунието. Сееш намерение, правиш първите стъпки, срещаш препятствия и настройваш курса, докато проектът не достигне връхната си точка.
            </p>
            <p className="mt-4 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-300">
              Около 14 дни и 16 часа
            </p>
          </div>

          <div className="sm:pl-6">
            <div className="mb-3 flex items-center gap-3">
              <span aria-hidden className="text-[18px] text-indigo-300/90">☾</span>
              <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-indigo-300/90">
                Намаляваща половина
              </p>
            </div>
            <p className="font-display text-[17px] font-semibold text-slate-100">
              Благодарност, пускане, почивка
            </p>
            <p className="mt-3 text-[14.5px] leading-[1.8] text-slate-200/90">
              От пълнолунието до следващото новолуние. Празнуваш постигнатото, освобождаваш онова, което не работи, приключваш и си почиваш, преди цикълът да започне отново.
            </p>
            <p className="mt-4 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-300">
              Около 14 дни и 16 часа
            </p>
          </div>
        </div>

        <div className="space-y-12">
          <div>
            <div className="mb-5 flex items-baseline gap-4">
              <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
                Осемте фази
              </p>
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-amber-300/30 via-slate-300/10 to-transparent" />
              <p className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-300">
                Изглед и насока
              </p>
            </div>

            <dl className="grid gap-x-10 border-t border-white/[0.05] sm:grid-cols-2">
              {[
                {
                  name: 'Новолуние',
                  task: 'Постави намерения',
                  appearance: 'Луната е обърната с тъмната си страна към Земята и обикновено не може да бъде видяна, тъй като се намира между Земята и Слънцето. Изключение е случаят при слънчево затъмнение, когато Луната засенчва Слънцето.',
                },
                {
                  name: 'Изгряващ полумесец',
                  task: 'Изгради импулс',
                  appearance: 'Тънък сребрист полумесец започва да се появява от дясната страна. Първата видима фаза след новолунието, когато Луната започва да расте.',
                },
                {
                  name: 'Първа четвърт',
                  task: 'Вземи решение',
                  appearance: 'Дясната половина от лунната повърхност е осветена.',
                },
                {
                  name: 'Растяща луна',
                  task: 'Усъвършенствай',
                  appearance: 'Повече от половината лунна повърхност е осветена, но Луната още не е пълна. Осветената част продължава да расте и покрива все по-голяма част от диска. Нарича се още „млада луна", защото наближава пълнолунието.',
                },
                {
                  name: 'Пълнолуние',
                  task: 'Празнувай и пусни',
                  appearance: 'Когато Земята е между Луната и Слънцето. Целият лунен диск е видим, освен при лунно затъмнение.',
                },
                {
                  name: 'Намаляваща луна',
                  task: 'Благодарност',
                  appearance: 'Луната започва да намалява и осветлението отслабва от дясната страна. Повече от половината лунна повърхност още е видима, но постепенно се смалява. Нарича се още „стара луна".',
                },
                {
                  name: 'Последна четвърт',
                  task: 'Пусни',
                  appearance: 'Лявата половина от лунната повърхност е осветена.',
                },
                {
                  name: 'Залязващ полумесец',
                  task: 'Почивка',
                  appearance: 'Луната продължава да намалява и оставя тънък сребрист полумесец от лявата страна. Последната видима фаза преди следващото новолуние.',
                },
              ].map((phase) => (
                <div
                  key={phase.name}
                  className="flex items-start gap-4 border-b border-white/[0.05] py-5"
                >
                  <div className="mt-1 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-[#0d0b18] text-[13px] text-amber-200/90">
                    ☾
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <dt className="font-display text-[17px] font-semibold text-slate-100">
                        {phase.name}
                      </dt>
                      <span className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/85">
                        {phase.task}
                      </span>
                    </div>
                    <dd className="text-[14px] leading-[1.8] text-slate-200/95">
                      {phase.appearance}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <p className="mt-10 max-w-2xl text-[16px] leading-[1.85] text-slate-200/95">
          <span className="text-white">Stellaeum</span> изчислява текущата лунна фаза в реално време и я показва на таблото ти, с конкретна насока за манифестация според мястото, където се намира цикълът в момента. На дашборда намираш и пълния манифест за всяка фаза: афирмация, кристал, ритуал и въпрос за дневника.
        </p>
      </Section>

      <Divider />

      {/* ── VII · Method ─────────────────────────────────── */}
      <Section index={7}>
        <SectionMark numeral="VII" eyebrow="Метод" title="Как Stellaeum изчислява твоята карта" />
        <ol className="max-w-2xl divide-y divide-white/[0.05] border-y border-white/[0.05]">
          {calculationSteps.map((item) => (
            <li key={item.numeral} className="grid grid-cols-[3rem_1fr] items-baseline gap-x-5 py-5">
              <span className="font-cinzel text-[13px] font-bold tracking-[0.18em] text-amber-300/80">
                {item.numeral}
              </span>
              <div>
                <p className="font-display text-[17px] font-semibold text-slate-100">
                  {item.title}
                </p>
                <p className="mt-1 text-[14.5px] leading-[1.8] text-slate-300/90">
                  {item.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Back link ────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
        variants={fadeUp}
        custom={8}
        className="mb-16 mt-16 text-center"
      >
        <div className="mb-6 flex items-center justify-center gap-3" aria-hidden>
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-amber-300/40" />
          <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-amber-300/40" />
        </div>
        <Link
          href="/dashboard"
          className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-400 transition-colors hover:text-amber-300"
        >
          &larr; Обратно към таблото
        </Link>
      </motion.div>
    </div>
  )
}
