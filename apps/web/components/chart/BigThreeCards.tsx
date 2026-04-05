'use client'

import type { PlanetPosition, PointData } from '@celestia/astrology/client'
import { ZODIAC_SIGNS_BG, PLANETS_BG } from '@celestia/astrology/client'
import type { ZodiacSign } from '@celestia/astrology/client'

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

const PLANET_GLYPHS: Record<'sun' | 'moon' | 'rising', string> = {
  sun: '☉︎',
  moon: '☽︎',
  rising: '↗',
}

const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  aries: '♈︎',
  taurus: '♉︎',
  gemini: '♊︎',
  cancer: '♋︎',
  leo: '♌︎',
  virgo: '♍︎',
  libra: '♎︎',
  scorpio: '♏︎',
  sagittarius: '♐︎',
  capricorn: '♑︎',
  aquarius: '♒︎',
  pisces: '♓︎',
}

interface BigThreeCardProps {
  glyph: string
  title: string
  sign: string
  degree: number
  trait: string
  color: string
  isApproximate?: boolean
  isSelected?: boolean
  onClick?: () => void
}

const SELECTED_COLORS: Record<string, { border: string; bg: string; glow: string }> = {
  yellow: {
    border: 'rgba(250, 204, 21, 0.5)',
    bg: 'rgba(250, 204, 21, 0.15)',
    glow: '0 0 20px rgba(250, 204, 21, 0.3)',
  },
  slate: {
    border: 'rgba(148, 163, 184, 0.5)',
    bg: 'rgba(148, 163, 184, 0.15)',
    glow: '0 0 20px rgba(148, 163, 184, 0.3)',
  },
  cyan: {
    border: 'rgba(34, 211, 238, 0.5)',
    bg: 'rgba(34, 211, 238, 0.15)',
    glow: '0 0 20px rgba(34, 211, 238, 0.3)',
  },
}

function BigThreeCard({
  glyph,
  title,
  sign,
  degree,
  trait,
  color,
  isApproximate,
  isSelected,
  onClick,
}: BigThreeCardProps) {
  const selectedStyle = SELECTED_COLORS[color] || SELECTED_COLORS.slate

  return (
    <button
      onClick={onClick}
      className={`
        w-full rounded-xl border p-4 text-left transition-all duration-200
        backdrop-blur-sm
        focus:outline-none focus:ring-2 focus:ring-purple-500/50
        ${isSelected
          ? 'scale-[1.02]'
          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50'
        }
      `}
      style={
        isSelected
          ? {
              borderColor: selectedStyle.border,
              backgroundColor: selectedStyle.bg,
              boxShadow: selectedStyle.glow,
            }
          : undefined
      }
      aria-pressed={isSelected}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`inline-flex items-center gap-2 text-sm font-medium ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
          <span className="text-base leading-none">{glyph}</span>
          <span>{isApproximate ? '~' : ''}{title}</span>
        </span>
        {isApproximate && (
          <span className="text-xs text-slate-500" title="приблизително">
            ?
          </span>
        )}
      </div>
      <div className="mb-1 text-lg font-semibold text-slate-100">
        <span className="inline-flex items-center gap-2">
          <span className="text-xl leading-none">{ZODIAC_GLYPHS[sign as ZodiacSign]}</span>
          <span>{ZODIAC_SIGNS_BG[sign as ZodiacSign]}</span>
        </span>
        <span className="ml-2 text-sm font-normal text-slate-400">
          {Math.floor(degree)}°
        </span>
      </div>
      <div className={`text-sm ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
        {trait}
      </div>
    </button>
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
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 lg:gap-4">
      <BigThreeCard
        glyph={PLANET_GLYPHS.sun}
        title={PLANETS_BG.sun}
        sign={sun.sign}
        degree={sun.signDegree}
        trait={SIGN_TRAITS[sun.sign as ZodiacSign]}
        color="yellow"
        isSelected={selected === 'sun'}
        onClick={() => onSelect?.('sun')}
      />
      <BigThreeCard
        glyph={PLANET_GLYPHS.moon}
        title={PLANETS_BG.moon}
        sign={moon.sign}
        degree={moon.signDegree}
        trait={SIGN_TRAITS[moon.sign as ZodiacSign]}
        color="slate"
        isSelected={selected === 'moon'}
        onClick={() => onSelect?.('moon')}
      />
      <BigThreeCard
        glyph={PLANET_GLYPHS.rising}
        title="Възходящ"
        sign={ascendant.sign}
        degree={ascendant.degree}
        trait={SIGN_TRAITS[ascendant.sign as ZodiacSign]}
        color="cyan"
        isApproximate={!birthTimeKnown}
        isSelected={selected === 'rising'}
        onClick={() => onSelect?.('rising')}
      />
    </div>
  )
}
