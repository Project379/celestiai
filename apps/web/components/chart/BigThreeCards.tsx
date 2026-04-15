'use client'

import { motion } from 'framer-motion'
import type { PlanetPosition, PointData } from '@celestia/astrology/client'
import { ZODIAC_SIGNS_BG, PLANETS_BG } from '@celestia/astrology/client'
import type { ZodiacSign } from '@celestia/astrology/client'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

interface BigThreeCardsProps {
  sun: PlanetPosition
  moon: PlanetPosition
  ascendant: PointData
  birthTimeKnown: boolean
  onSelect?: (type: 'sun' | 'moon' | 'rising') => void
  selected?: 'sun' | 'moon' | 'rising' | null
}

const SIGN_TRAITS: Record<ZodiacSign, string> = {
  aries: 'лидер',
  taurus: 'стабилен',
  gemini: 'комуникативен',
  cancer: 'грижовен',
  leo: 'харизматичен',
  virgo: 'аналитичен',
  libra: 'дипломатичен',
  scorpio: 'интензивен',
  sagittarius: 'оптимистичен',
  capricorn: 'амбициозен',
  aquarius: 'оригинален',
  pisces: 'интуитивен',
}

interface CardTint {
  ring: string
  glow: string
  dot: string
  icon: string
  label: string
}

const CARD_TINTS: Record<'sun' | 'moon' | 'rising', CardTint> = {
  sun: {
    ring: 'ring-amber-300/35',
    glow: 'shadow-[0_0_32px_rgba(251,191,36,0.18)]',
    dot:  'bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.65)]',
    icon: 'text-amber-200',
    label: 'text-amber-200',
  },
  moon: {
    ring: 'ring-slate-200/25',
    glow: 'shadow-[0_0_28px_rgba(226,232,240,0.10)]',
    dot:  'bg-slate-200/90 shadow-[0_0_8px_rgba(226,232,240,0.55)]',
    icon: 'text-slate-100',
    label: 'text-slate-100',
  },
  rising: {
    ring: 'ring-cyan-300/35',
    glow: 'shadow-[0_0_28px_rgba(103,232,249,0.18)]',
    dot:  'bg-cyan-300/90 shadow-[0_0_8px_rgba(103,232,249,0.55)]',
    icon: 'text-cyan-200',
    label: 'text-cyan-200',
  },
}

interface BigThreeCardProps {
  kind: 'sun' | 'moon' | 'rising'
  iconName: string
  title: string
  sign: string
  degree: number
  trait: string
  isApproximate?: boolean
  isSelected?: boolean
  onClick?: () => void
}

function BigThreeCard({
  kind,
  iconName,
  title,
  sign,
  degree,
  trait,
  isApproximate,
  isSelected,
  onClick,
}: BigThreeCardProps) {
  const tint = CARD_TINTS[kind]
  const signLabel = ZODIAC_SIGNS_BG[sign as ZodiacSign]

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={false}
      animate={{
        scale: isSelected ? 1.015 : 1,
      }}
      transition={{ duration: 0.35, ease: [0.22, 0.68, 0.35, 1] }}
      className={`group relative w-full overflow-hidden rounded-2xl border px-5 py-5 text-left backdrop-blur-sm transition-colors duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60 ${
        isSelected
          ? `border-amber-300/45 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-amber-400/[0.06] ${tint.glow}`
          : 'border-white/[0.06] bg-white/[0.015] hover:border-violet-300/25 hover:bg-white/[0.03] hover:shadow-[0_0_22px_rgba(167,139,250,0.10)]'
      }`}
      style={{ willChange: 'transform' }}
      aria-pressed={isSelected}
    >
      {/* Active ring flare */}
      {isSelected && (
        <motion.span
          aria-hidden
          className={`pointer-events-none absolute inset-[-1px] rounded-2xl ring-1 ${tint.ring}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.9, 0.55] }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      )}

      {/* Top amber diamond on select */}
      {isSelected && (
        <motion.span
          aria-hidden
          className="absolute left-5 top-4 h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        />
      )}

      <div className="relative z-10">
        {/* Title row - Cinzel eyebrow */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-2.5 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] transition-colors duration-300 ${
              isSelected ? tint.label : 'text-slate-400 group-hover:text-slate-300'
            }`}
          >
            <motion.span
              className={`leading-none transition-colors duration-300 ${
                isSelected ? tint.icon : 'text-slate-300 group-hover:text-slate-200'
              }`}
              animate={isSelected ? { scale: [1, 1.25, 1], rotate: [0, 8, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.5 }}
            >
              <CelestialIcon name={iconName} size={16} />
            </motion.span>
            <span>{isApproximate ? '~' : ''}{title}</span>
          </span>
          {isApproximate && (
            <span className="font-cinzel text-[9px] text-slate-600" title="приблизително">
              ≈
            </span>
          )}
        </div>

        {/* Sign name + degree */}
        <div className="mb-2 flex items-baseline gap-3">
          <span className="inline-flex items-center gap-2.5">
            <CelestialIcon name={sign.toLowerCase()} size={22} className="text-slate-200" />
            <span className="font-display text-[1.375rem] font-semibold leading-none text-slate-100">
              {signLabel}
            </span>
          </span>
          <span className="font-cinzel text-[11px] font-semibold tabular-nums text-amber-300/85">
            {Math.floor(degree)}°
          </span>
        </div>

        {/* Trait */}
        <p className={`font-display text-[13px] italic transition-colors duration-300 ${
          isSelected ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-300'
        }`}>
          {trait}
        </p>
      </div>
    </motion.button>
  )
}

export function BigThreeCards({
  sun,
  moon,
  ascendant,
  birthTimeKnown,
  onSelect,
  selected,
}: BigThreeCardsProps) {
  return (
    <div>
      {/* Editorial heading */}
      <header className="mb-5">
        <p className="mb-2 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
          <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          Големите три
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-amber-300/40 via-slate-300/15 to-transparent" />
        </p>
        <h2 className="font-display text-[1.125rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[1.25rem]">
          <span className="font-light italic text-slate-300">Слънце · Луна · </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent">
            Асцендент
          </span>
        </h2>
        <p className="mt-1.5 font-display text-[12.5px] font-light italic text-slate-400">
          Трите основни оси на твоята карта.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
        <BigThreeCard
          kind="sun"
          iconName="sun"
          title={PLANETS_BG.sun}
          sign={sun.sign}
          degree={sun.signDegree}
          trait={SIGN_TRAITS[sun.sign as ZodiacSign]}
          isSelected={selected === 'sun'}
          onClick={() => onSelect?.('sun')}
        />
        <BigThreeCard
          kind="moon"
          iconName="moon"
          title={PLANETS_BG.moon}
          sign={moon.sign}
          degree={moon.signDegree}
          trait={SIGN_TRAITS[moon.sign as ZodiacSign]}
          isSelected={selected === 'moon'}
          onClick={() => onSelect?.('moon')}
        />
        <BigThreeCard
          kind="rising"
          iconName="rising"
          title="Асцендент"
          sign={ascendant.sign}
          degree={ascendant.degree}
          trait={SIGN_TRAITS[ascendant.sign as ZodiacSign]}
          isApproximate={!birthTimeKnown}
          isSelected={selected === 'rising'}
          onClick={() => onSelect?.('rising')}
        />
      </div>
    </div>
  )
}
