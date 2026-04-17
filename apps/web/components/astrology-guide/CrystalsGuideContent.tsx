'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { CrystalGem, type GemVariant } from '@/components/crystals/CrystalGem'
import {
  CRYSTAL_GUIDE_BG,
  CRYSTAL_GUIDE_FAMILIES,
} from '@/lib/crystals/guide-content-bg'

interface CatalogEntry {
  slug: string
  name_en: string
  color_primary: string
  color_secondary: string
  color_accent: string | null
  svg_variant: string
  rarity: string
}

interface CrystalsGuideContentProps {
  catalog: CatalogEntry[]
}

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

export function CrystalsGuideContent({ catalog }: CrystalsGuideContentProps) {
  const bySlug = new Map(catalog.map((c) => [c.slug, c]))

  return (
    <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-12 sm:px-6">
      {/* Ambient atmosphere — matches the crystals tab */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 -z-10 h-[380px] w-[380px] rounded-full bg-violet-500/[0.09] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-60 -z-10 h-[300px] w-[300px] rounded-full bg-amber-500/[0.06] blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[60%] -z-10 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-indigo-500/[0.05] blur-[110px]"
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-16 sm:mb-20"
      >
        <p className="mb-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-500">
          Ръководство · Кристали
        </p>
        <h1 className="font-display flex flex-wrap items-baseline gap-x-3 text-[2rem] leading-[1.12] tracking-tight text-slate-100 sm:text-[2.8rem]">
          <span className="font-light text-slate-400">Камъните на</span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent">
            твоето небе
          </span>
        </h1>
        <p className="mt-5 max-w-2xl font-display text-[17px] font-light leading-[1.85] text-slate-400">
          Тридесет камъка, подредени по планета и лунна фаза. Celestia отваря прозорец за някой от тях само когато небето е готово — около новолуние, пълнолуние или когато бавна планета мине близо до картата ти. Пропуснеш ли прозореца, възможността се затваря заедно с него.
        </p>
      </motion.div>

      {/* ── Как работи ───────────────────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
        className="mb-20"
      >
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-400">
          Как работи колекцията
        </p>
        <h2 className="mb-4 font-display text-[1.75rem] font-semibold leading-tight text-slate-100 sm:text-[2rem]">
          Малко камъни, но точните
        </h2>
        <p className="mb-8 max-w-2xl font-display text-[15.5px] font-light leading-[1.85] text-slate-400">
          Колекцията ти има два ритъма. Бавният — два или три редки камъка на месец, които се появяват само когато небето отвори прозорец; тогава трябва да се върнеш и да ги прибереш, преди прозорецът да се затвори. И бързият — по един камък на ден, който отключваш с всяко отваряне на таблото.
        </p>

        <div className="mystic-panel grid gap-px overflow-hidden bg-white/[0.03] sm:grid-cols-2 lg:grid-cols-3">
          <GuideStep
            numeral="I"
            title="Рожден камък"
            body="Първият прозорец, който се отваря за теб, е за рождения ти камък — избран по слънчевия знак от картата ти. Връщаш се в „Прозорци“, събираш го и той остава с теб завинаги, каквото и да прави небето над главата ти."
          />
          <GuideStep
            numeral="II"
            title="Новолуние"
            body="Около всяко новолуние — за около три дни — се отваря прозорец за нов камък на фазата. Ако не се върнеш навреме, прозорецът се затваря заедно с възможността. Затова е прозорец, а не полица."
          />
          <GuideStep
            numeral="III"
            title="Пълнолуние"
            body="Пълнолунието носи втория камък за месеца. Той усилва кулминацията — емоционалния връх, решението, което отлагаш от седмици. Събереш ли го навреме, е твой."
          />
          <GuideStep
            numeral="IV"
            title="Транзити"
            body="Когато някоя от бавните планети натисне лична планета в картата ти, Celestia отваря прозорец за камък, който да събере този натиск. Прозорецът трае около две седмици — колкото да го усетиш и да решиш дали искаш камъка."
          />
          <GuideStep
            numeral="V"
            title="Ежедневна серия"
            body="Успоредно с редките камъни върви всекидневен ритъм. Всеки път, когато отвориш таблото, отключваш днешния камък на лунната фаза и удължаваш серията си с още един ден. Пропуснеш ли ден, серията се нулира."
          />
          <GuideStep
            numeral="VI"
            title="Рядкост"
            body="Всеки камък носи своята тежест — обикновен, рядък, ценен или легендарен. Обикновените срещаш често; легендарните идват рядко и никога случайно."
          />
          <GuideStep
            numeral="VII"
            title="Физически камък"
            body="Ако поискаш истинския минерал, Celestia ще те свърже с български магазин — партньорство, което подготвяме. Засега всичко е дигитално и е част от премиум абонамента."
          />
          <GuideStep
            numeral="VIII"
            title="Безплатно и премиум"
            body="С безплатния абонамент виждаш дневния камък на таблото и можеш да четеш ръководството — достатъчно, за да усетиш ритъма. Колекцията, препоръките от наталната ти карта, транзитите и ежедневната серия са част от премиума."
          />
        </div>
      </motion.section>

      {/* ── Философията ──────────────────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={2}
        className="mb-20"
      >
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-400">
          Философия
        </p>
        <h2 className="mb-6 font-display text-[1.6rem] font-semibold leading-tight text-slate-100 sm:text-[1.85rem]">
          Защо камъните вървят със звездите
        </h2>
        <div className="mystic-panel space-y-5 px-6 py-8 font-display text-[16px] font-light leading-[1.9] text-slate-300/95 sm:px-10">
          <p>
            Писмени източници описват връзката между планетите и минералите още от IV век. Египтяните стривали малахит за очна боя, римляните носели тигрово око в битка, а ведическите текстове подреждат деветте камъка на навратна — по един за всяка небесна сила.
          </p>
          <p>
            Логиката е проста. Всяка планета има свой характер — Марс гори, Сатурн събира, Луната се лее. Всеки минерал също си има характер, даден му от цвета, твърдостта и начина, по който пречупва светлината. Когато двете си паснат, камъкът започва да работи като малък физически съсъд за идеята, която планетата носи.
          </p>
          <p>
            Celestia не обещава чудеса. Камъните са по-скоро фокусираща леща — начин да превърнеш една абстрактна астрологична конфигурация в нещо, което можеш да стиснеш между пръстите си. Ритуалът е за теб, не за тях.
          </p>
        </div>
      </motion.section>

      {/* ── Семействата ──────────────────────────────────── */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={3}
        className="mb-16"
      >
        <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-400">
          Каталог по семейства
        </p>
        <h2 className="mb-8 font-display text-[1.6rem] font-semibold leading-tight text-slate-100 sm:text-[1.85rem]">
          Тридесет камъка, девет семейства
        </h2>

        <div className="space-y-14">
          {CRYSTAL_GUIDE_FAMILIES.map((family) => (
            <div key={family.id}>
              <div className="mb-5 border-l-2 border-amber-300/30 pl-4">
                <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
                  {family.title}
                </p>
                <p className="mt-1 font-display text-[14px] font-light text-slate-400">
                  {family.subtitle}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {family.slugs.map((slug) => {
                  const entry = bySlug.get(slug)
                  const blurb = CRYSTAL_GUIDE_BG[slug]
                  if (!entry || !blurb) return null
                  return (
                    <div
                      key={slug}
                      className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-300/25 hover:bg-white/[0.04]"
                    >
                      <div className="flex-shrink-0 transition-transform duration-500 group-hover:scale-105">
                        <CrystalGem
                          variant={entry.svg_variant as GemVariant}
                          primary={entry.color_primary}
                          secondary={entry.color_secondary}
                          accent={entry.color_accent}
                          size={72}
                          seed={entry.slug}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-[16px] font-medium text-slate-100">
                          {blurb.nameBg}
                        </h3>
                        <p className="mt-1 font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                          {entry.name_en} · {entry.rarity}
                        </p>
                        <p className="mt-2.5 font-display text-[13.5px] font-light leading-[1.7] text-slate-400">
                          {blurb.bg}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Editorial finale ─────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={4}
        className="mt-20 text-center"
      >
        <div
          className="mb-8 flex items-center justify-center gap-4"
          aria-hidden
        >
          <span className="h-px w-20 bg-gradient-to-r from-transparent to-amber-300/40" />
          <span className="h-1.5 w-1.5 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="h-px w-20 bg-gradient-to-l from-transparent to-amber-300/40" />
        </div>

        <h2 className="mx-auto max-w-lg font-display text-[1.45rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[1.7rem]">
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text text-transparent">
            Върни се към камъните си
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-xl font-display text-[15px] font-light leading-[1.85] text-slate-400">
          Тридесет минерала чакат в каталога. До теб ще стигнат само онези, които небето посочи в точния момент. Прозорецът се отваря, ти се връщаш, събираш камъка — така расте колекцията.
        </p>

        <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-center sm:gap-10">
          <Link
            href="/crystals"
            className="group inline-flex items-center gap-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-200 transition-colors hover:text-amber-100"
          >
            <span className="h-px w-5 bg-gradient-to-r from-transparent to-amber-300/70 transition-all duration-300 group-hover:w-7" />
            Към моите камъни
            <span className="h-px w-5 bg-gradient-to-l from-transparent to-amber-300/70 transition-all duration-300 group-hover:w-7" />
          </Link>
          <Link
            href="/dashboard"
            className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-500 transition-colors hover:text-amber-300"
          >
            &larr; Обратно към таблото
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

function GuideStep({
  numeral,
  title,
  body,
}: {
  numeral: string
  title: string
  body: string
}) {
  return (
    <div className="relative flex flex-col bg-[#0a0715]/60 px-6 py-7 transition-colors duration-300 hover:bg-white/[0.02]">
      <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/80">
        {numeral}
      </p>
      <h3 className="mt-2 font-display text-[17px] font-semibold text-slate-100">
        {title}
      </h3>
      <p className="mt-3 font-display text-[13.5px] font-light leading-[1.75] text-slate-400">
        {body}
      </p>
    </div>
  )
}
