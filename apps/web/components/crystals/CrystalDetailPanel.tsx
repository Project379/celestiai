'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CrystalGem, type GemVariant } from './CrystalGem'

export interface CrystalDetailData {
  slug: string
  nameEn: string
  nameBg: string | null
  taglineEn: string
  taglineBg: string | null
  descriptionEn: string
  descriptionBg: string | null
  planet: string | null
  zodiacSigns: string[]
  moonPhases: string[]
  element: string | null
  chakra: string | null
  hardness: number | null
  colorPrimary: string
  colorSecondary: string
  colorAccent: string | null
  svgVariant: string
  rarity: string
  keywords: string[]
}

interface CrystalDetailPanelProps {
  crystal: CrystalDetailData | null
  reason?: string | null
  canCollect?: boolean
  collecting?: boolean
  onCollect?: () => void
  onClose: () => void
}

const PHASE_BG: Record<string, string> = {
  new: 'Новолуние',
  waxing_crescent: 'Изгряващ полумесец',
  first_quarter: 'Първа четвърт',
  waxing_gibbous: 'Растяща луна',
  full: 'Пълнолуние',
  waning_gibbous: 'Намаляваща луна',
  last_quarter: 'Последна четвърт',
  waning_crescent: 'Намаляващ полумесец',
}

const ZODIAC_BG: Record<string, string> = {
  aries: 'Овен',
  taurus: 'Телец',
  gemini: 'Близнаци',
  cancer: 'Рак',
  leo: 'Лъв',
  virgo: 'Дева',
  libra: 'Везни',
  scorpio: 'Скорпион',
  sagittarius: 'Стрелец',
  capricorn: 'Козирог',
  aquarius: 'Водолей',
  pisces: 'Риби',
  all: 'Всички',
}

const PLANET_BG: Record<string, string> = {
  sun: 'Слънце',
  moon: 'Луна',
  mercury: 'Меркурий',
  venus: 'Венера',
  mars: 'Марс',
  jupiter: 'Юпитер',
  saturn: 'Сатурн',
  uranus: 'Уран',
  neptune: 'Нептун',
  pluto: 'Плутон',
}

const ELEMENT_BG: Record<string, string> = {
  fire: 'Огън',
  earth: 'Земя',
  air: 'Въздух',
  water: 'Вода',
}

const RARITY_BG: Record<string, string> = {
  common: 'Обикновен',
  uncommon: 'Рядък',
  rare: 'Ценен',
  legendary: 'Легендарен',
}

export function CrystalDetailPanel({
  crystal,
  reason,
  canCollect,
  collecting,
  onCollect,
  onClose,
}: CrystalDetailPanelProps) {
  return (
    <AnimatePresence>
      {crystal && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mystic-panel mystic-corners fixed inset-x-4 top-[6vh] z-50 mx-auto flex max-h-[88vh] max-w-2xl flex-col sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crystal-detail-title"
          >
            {/* Crystal-specific color halo layered over the mystic-panel base */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-60"
              style={{
                background: `radial-gradient(circle at 30% 8%, ${crystal.colorPrimary}28, transparent 60%)`,
              }}
            />

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 backdrop-blur-md transition-all hover:border-amber-300/40 hover:text-amber-200"
              aria-label="Затвори"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1 L13 13 M13 1 L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="relative flex-1 overflow-y-auto">
              <div className="flex flex-col items-center px-6 pt-12 pb-10 sm:px-10">
                <motion.div
                  animate={{ rotate: [0, 3, -3, 0] }}
                  transition={{
                    duration: 14,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="drop-shadow-[0_0_32px_rgba(167,139,250,0.25)]"
                >
                  <CrystalGem
                    variant={crystal.svgVariant as GemVariant}
                    primary={crystal.colorPrimary}
                    secondary={crystal.colorSecondary}
                    accent={crystal.colorAccent}
                    size={180}
                    seed={crystal.slug}
                  />
                </motion.div>

                <p className="mt-5 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/80">
                  {RARITY_BG[crystal.rarity] ?? crystal.rarity}
                </p>
                <h2
                  id="crystal-detail-title"
                  className="mt-3 text-center font-display text-[28px] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[34px]"
                >
                  <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent">
                    {crystal.nameBg ?? crystal.nameEn}
                  </span>
                </h2>
                <p className="mt-2 text-center font-display text-[14.5px] font-light text-slate-400">
                  {crystal.taglineBg ?? crystal.taglineEn}
                </p>

                {reason && (
                  <div className="relative mt-7 w-full overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-b from-amber-400/[0.06] to-transparent px-6 py-5">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -left-10 -top-10 h-[180px] w-[180px] rounded-full bg-amber-400/[0.06] blur-[60px]"
                    />
                    <p className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
                      Избран за този момент
                    </p>
                    <p className="mt-2.5 font-display text-[14.5px] font-light leading-[1.8] text-slate-200">
                      {reason}
                    </p>
                  </div>
                )}

                <p className="mt-7 font-display text-[15px] font-light leading-[1.85] text-slate-300/95">
                  {crystal.descriptionBg ?? crystal.descriptionEn}
                </p>

                <dl className="mt-7 grid w-full grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6 text-left">
                  {crystal.planet && (
                    <div>
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Планета
                      </dt>
                      <dd className="mt-1 font-display text-[14px] text-slate-200">
                        {PLANET_BG[crystal.planet] ?? crystal.planet}
                      </dd>
                    </div>
                  )}
                  {crystal.zodiacSigns.length > 0 && (
                    <div>
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Зодии
                      </dt>
                      <dd className="mt-1 font-display text-[14px] text-slate-200">
                        {crystal.zodiacSigns
                          .map((s) => ZODIAC_BG[s] ?? s)
                          .join(', ')}
                      </dd>
                    </div>
                  )}
                  {crystal.moonPhases.length > 0 && (
                    <div className="col-span-2">
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Лунни фази
                      </dt>
                      <dd className="mt-1 font-display text-[14px] text-slate-200">
                        {crystal.moonPhases
                          .map((p) => PHASE_BG[p] ?? p)
                          .join(' · ')}
                      </dd>
                    </div>
                  )}
                  {crystal.element && (
                    <div>
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Елемент
                      </dt>
                      <dd className="mt-1 font-display text-[14px] text-slate-200">
                        {ELEMENT_BG[crystal.element] ?? crystal.element}
                      </dd>
                    </div>
                  )}
                  {crystal.hardness !== null && (
                    <div>
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Твърдост (Mohs)
                      </dt>
                      <dd className="mt-1 font-display text-[14px] text-slate-200">
                        {crystal.hardness}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Shop CTA stub — Bulgarian partnership coming */}
                <div className="mt-7 w-full rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-center">
                  <p className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Физически камък
                  </p>
                  <p className="mt-2 font-display text-[13px] font-light text-slate-500">
                    Скоро — партньорство с български магазин за кристали.
                  </p>
                </div>

                {canCollect && (
                  <button
                    type="button"
                    disabled={collecting}
                    onClick={onCollect}
                    className="group relative mt-7 w-full overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-b from-amber-400/25 to-amber-500/5 px-6 py-4 font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-100 transition-all duration-300 hover:border-amber-200 hover:from-amber-400/35 hover:shadow-[0_0_28px_rgba(251,191,36,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    />
                    {collecting ? 'Събира се...' : 'Събери в колекцията'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
