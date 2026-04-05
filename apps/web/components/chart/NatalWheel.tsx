'use client'

import { useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { useD3 } from '@/hooks/useD3'
import type { ChartData, PlanetPosition, AspectData } from '@celestia/astrology/client'
import { ZODIAC_SIGNS_BG, PLANETS_BG, ZODIAC_SIGNS_ORDER } from '@celestia/astrology/client'
import type { ZodiacSign, Planet, AspectType } from '@celestia/astrology/client'

interface NatalWheelProps {
  /** Calculated chart data */
  chart: ChartData
  /** Callback when a planet is selected */
  onPlanetSelect?: (planet: PlanetPosition) => void
  /** Selected planet (for highlighting) */
  selectedPlanet?: string | null
  /** Chart size in pixels (default 500) */
  size?: number
}

// Planet colors for visualization
const PLANET_COLORS: Record<string, string> = {
  sun: '#fbbf24', // gold
  moon: '#94a3b8', // silver
  mercury: '#a78bfa', // purple
  venus: '#f472b6', // pink
  mars: '#ef4444', // red
  jupiter: '#fb923c', // orange
  saturn: '#78716c', // stone
  uranus: '#22d3ee', // cyan
  neptune: '#3b82f6', // blue
  pluto: '#6b21a8', // dark purple
  northNode: '#a855f7', // violet
}

// Aspect line colors
const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: '#fbbf24', // gold
  sextile: '#22c55e', // green
  square: '#ef4444', // red
  trine: '#3b82f6', // blue
  opposition: '#f97316', // orange
}

// Zodiac sign element colors (subtle background)
const ELEMENT_COLORS = {
  fire: 'rgba(239, 68, 68, 0.15)', // red
  earth: 'rgba(34, 197, 94, 0.15)', // green
  air: 'rgba(59, 130, 246, 0.15)', // blue
  water: 'rgba(168, 85, 247, 0.15)', // purple
}

const SIGN_ELEMENTS: Record<ZodiacSign, keyof typeof ELEMENT_COLORS> = {
  aries: 'fire',
  taurus: 'earth',
  gemini: 'air',
  cancer: 'water',
  leo: 'fire',
  virgo: 'earth',
  libra: 'air',
  scorpio: 'water',
  sagittarius: 'fire',
  capricorn: 'earth',
  aquarius: 'air',
  pisces: 'water',
}

const PLANET_GLYPHS: Record<Planet, string> = {
  sun: '☉︎',
  moon: '☽︎',
  mercury: '☿︎',
  venus: '♀︎',
  mars: '♂︎',
  jupiter: '♃︎',
  saturn: '♄︎',
  uranus: '♅︎',
  neptune: '♆︎',
  pluto: '♇︎',
  northNode: '☊︎',
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

/**
 * Interactive natal chart wheel visualization using D3.js
 *
 * Renders concentric rings:
 * - Outer: 12 zodiac sign segments with Bulgarian abbreviations
 * - Middle: House cusp lines
 * - Inner: Planet positions (clickable)
 * - Center: Aspect lines connecting planets
 */
export function NatalWheel({chart, onPlanetSelect, selectedPlanet, size = 500,}: NatalWheelProps) {
  const center = size / 2
  const outerRadius = size * 0.48
  const zodiacOuterRadius = size * 0.46
  const zodiacInnerRadius = size * 0.38
  const houseInnerRadius = size * 0.2
  const planetRadius = size * 0.32
  const aspectRadius = houseInnerRadius * 0.9
  const aspectAnchorRadius = houseInnerRadius * 0.96

  // Memoize planet positions to avoid recalculating
  const planetPositions = useMemo(() => {
    return chart.planets.map((planet) => {
      // Convert longitude to angle (Aries starts at 9 o'clock = 180 degrees)
      // We rotate -90 to put Aries at the left (9 o'clock position)
      const angle = ((planet.longitude - 90) * Math.PI) / 180
      return {
        ...planet,
        x: center + Math.cos(angle) * planetRadius,
        y: center + Math.sin(angle) * planetRadius,
        angle,
      }
    })
  }, [chart.planets, center, planetRadius])

  // Handle planet click
  const handlePlanetClick = useCallback(
    (planet: PlanetPosition) => {
      if (onPlanetSelect) {
        onPlanetSelect(planet)
      }
    },
    [onPlanetSelect]
  )

  const svgRef = useD3<SVGSVGElement>(
    (svg) => {
      const g = svg.append('g')

      // Draw outer ring border
      g.append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', outerRadius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(148, 163, 184, 0.3)')
        .attr('stroke-width', 1)

      // Draw zodiac segments
      const zodiacArc = d3
        .arc<{ index: number }>()
        .innerRadius(zodiacInnerRadius)
        .outerRadius(zodiacOuterRadius)
        .startAngle((d) => ((d.index * 30 - 90) * Math.PI) / 180)
        .endAngle((d) => (((d.index + 1) * 30 - 90) * Math.PI) / 180)

      const zodiacData = ZODIAC_SIGNS_ORDER.map((sign, index) => ({
        sign,
        index,
      }))

      // Draw zodiac segment backgrounds
      g.selectAll('.zodiac-segment')
        .data(zodiacData)
        .enter()
        .append('path')
        .attr('class', 'zodiac-segment')
        .attr('d', (d) => zodiacArc({ index: d.index }))
        .attr('transform', `translate(${center}, ${center})`)
        .attr('fill', (d) => ELEMENT_COLORS[SIGN_ELEMENTS[d.sign]])
        .attr('stroke', 'rgba(148, 163, 184, 0.2)')
        .attr('stroke-width', 1)

      // Draw zodiac labels
      const labelRadius = (zodiacInnerRadius + zodiacOuterRadius) / 2
      zodiacData.forEach((d) => {
        const angle = ((d.index * 30 + 15 - 90) * Math.PI) / 180
        const x = center + Math.cos(angle) * labelRadius
        const y = center + Math.sin(angle) * labelRadius

        g.append('text')
          .attr('x', x)
          .attr('y', y)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'rgba(226, 232, 240, 0.8)')
          .attr('font-size', size * 0.034)
          .attr('font-weight', '500')
          .text(ZODIAC_GLYPHS[d.sign])
      })

      // Draw inner zodiac ring border
      g.append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', zodiacInnerRadius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(148, 163, 184, 0.2)')
        .attr('stroke-width', 1)

      // Draw house cusp lines
      chart.houses.forEach((house) => {
        const angle = ((house.cuspLongitude - 90) * Math.PI) / 180
        const x1 = center + Math.cos(angle) * houseInnerRadius
        const y1 = center + Math.sin(angle) * houseInnerRadius
        const x2 = center + Math.cos(angle) * zodiacInnerRadius
        const y2 = center + Math.sin(angle) * zodiacInnerRadius

        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', 'rgba(148, 163, 184, 0.3)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', house.number === 1 || house.number === 10 ? 'none' : '3,3')

        // House number label (positioned at inner edge)
        const labelAngle = angle + (15 * Math.PI) / 180 // Offset by 15 degrees
        const houseNumberRadius = houseInnerRadius * 1.15
        const labelX = center + Math.cos(labelAngle) * houseNumberRadius
        const labelY = center + Math.sin(labelAngle) * houseNumberRadius

        g.append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'rgba(148, 163, 184, 0.5)')
          .attr('font-size', size * 0.02)
          .text(house.number.toString())
      })

      // Draw Ascendant line (thicker, highlighted)
      const ascAngle = ((chart.ascendant.longitude - 90) * Math.PI) / 180
      g.append('line')
        .attr('x1', center + Math.cos(ascAngle) * (houseInnerRadius * 0.5))
        .attr('y1', center + Math.sin(ascAngle) * (houseInnerRadius * 0.5))
        .attr('x2', center + Math.cos(ascAngle) * zodiacOuterRadius)
        .attr('y2', center + Math.sin(ascAngle) * zodiacOuterRadius)
        .attr('stroke', '#22d3ee')
        .attr('stroke-width', 2)

      // Draw MC line (thicker, highlighted)
      const mcAngle = ((chart.mc.longitude - 90) * Math.PI) / 180
      g.append('line')
        .attr('x1', center + Math.cos(mcAngle) * (houseInnerRadius * 0.5))
        .attr('y1', center + Math.sin(mcAngle) * (houseInnerRadius * 0.5))
        .attr('x2', center + Math.cos(mcAngle) * zodiacOuterRadius)
        .attr('y2', center + Math.sin(mcAngle) * zodiacOuterRadius)
        .attr('stroke', '#f472b6')
        .attr('stroke-width', 2)

      // Draw aspect lines (in center)
      chart.aspects.forEach((aspect) => {
        const planet1 = planetPositions.find((p) => p.planet === aspect.planet1)
        const planet2 = planetPositions.find((p) => p.planet === aspect.planet2)

        if (!planet1 || !planet2) return

        // Calculate positions for aspect lines (closer to center)
        const p1x = center + Math.cos(planet1.angle) * aspectRadius
        const p1y = center + Math.sin(planet1.angle) * aspectRadius
        const p2x = center + Math.cos(planet2.angle) * aspectRadius
        const p2y = center + Math.sin(planet2.angle) * aspectRadius

        g.append('line')
          .attr('x1', p1x)
          .attr('y1', p1y)
          .attr('x2', p2x)
          .attr('y2', p2y)
          .attr('stroke', ASPECT_COLORS[aspect.aspect])
          .attr('stroke-width', aspect.orb < 3 ? 1.5 : 1)
          .attr('stroke-opacity', Math.max(0.3, 1 - aspect.orb / 8))
          .attr('stroke-dasharray', aspect.aspect === 'square' || aspect.aspect === 'opposition' ? '4,2' : 'none')
      })

      // Draw subtle aspect anchor ring to show where aspect lines connect
      g.append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', aspectAnchorRadius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(148, 163, 184, 0.08)')
        .attr('stroke-width', 1)

      // Draw inner circle border
      g.append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', houseInnerRadius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(148, 163, 184, 0.2)')
        .attr('stroke-width', 1)

      // Draw planets
      planetPositions.forEach((planet) => {
        const isSelected = selectedPlanet === planet.planet
        const anchorX = center + Math.cos(planet.angle) * aspectAnchorRadius
        const anchorY = center + Math.sin(planet.angle) * aspectAnchorRadius
        const planetGroup = g
          .append('g')
          .attr('class', 'planet-group')
          .attr('role', 'button')
          .attr('tabindex', '0')
          .attr('aria-label', `${PLANETS_BG[planet.planet as Planet]} - натисни за детайли`)
          .style('cursor', 'pointer')
          .style('outline', 'none')
          .on('click', () => handlePlanetClick(planet))
          .on('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handlePlanetClick(planet)
            }
          })

        // Anchor point showing the exact aspect connection location for this planet
        planetGroup
          .append('circle')
          .attr('cx', anchorX)
          .attr('cy', anchorY)
          .attr('r', size * 0.0085)
          .attr('fill', PLANET_COLORS[planet.planet])
          .attr('stroke', 'rgba(15, 23, 42, 0.9)')
          .attr('stroke-width', 1)
          .attr('opacity', isSelected ? 1 : 0.75)

        // Planet circle background
        planetGroup
          .append('circle')
          .attr('cx', planet.x)
          .attr('cy', planet.y)
          .attr('r', size * 0.03)
          .attr('fill', isSelected ? PLANET_COLORS[planet.planet] : 'rgba(15, 23, 42, 0.9)')
          .attr('stroke', PLANET_COLORS[planet.planet])
          .attr('stroke-width', isSelected ? 3 : 2)

        // Planet abbreviation
        planetGroup
          .append('text')
          .attr('x', planet.x)
          .attr('y', planet.y)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', isSelected ? '#0f172a' : PLANET_COLORS[planet.planet])
          .attr('font-size', size * 0.03)
          .attr('font-weight', '600')
          .text(PLANET_GLYPHS[planet.planet as Planet])

        // Retrograde indicator
        if (planet.speed < 0) {
          planetGroup
            .append('text')
            .attr('x', planet.x + size * 0.035)
            .attr('y', planet.y - size * 0.02)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(239, 68, 68, 0.8)')
            .attr('font-size', size * 0.015)
            .attr('font-weight', 'bold')
            .text('R')
        }
      })
    },
    [chart, center, size, planetPositions, selectedPlanet, handlePlanetClick, aspectAnchorRadius]
  )

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  )
}
