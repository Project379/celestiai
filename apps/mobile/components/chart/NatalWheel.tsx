import { memo, useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg'

import { PLANET_GLYPHS, ZODIAC_SIGNS_ORDER } from '@stellaeum/astrology/client'
import type {
  AspectType,
  ChartData,
  Planet,
  PlanetPosition,
  ZodiacSign,
} from '@stellaeum/astrology/client'
import { ZODIAC_GLYPH_PATHS } from '@stellaeum/core/charts/glyphs'
import { color } from '@/components/design-system/tokens'
import { PlanetDisambiguation, PLANET_COLORS } from '@/components/chart/PlanetDisambiguation'
import { NatalWheelFrame } from '@/components/chart/NatalWheelFrame'

// The instrument's static furniture (rim/bezel/face/graticule, including
// the graticule's tick-degree constants) lives in NatalWheelFrame.tsx —
// Stage 2 LOC split, see that file's header.
const GRATICULE_RESOLVE_MS = 500

/**
 * Mobile natal-wheel render via react-native-svg. Direct port of
 * apps/web/components/chart/NatalWheel.tsx — same layout primitives
 * (zodiac segments → houses → ASC/MC → aspects → planets), same
 * de-clumping math (4-pass, 8° minimum separation), same aspect color
 * scheme and per-planet PLANET_COLORS. Stage 2 (2026-07-27, Decision (a))
 * briefly made the wheel's gems uniform/glyphless per the ratified
 * mockup; the founder's 2026-07-27 device pass INVERTED that decision —
 * per-planet color and the Unicode glyph are both back on the gems,
 * a deliberate departure from the mockup. PLANET_COLORS is imported from
 * PlanetDisambiguation.tsx (single source, not duplicated).
 *
 * Scope-bounded vs web (per SR 6 ratifications):
 *  - Zodiac ring glyphs: Unicode/custom SVG line-art (ZODIAC_GLYPH_PATHS)
 *    instead of web's <GlyphDefs />. Planet glyphs: Unicode from
 *    PLANET_GLYPHS, same as web's fallback path.
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

// PLANET_COLORS moved to PlanetDisambiguation.tsx — Decision (a) removed
// per-planet color from the wheel's own gems, so this file no longer
// needs the palette itself, only PLANET_GLYPHS (still used for the
// Unicode placeholder glyph).
// Exported so NatalWheelLegend can read the wheel's REAL aspect colors
// directly instead of hand-copying its own guess — a hand-copied legend
// drifted to only 2 colors (harmony/tension) against these actual 5,
// stating something false about the app's own data (founder-flagged,
// 2026-07-27). Same reasoning for the Ascendant/Midheaven line colors
// below (also exported, also legend-consumed).
export const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: '#fcd34d',
  sextile: '#6ee7b7',
  square: '#fda4af',
  trine: '#7dd3fc',
  opposition: '#f0abfc',
}
export const ASCENDANT_LINE_COLOR = '#22d3ee'
export const MIDHEAVEN_LINE_COLOR = '#fcd34d'

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

// Perf fix, round 2 (2026-08-13, founder-reported FPS drop on planet tap):
// the outer `memo()` on NatalWheel only blocks re-renders triggered by
// UNRELATED ChartScreen state (e.g. opening DetailsSheet) — it does nothing
// for a tap, because `selectedPlanet` is itself a NatalWheel prop that
// changes on every tap, so NatalWheel's function body always re-executes
// then. Previously every one of the ~500 SVG nodes below (zodiac segments,
// zodiac glyphs, house lines, aspect lines, planet gems) was inline JSX in
// that one function body, so all ~500 re-rendered and re-diffed on every
// single tap even though ~430 of them (everything except the planet gems)
// never depend on `selectedPlanet` at all.
//
// Fixed by splitting the tree into two independently memoized pieces:
//  - `WheelStaticLayers` — zodiac segments/glyphs, house lines, ASC/MC
//    lines, aspect lines. Props are all chart/geometry-derived, never
//    `selectedPlanet`, so React.memo's shallow-prop-equality bails out of
//    re-rendering this whole subtree on a tap (chart.houses/chart.aspects
//    and planetPositions are referentially stable across selection-only
//    re-renders — planetPositions is already behind its own `useMemo` keyed
//    on chart data, not selectedPlanet).
//  - `PlanetGems` — the ~70 selection-dependent nodes. This one SHOULD
//    re-render on tap (that's the actual visual change), so no memo bypass
//    is expected or wanted here.
// Net effect: a tap now re-diffs ~70 nodes instead of ~500.
//
// This narrows the per-tap COST but does not by itself explain the
// founder-reported "stays at ~30fps until force-quit" persistence — a
// single expensive re-render, however large, doesn't normally survive past
// the render that caused it.
//
// ANSWERED (2026-08-26 sweep #15, inferred mechanism, code fix applied —
// still needs device verification, no device/emulator in that session):
// NatalWheelFrame.tsx (rim/bezel/face/graticule) was NOT wrapped in memo
// the way WheelStaticLayers is here — so it re-rendered on every tap and
// re-attached the same useAnimatedProps object (graticuleProps) to
// AnimatedG each time. That's almost certainly both the "Tried to modify
// key `current` of an object which has been already passed to a worklet"
// warning AND this frame-rate persistence — an accumulating
// re-attachment across taps, not a per-render cost. WheelArrivalContainer
// was ruled out separately: no caller passes `onSettled` into it
// (chart.tsx renders it with only wheelSize/triggerKey), so that
// candidate's completion-worklet closure captures nothing. Confirm by
// re-running the tap sequence on device post-fix.
const WheelStaticLayers = memo(function WheelStaticLayers({
  center,
  size,
  rotationDeg,
  zodiacInnerRadius,
  zodiacOuterRadius,
  labelRadius,
  houses,
  houseInnerRadius,
  houseNumberRadius,
  ascAngle,
  mcAngle,
  aspects,
  planetPositions,
  aspectRadius,
  aspectAnchorRadius,
}: {
  center: number
  size: number
  rotationDeg: number
  zodiacInnerRadius: number
  zodiacOuterRadius: number
  labelRadius: number
  houses: ChartData['houses']
  houseInnerRadius: number
  houseNumberRadius: number
  ascAngle: number
  mcAngle: number
  aspects: ChartData['aspects']
  planetPositions: Array<PlanetPosition & { x: number; y: number; angle: number }>
  aspectRadius: number
  aspectAnchorRadius: number
}) {
  return (
    <>
      {/* Zodiac segments */}
      {ZODIAC_SIGNS_ORDER.map((sign, index) => {
        const startRad = longitudeToScreenRad((index + 1) * 30, rotationDeg)
        const endRad = longitudeToScreenRad(index * 30, rotationDeg)
        return (
          <Path
            key={`seg-${sign}`}
            d={arcPath(center, center, zodiacInnerRadius, zodiacOuterRadius, startRad, endRad)}
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
      {houses.map((house) => {
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
        stroke={ASCENDANT_LINE_COLOR}
        strokeWidth={2}
      />

      {/* Midheaven line — amber accent */}
      <Line
        x1={center + Math.cos(mcAngle) * (houseInnerRadius * 0.5)}
        y1={center + Math.sin(mcAngle) * (houseInnerRadius * 0.5)}
        x2={center + Math.cos(mcAngle) * zodiacOuterRadius}
        y2={center + Math.sin(mcAngle) * zodiacOuterRadius}
        stroke={MIDHEAVEN_LINE_COLOR}
        strokeWidth={2}
      />

      {/* Aspect lines */}
      {aspects.map((aspect, idx) => {
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
    </>
  )
})

// Planet gems, isolated from WheelStaticLayers above specifically so a tap
// (which only ever changes `selectedPlanet`) re-renders just this ~70-node
// subtree instead of the ~430-node static layers. See the perf-fix header
// comment on NatalWheel below for the full diagnosis.
const PlanetGems = memo(function PlanetGems({
  planetPositions,
  selectedPlanet,
  size,
  center,
  aspectAnchorRadius,
}: {
  planetPositions: Array<PlanetPosition & { x: number; y: number; angle: number }>
  selectedPlanet?: string | null
  size: number
  center: number
  aspectAnchorRadius: number
}) {
  return (
    <>
      {/* Planets — Decision (a), Stage 2 (2026-07-27): uniform starlight/
          cool gems.
          FOUNDER CORRECTION (2026-07-27, device pass): Decision (a) —
          uniform glyphless gems — is INVERTED here, deliberately, a
          departure from the ratified mockup. Per-planet PLANET_COLORS
          is back on the wheel's own gems (imported from
          PlanetDisambiguation.tsx, not duplicated), and the Unicode
          glyph renders on the gem again as a placeholder for the
          designer asset. Selection stays categorical — solid fill +
          an outer ring — never a hue swap; the base color IS per-planet
          hue again, but selected-vs-not is still shown by brightness/
          containment, not by changing which hue is shown. */}
      {planetPositions.map((planet) => {
        const isSelected = selectedPlanet === planet.planet
        const planetColor = PLANET_COLORS[planet.planet]
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
              fill={planetColor}
              stroke="rgba(8, 6, 15, 0.92)"
              strokeWidth={1}
              opacity={isSelected ? 1 : 0.78}
            />
            {/* Selection ring — a categorical signal separate from the
                gem's own fill, drawn just outside it. Absent when not
                selected, not a dimmer version of itself. */}
            {isSelected && (
              <Circle
                cx={planet.x}
                cy={planet.y}
                r={size * 0.048}
                fill="none"
                stroke={color.starlight}
                strokeWidth={1}
                opacity={0.7}
              />
            )}
            {/* Planet gem — per-planet color again (see inversion note
                above). Selected = solid fill; unselected = outline only
                on a near-black disc — same categorical (fill vs. no
                fill) signal as the pre-Stage-2 original, plus the ring
                above. */}
            <Circle
              cx={planet.x}
              cy={planet.y}
              r={size * 0.035}
              fill={isSelected ? planetColor : 'rgba(8, 6, 15, 0.92)'}
              stroke={planetColor}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            <Circle
              cx={planet.x - size * 0.012}
              cy={planet.y - size * 0.012}
              r={size * 0.014}
              fill="url(#gem-sheen)"
            />
            {/* Planet glyph — Unicode placeholder for the designer
                glyph asset (not yet landed). */}
            <SvgText
              x={planet.x}
              y={planet.y}
              fill={isSelected ? '#08060f' : planetColor}
              fontSize={size * 0.04}
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {planetGlyph}
            </SvgText>
            {/* Retrograde marker — a status flag, not planet identity. */}
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
    </>
  )
})

// Outer memo (unchanged from round 1): blocks re-renders from UNRELATED
// ChartScreen state (e.g. opening DetailsSheet). Requires callers to pass a
// referentially-stable onPlanetSelect (see chart.tsx's useCallback) —
// otherwise this memo is a no-op since a new function identity every
// render still fails the shallow prop comparison. Round 2 above handles
// the case this one can't: re-renders caused by NatalWheel's OWN props
// changing (selectedPlanet, on every tap).
export const NatalWheel = memo(function NatalWheel({
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
        <NatalWheelFrame
          center={center}
          size={size}
          outerRadius={outerRadius}
          zodiacInnerRadius={zodiacInnerRadius}
          houseInnerRadius={houseInnerRadius}
          graticuleProps={graticuleProps}
        />

        <WheelStaticLayers
          center={center}
          size={size}
          rotationDeg={rotationDeg}
          zodiacInnerRadius={zodiacInnerRadius}
          zodiacOuterRadius={zodiacOuterRadius}
          labelRadius={labelRadius}
          houses={chart.houses}
          houseInnerRadius={houseInnerRadius}
          houseNumberRadius={houseNumberRadius}
          ascAngle={ascAngle}
          mcAngle={mcAngle}
          aspects={chart.aspects}
          planetPositions={planetPositions}
          aspectRadius={aspectRadius}
          aspectAnchorRadius={aspectAnchorRadius}
        />

        <PlanetGems
          planetPositions={planetPositions}
          selectedPlanet={selectedPlanet}
          size={size}
          center={center}
          aspectAnchorRadius={aspectAnchorRadius}
        />
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
          HIT_RADIUS_MIN of more than one planet (a stellium). Extracted
          to PlanetDisambiguation.tsx (Stage 2 LOC split, see that file's
          header). */}
      {ambiguous && (
        <PlanetDisambiguation
          planets={ambiguous}
          wheelSize={size}
          onDismiss={() => setAmbiguous(null)}
          onSelect={(planet) => {
            handlePlanetPress(planet)
            setAmbiguous(null)
          }}
        />
      )}
    </View>
  )
})
