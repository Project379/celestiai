'use client'

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { select } from 'd3-selection'
import { arc } from 'd3-shape'
import { useD3 } from '@/hooks/useD3'
import type { ChartData, PlanetPosition, AspectData } from '@celestia/astrology/client'
import { ZODIAC_SIGNS_BG, PLANETS_BG, ZODIAC_SIGNS_ORDER } from '@celestia/astrology/client'
import type { ZodiacSign, Planet, AspectType } from '@celestia/astrology/client'
import { GlyphDefs } from '@/components/icons/CelestialIcons'

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

// Element color palettes for canvas FX (hoisted to module level per rerender-no-inline-components)
const ELEMENT_FX: Record<string, { core: number[]; mid: number[]; outer: number[]; symbols: string[] }> = {
  fire:  { core: [255, 200, 60],  mid: [239, 68, 68],   outer: [180, 20, 10],   symbols: ['\u2736', '\u2600', '\u2605'] },
  earth: { core: [180, 200, 120], mid: [16, 185, 129],  outer: [60, 80, 40],    symbols: ['\u2726', '\u25C6', '\u2742'] },
  air:   { core: [200, 240, 255], mid: [34, 211, 238],  outer: [60, 80, 180],   symbols: ['\u2727', '\u2604', '\u2738'] },
  water: { core: [180, 160, 255], mid: [59, 130, 246],  outer: [40, 20, 120],   symbols: ['\u2744', '\u273C', '\u2756'] },
}

// Glyph rendering now uses <use href="#glyph-{name}"> referencing <GlyphDefs />
// defined in CelestialIcons.tsx — sharp custom SVG line art per symbol.

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
      const zodiacArc = arc<{ index: number }>()
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

      // Draw zodiac labels (custom SVG glyphs via <use>)
      const labelRadius = (zodiacInnerRadius + zodiacOuterRadius) / 2
      const zodiacGlyphSize = size * 0.055
      zodiacData.forEach((d) => {
        const angle = ((d.index * 30 + 15 - 90) * Math.PI) / 180
        const x = center + Math.cos(angle) * labelRadius
        const y = center + Math.sin(angle) * labelRadius

        g.append('use')
          .attr('href', `#glyph-${d.sign}`)
          .attr('x', x - zodiacGlyphSize / 2)
          .attr('y', y - zodiacGlyphSize / 2)
          .attr('width', zodiacGlyphSize)
          .attr('height', zodiacGlyphSize)
          .attr('fill', 'none')
          .attr('stroke', 'rgba(226, 232, 240, 0.8)')
          .attr('stroke-width', 1.5)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .style('color', 'rgba(226, 232, 240, 0.8)')
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
          .attr('class', 'planet-anchor')
          .attr('data-planet', planet.planet)
          .attr('cx', anchorX)
          .attr('cy', anchorY)
          .attr('r', size * 0.0085)
          .attr('fill', PLANET_COLORS[planet.planet])
          .attr('stroke', 'rgba(15, 23, 42, 0.9)')
          .attr('stroke-width', 1)
          .attr('opacity', 0.75)

        // Planet circle background
        planetGroup
          .append('circle')
          .attr('class', 'planet-bg')
          .attr('data-planet', planet.planet)
          .attr('cx', planet.x)
          .attr('cy', planet.y)
          .attr('r', size * 0.03)
          .attr('fill', 'rgba(15, 23, 42, 0.9)')
          .attr('stroke', PLANET_COLORS[planet.planet])
          .attr('stroke-width', 2)

        // Planet glyph (custom SVG via <use>)
        const planetGlyphSize = size * 0.038
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
    [chart, center, size, planetPositions, handlePlanetClick, aspectAnchorRadius]
  )

  // Secondary effect to only toggle styles when selectedPlanet changes without tearing down the D3 graph
  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)

    // Reset all planets to unselected map styles
    svg.selectAll('.planet-anchor').attr('opacity', 0.75)
    svg.selectAll('.planet-bg').attr('fill', 'rgba(15, 23, 42, 0.9)').attr('stroke-width', 2)
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
        .attr('stroke-width', 3)
      svg.select(`.planet-glyph[data-planet="${selectedPlanet}"]`)
        .attr('stroke', '#0f172a')
        .style('color', '#0f172a')
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

  // Stand FX canvas — speed lines, aura orbs, menacing glyphs on planet selection
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

    const isNewSelection = selectedPlanet !== prevSelectedRef.current
    prevSelectedRef.current = selectedPlanet ?? null

    const pal = ELEMENT_FX[selectedElement] || ELEMENT_FX.fire
    const cx = size / 2
    const cy = size / 2
    const wheelR = size * 0.46

    const planetScreenX = spx
    const planetScreenY = spy

    // ─── Speed lines (only on new selection) ───
    type SpeedLine = { angle: number; len: number; w: number; offset: number; life: number; delay: number }
    const speedLines: SpeedLine[] = []
    if (isNewSelection) {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2
        speedLines.push({
          angle,
          len: (0.2 + Math.random() * 0.5) * wheelR,
          w: 0.5 + Math.random() * 2,
          offset: 15 + Math.random() * 10,
          life: 1.0,
          delay: Math.random() * 0.06,
        })
      }
    }

    // ─── Aura orbs (orbiting ring around wheel) ───
    type AuraOrb = { angle: number; baseR: number; speed: number; sz: number; breathPhase: number; breathSpd: number }
    const auraOrbs: AuraOrb[] = []
    for (let i = 0; i < 20; i++) {
      auraOrbs.push({
        angle: (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        baseR: wheelR * (0.95 + Math.random() * 0.15),
        speed: (0.004 + Math.random() * 0.012) * (Math.random() < 0.5 ? 1 : -1),
        sz: 1 + Math.random() * 2,
        breathPhase: Math.random() * Math.PI * 2,
        breathSpd: 0.7 + Math.random() * 0.6,
      })
    }

    // ─── Menacing glyphs (float up from planet, only on new selection) ───
    type MenGlyph = { x: number; y: number; vx: number; vy: number; char: string; sz: number; life: number; fadeRate: number; rot: number; rotSpd: number }
    const glyphs: MenGlyph[] = []
    if (isNewSelection) {
      for (let i = 0; i < 4; i++) {
        glyphs.push({
          x: planetScreenX + (Math.random() - 0.5) * 20,
          y: planetScreenY,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(0.6 + Math.random() * 1.2),
          char: pal.symbols[Math.floor(Math.random() * pal.symbols.length)],
          sz: 10 + Math.random() * 14,
          life: 1.0,
          fadeRate: 0.005 + Math.random() * 0.004,
          rot: (Math.random() - 0.5) * 0.3,
          rotSpd: (Math.random() - 0.5) * 0.012,
        })
      }
    }

    let flash = isNewSelection ? 2.0 : 0
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
      flash *= 0.93

      // ─── Aura orbs ───
      for (const orb of auraOrbs) {
        orb.angle += orb.speed
        const breathe = Math.sin(t * orb.breathSpd + orb.breathPhase) * wheelR * 0.02
        const nOff = noise(orb.angle * 2, t * 0.5, 0) * wheelR * 0.025
        const r = orb.baseR + breathe + nOff
        const ox = cx + Math.cos(orb.angle) * r
        const oy = cy + Math.sin(orb.angle) * r
        const pulse = Math.sin(t * 1.5 + orb.breathPhase) * 0.3 + 0.7

        // Glow
        ctx.fillStyle = `rgba(${pal.mid[0]}, ${pal.mid[1]}, ${pal.mid[2]}, ${pulse * 0.05})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.sz * 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(${pal.mid[0]}, ${pal.mid[1]}, ${pal.mid[2]}, ${pulse * 0.08})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.sz * 2, 0, Math.PI * 2)
        ctx.fill()

        // Core dot
        ctx.fillStyle = `rgba(${pal.core[0]}, ${pal.core[1]}, ${pal.core[2]}, ${pulse * 0.45})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.sz, 0, Math.PI * 2)
        ctx.fill()
      }

      // ─── Speed lines from selected planet ───
      for (const sl of speedLines) {
        sl.life -= 0.02
        if (sl.life <= 0 || t < sl.delay) continue
        const a = sl.life * sl.life
        const startR = sl.offset
        const endR = sl.offset + sl.len * (1 - sl.life * 0.5)
        ctx.strokeStyle = `rgba(${pal.core[0]}, ${pal.core[1]}, ${pal.core[2]}, ${a * 0.6})`
        ctx.lineWidth = sl.w * sl.life
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(planetScreenX + Math.cos(sl.angle) * startR, planetScreenY + Math.sin(sl.angle) * startR)
        ctx.lineTo(planetScreenX + Math.cos(sl.angle) * endR, planetScreenY + Math.sin(sl.angle) * endR)
        ctx.stroke()
      }

      // ─── Menacing glyphs ───
      for (const mg of glyphs) {
        mg.x += mg.vx
        mg.y += mg.vy
        mg.life -= mg.fadeRate
        mg.rot += mg.rotSpd
        if (mg.life <= 0) continue
        const a = mg.life * mg.life
        ctx.save()
        ctx.translate(mg.x, mg.y)
        ctx.rotate(mg.rot)
        ctx.font = `bold ${mg.sz * (1 + (1 - mg.life) * 0.25)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `rgba(${pal.core[0]}, ${pal.core[1]}, ${pal.core[2]}, ${a * 0.65})`
        ctx.fillText(mg.char, 0, 0)
        ctx.restore()
      }

      // ─── Flash overlay (selection burst) ───
      if (flash > 0.05) {
        ctx.fillStyle = `rgba(${pal.core[0]}, ${pal.core[1]}, ${pal.core[2]}, ${flash * 0.05})`
        ctx.beginPath()
        ctx.arc(planetScreenX, planetScreenY, wheelR * 0.6, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = `rgba(${pal.core[0]}, ${pal.core[1]}, ${pal.core[2]}, ${flash * 0.1})`
        ctx.beginPath()
        ctx.arc(planetScreenX, planetScreenY, wheelR * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }

      // After one-shot effects finish (~3s), throttle to 30fps for aura-only phase
      const hasOneShots = speedLines.some(sl => sl.life > 0) || glyphs.some(g => g.life > 0) || flash > 0.05
      if (hasOneShots) {
        fxAnimRef.current = requestAnimationFrame(draw)
      } else {
        // 30fps is enough for the subtle aura orb animation
        setTimeout(() => { fxAnimRef.current = requestAnimationFrame(draw) }, 33)
      }
    }

    draw()

    return () => {
      document.removeEventListener('visibilitychange', handleFxVisibility)
      if (fxAnimRef.current) cancelAnimationFrame(fxAnimRef.current)
    }
  }, [selectedPlanet, selectedElement, size, spx, spy])

  return (
    <div className="relative mx-auto" style={{ maxWidth: size, width: '100%' }}>
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
    </div>
  )
}
