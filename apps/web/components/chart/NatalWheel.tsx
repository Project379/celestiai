'use client'

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { select } from 'd3-selection'
import { arc } from 'd3-shape'
import { useD3 } from '@/hooks/useD3'
import type { ChartData, PlanetPosition, AspectData } from '@stellaeum/astrology/client'
import { ZODIAC_SIGNS_BG, PLANETS_BG, ZODIAC_SIGNS_ORDER } from '@stellaeum/astrology/client'
// Traditional natal wheel convention:
//   - Ascendant anchored at the 9 o'clock (left) position
//   - Zodiac signs proceed counterclockwise from the Ascendant
// Converts an ecliptic longitude to a trigonometric angle (radians) compatible
// with `Math.cos`/`Math.sin` and SVG y-down screen coordinates.
const longitudeToScreenRad = (longitude: number, rotationDeg: number) =>
  ((180 - (longitude - rotationDeg)) * Math.PI) / 180
import type { ZodiacSign, Planet, AspectType } from '@stellaeum/astrology/client'
import { GlyphDefs } from '@/components/icons/CelestialIcons'

interface NatalWheelProps {
  /** Calculated chart data */
  chart: ChartData
  /** Callback when a planet is selected */
  onPlanetSelect?: (planet: PlanetPosition) => void
  /** Selected planet (for highlighting) */
  selectedPlanet?: string | null
  /** Chart size in pixels (default 600) */
  size?: number
}

// Editorial Stellaeum palette — amber / violet / slate / cyan / rose,
// soft and desaturated, matching the dashboard and hero accents.
const PLANET_COLORS: Record<string, string> = {
  sun: '#fcd34d',        // amber-300 (matches hero amber)
  moon: '#e2e8f0',       // slate-200 (matches BigThree moon)
  mercury: '#c4b5fd',    // violet-300
  venus: '#fbcfe8',      // pink-200 (soft)
  mars: '#fda4af',       // rose-300 (softer than red)
  jupiter: '#fde68a',    // amber-200 (warm)
  saturn: '#94a3b8',     // slate-400
  uranus: '#67e8f9',     // cyan-300 (matches BigThree rising)
  neptune: '#a78bfa',    // violet-400
  pluto: '#8b5cf6',      // violet-500 (deeper violet)
  northNode: '#c4b5fd',  // violet-300
}

// Aspect lines — traditional semantics preserved (harmony vs tension)
// but mapped to the editorial palette so they stop fighting the ambient
// amber/violet atmosphere around the wheel.
const ASPECT_COLORS: Record<AspectType, string> = {
  conjunction: '#fcd34d', // amber — unity
  sextile:     '#6ee7b7', // emerald-300 — harmony, softened
  square:      '#fda4af', // rose-300 — tension, softened
  trine:       '#7dd3fc', // sky-300 — flowing, softened
  opposition:  '#f0abfc', // fuchsia-300 — polarity
}

// Element backgrounds — barely there; they set element tone without
// fighting the amber/violet glows from the page surround.
const ELEMENT_COLORS = {
  fire:  'rgba(253, 164, 175, 0.06)',  // rose tint
  earth: 'rgba(253, 230, 138, 0.05)',  // amber tint
  air:   'rgba(125, 211, 252, 0.06)',  // sky tint
  water: 'rgba(196, 181, 253, 0.06)',  // violet tint
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

// Element color palettes for the orbiting-orb canvas FX when a planet is
// selected. Editorial — softened rose / amber / sky / violet so the aura
// blends with the amber/violet ambient glow around the wheel.
const ELEMENT_FX: Record<string, { core: number[]; mid: number[]; outer: number[]; symbols: string[] }> = {
  fire:  { core: [253, 230, 138], mid: [253, 164, 175], outer: [190, 60, 80],   symbols: ['\u2736', '\u2600', '\u2605'] },
  earth: { core: [255, 239, 195], mid: [253, 230, 138], outer: [140, 110, 50],  symbols: ['\u2726', '\u25C6', '\u2742'] },
  air:   { core: [241, 245, 249], mid: [125, 211, 252], outer: [60, 100, 160],  symbols: ['\u2727', '\u2604', '\u2738'] },
  water: { core: [237, 233, 254], mid: [196, 181, 253], outer: [80, 50, 170],   symbols: ['\u2744', '\u273C', '\u2756'] },
}

// Glyph rendering now uses <use href="#glyph-{name}"> referencing <GlyphDefs />
// defined in CelestialIcons.tsx - sharp custom SVG line art per symbol.

/**
 * Interactive natal chart wheel visualization using D3.js
 *
 * Renders concentric rings:
 * - Outer: 12 zodiac sign segments with Bulgarian abbreviations
 * - Middle: House cusp lines
 * - Inner: Planet positions (clickable)
 * - Center: Aspect lines connecting planets
 */
export function NatalWheel({chart, onPlanetSelect, selectedPlanet, size = 600,}: NatalWheelProps) {
  const center = size / 2
  const outerRadius = size * 0.48
  const zodiacOuterRadius = size * 0.46
  const zodiacInnerRadius = size * 0.38
  const houseInnerRadius = size * 0.2
  const planetRadius = size * 0.32
  const aspectRadius = houseInnerRadius * 0.9
  const aspectAnchorRadius = houseInnerRadius * 0.96

  // Hovered zodiac sign - drives the custom React tooltip. Position is in
  // container-local coordinates so the overlay div can be absolutely placed.
  const [hoveredSign, setHoveredSign] = useState<
    { sign: ZodiacSign; x: number; y: number } | null
  >(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Minimum angular separation between planet glyphs (degrees).
  // When two or more planets are within this distance their display
  // angles are fanned out so glyphs never overlap.
  const MIN_SEPARATION_DEG = 8

  const rotationDeg = chart.ascendant.longitude

  // Memoize planet positions with de-clumping to prevent overlap
  const planetPositions = useMemo(() => {
    // 1. Compute raw angles
    const raw = chart.planets.map((planet) => ({
      ...planet,
      rawAngle: planet.longitude,
      displayAngle: planet.longitude,
    }))

    // 2. Sort by raw angle so we can detect clusters
    raw.sort((a, b) => a.rawAngle - b.rawAngle)

    // 3. De-clump: walk through sorted list and push apart when too close
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < raw.length; i++) {
        const next = (i + 1) % raw.length
        let diff = raw[next].displayAngle - raw[i].displayAngle
        if (next === 0) diff += 360 // wrap-around
        if (diff < MIN_SEPARATION_DEG) {
          const shift = (MIN_SEPARATION_DEG - diff) / 2
          raw[i].displayAngle -= shift
          raw[next].displayAngle += shift
        }
      }
    }

    // 4. Convert to pixel positions using the traditional rotated frame
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
        .attr('stroke', 'rgba(226, 232, 240, 0.22)')
        .attr('stroke-width', 1)

      // Draw zodiac segments.
      // Wheel rotates so longitude == rotationDeg lands at 9 o'clock and signs
      // proceed counterclockwise (the traditional Western natal chart layout).
      // The d3 arc angle convention is 0 at 12 o'clock with positive values
      // proceeding clockwise, so we map each 30° sign band accordingly and
      // feed the start/end in ascending order to keep the sweep positive.
      const zodiacArc = arc<{ index: number }>()
        .innerRadius(zodiacInnerRadius)
        .outerRadius(zodiacOuterRadius)
        .startAngle((d) => ((270 - ((d.index + 1) * 30 - rotationDeg)) * Math.PI) / 180)
        .endAngle((d) => ((270 - (d.index * 30 - rotationDeg)) * Math.PI) / 180)

      const zodiacData = ZODIAC_SIGNS_ORDER.map((sign, index) => ({
        sign,
        index,
      }))

      // Position helper: translate a native pointer event into container-local
      // coordinates so the absolutely-positioned React tooltip lines up with
      // the cursor regardless of scroll or responsive scaling.
      const pointerToLocal = (event: MouseEvent) => {
        const host = containerRef.current
        if (!host) return { x: 0, y: 0 }
        const rect = host.getBoundingClientRect()
        return { x: event.clientX - rect.left, y: event.clientY - rect.top }
      }

      // Draw zodiac segment backgrounds. Each segment hosts the hover
      // handlers that drive the React tooltip - overlapping decorations
      // (glyphs, ASC/MC lines) are set to `pointer-events: none` below so
      // they can't steal these events from the segment underneath.
      g.selectAll('.zodiac-segment')
        .data(zodiacData)
        .enter()
        .append('path')
        .attr('class', 'zodiac-segment')
        .attr('d', (d) => zodiacArc({ index: d.index }))
        .attr('transform', `translate(${center}, ${center})`)
        .attr('fill', (d) => ELEMENT_COLORS[SIGN_ELEMENTS[d.sign]])
        .attr('stroke', 'rgba(226, 232, 240, 0.12)')
        .attr('stroke-width', 1)
        .style('cursor', 'help')
        .style('pointer-events', 'all')
        .on('mouseenter', function (event: MouseEvent, d) {
          const { x, y } = pointerToLocal(event)
          setHoveredSign({ sign: d.sign, x, y })
        })
        .on('mousemove', function (event: MouseEvent, d) {
          const { x, y } = pointerToLocal(event)
          setHoveredSign({ sign: d.sign, x, y })
        })
        .on('mouseleave', () => setHoveredSign(null))

      // Draw zodiac labels (custom SVG glyphs via <use>). They sit on top of
      // the segment wedges, so we mark them pointer-events-none and let hover
      // events fall through to the segment underneath.
      const labelRadius = (zodiacInnerRadius + zodiacOuterRadius) / 2
      const zodiacGlyphSize = size * 0.055
      zodiacData.forEach((d) => {
        const angle = longitudeToScreenRad(d.index * 30 + 15, rotationDeg)
        const x = center + Math.cos(angle) * labelRadius
        const y = center + Math.sin(angle) * labelRadius

        g.append('use')
          .attr('href', `#glyph-${d.sign}`)
          .attr('x', x - zodiacGlyphSize / 2)
          .attr('y', y - zodiacGlyphSize / 2)
          .attr('width', zodiacGlyphSize)
          .attr('height', zodiacGlyphSize)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(226, 232, 240, 0.72)')
          .attr('stroke-width', 1.5)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .style('color', 'rgba(226, 232, 240, 0.72)')
          .style('pointer-events', 'none')
      })

      // Draw inner zodiac ring border
      g.append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', zodiacInnerRadius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(226, 232, 240, 0.15)')
        .attr('stroke-width', 1)
        .style('pointer-events', 'none')

      // Draw house cusp lines
      chart.houses.forEach((house) => {
        const angle = longitudeToScreenRad(house.cuspLongitude, rotationDeg)
        const x1 = center + Math.cos(angle) * houseInnerRadius
        const y1 = center + Math.sin(angle) * houseInnerRadius
        const x2 = center + Math.cos(angle) * zodiacInnerRadius
        const y2 = center + Math.sin(angle) * zodiacInnerRadius

        g.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', 'rgba(226, 232, 240, 0.22)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', house.number === 1 || house.number === 10 ? 'none' : '3,3')

        // House number label - offset into the middle of the house the
        // traditional (counterclockwise) direction.
        const labelAngle = angle - (15 * Math.PI) / 180
        const houseNumberRadius = houseInnerRadius * 1.15
        const labelX = center + Math.cos(labelAngle) * houseNumberRadius
        const labelY = center + Math.sin(labelAngle) * houseNumberRadius

        g.append('text')
          .attr('x', labelX)
          .attr('y', labelY)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', 'rgba(203, 213, 225, 0.55)')
          .attr('font-family', 'Cinzel, serif')
          .attr('font-size', size * 0.022)
          .attr('font-weight', 600)
          .attr('letter-spacing', '0.08em')
          .text(house.number.toString())
      })

      // Draw Ascendant line (thicker, highlighted) - will always sit on the left
      const ascAngle = longitudeToScreenRad(chart.ascendant.longitude, rotationDeg)
      g.append('line')
        .attr('x1', center + Math.cos(ascAngle) * (houseInnerRadius * 0.5))
        .attr('y1', center + Math.sin(ascAngle) * (houseInnerRadius * 0.5))
        .attr('x2', center + Math.cos(ascAngle) * zodiacOuterRadius)
        .attr('y2', center + Math.sin(ascAngle) * zodiacOuterRadius)
        .attr('stroke', '#22d3ee')
        .attr('stroke-width', 2)
        .style('pointer-events', 'none')

      // Draw MC line (thicker, highlighted) — amber to match Stellaeum accent
      const mcAngle = longitudeToScreenRad(chart.mc.longitude, rotationDeg)
      g.append('line')
        .attr('x1', center + Math.cos(mcAngle) * (houseInnerRadius * 0.5))
        .attr('y1', center + Math.sin(mcAngle) * (houseInnerRadius * 0.5))
        .attr('x2', center + Math.cos(mcAngle) * zodiacOuterRadius)
        .attr('y2', center + Math.sin(mcAngle) * zodiacOuterRadius)
        .attr('stroke', '#fcd34d')
        .attr('stroke-width', 2)
        .style('pointer-events', 'none')

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
        .attr('stroke', 'rgba(226, 232, 240, 0.06)')
        .attr('stroke-width', 1)

      // Draw inner circle border
      g.append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', houseInnerRadius)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(226, 232, 240, 0.15)')
        .attr('stroke-width', 1)

      // Draw planets
      planetPositions.forEach((planet) => {
        const anchorX = center + Math.cos(planet.angle) * aspectAnchorRadius
        const anchorY = center + Math.sin(planet.angle) * aspectAnchorRadius
        const planetGroup = g
          .append('g')
          .attr('class', 'planet-group')
          .attr('role', 'button')
          .attr('tabindex', '0')
          .attr('aria-label', `${PLANETS_BG[planet.planet as Planet]} - натисни за тълкуване`)
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
          .attr('class', 'planet-anchor')
          .attr('data-planet', planet.planet)
          .attr('cx', anchorX)
          .attr('cy', anchorY)
          .attr('r', size * 0.0085)
          .attr('fill', PLANET_COLORS[planet.planet])
          .attr('stroke', 'rgba(8, 6, 15, 0.92)')
          .attr('stroke-width', 1)
          .attr('opacity', 0.78)

        // Planet circle background — matches Stellaeum bg (#08060f)
        planetGroup
          .append('circle')
          .attr('class', 'planet-bg')
          .attr('data-planet', planet.planet)
          .attr('cx', planet.x)
          .attr('cy', planet.y)
          .attr('r', size * 0.035)
          .attr('fill', 'rgba(8, 6, 15, 0.92)')
          .attr('stroke', PLANET_COLORS[planet.planet])
          .attr('stroke-width', 1.5)

        // Planet glyph (custom SVG via <use>)
        const planetGlyphSize = size * 0.042
        const glyphColor = PLANET_COLORS[planet.planet]
        planetGroup
          .append('use')
          .attr('class', 'planet-glyph')
          .attr('data-planet', planet.planet)
          .attr('data-base-color', glyphColor)
          .attr('href', `#glyph-${planet.planet}`)
          .attr('x', planet.x - planetGlyphSize / 2)
          .attr('y', planet.y - planetGlyphSize / 2)
          .attr('width', planetGlyphSize)
          .attr('height', planetGlyphSize)
          .attr('fill', 'none')
          .attr('stroke', glyphColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .style('color', glyphColor)

        // Retrograde indicator — soft rose, Cinzel-styled
        if (planet.speed < 0) {
          planetGroup
            .append('text')
            .attr('x', planet.x + size * 0.035)
            .attr('y', planet.y - size * 0.02)
            .attr('text-anchor', 'middle')
            .attr('fill', 'rgba(253, 164, 175, 0.9)')
            .attr('font-family', 'Cinzel, serif')
            .attr('font-size', size * 0.018)
            .attr('font-weight', 600)
            .attr('letter-spacing', '0.08em')
            .text('R')
        }
      })
    },
    [chart, center, size, planetPositions, handlePlanetClick, aspectAnchorRadius, rotationDeg]
  )

  // Secondary effect to only toggle styles when selectedPlanet changes without tearing down the D3 graph
  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)

    // Reset all planets to unselected map styles
    svg.selectAll('.planet-anchor').attr('opacity', 0.78)
    svg.selectAll('.planet-bg').attr('fill', 'rgba(8, 6, 15, 0.92)').attr('stroke-width', 1.5)
    svg.selectAll('.planet-glyph').each(function() {
      const el = select(this)
      const color = el.attr('data-base-color')
      el.attr('stroke', color).style('color', color)
    })

    // Apply active highlight to selected
    if (selectedPlanet) {
      svg.select(`.planet-anchor[data-planet="${selectedPlanet}"]`).attr('opacity', 1)
      svg.select(`.planet-bg[data-planet="${selectedPlanet}"]`)
        .attr('fill', PLANET_COLORS[selectedPlanet])
        .attr('stroke-width', 2.5)
      svg.select(`.planet-glyph[data-planet="${selectedPlanet}"]`)
        .attr('stroke', '#08060f')
        .style('color', '#08060f')
    }
  }, [selectedPlanet])

  // Track selected planet for aura effect
  const selectedPlanetColor = selectedPlanet ? PLANET_COLORS[selectedPlanet] : null
  const prevSelectedRef = useRef<string | null>(null)
  const fxCanvasRef = useRef<HTMLCanvasElement>(null)
  const fxAnimRef = useRef<number>(0)

  // Derive primitives for the FX effect dependencies (rerender-dependencies)
  const selectedElement = useMemo(() => {
    if (!selectedPlanet) return null
    const planet = chart.planets.find(p => p.planet === selectedPlanet)
    if (!planet) return null
    return SIGN_ELEMENTS[planet.sign as ZodiacSign] || null
  }, [selectedPlanet, chart.planets])

  const selectedPlanetPos = useMemo(() => {
    if (!selectedPlanet) return null
    const p = planetPositions.find(pp => pp.planet === selectedPlanet)
    return p ? { x: p.x, y: p.y } : null
  }, [selectedPlanet, planetPositions])
  const spx = selectedPlanetPos?.x ?? center
  const spy = selectedPlanetPos?.y ?? center

  // Stand FX canvas - speed lines, aura orbs, menacing glyphs on planet selection
  useEffect(() => {
    const canvas = fxCanvasRef.current
    if (!canvas) return

    // Cancel any prior animation
    if (fxAnimRef.current) cancelAnimationFrame(fxAnimRef.current)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    // If no planet selected, clear and stop
    if (!selectedPlanet || !selectedElement) {
      ctx.clearRect(0, 0, size, size)
      prevSelectedRef.current = selectedPlanet ?? null
      return
    }

    prevSelectedRef.current = selectedPlanet ?? null

    const pal = ELEMENT_FX[selectedElement] || ELEMENT_FX.fire
    const cx = size / 2
    const cy = size / 2
    const wheelR = size * 0.46

    // ─── Aura orbs (orbiting ring around wheel) ───
    type AuraOrb = { angle: number; baseR: number; speed: number; sz: number; breathPhase: number; breathSpd: number }
    const auraOrbs: AuraOrb[] = []
    for (let i = 0; i < 20; i++) {
      auraOrbs.push({
        angle: (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        baseR: wheelR * (0.95 + Math.random() * 0.15),
        speed: (0.003 + Math.random() * 0.008) * (Math.random() < 0.5 ? 1 : -1),
        sz: 0.8 + Math.random() * 1.5,
        breathPhase: Math.random() * Math.PI * 2,
        breathSpd: 0.5 + Math.random() * 0.4,
      })
    }
    const startTime = performance.now()
    let fxPaused = false

    const handleFxVisibility = () => {
      fxPaused = document.hidden
      if (!fxPaused) fxAnimRef.current = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', handleFxVisibility)

    const noise = (x: number, y: number, z: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453
      return n - Math.floor(n)
    }

    const draw = () => {
      if (fxPaused) return
      const t = (performance.now() - startTime) / 1000
      ctx.clearRect(0, 0, size, size)

      // ─── Aura orbs - subtle breathing ring ───
      for (const orb of auraOrbs) {
        orb.angle += orb.speed
        const breathe = Math.sin(t * orb.breathSpd + orb.breathPhase) * wheelR * 0.015
        const nOff = noise(orb.angle * 2, t * 0.3, 0) * wheelR * 0.02
        const r = orb.baseR + breathe + nOff
        const ox = cx + Math.cos(orb.angle) * r
        const oy = cy + Math.sin(orb.angle) * r
        const pulse = Math.sin(t * 1.2 + orb.breathPhase) * 0.25 + 0.7

        // Soft glow
        ctx.fillStyle = `rgba(${pal.mid[0]}, ${pal.mid[1]}, ${pal.mid[2]}, ${pulse * 0.04})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.sz * 3, 0, Math.PI * 2)
        ctx.fill()

        // Core dot
        ctx.fillStyle = `rgba(${pal.core[0]}, ${pal.core[1]}, ${pal.core[2]}, ${pulse * 0.3})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.sz, 0, Math.PI * 2)
        ctx.fill()
      }

      // Throttle to 30fps - subtle animation doesn't need 60
      setTimeout(() => { fxAnimRef.current = requestAnimationFrame(draw) }, 33)
    }

    draw()

    return () => {
      document.removeEventListener('visibilitychange', handleFxVisibility)
      if (fxAnimRef.current) cancelAnimationFrame(fxAnimRef.current)
    }
  }, [selectedPlanet, selectedElement, size, spx, spy])

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{ maxWidth: size, width: '100%' }}
      onMouseLeave={() => setHoveredSign(null)}
    >
      {/* Hidden SVG for glyph definitions so d3 doesn't clear it */}
      <svg width="0" height="0" className="absolute">
        <GlyphDefs />
      </svg>
      {/* Stand FX canvas overlay */}
      <canvas
        ref={fxCanvasRef}
        className="pointer-events-none absolute inset-0 z-10"
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {hoveredSign && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-30 flex items-center gap-2 whitespace-nowrap border-y border-amber-300/30 bg-[#08060f]/92 px-3 py-1.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md"
          style={{
            left: hoveredSign.x + 14,
            top: hoveredSign.y + 14,
          }}
        >
          <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          {ZODIAC_SIGNS_BG[hoveredSign.sign]}
        </div>
      )}
    </div>
  )
}
