'use client'

import type { PlanetPosition, PointData } from '@celestia/astrology/client'
import { ZODIAC_SIGNS_BG, PLANETS_BG } from '@celestia/astrology/client'
import type { ZodiacSign } from '@celestia/astrology/client'

interface BigThreeCardsProps {
  /** Sun planet position */
  sun: PlanetPosition
  /** Moon planet position */
  moon: PlanetPosition
  /** Ascendant (Rising) data */
  ascendant: PointData
  /** Whether birth time is known (affects Rising display) */
  birthTimeKnown: boolean
  /** Callback when a card is selected */
  onSelect?: (type: 'sun' | 'moon' | 'rising') => void
  /** Currently selected type */
  selected?: 'sun' | 'moon' | 'rising' | null
}

// Brief trait keywords per sign (in Bulgarian)
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

interface BigThreeCardProps {
  title: string
  sign: string
  degree: number
  trait: string
  color: string
  isApproximate?: boolean
  isSelected?: boolean
  onClick?: () => void
}

// Color configurations for selected state
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
      style={isSelected ? {
        borderColor: selectedStyle.border,
        backgroundColor: selectedStyle.bg,
        boxShadow: selectedStyle.glow,
      } : undefined}
      aria-pressed={isSelected}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-sm font-medium ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
          {isApproximate ? '~' : ''}{title}
        </span>
        {isApproximate && (
          <span className="text-xs text-slate-500" title="приблизително">
            ?
          </span>
        )}
      </div>
      <div className="mb-1 text-lg font-semibold text-slate-100">
        {ZODIAC_SIGNS_BG[sign as ZodiacSign]}
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

/**
 * Big Three cards displaying Sun, Moon, and Rising signs
 *
 * Prominent display of the most important chart positions.
 * Shows sign in Bulgarian with brief trait keyword.
 * Rising shows "~" prefix if birth time unknown.
 */
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
        title={PLANETS_BG.sun}
        sign={sun.sign}
        degree={sun.signDegree}
        trait={SIGN_TRAITS[sun.sign as ZodiacSign]}
        color="yellow"
        isSelected={selected === 'sun'}
        onClick={() => onSelect?.('sun')}
      />
      <BigThreeCard
        title={PLANETS_BG.moon}
        sign={moon.sign}
        degree={moon.signDegree}
        trait={SIGN_TRAITS[moon.sign as ZodiacSign]}
        color="slate"
        isSelected={selected === 'moon'}
        onClick={() => onSelect?.('moon')}
      />
      <BigThreeCard
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
