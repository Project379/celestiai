import { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Text as SvgText,
} from 'react-native-svg'

import {
  PLANET_GLYPHS,
  ZODIAC_GLYPHS,
  ZODIAC_SIGNS_ORDER,
} from '@stellaeum/astrology/client'
import type {
  AspectType,
  ChartData,
  Planet,
  PlanetPosition,
  ZodiacSign,
} from '@stellaeum/astrology/client'

/**
 * Mobile natal-wheel render via react-native-svg. Direct port of
 * apps/web/components/chart/NatalWheel.tsx — same layout primitives
 * (zodiac segments → houses → ASC/MC → aspects → planets), same
 * de-clumping math (4-pass, 8° minimum separation), same planet color
 * palette and aspect color scheme.
 *
 * Scope-bounded vs web (per SR 6 ratifications):
 *  - Unicode glyphs from PLANET_GLYPHS / ZODIAC_GLYPHS instead of web's
 *    custom SVG line-art via <GlyphDefs />. Defer custom-paths port if
 *    Android rendering looks bad.
 *  - No orbiting-orb selection FX canvas (decorative, defer to polish).
 *  - No pinch-to-zoom (screen-fit fixed size).
 *  - No hover tooltip (mobile-untestable; tap behavior owns interaction).
 *  - No font-family on SVG <Text> elements (system default; Cinzel
 *    rendering inside SVG is a polish item once expo-font loading is
 *    threaded through).
 */

interface NatalWheelProps {
  chart: ChartData
  size: number
  onPlanetSelect?: (planet: PlanetPosition) => void
  selectedPlanet?: string | null
}

const PLANET_COLORS: Record<string, string> = {
  sun: '#fcd34d',
  moon: '#e2e8f0',
  mercury: '#c4b5fd',
  venus: '#fbcfe8',
  mars: '#fda4af',
  jupiter: '#fde68a',
  saturn: '#94a3b8',
  uranus: '#67e8f9',
  neptune: '#a78bfa',
  pluto: '#8b5cf6',
  northNode: '#c4b5fd',
}

const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: '#fcd34d',
  sextile: '#6ee7b7',
  square: '#fda4af',
  trine: '#7dd3fc',
  opposition: '#f0abfc',
}

const ELEMENT_FILLS = {
  fire: 'rgba(253, 164, 175, 0.06)',
  earth: 'rgba(253, 230, 138, 0.05)',
  air: 'rgba(125, 211, 252, 0.06)',
  water: 'rgba(196, 181, 253, 0.06)',
} as const

const SIGN_ELEMENTS: Record<ZodiacSign, keyof typeof ELEMENT_FILLS> = {
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

const MIN_SEPARATION_DEG = 8

/**
 * Convert ecliptic longitude to a screen-coordinate trigonometric angle.
 * Ascendant anchored at 9 o'clock (left) per traditional Western natal
 * chart layout; signs proceed counterclockwise.
 */
function longitudeToScreenRad(longitude: number, rotationDeg: number): number {
  return ((180 - (longitude - rotationDeg)) * Math.PI) / 180
}

/**
 * Build an SVG annular-arc path (zodiac segment) from start/end angles
 * (radians, math convention — 0 = 3 o'clock, increasing counter-clockwise)
 * and inner/outer radii. Replaces d3.arc() which is web-only.
 */
function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startRad: number,
  endRad: number,
): string {
  const x1 = cx + Math.cos(startRad) * outerR
  const y1 = cy + Math.sin(startRad) * outerR
  const x2 = cx + Math.cos(endRad) * outerR
  const y2 = cy + Math.sin(endRad) * outerR
  const x3 = cx + Math.cos(endRad) * innerR
  const y3 = cy + Math.sin(endRad) * innerR
  const x4 = cx + Math.cos(startRad) * innerR
  const y4 = cy + Math.sin(startRad) * innerR
  // Sweep direction: SVG arc treats sweep=1 as counter-clockwise in screen
  // coords (y-down), but our angles are math-standard so the outer arc
  // sweeps with sweep=0 and the inner arc reverses with sweep=1 to close
  // the wedge cleanly. largeArcFlag=0 since each sign segment spans 30°.
  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 1 ${x4} ${y4} Z`
}

export function NatalWheel({
  chart,
  size,
  onPlanetSelect,
  selectedPlanet,
}: NatalWheelProps) {
  const center = size / 2
  const outerRadius = size * 0.48
  const zodiacOuterRadius = size * 0.46
  const zodiacInnerRadius = size * 0.38
  const houseInnerRadius = size * 0.2
  const planetRadius = size * 0.32
  const aspectRadius = houseInnerRadius * 0.9
  const aspectAnchorRadius = houseInnerRadius * 0.96

  const rotationDeg = chart.ascendant.longitude

  const planetPositions = useMemo(() => {
    const raw = chart.planets.map((planet) => ({
      ...planet,
      rawAngle: planet.longitude,
      displayAngle: planet.longitude,
    }))
    raw.sort((a, b) => a.rawAngle - b.rawAngle)
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < raw.length; i++) {
        const next = (i + 1) % raw.length
        let diff = raw[next].displayAngle - raw[i].displayAngle
        if (next === 0) diff += 360
        if (diff < MIN_SEPARATION_DEG) {
          const shift = (MIN_SEPARATION_DEG - diff) / 2
          raw[i].displayAngle -= shift
          raw[next].displayAngle += shift
        }
      }
    }
    return raw.map((planet) => {
      const angle = longitudeToScreenRad(planet.displayAngle, rotationDeg)
      return {
        ...planet,
        x: center + Math.cos(angle) * planetRadius,
        y: center + Math.sin(angle) * planetRadius,
        angle,
      }
    })
  }, [chart.planets, center, planetRadius, rotationDeg])

  const ascAngle = longitudeToScreenRad(chart.ascendant.longitude, rotationDeg)
  const mcAngle = longitudeToScreenRad(chart.mc.longitude, rotationDeg)
  const labelRadius = (zodiacInnerRadius + zodiacOuterRadius) / 2
  const houseNumberRadius = houseInnerRadius * 1.15

  const handlePlanetPress = (planet: PlanetPosition) => {
    onPlanetSelect?.(planet)
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer ring border */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="rgba(226, 232, 240, 0.22)"
          strokeWidth={1}
        />

        {/* Zodiac segments */}
        {ZODIAC_SIGNS_ORDER.map((sign, index) => {
          const startRad = longitudeToScreenRad((index + 1) * 30, rotationDeg)
          const endRad = longitudeToScreenRad(index * 30, rotationDeg)
          return (
            <Path
              key={`seg-${sign}`}
              d={arcPath(
                center,
                center,
                zodiacInnerRadius,
                zodiacOuterRadius,
                startRad,
                endRad,
              )}
              fill={ELEMENT_FILLS[SIGN_ELEMENTS[sign]]}
              stroke="rgba(226, 232, 240, 0.12)"
              strokeWidth={1}
            />
          )
        })}

        {/* Zodiac glyphs (Unicode) */}
        {ZODIAC_SIGNS_ORDER.map((sign, index) => {
          const angle = longitudeToScreenRad(index * 30 + 15, rotationDeg)
          const x = center + Math.cos(angle) * labelRadius
          const y = center + Math.sin(angle) * labelRadius
          return (
            <SvgText
              key={`glyph-${sign}`}
              x={x}
              y={y}
              fill="rgba(226, 232, 240, 0.78)"
              fontSize={size * 0.05}
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {ZODIAC_GLYPHS[sign]}
            </SvgText>
          )
        })}

        {/* Inner zodiac ring border */}
        <Circle
          cx={center}
          cy={center}
          r={zodiacInnerRadius}
          fill="none"
          stroke="rgba(226, 232, 240, 0.15)"
          strokeWidth={1}
        />

        {/* House cusp lines + numbers */}
        {chart.houses.map((house) => {
          const angle = longitudeToScreenRad(house.cuspLongitude, rotationDeg)
          const x1 = center + Math.cos(angle) * houseInnerRadius
          const y1 = center + Math.sin(angle) * houseInnerRadius
          const x2 = center + Math.cos(angle) * zodiacInnerRadius
          const y2 = center + Math.sin(angle) * zodiacInnerRadius
          const labelAngle = angle - (15 * Math.PI) / 180
          const labelX = center + Math.cos(labelAngle) * houseNumberRadius
          const labelY = center + Math.sin(labelAngle) * houseNumberRadius
          const isAngular = house.number === 1 || house.number === 10
          return (
            <G key={`house-${house.number}`}>
              <Line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(226, 232, 240, 0.22)"
                strokeWidth={1}
                strokeDasharray={isAngular ? undefined : '3,3'}
              />
              <SvgText
                x={labelX}
                y={labelY}
                fill="rgba(203, 213, 225, 0.55)"
                fontSize={size * 0.022}
                fontWeight="600"
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {String(house.number)}
              </SvgText>
            </G>
          )
        })}

        {/* Ascendant line — cyan accent */}
        <Line
          x1={center + Math.cos(ascAngle) * (houseInnerRadius * 0.5)}
          y1={center + Math.sin(ascAngle) * (houseInnerRadius * 0.5)}
          x2={center + Math.cos(ascAngle) * zodiacOuterRadius}
          y2={center + Math.sin(ascAngle) * zodiacOuterRadius}
          stroke="#22d3ee"
          strokeWidth={2}
        />

        {/* Midheaven line — amber accent */}
        <Line
          x1={center + Math.cos(mcAngle) * (houseInnerRadius * 0.5)}
          y1={center + Math.sin(mcAngle) * (houseInnerRadius * 0.5)}
          x2={center + Math.cos(mcAngle) * zodiacOuterRadius}
          y2={center + Math.sin(mcAngle) * zodiacOuterRadius}
          stroke="#fcd34d"
          strokeWidth={2}
        />

        {/* Aspect lines */}
        {chart.aspects.map((aspect, idx) => {
          const planet1 = planetPositions.find((p) => p.planet === aspect.planet1)
          const planet2 = planetPositions.find((p) => p.planet === aspect.planet2)
          if (!planet1 || !planet2) return null
          const p1x = center + Math.cos(planet1.angle) * aspectRadius
          const p1y = center + Math.sin(planet1.angle) * aspectRadius
          const p2x = center + Math.cos(planet2.angle) * aspectRadius
          const p2y = center + Math.sin(planet2.angle) * aspectRadius
          const isHard = aspect.aspect === 'square' || aspect.aspect === 'opposition'
          return (
            <Line
              key={`aspect-${idx}`}
              x1={p1x}
              y1={p1y}
              x2={p2x}
              y2={p2y}
              stroke={ASPECT_COLORS[aspect.aspect]}
              strokeWidth={aspect.orb < 3 ? 1.5 : 1}
              strokeOpacity={Math.max(0.3, 1 - aspect.orb / 8)}
              strokeDasharray={isHard ? '4,2' : undefined}
            />
          )
        })}

        {/* Aspect anchor ring */}
        <Circle
          cx={center}
          cy={center}
          r={aspectAnchorRadius}
          fill="none"
          stroke="rgba(226, 232, 240, 0.06)"
          strokeWidth={1}
        />

        {/* Inner circle border */}
        <Circle
          cx={center}
          cy={center}
          r={houseInnerRadius}
          fill="none"
          stroke="rgba(226, 232, 240, 0.15)"
          strokeWidth={1}
        />

        {/* Planets */}
        {planetPositions.map((planet) => {
          const isSelected = selectedPlanet === planet.planet
          const color = PLANET_COLORS[planet.planet]
          const anchorX = center + Math.cos(planet.angle) * aspectAnchorRadius
          const anchorY = center + Math.sin(planet.angle) * aspectAnchorRadius
          const planetGlyph = PLANET_GLYPHS[planet.planet as Planet] ?? '?'
          return (
            <G key={`planet-${planet.planet}`}>
              {/* Anchor dot at the aspect-line attachment radius */}
              <Circle
                cx={anchorX}
                cy={anchorY}
                r={size * 0.0085}
                fill={color}
                stroke="rgba(8, 6, 15, 0.92)"
                strokeWidth={1}
                opacity={isSelected ? 1 : 0.78}
              />
              {/* Planet circle background */}
              <Circle
                cx={planet.x}
                cy={planet.y}
                r={size * 0.035}
                fill={isSelected ? color : 'rgba(8, 6, 15, 0.92)'}
                stroke={color}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              {/* Planet glyph */}
              <SvgText
                x={planet.x}
                y={planet.y}
                fill={isSelected ? '#08060f' : color}
                fontSize={size * 0.04}
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {planetGlyph}
              </SvgText>
              {/* Retrograde marker */}
              {planet.speed < 0 && (
                <SvgText
                  x={planet.x + size * 0.035}
                  y={planet.y - size * 0.02}
                  fill="rgba(253, 164, 175, 0.9)"
                  fontSize={size * 0.018}
                  fontWeight="600"
                  textAnchor="middle"
                >
                  R
                </SvgText>
              )}
            </G>
          )
        })}
      </Svg>

      {/* Tap hit-area overlay — Pressables sized to each planet glyph
          for tap-to-interpret. Sits above the SVG. Per SR 6 decision 6,
          tap fires the bottom-sheet PlanetDetail in the parent. */}
      {planetPositions.map((planet) => {
        const hitSize = size * 0.09
        return (
          <Pressable
            key={`hit-${planet.planet}`}
            onPress={() => handlePlanetPress(planet)}
            accessibilityRole="button"
            accessibilityLabel={`${planet.planet} — натисни за тълкуване`}
            style={{
              position: 'absolute',
              left: planet.x - hitSize / 2,
              top: planet.y - hitSize / 2,
              width: hitSize,
              height: hitSize,
            }}
          />
        )
      })}
    </View>
  )
}
