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
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 -z-10 h-[360px] w-[360px] rounded-full bg-violet-500/[0.08] blur-[110px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-60 -z-10 h-[280px] w-[280px] rounded-full bg-amber-500/[0.06] blur-[90px]"
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
          <span className="font-light italic text-slate-400">Камъните на</span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text font-semibold text-transparent">
            твоето небе
          </span>
        </h1>
        <p className="mt-5 max-w-2xl font-display text-[17px] font-light italic leading-[1.8] text-slate-400">
          Тридесет кристала, подредени по планета и лунна фаза. Celestia ги избира за теб според наталната ти карта и текущото небе — не всеки ден, а тогава, когато наистина имат значение.
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
        <h2 className="mb-7 font-display text-[1.75rem] font-semibold leading-tight text-slate-100 sm:text-[2rem]">
          Два-три камъка на месец — не повече
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <GuideStep
            numeral="I"
            title="Рожден камък"
            body="При първата си среща с колекцията получаваш своя рожден камък — избран по слънчевия знак в картата ти. Остава с теб завинаги, без значение какво прави небето."
          />
          <GuideStep
            numeral="II"
            title="Новолуние"
            body="Около всяко новолуние (±3 дни) се отваря прозорец за нов камък, свързан с фазата. Препоръката изчезва, ако не я прибереш навреме — затова я наричаме прозорец, а не списък."
          />
          <GuideStep
            numeral="III"
            title="Пълнолуние"
            body="Пълнолунието носи втория камък на месеца. Той усилва кулминацията — емоционалния пик, решението, което отлагаш от седмици."
          />
          <GuideStep
            numeral="IV"
            title="Транзити (скоро)"
            body="Когато тежка планета ти прави напрегнат аспект, Celestia предлага камък за момента. Рамката е готова — активира се в следваща версия."
          />
          <GuideStep
            numeral="V"
            title="Редкост"
            body="Всеки камък носи тежест — общ, рядък, ценен или легендарен. По-често виждаш общите, а легендарните идват рядко и не случайно."
          />
          <GuideStep
            numeral="VI"
            title="Физически камък"
            body="Ако поискаш истинския камък, Celestia ще те свърже с български магазин — партньорство, което подготвяме. Засега всичко е дигитално и безплатно за премиум потребителите."
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
          Защо камъни и звезди вървят заедно
        </h2>
        <div className="space-y-5 font-display text-[16px] font-light leading-[1.9] text-slate-300/95">
          <p>
            Съответствието между планети и минерали се появява в писмени източници още от IV век. Древните египтяни стривали малахит за очна боя, римляните носели тигрово око в битка, ведическите текстове подреждат деветте камъка на навратна — по един за всяка небесна сила.
          </p>
          <p>
            Логиката е проста. Всяка планета има свой темперамент — Марс гори, Сатурн събира, Луна се лее. Всеки минерал също има темперамент, даден му от цвета, твърдостта и начина, по който пречупва светлината. Когато двете съвпаднат, камъкът работи като малък физически котел за идеята, която носи планетата.
          </p>
          <p>
            Celestia не твърди, че камъните правят чудеса. По-скоро са фокусираща леща — начин да превърнеш едно астрологично състояние в нещо, което можеш да държиш между пръстите си. Ритуалът е за теб, не за тях.
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
                <p className="mt-1 font-display text-[14px] font-light italic text-slate-400">
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
                      className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.04]"
                    >
                      <div className="flex-shrink-0">
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

      {/* ── CTA ──────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={4}
        className="mt-20 rounded-3xl border border-amber-300/20 bg-amber-400/[0.03] px-6 py-10 text-center sm:px-10"
      >
        <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
          Твоята колекция те чака
        </p>
        <p className="mx-auto mt-4 max-w-xl font-display text-[17px] font-light italic leading-[1.85] text-slate-300">
          Тридесет камъка седят в каталога. Два-три ще стигнат до колекцията ти този месец — ако наминеш, когато небето каже „сега".
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/crystals"
            className="rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-7 py-3 font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition-colors hover:border-amber-200 hover:bg-amber-400/15"
          >
            Към колекцията
          </Link>
          <Link
            href="/astrology-guide"
            className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 transition-colors hover:text-amber-300"
          >
            &larr; Към ръководството
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-6">
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
