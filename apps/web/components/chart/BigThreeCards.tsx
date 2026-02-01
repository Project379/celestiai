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
  return (
    <button
      onClick={onClick}
      className={`
        w-full rounded-xl border p-4 text-left transition-all
        backdrop-blur-sm
        ${isSelected
          ? `border-${color}-500/70 bg-${color}-500/20`
          : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50'
        }
      `}
      style={{
        borderColor: isSelected ? `var(--${color}-glow)` : undefined,
        backgroundColor: isSelected ? `var(--${color}-bg)` : undefined,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">
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
      <div className="text-sm text-slate-400">
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
