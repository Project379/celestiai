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
  discovered: boolean
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

export function CrystalDetailPanel({
  crystal,
  discovered,
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[8vh] z-50 mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-[#0b0816]/95 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
            role="dialog"
            aria-modal="true"
            aria-labelledby="crystal-detail-title"
          >
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-40"
                style={{
                  background: `radial-gradient(circle at 30% 15%, ${crystal.colorPrimary}22, transparent 60%)`,
                }}
              />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition-colors hover:border-white/30 hover:text-white"
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

              <div className="flex flex-col items-center px-6 pt-10 pb-6 sm:px-10">
                <motion.div
                  animate={{ rotate: [0, 3, -3, 0] }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
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

                <p className="mt-4 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-slate-400">
                  {crystal.rarity}
                </p>
                <h2
                  id="crystal-detail-title"
                  className="mt-2 font-display text-[28px] font-semibold leading-tight text-slate-100 sm:text-[32px]"
                >
                  <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent">
                    {crystal.nameBg ?? crystal.nameEn}
                  </span>
                </h2>
                <p className="mt-1 font-display text-[14px] font-light italic text-slate-400">
                  {crystal.taglineBg ?? crystal.taglineEn}
                </p>

                {reason && (
                  <div className="mt-5 w-full rounded-2xl border border-amber-300/20 bg-amber-400/[0.04] px-5 py-4">
                    <p className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-amber-300/90">
                      Защо този камък, точно сега
                    </p>
                    <p className="mt-2 font-display text-[14px] leading-[1.7] text-slate-200">
                      {reason}
                    </p>
                  </div>
                )}

                <p className="mt-5 font-display text-[15px] font-light leading-[1.8] text-slate-300">
                  {crystal.descriptionBg ?? crystal.descriptionEn}
                </p>

                <dl className="mt-6 grid w-full grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-left">
                  {crystal.planet && (
                    <div>
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Планета
                      </dt>
                      <dd className="mt-0.5 font-display text-[14px] text-slate-200">
                        {PLANET_BG[crystal.planet] ?? crystal.planet}
                      </dd>
                    </div>
                  )}
                  {crystal.zodiacSigns.length > 0 && (
                    <div>
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Зодии
                      </dt>
                      <dd className="mt-0.5 font-display text-[14px] text-slate-200">
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
                      <dd className="mt-0.5 font-display text-[14px] text-slate-200">
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
                      <dd className="mt-0.5 font-display text-[14px] text-slate-200 capitalize">
                        {crystal.element}
                      </dd>
                    </div>
                  )}
                  {crystal.hardness !== null && (
                    <div>
                      <dt className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">
                        Твърдост (Mohs)
                      </dt>
                      <dd className="mt-0.5 font-display text-[14px] text-slate-200">
                        {crystal.hardness}
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Shop CTA stub — Bulgarian partnership coming */}
                <div className="mt-6 w-full rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 text-center">
                  <p className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Физически камък
                  </p>
                  <p className="mt-2 font-display text-[13px] font-light italic text-slate-500">
                    Скоро — партньорство с български магазин за кристали.
                  </p>
                </div>

                {canCollect && (
                  <button
                    type="button"
                    disabled={collecting}
                    onClick={onCollect}
                    className="mt-6 w-full rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-6 py-3 font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition-colors duration-300 hover:border-amber-200 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {collecting ? 'Призовава се...' : 'Добави в колекцията'}
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
