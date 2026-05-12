'use client'

import type { Planet, PlanetPosition } from '@stellaeum/astrology/client'
import { PLANETS_BG, PLANET_GLYPHS } from '@stellaeum/astrology/client'
import { formatDegreeInSign } from '@stellaeum/core/charts/sections'

interface PlanetsListProps {
  planets: readonly PlanetPosition[]
  onSelect?: (planet: PlanetPosition) => void
  selectedPlanet?: string | null
}

/**
 * Карта · Детайли (§2.2). Editorial row per planet — glyph + name +
 * degree-in-sign + house + retrograde marker. Tappable to open the
 * existing PlanetDetail sheet. This is the "correct science" surface
 * the research doc §8 calls out — real degrees, house, retrograde,
 * nothing hidden.
 */
export function PlanetsList({
  planets,
  onSelect,
  selectedPlanet,
}: PlanetsListProps) {
  return (
    <ul className="divide-y divide-slate-800/60">
      {planets.map((planet) => {
        const nameBg = PLANETS_BG[planet.planet as Planet] ?? planet.planet
        const glyph = PLANET_GLYPHS[planet.planet as Planet] ?? '✦'
        const position = formatDegreeInSign(planet.signDegree, planet.sign)
        const retrograde = planet.speed < 0
        const isSelected = selectedPlanet === planet.planet

        return (
          <li key={planet.planet}>
            <button
              type="button"
              onClick={() => onSelect?.(planet)}
              className={`group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors duration-200 ${
                isSelected ? 'text-amber-200' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                  aria-hidden
                  className={`font-cinzel text-[16px] leading-none transition-colors duration-200 ${
                    isSelected ? 'text-amber-300' : 'text-slate-500 group-hover:text-amber-200'
                  }`}
                >
                  {glyph}
                </span>
                <span
                  className={`font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] transition-colors duration-200 ${
                    isSelected ? 'text-amber-200' : 'text-slate-200 group-hover:text-amber-200'
                  }`}
                >
                  {nameBg}
                </span>
              </div>

              <div className="flex items-baseline gap-3 font-display text-[12.5px] font-light text-slate-400">
                <span>{position}</span>
                <span className="text-slate-600">·</span>
                <span>H{planet.house}</span>
                {retrograde && (
                  <span
                    aria-label="Ретроград"
                    className="font-cinzel text-[9px] font-semibold tracking-[0.18em] text-amber-300/80"
                  >
                    R
                  </span>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
