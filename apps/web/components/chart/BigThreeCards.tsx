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

const KIND_TINT: Record<'sun' | 'moon' | 'rising', { dot: string; selected: string }> = {
  sun: {
    dot: 'bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    selected: 'text-amber-200',
  },
  moon: {
    dot: 'bg-slate-200/90 shadow-[0_0_8px_rgba(226,232,240,0.5)]',
    selected: 'text-slate-100',
  },
  rising: {
    dot: 'bg-cyan-300/90 shadow-[0_0_8px_rgba(103,232,249,0.55)]',
    selected: 'text-cyan-200',
  },
}

interface BigThreeRowProps {
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

function BigThreeRow({
  kind,
  iconName,
  title,
  sign,
  degree,
  trait,
  isApproximate,
  isSelected,
  onClick,
}: BigThreeRowProps) {
  const tint = KIND_TINT[kind]
  const signLabel = ZODIAC_SIGNS_BG[sign as ZodiacSign]

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.99 }}
      initial={false}
      className="group relative block w-full py-5 text-left transition-colors duration-300 focus:outline-none"
      style={{ willChange: 'transform' }}
      aria-pressed={isSelected}
    >
      {/* Eyebrow row */}
      <div className="mb-3 flex items-center gap-2.5">
        <span aria-hidden className={`h-1 w-1 rotate-45 transition-opacity duration-300 ${tint.dot} ${isSelected ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'}`} />
        <span
          className={`inline-flex items-center gap-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.34em] transition-colors duration-300 ${
            isSelected ? tint.selected : 'text-slate-400 group-hover:text-slate-200'
          }`}
        >
          <CelestialIcon name={iconName} size={14} />
          <span>{isApproximate ? '~' : ''}{title}</span>
        </span>
        {isApproximate && (
          <span className="font-cinzel text-[9px] text-slate-600" title="приблизително">
            ≈
          </span>
        )}
        <span className="ml-auto font-cinzel text-[11px] font-semibold tabular-nums text-amber-300/85">
          {Math.floor(degree)}°
        </span>
      </div>

      {/* Sign name */}
      <div className="mb-1.5 flex items-baseline gap-3">
        <CelestialIcon name={sign.toLowerCase()} size={22} className="text-slate-200" />
        <span className="font-display text-[1.5rem] font-semibold leading-none tracking-tight text-slate-100 sm:text-[1.65rem]">
          {signLabel}
        </span>
      </div>

      {/* Trait */}
      <p
        className={`font-display text-[13.5px] font-light leading-relaxed transition-colors duration-300 ${
          isSelected ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-300'
        }`}
      >
        {trait}
      </p>

      {/* Active hairline under the row */}
      {isSelected && (
        <motion.span
          layoutId="big-three-underline"
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-amber-300/0 via-amber-300/70 to-amber-300/0 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
          transition={{ duration: 0.4, ease: [0.22, 0.68, 0.35, 1] }}
        />
      )}
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
    <section>
      <header className="mb-3">
        <p className="mb-2 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
          <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          Големите три
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-amber-300/40 via-slate-300/15 to-transparent" />
        </p>
        <h2 className="font-display text-[1.125rem] font-semibold leading-tight tracking-tight text-slate-100 sm:text-[1.25rem]">
          <span className="font-light text-slate-300">Слънце · Луна · </span>
          <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent">
            Асцендент
          </span>
        </h2>
        <p className="mt-1.5 font-display text-[12.5px] font-light text-slate-400">
          Трите основни оси на твоята карта.
        </p>
      </header>

      {/* Responsive layout:
          <sm & lg+: vertical list divided by hairlines.
          sm–md (tablet): 3 columns side-by-side so the wheel stays
          above the fold when BigThree appears above it on mobile/tablet. */}
      <ul className="divide-y divide-slate-300/[0.06] sm:grid sm:grid-cols-3 sm:gap-x-6 sm:divide-y-0 lg:block lg:divide-y">
        <li>
          <BigThreeRow
            kind="sun"
            iconName="sun"
            title={PLANETS_BG.sun}
            sign={sun.sign}
            degree={sun.signDegree}
            trait={SIGN_TRAITS[sun.sign as ZodiacSign]}
            isSelected={selected === 'sun'}
            onClick={() => onSelect?.('sun')}
          />
        </li>
        <li>
          <BigThreeRow
            kind="moon"
            iconName="moon"
            title={PLANETS_BG.moon}
            sign={moon.sign}
            degree={moon.signDegree}
            trait={SIGN_TRAITS[moon.sign as ZodiacSign]}
            isSelected={selected === 'moon'}
            onClick={() => onSelect?.('moon')}
          />
        </li>
        <li>
          <BigThreeRow
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
        </li>
      </ul>
    </section>
  )
}
