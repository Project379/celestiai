import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg'

import {
  PLANET_GLYPHS,
  PLANETS_BG,
  ZODIAC_SIGNS_ORDER,
} from '@stellaeum/astrology/client'
import type {
  AspectType,
  ChartData,
  Planet,
  PlanetPosition,
  ZodiacSign,
} from '@stellaeum/astrology/client'
import { ZODIAC_GLYPH_PATHS } from '@stellaeum/core/charts/glyphs'
import { color, pressFeedback } from '@/components/design-system/tokens'

const AnimatedG = Animated.createAnimatedComponent(G)
// Warm/cool amendment, Stage 1 (2026-07-25): the "instrument resolving
// into focus" moment (source: Animus, motion only — no HUD chrome). Ticks
// are a plain fixed-angle scale (NOT rotationDeg-dependent like the zodiac
// ring) — this is the instrument's own measurement, distinct from the sky
// data it's reading.
const GRATICULE_TICK_DEGREES = Array.from({ length: 24 }, (_, i) => i * 15)
const GRATICULE_RESOLVE_MS = 500

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
 * Hit-testing note (MOBILE-ALPHA-REDESIGN v3, gap 2): the de-clumping pass
 * above only guarantees MIN_SEPARATION_DEG (8°) between adjacent planets —
 * a real stellium still clusters several planets that tightly. At a
 * typical 390px-wide-screen wheel, 8° of separation is ~15.6px of arc
 * length, so independent per-planet 44pt hit regions would overlap by
 * ~64% of their diameter for exactly the charts most likely to need
 * disambiguation. Fixed by removing per-planet Pressables in favor of one
 * tap surface that finds every planet within HIT_RADIUS_MIN of the tap
 * point and opens a disambiguation list when more than one qualifies,
 * rather than silently guessing via z-order.
 */
const HIT_RADIUS_MIN = 22 // px — 44pt HIG minimum tap target, as a radius

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

  const [ambiguous, setAmbiguous] = useState<PlanetPosition[] | null>(null)

  const hitRadius = Math.max(HIT_RADIUS_MIN, size * 0.063)

  // One-shot resolve on mount — not a continuous loop, so it costs nothing
  // ongoing once settled. See WARM_COOL_AMENDMENT.md §8 for the frame
  // budget this was checked against.
  const graticule = useSharedValue(0)
  useEffect(() => {
    graticule.value = withTiming(1, { duration: GRATICULE_RESOLVE_MS })
  }, [graticule])
  const graticuleProps = useAnimatedProps(() => ({ opacity: graticule.value }))

  const handlePlanetPress = (planet: PlanetPosition) => {
    // A definite, discrete selection on a small/precise tap target —
    // Medium impact per Apple's own semantic taxonomy (a "collision"
    // between the tap and the UI element, not a continuous scrub).
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onPlanetSelect?.(planet)
  }

  const handleWheelPress = (locationX: number, locationY: number) => {
    const candidates = planetPositions
      .map((planet) => ({
        planet,
        distance: Math.hypot(locationX - planet.x, locationY - planet.y),
      }))
      .filter((c) => c.distance <= hitRadius)
      .sort((a, b) => a.distance - b.distance)
      .map((c) => c.planet)

    if (candidates.length === 0) return
    if (candidates.length === 1) {
      handlePlanetPress(candidates[0])
      return
    }
    // Stellium case — multiple planets within the same tap's catch
    // radius. Ask rather than guess (see HIT_RADIUS_MIN note above).
    setAmbiguous(candidates)
  }

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Warm/cool amendment — the recovered-instrument bevel rim
              (the fitting a hand would touch), ported from the approved
              mockup's diagonal border-color bevel. A gradient stroke is
              the SVG-portable equivalent of CSS's per-side border-color
              trick. Bronze, and ONLY the rim — the face/ticks/data stay
              cool, per the ratified "cold instrument, warm fittings"
              reading (WARM_COOL_AMENDMENT.md, corrected pass). */}
          <LinearGradient id="rim-bevel" x1="15%" y1="8%" x2="85%" y2="92%">
            <Stop offset="0%" stopColor="#d9a06a" />
            <Stop offset="50%" stopColor="#8a6339" />
            <Stop offset="100%" stopColor="#5c3f22" />
          </LinearGradient>
        </Defs>
        {/* Outer ring border — the instrument's rim */}
        <Circle
          cx={center}
          cy={center}
          r={outerRadius}
          fill="none"
          stroke="url(#rim-bevel)"
          strokeWidth={size * 0.012}
          opacity={0.85}
        />

        {/* Instrument graticule — the wheel's own measurement scale, cool-
            toned, fixed to the frame (not the rotating zodiac data below).
            Resolves in once on mount; see the shared-value comment above. */}
        <AnimatedG animatedProps={graticuleProps}>
          {GRATICULE_TICK_DEGREES.map((deg, i) => {
            const major = i % 6 === 0
            const rad = ((deg - 90) * Math.PI) / 180
            const r1 = outerRadius + size * 0.003
            const r2 = outerRadius + size * (major ? 0.018 : 0.011)
            return (
              <Line
                key={`grat-${i}`}
                x1={center + Math.cos(rad) * r1}
                y1={center + Math.sin(rad) * r1}
                x2={center + Math.cos(rad) * r2}
                y2={center + Math.sin(rad) * r2}
                stroke={color.cool}
                strokeWidth={major ? 1.2 : 0.8}
                opacity={major ? 0.55 : 0.3}
              />
            )
          })}
        </AnimatedG>

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

        {/* Zodiac glyphs — custom SVG line-art ported from web's
            CelestialIcons.tsx via @stellaeum/core/charts/glyphs.
            Each glyph is in a 24×24 viewBox; we translate to the
            target position and scale via <G transform>. Strokes use
            vectorEffect="non-scaling-stroke" so they stay at 1.5px
            in screen space regardless of the scale factor. */}
        {ZODIAC_SIGNS_ORDER.map((sign, index) => {
          const angle = longitudeToScreenRad(index * 30 + 15, rotationDeg)
          const x = center + Math.cos(angle) * labelRadius
          const y = center + Math.sin(angle) * labelRadius
          const glyphSize = size * 0.055
          const scale = glyphSize / 24
          return (
            <G
              key={`glyph-${sign}`}
              transform={`translate(${x - glyphSize / 2} ${y - glyphSize / 2}) scale(${scale})`}
            >
              {ZODIAC_GLYPH_PATHS[sign].map((d, i) => (
                <Path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="rgba(226, 232, 240, 0.78)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </G>
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

      {/* Single tap surface — per SR 6 decision 6, tap fires the
          bottom-sheet PlanetDetail in the parent. Replaces the old
          per-planet independent Pressable array (each undersized at
          size*0.09 and prone to overlapping at stellium separations) with
          one nearest-planet-within-radius lookup; see HIT_RADIUS_MIN. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Натисни планета за тълкуване"
        style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}
        onPress={(e) => handleWheelPress(e.nativeEvent.locationX, e.nativeEvent.locationY)}
      />

      {/* Disambiguation list — shown only when a tap lands within
          HIT_RADIUS_MIN of more than one planet (a stellium). Centered
          rather than tap-anchored so it never clips off-screen. */}
      {ambiguous && (
        <>
          <Pressable
            accessibilityLabel="Затвори"
            style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, zIndex: 10 }}
            onPress={() => setAmbiguous(null)}
          />
          <View
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: [{ translateX: -90 }, { translateY: -(ambiguous.length * 22) }],
              width: 180,
              zIndex: 11,
              backgroundColor: '#161029',
              borderWidth: 1,
              borderColor: 'rgba(139,92,246,0.35)',
              borderRadius: 14,
              paddingVertical: 6,
            }}
          >
            {ambiguous.map((planet) => (
              <Pressable
                key={planet.planet}
                onPress={() => {
                  handlePlanetPress(planet)
                  setAmbiguous(null)
                }}
                style={({ pressed }) => ({
                  ...pressFeedback(pressed),
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  minHeight: 44,
                })}
              >
                <Text style={{ color: PLANET_COLORS[planet.planet], fontSize: 16 }}>
                  {PLANET_GLYPHS[planet.planet as Planet] ?? '?'}
                </Text>
                <Text style={{ color: '#e2e8f0', fontSize: 14 }}>
                  {PLANETS_BG[planet.planet as Planet] ?? planet.planet}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  )
}
