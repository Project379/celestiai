'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PLANETS_BG,
  ZODIAC_SIGNS_BG,
  type AspectData,
  type Planet,
  type PlanetPosition,
  type PointData,
  type ZodiacSign,
} from '@celestia/astrology/client'
import {
  getPlanetInterpretation,
  getRisingInterpretation,
} from '@/lib/interpretations/planets'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

interface PlanetDetailProps {
  planet: PlanetPosition | PointData | null
  onClose: () => void
  type?: 'sun' | 'moon' | 'rising' | null
  birthTimeKnown?: boolean
  house?: number
  aspects?: AspectData[]
}

// Glyphs now use <CelestialIcon> components from icons/CelestialIcons

/* ─── Element-specific visual config ─── */
const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
}

const ELEMENT_THEMES = {
  fire: {
    symbols: ['\u2736', '\u2600', '\u269D', '\u2666', '\u2605'],
    bgGradient: 'from-red-950/40 via-orange-950/30 to-transparent',
    glowColor: 'rgba(239, 68, 68, 0.25)',
    accentColor: 'rgba(251, 146, 60, 0.6)',
    // RGB arrays for canvas rendering
    core: [255, 200, 60],
    mid: [239, 68, 68],
    outer: [180, 20, 10],
    particleColors: [[255, 100, 30], [239, 68, 68], [251, 191, 36], [220, 38, 38]],
    symbolColor: 'rgba(251, 146, 60, 0.8)',
  },
  earth: {
    symbols: ['\u2726', '\u25C6', '\u2B22', '\u2B23', '\u2742'],
    bgGradient: 'from-emerald-950/40 via-stone-950/30 to-transparent',
    glowColor: 'rgba(16, 185, 129, 0.2)',
    accentColor: 'rgba(180, 160, 100, 0.6)',
    core: [180, 200, 120],
    mid: [16, 185, 129],
    outer: [60, 80, 40],
    particleColors: [[16, 185, 129], [163, 160, 68], [146, 115, 79], [107, 114, 128]],
    symbolColor: 'rgba(16, 185, 129, 0.7)',
  },
  air: {
    symbols: ['\u2727', '\u2604', '\u269B', '\u2738', '\u2735'],
    bgGradient: 'from-cyan-950/40 via-indigo-950/30 to-transparent',
    glowColor: 'rgba(34, 211, 238, 0.2)',
    accentColor: 'rgba(125, 211, 252, 0.6)',
    core: [200, 240, 255],
    mid: [34, 211, 238],
    outer: [60, 80, 180],
    particleColors: [[34, 211, 238], [125, 211, 252], [165, 180, 252], [196, 181, 253]],
    symbolColor: 'rgba(125, 211, 252, 0.7)',
  },
  water: {
    symbols: ['\u2744', '\u2740', '\u273C', '\u2741', '\u2756'],
    bgGradient: 'from-blue-950/40 via-purple-950/30 to-transparent',
    glowColor: 'rgba(59, 130, 246, 0.25)',
    accentColor: 'rgba(147, 130, 246, 0.6)',
    core: [180, 160, 255],
    mid: [59, 130, 246],
    outer: [40, 20, 120],
    particleColors: [[59, 130, 246], [139, 92, 246], [99, 102, 241], [37, 99, 235]],
    symbolColor: 'rgba(147, 130, 246, 0.8)',
  },
}

// Element-specific entrance animations
const ELEMENT_ENTRANCE = {
  fire: {
    initial: { opacity: 0, scale: 0.7, y: 40 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  earth: {
    initial: { opacity: 0, y: 80, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
  air: {
    initial: { opacity: 0, x: 60, scale: 1.05 },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  water: {
    initial: { opacity: 0, scale: 0.8, y: 30 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.22, 0.61, 0.36, 1] as [number, number, number, number] },
  },
}

const PLANET_AURA_COLORS: Record<string, string> = {
  sun: 'rgba(250, 204, 21, 0.35)',
  moon: 'rgba(148, 163, 184, 0.3)',
  mercury: 'rgba(167, 139, 250, 0.3)',
  venus: 'rgba(244, 114, 182, 0.3)',
  mars: 'rgba(239, 68, 68, 0.35)',
  jupiter: 'rgba(251, 146, 60, 0.3)',
  saturn: 'rgba(120, 113, 108, 0.25)',
  uranus: 'rgba(34, 211, 238, 0.3)',
  neptune: 'rgba(59, 130, 246, 0.3)',
  pluto: 'rgba(107, 33, 168, 0.3)',
  northNode: 'rgba(168, 85, 247, 0.25)',
  rising: 'rgba(34, 211, 238, 0.3)',
}

/* ═══════════════════════════════════════════════════════════════
   CELESTIAL MENACE — Full Stand Particle Engine
   Ported from p5.js Celestial Menace algorithmic art.
   Each element has unique particle physics, speed lines,
   aura ring, and menacing glyph emergence.
   ═══════════════════════════════════════════════════════════════ */

interface Particle {
  x: number; y: number; vx: number; vy: number
  size: number; life: number; maxLife: number
  noiseOffset: number
  burstVx: number; burstVy: number; burstLife: number
}

interface SpeedLine {
  angle: number; length: number; width: number
  offset: number; life: number; delay: number
}

interface AuraOrb {
  angle: number; baseRadius: number; speed: number
  size: number; breathPhase: number; breathSpeed: number
}

interface MenacingGlyph {
  x: number; y: number; vx: number; vy: number
  char: string; size: number; life: number
  fadeRate: number; rotation: number; rotSpeed: number
}

// Simple 2D noise approximation for canvas (no p5 dependency)
function simpleNoise(x: number, y: number, z: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 45.164) * 43758.5453
  return (n - Math.floor(n))
}

function StandParticleEngine({ element, isActive, delayMs = 0 }: { element: 'fire' | 'earth' | 'air' | 'water'; isActive: boolean; delayMs?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(delayMs === 0)
  const stateRef = useRef<{
    particles: Particle[]
    speedLines: SpeedLine[]
    auraOrbs: AuraOrb[]
    menacingGlyphs: MenacingGlyph[]
    frame: number
    flashIntensity: number
    phase: number // 0=idle, 1=summon, 2=manifest, 3=sustain
    phaseTimer: number
  } | null>(null)

  // Delay particle engine start so the panel finishes its entrance animation
  useEffect(() => {
    if (delayMs <= 0) { setReady(true); return }
    const t = setTimeout(() => setReady(true), delayMs)
    return () => clearTimeout(t)
  }, [delayMs])

  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return

    const updateSize = () => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    updateSize()

    const theme = ELEMENT_THEMES[element]
    const w = () => canvas.width / (Math.min(window.devicePixelRatio || 1, 2))
    const h = () => canvas.height / (Math.min(window.devicePixelRatio || 1, 2))
    const cxFn = () => w() / 2
    const cyFn = () => h() / 2

    // Initialize state
    const particles: Particle[] = []
    const speedLines: SpeedLine[] = []
    const auraOrbs: AuraOrb[] = []
    const menacingGlyphs: MenacingGlyph[] = []

    // Spawn particles — burst from center (summon phase)
    const particleCount = isActive ? 60 : 30
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = Math.random() * 10
      particles.push({
        x: cxFn() + Math.cos(angle) * r,
        y: cyFn() + Math.sin(angle) * r,
        vx: 0, vy: 0,
        size: 1 + Math.random() * 3,
        life: 1.0,
        maxLife: 80 + Math.random() * 120,
        noiseOffset: Math.random() * 1000,
        burstVx: Math.cos(angle) * (3 + Math.random() * 8),
        burstVy: Math.sin(angle) * (3 + Math.random() * 8),
        burstLife: 15 + Math.random() * 25,
      })
    }

    // Speed lines — radial slashes
    if (isActive) {
      for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2
        speedLines.push({
          angle,
          length: (0.3 + Math.random() * 0.5) * Math.min(w(), h()) * 0.35,
          width: 0.5 + Math.random() * 2,
          offset: Math.min(w(), h()) * 0.08 * (0.8 + Math.random() * 0.4),
          life: 1.0,
          delay: Math.random() * 0.08,
        })
      }
    }

    // Aura orbs — orbital ring
    for (let i = 0; i < 30; i++) {
      auraOrbs.push({
        angle: (i / 30) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        baseRadius: Math.min(w(), h()) * (0.15 + Math.random() * 0.15),
        speed: (0.005 + Math.random() * 0.015) * (Math.random() < 0.5 ? 1 : -1),
        size: 1 + Math.random() * 2.5,
        breathPhase: Math.random() * Math.PI * 2,
        breathSpeed: 0.8 + Math.random() * 0.7,
      })
    }

    // Menacing glyphs
    if (isActive) {
      const glyphSymbols = theme.symbols
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI * 0.4 + Math.random() * Math.PI * 0.5
        const dist = Math.min(w(), h()) * (0.15 + Math.random() * 0.2)
        menacingGlyphs.push({
          x: cxFn() + Math.cos(angle) * dist + (Math.random() - 0.5) * 30,
          y: cyFn() + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -(0.5 + Math.random() * 1.5),
          char: glyphSymbols[Math.floor(Math.random() * glyphSymbols.length)],
          size: 12 + Math.random() * 18,
          life: 1.0,
          fadeRate: 0.004 + Math.random() * 0.004,
          rotation: (Math.random() - 0.5) * 0.4,
          rotSpeed: (Math.random() - 0.5) * 0.015,
        })
      }
    }

    stateRef.current = {
      particles, speedLines, auraOrbs, menacingGlyphs,
      frame: 0, flashIntensity: isActive ? 2.5 : 0,
      phase: isActive ? 1 : 3, phaseTimer: 0,
    }

    let animId: number
    const startTime = performance.now()
    let fxPaused = false

    const handleFxVisibility = () => {
      fxPaused = document.hidden
      if (!fxPaused) animId = requestAnimationFrame(draw)
    }
    document.addEventListener('visibilitychange', handleFxVisibility)

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

    // Cache property access for hot loop (js-cache-property-access)
    const coreR = theme.core[0], coreG = theme.core[1], coreB = theme.core[2]
    const midR = theme.mid[0], midG = theme.mid[1], midB = theme.mid[2]
    const outerR = theme.outer[0], outerG = theme.outer[1], outerB = theme.outer[2]

    const draw = () => {
      if (fxPaused) return
      const state = stateRef.current
      if (!state) return

      const cw = w()
      const ch = h()
      const centerX = cw / 2
      const centerY = ch / 2
      const elapsed = (performance.now() - startTime) / 1000

      state.frame++
      state.phaseTimer += 1 / 60

      // Phase transitions
      if (state.phase === 1 && state.phaseTimer > 0.4) state.phase = 2
      if (state.phase === 2 && state.phaseTimer > 1.2) state.phase = 3
      state.flashIntensity *= 0.94

      ctx.clearRect(0, 0, cw, ch)

      const t = elapsed

      // ─── Aura orbs (orbital breathing ring) ───
      for (const orb of state.auraOrbs) {
        orb.angle += orb.speed
        const breathe = Math.sin(t * orb.breathSpeed + orb.breathPhase) * ch * 0.02
        const nOff = simpleNoise(orb.angle * 2, t * 0.5, 0) * ch * 0.03
        const r = orb.baseRadius + breathe + nOff
        const ox = centerX + Math.cos(orb.angle) * r
        const oy = centerY + Math.sin(orb.angle) * r
        const pulse = (Math.sin(t * 1.5 + orb.breathPhase) * 0.3 + 0.7)

        // High performance glow arcs (no createRadialGradient)
        ctx.fillStyle = `rgba(${midR}, ${midG}, ${midB}, ${pulse * 0.08})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.size * 4, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = `rgba(${midR}, ${midG}, ${midB}, ${pulse * 0.15})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.size * 2, 0, Math.PI * 2)
        ctx.fill()

        // Core
        ctx.fillStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${pulse * 0.5})`
        ctx.beginPath()
        ctx.arc(ox, oy, orb.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // ─── Element particles with full physics ───
      const ns = 0.008
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i]

        // Burst phase — explosive outward from center
        if (p.burstLife > 0) {
          p.x += p.burstVx
          p.y += p.burstVy
          p.burstVx *= 0.92
          p.burstVy *= 0.92
          p.burstLife--
        } else {
          // Element-specific physics (from Celestial Menace p5.js engine)
          if (element === 'fire') {
            // Turbulent upward rise with noise perturbation
            const nx = simpleNoise(p.x * ns * 2, p.y * ns * 2, t + p.noiseOffset) * Math.PI * 4
            p.vx += Math.cos(nx) * 0.25
            p.vy += Math.sin(nx) * 0.25 - 0.7 // strong upward bias
            p.vx *= 0.96
            p.vy *= 0.96
            p.size *= 0.997
          } else if (element === 'earth') {
            // Crystalline drift toward hexagonal lattice points
            const gridSnap = 25
            let targetX = Math.round(p.x / gridSnap) * gridSnap
            const targetY = Math.round(p.y / gridSnap) * gridSnap
            if (Math.round(p.y / gridSnap) % 2 !== 0) targetX += gridSnap * 0.5
            p.vx += (targetX - p.x) * 0.008
            p.vy += (targetY - p.y) * 0.008
            const nx = simpleNoise(p.x * ns, p.y * ns, t * 0.5 + p.noiseOffset)
            p.vx += (nx - 0.5) * 0.3
            p.vy += (nx - 0.5) * 0.3
            p.vx *= 0.94
            p.vy *= 0.94
          } else if (element === 'air') {
            // Rotational vortex flow
            const dx = p.x - centerX
            const dy = p.y - centerY
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
            const tangentX = -dy / dist
            const tangentY = dx / dist
            const radialX = dx / dist
            const radialY = dy / dist
            p.vx += (tangentX * 1.2 + radialX * 0.12) * 0.3
            p.vy += (tangentY * 1.2 + radialY * 0.12) * 0.3
            const nx = simpleNoise(p.x * ns, p.y * ns, t + p.noiseOffset)
            p.vx += (nx - 0.5) * 0.6
            p.vy += (simpleNoise(p.y * ns, p.x * ns, t + p.noiseOffset) - 0.5) * 0.6
            p.vx *= 0.97
            p.vy *= 0.97
          } else {
            // Water: concentric ripple oscillation
            const dx = p.x - centerX
            const dy = p.y - centerY
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.01
            const wave = Math.sin(dist * 0.05 - t * 3) * 1.5
            const radialX = dx / dist
            const radialY = dy / dist
            p.vx += radialX * wave * 0.25
            p.vy += radialY * wave * 0.25
            const tangentX = -dy / dist
            const tangentY = dx / dist
            p.vx += tangentX * 0.25
            p.vy += tangentY * 0.25
            p.vx *= 0.95
            p.vy *= 0.95
          }

          p.x += p.vx
          p.y += p.vy
        }

        p.life -= 1 / p.maxLife
        if (p.life <= 0 || p.x < -30 || p.x > cw + 30 || p.y < -30 || p.y > ch + 30) {
          // Respawn near center
          const angle = Math.random() * Math.PI * 2
          const rd = Math.random() * Math.min(cw, ch) * 0.3
          p.x = centerX + Math.cos(angle) * rd
          p.y = centerY + Math.sin(angle) * rd
          p.vx = 0; p.vy = 0
          p.life = 1.0
          p.maxLife = 80 + Math.random() * 120
          p.size = 1 + Math.random() * 3
          p.burstLife = 0
          continue
        }

        // Velocity-mapped color (fast=core, slow=outer)
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const speedNorm = clamp(speed / 5, 0, 1)
        const cr = lerp(outerR, coreR, speedNorm)
        const cg = lerp(outerG, coreG, speedNorm)
        const cb = lerp(outerB, coreB, speedNorm)
        const alpha = p.life * (0.4 + speedNorm * 0.6)

        // High performance glow arcs for fast particles
        if (speed > 1.5 && p.size > 1.5) {
          ctx.fillStyle = `rgba(${cr|0}, ${cg|0}, ${cb|0}, ${alpha * 0.15})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
          ctx.fill()
        }

        // Core
        ctx.fillStyle = `rgba(${cr|0}, ${cg|0}, ${cb|0}, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      // ─── Speed lines (radial slashes) ───
      for (const sl of state.speedLines) {
        sl.life -= 0.022
        if (sl.life <= 0) continue
        if (state.phaseTimer < sl.delay) continue

        const a = sl.life * sl.life
        const startR = sl.offset
        const endR = sl.offset + sl.length * (1 - sl.life * 0.5)

        ctx.strokeStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${a * 0.7})`
        ctx.lineWidth = sl.width * sl.life
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(centerX + Math.cos(sl.angle) * startR, centerY + Math.sin(sl.angle) * startR)
        ctx.lineTo(centerX + Math.cos(sl.angle) * endR, centerY + Math.sin(sl.angle) * endR)
        ctx.stroke()
      }

      // ─── Menacing glyphs (floating upward, dissolving) ───
      for (const mg of state.menacingGlyphs) {
        mg.x += mg.vx
        mg.y += mg.vy
        mg.life -= mg.fadeRate
        mg.rotation += mg.rotSpeed
        if (mg.life <= 0) continue

        const a = mg.life * mg.life
        ctx.save()
        ctx.translate(mg.x, mg.y)
        ctx.rotate(mg.rotation)
        ctx.font = `bold ${mg.size * (1 + (1 - mg.life) * 0.3)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${a * 0.7})`
        ctx.fillText(mg.char, 0, 0)
        ctx.restore()
      }

      // ─── Flash overlay (summon burst) ───
      if (state.flashIntensity > 0.05) {
        ctx.fillStyle = `rgba(${coreR}, ${coreG}, ${coreB}, ${state.flashIntensity * 0.08})`
        ctx.fillRect(0, 0, cw, ch)
      }

      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      document.removeEventListener('visibilitychange', handleFxVisibility)
      cancelAnimationFrame(animId)
    }
  }, [element, isActive, ready])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0 }}
      aria-hidden="true"
    />
  )
}

/* ═══════════════════════════════════════════════════════════════
   MENACING FLOATING SYMBOLS — ゴゴゴ-style astrology glyphs
   Float around the panel edges during the summon phase.
   ═══════════════════════════════════════════════════════════════ */
const MENACING_SYMBOLS = ['☽', '☉', '♄', '♃', '♂', '♀', '☿', '♆', '♅', '♇', '✦', '✧', '⚹', '△', '☊']

function MenacingSymbols({ element, isActive }: { element: 'fire' | 'earth' | 'air' | 'water'; isActive: boolean }) {
  const theme = ELEMENT_THEMES[element]
  const symbols = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      char: MENACING_SYMBOLS[Math.floor(Math.random() * MENACING_SYMBOLS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 20,
      delay: i * 0.08,
      duration: 2 + Math.random() * 1.5,
      drift: (Math.random() - 0.5) * 40,
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive])

  if (!isActive) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {symbols.map((s, i) => (
        <motion.span
          key={i}
          className="absolute font-bold"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            fontSize: s.size,
            color: theme.symbolColor,
            textShadow: `0 0 12px ${theme.glowColor}, 0 0 24px ${theme.glowColor}`,
          }}
          initial={{ opacity: 0, scale: 0, rotate: -30, y: 20 }}
          animate={{
            opacity: [0, 0.9, 0.7, 0],
            scale: [0, 1.3, 1.1, 0.8],
            rotate: [-30, 5, -5, 15],
            y: [20, -10, s.drift, s.drift - 30],
          }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            ease: 'easeOut',
          }}
        >
          {s.char}
        </motion.span>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GIANT GLYPH REVEAL — Planet symbol spirals from top-left to center
   Mathematically computed logarithmic spiral with 40 sample points
   for buttery-smooth interpolation via Framer Motion keyframes.
   ═══════════════════════════════════════════════════════════════ */

// Pre-compute spiral path once (40 points along a logarithmic spiral)
// Starts at top-left (~2.5 turns out) and converges to center
const SPIRAL_STEPS = 40
const SPIRAL_PATH = (() => {
  const xs: number[] = []
  const ys: number[] = []
  const rotations: number[] = []
  const scales: number[] = []
  const opacities: number[] = []

  const startRadius = 320    // pixels from center at start
  const totalRotation = 900  // degrees of spiral rotation (2.5 turns)
  const startAngle = Math.PI + Math.PI / 4 // begin from top-left quadrant (~225°)

  for (let i = 0; i <= SPIRAL_STEPS; i++) {
    // t goes from 0 (start) to 1 (center) with ease-in curve for deceleration
    const linear = i / SPIRAL_STEPS
    // Ease: fast at start, slow approach to center
    const t = 1 - Math.pow(1 - linear, 1.8)

    // Radius shrinks exponentially
    const radius = startRadius * Math.pow(1 - t, 2.2)
    // Angle advances through the spiral
    const angle = startAngle + (totalRotation * Math.PI / 180) * t

    xs.push(Math.cos(angle) * radius)
    ys.push(Math.sin(angle) * radius)
    rotations.push(-totalRotation * (1 - t))
    scales.push(0.25 + 0.75 * t)

    // Opacity: fade in over first 15%, hold, then slight dim at end
    if (linear < 0.12) opacities.push(linear / 0.12)
    else if (linear > 0.92) opacities.push(0.3 + 0.7 * ((1 - linear) / 0.08))
    else opacities.push(1)
  }
  return { xs, ys, rotations, scales, opacities }
})()

function GiantGlyphReveal({ iconName, element }: { iconName: string; element: 'fire' | 'earth' | 'air' | 'water' }) {
  const theme = ELEMENT_THEMES[element]
  const { xs, ys, rotations, scales, opacities } = SPIRAL_PATH

  // Afterimage opacity: lower and fades to 0 faster
  const afterOpacities = opacities.map((o, i) => {
    const t = i / SPIRAL_STEPS
    return o * Math.max(0, 0.45 - t * 0.5)
  })

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: 1.1, ease: 'easeIn' }}
    >
      {/* Afterimage trail — blurred, follows the same path */}
      <motion.div
        className="absolute select-none"
        style={{ color: theme.accentColor, filter: 'blur(6px)' }}
        initial={{ x: xs[0], y: ys[0], scale: scales[0] * 1.2, opacity: 0, rotate: rotations[0] }}
        animate={{
          x: xs,
          y: ys,
          scale: scales.map(s => s * 1.2),
          opacity: afterOpacities,
          rotate: rotations,
        }}
        transition={{ duration: 1.3, ease: 'linear', delay: 0.03 }}
      >
        <CelestialIcon name={iconName} size={180} />
      </motion.div>
      {/* Main icon — crisp, follows the spiral */}
      <motion.div
        className="absolute select-none"
        style={{ color: theme.symbolColor }}
        initial={{ x: xs[0], y: ys[0], scale: scales[0], opacity: 0, rotate: rotations[0] }}
        animate={{
          x: xs,
          y: ys,
          scale: scales,
          opacity: opacities.map((o, i) => i === opacities.length - 1 ? 0.3 : o),
          rotate: rotations,
        }}
        transition={{ duration: 1.1, ease: 'linear' }}
      >
        <CelestialIcon name={iconName} size={180} />
      </motion.div>
      {/* Small trail particles left behind at intervals along the spiral */}
      {[6, 12, 18, 24, 30].map((idx, i) => (
        <motion.div
          key={`trail-${i}`}
          className="absolute h-2 w-2 rounded-full"
          style={{ background: theme.accentColor }}
          initial={{ x: xs[idx], y: ys[idx], scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 0.8, 0],
            opacity: [0, 0.7, 0.3, 0],
          }}
          transition={{ duration: 0.8, delay: (idx / SPIRAL_STEPS) * 1.1, ease: 'easeOut' }}
        />
      ))}
    </motion.div>
  )
}

export function PlanetDetail({
  planet,
  onClose,
  type,
  birthTimeKnown = true,
  house,
  aspects = [],
}: PlanetDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [showMenacing, setShowMenacing] = useState(false)
  const [revealPhase, setRevealPhase] = useState(0) // 0=hidden, 1=flash, 2=glyph, 3=panel, 4=content

  const element = useMemo(() => {
    if (!planet) return 'fire' as const
    return SIGN_ELEMENTS[planet.sign.toLowerCase() as ZodiacSign] || 'fire'
  }, [planet])

  const theme = ELEMENT_THEMES[element]

  // Orchestrate the multi-phase reveal sequence
  useEffect(() => {
    if (planet) {
      setRevealPhase(1) // Flash
      setShowMenacing(true)
      const t1 = setTimeout(() => setRevealPhase(2), 80)   // Glyph reveal
      const t2 = setTimeout(() => setRevealPhase(3), 350)   // Panel slam
      const t3 = setTimeout(() => setRevealPhase(4), 700)   // Content cascade
      const t4 = setTimeout(() => setShowMenacing(false), 4000)
      if (panelRef.current) panelRef.current.focus()
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
    } else {
      setRevealPhase(0)
    }
  }, [planet])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (planet) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [planet, onClose])

  const interpretation = useMemo(() => {
    if (!planet) return null
    const isPlanetPosition = 'planet' in planet
    const isRising = type === 'rising'
    
    return isRising
      ? getRisingInterpretation(
          planet.sign,
          'degree' in planet ? planet.degree : (planet as PlanetPosition).signDegree,
          !birthTimeKnown
        )
      : getPlanetInterpretation(
          isPlanetPosition ? (planet as PlanetPosition).planet : type || 'sun',
          planet.sign,
          isPlanetPosition ? (planet as PlanetPosition).signDegree : (planet as PointData).degree,
          house,
          aspects
        )
  }, [planet, type, birthTimeKnown, house, aspects])

  if (!planet || !interpretation) return null

  const isPlanetPosition = 'planet' in planet
  const isRising = type === 'rising'

  const colorKey: Planet | 'rising' = isRising
    ? 'rising'
    : isPlanetPosition
      ? ((planet as PlanetPosition).planet as Planet)
      : 'sun'
  const auraColor = PLANET_AURA_COLORS[colorKey] || PLANET_AURA_COLORS.sun
  const signKey = planet.sign.toLowerCase() as ZodiacSign
  const displayTitle = isRising
    ? interpretation.title
    : isPlanetPosition
      ? PLANETS_BG[(planet as PlanetPosition).planet as Planet]
      : interpretation.title
  const titleIconName = colorKey // 'sun', 'moon', 'rising', etc.
  const signIconName = signKey   // 'aries', 'taurus', etc.
  const signLabel = ZODIAC_SIGNS_BG[signKey] || planet.sign

  const hasOverview = Boolean(interpretation.overview.trim())
  const hasStrengths = interpretation.strengths.length > 0
  const hasChallenges = interpretation.challenges.length > 0
  const hasAspectInsights = interpretation.aspectInsights.length > 0
  const hasGrowth = Boolean(interpretation.growth.trim())

  return (
    <AnimatePresence mode="wait">
      <div key={colorKey + planet.sign}>
        {/* ═══ PHASE 1: Full-screen dark vignette + flash ═══ */}
        <motion.div
          className="pointer-events-none fixed inset-0 z-50"
          style={{
            background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)`,
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        />
        {/* White/colored flash */}
        <motion.div
          className="pointer-events-none fixed inset-0 z-50"
          style={{ background: theme.glowColor.replace(/[\d.]+\)$/, '0.4)') }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />

        {/* ═══ PHASE 2: Giant glyph reveal ═══ */}
        {revealPhase >= 2 && (
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <GiantGlyphReveal iconName={titleIconName} element={element} />
          </div>
        )}

        {/* ═══ PHASE 3: The panel itself — sharp, angular, dramatic ═══ */}
        <motion.div
          ref={panelRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.3, y: 60 }}
          animate={{
            opacity: revealPhase >= 3 ? 1 : 0,
            scale: revealPhase >= 3 ? 1 : 0.3,
            y: revealPhase >= 3 ? 0 : 60,
          }}
          exit={{ opacity: 0, scale: 0.85, y: 30 }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1], // Dramatic overshoot
            scale: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }, // Springy slam
          }}
          className="mt-6 relative overflow-hidden backdrop-blur-md p-5 focus:outline-none"
          style={{
            '--aura-color': auraColor,
            background: 'linear-gradient(135deg, rgba(8, 12, 28, 0.92), rgba(15, 23, 42, 0.85))',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
          } as React.CSSProperties}
          role="dialog"
          aria-labelledby="planet-detail-title"
          aria-describedby="planet-detail-desc"
        >
          {/* ─── Full Stand Particle Engine (delayed until panel entrance finishes) ─── */}
          <StandParticleEngine element={element} isActive={showMenacing} delayMs={600} />

          {/* ─── Menacing floating symbols ─── */}
          <MenacingSymbols element={element} isActive={showMenacing} />

          {/* Dramatic corner accent cuts */}
          <motion.div
            className="pointer-events-none absolute top-0 right-0 w-[20px] h-[20px]"
            style={{
              background: `linear-gradient(225deg, ${theme.accentColor}, transparent)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          />
          <motion.div
            className="pointer-events-none absolute bottom-0 left-0 w-[20px] h-[20px]"
            style={{
              background: `linear-gradient(45deg, ${theme.accentColor}, transparent)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          />

          {/* Element-colored background wash */}
          <motion.div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${theme.bgGradient}`}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1.2 }}
          />

          {/* Breathing aura glow — intensified */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{
              boxShadow: `inset 0 0 60px ${theme.glowColor}`,
            }}
            animate={{
              boxShadow: [
                `inset 0 0 20px ${theme.glowColor.replace(/[\d.]+\)$/, '0.06)')}`,
                `inset 0 0 40px ${theme.glowColor.replace(/[\d.]+\)$/, '0.12)')}`,
                `inset 0 0 20px ${theme.glowColor.replace(/[\d.]+\)$/, '0.06)')}`,
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Shockwave rings — 3 staggered bursts */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`shockwave-${i}`}
              className="pointer-events-none absolute inset-0"
              style={{
                border: `${2 - i * 0.5}px solid ${theme.accentColor}`,
                clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
              }}
              initial={{ opacity: 0.8, scale: 0.9 }}
              animate={{ opacity: 0, scale: 1.8 + i * 0.3 }}
              transition={{ duration: 0.6 + i * 0.15, ease: 'easeOut', delay: 0.05 + i * 0.1 }}
            />
          ))}

          {/* Horizontal scan line (like Pokemon evolution flash) */}
          <motion.div
            className="pointer-events-none absolute left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.accentColor}, transparent)`,
              boxShadow: `0 0 20px ${theme.glowColor}, 0 0 40px ${theme.glowColor}`,
            }}
            initial={{ top: '0%', opacity: 1 }}
            animate={{ top: '100%', opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          />
          {/* Second scan line going up */}
          <motion.div
            className="pointer-events-none absolute left-0 right-0 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.accentColor.replace(/[\d.]+\)$/, '0.4)')}, transparent)`,
            }}
            initial={{ bottom: '0%', opacity: 0.8 }}
            animate={{ bottom: '100%', opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          />

          {/* Edge accent lines that draw in */}
          <motion.div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-[2px]"
            style={{ background: `linear-gradient(to bottom, ${theme.accentColor}, transparent 70%)` }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.3, delay: 0.15, ease: 'easeOut' }}
          />
          <motion.div
            className="pointer-events-none absolute top-0 left-0 right-0 h-[1px]"
            style={{ background: `linear-gradient(to right, ${theme.accentColor}, transparent 60%)` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
          />

          {/* ═══ PHASE 4: Content — staggered dramatic reveal ═══ */}
          <div className="relative z-10">
            <div className="mb-4 flex items-start justify-between">
              <div className="min-w-0">
                {/* Title badge row — slams in from left */}
                <motion.div
                  className="mb-3 flex flex-wrap items-center gap-2"
                  initial={{ x: -60, opacity: 0, filter: 'blur(8px)' }}
                  animate={{
                    x: revealPhase >= 4 ? 0 : -60,
                    opacity: revealPhase >= 4 ? 1 : 0,
                    filter: revealPhase >= 4 ? 'blur(0px)' : 'blur(8px)',
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <motion.span
                    className="inline-flex items-center gap-2 px-3 py-1 text-sm font-bold tracking-wide"
                    style={{
                      background: `linear-gradient(135deg, ${theme.glowColor}, ${theme.glowColor.replace(/[\d.]+\)$/, '0.05)')})`,
                      border: `1px solid ${theme.accentColor.replace(/[\d.]+\)$/, '0.4)')}`,
                      color: 'rgba(255,255,255,0.95)',
                      clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                    }}
                  >
                    {/* Planet glyph with spiral-in */}
                    <motion.span
                      className="text-lg leading-none"
                      initial={{ scale: 2.5, opacity: 0, rotate: -360, x: -20, y: -12 }}
                      animate={{
                        scale: revealPhase >= 4 ? [2.5, 1.8, 1.2, 1] : 2.5,
                        opacity: revealPhase >= 4 ? [0, 0.6, 1, 1] : 0,
                        rotate: revealPhase >= 4 ? [-360, -180, -30, 0] : -360,
                        x: revealPhase >= 4 ? [-20, -10, 3, 0] : -20,
                        y: revealPhase >= 4 ? [-12, -6, 2, 0] : -12,
                      }}
                      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 0.68, 0.36, 1] }}
                      style={{ textShadow: `0 0 12px ${theme.glowColor}` }}
                    >
                      <CelestialIcon name={titleIconName} size={18} />
                    </motion.span>
                    <span>{displayTitle}</span>
                  </motion.span>
                  <motion.span
                    className="inline-flex items-center gap-2 border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-slate-300"
                    style={{
                      clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: revealPhase >= 4 ? 1 : 0,
                      x: revealPhase >= 4 ? 0 : -20,
                    }}
                    transition={{ delay: 0.15, duration: 0.3 }}
                  >
                    <motion.span
                      className="text-base leading-none"
                      animate={revealPhase >= 4 ? { scale: [1.5, 1], rotate: [20, 0] } : {}}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      <CelestialIcon name={signIconName} size={18} />
                    </motion.span>
                    <span>{signLabel}</span>
                  </motion.span>
                  {house !== undefined && (
                    <motion.span
                      className="inline-flex items-center border border-white/10 bg-slate-900/60 px-3 py-1 text-sm text-slate-400"
                      style={{
                        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                      }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{
                        opacity: revealPhase >= 4 ? 1 : 0,
                        scale: revealPhase >= 4 ? 1 : 0.5,
                      }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      Дом {house}
                    </motion.span>
                  )}
                </motion.div>

                {/* Title — types in with glow */}
                <motion.h3
                  id="planet-detail-title"
                  className="text-lg font-bold text-slate-100"
                  style={{ textShadow: `0 0 20px ${theme.glowColor}` }}
                  initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 15,
                    filter: revealPhase >= 4 ? 'blur(0px)' : 'blur(4px)',
                  }}
                  transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  {interpretation.title}
                </motion.h3>
                <motion.p
                  className="mt-1 text-sm text-slate-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: revealPhase >= 4 ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                >
                  {interpretation.position}
                </motion.p>
              </div>

              {/* Close button — appears last */}
              <motion.button
                onClick={onClose}
                className="-mr-2 -mt-1 p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                style={{
                  clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                }}
                aria-label="Затвори"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: revealPhase >= 4 ? 1 : 0, scale: revealPhase >= 4 ? 1 : 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Brief interpretation — dramatic fade with underline sweep */}
            {interpretation.brief && (
              <motion.div
                className="mb-4 relative"
                initial={{ opacity: 0, x: -30 }}
                animate={{
                  opacity: revealPhase >= 4 ? 1 : 0,
                  x: revealPhase >= 4 ? 0 : -30,
                }}
                transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <p
                  className="text-base font-medium leading-relaxed"
                  style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    textShadow: `0 0 20px ${theme.glowColor}`,
                  }}
                >
                  {interpretation.brief.charAt(0).toUpperCase() + interpretation.brief.slice(1)}
                </p>
                {/* Underline sweep */}
                <motion.div
                  className="mt-2 h-[1px]"
                  style={{
                    background: `linear-gradient(90deg, ${theme.accentColor}, transparent)`,
                    transformOrigin: 'left',
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: revealPhase >= 4 ? 1 : 0 }}
                  transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
                />
              </motion.div>
            )}

            {/* Content sections — staggered cascade with left accent bars */}
            <motion.div
              id="planet-detail-desc"
              className="space-y-4 text-sm leading-relaxed text-slate-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: revealPhase >= 4 ? 1 : 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
            >
              {hasOverview && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-1 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Общ поглед
                  </h4>
                  <p>{interpretation.overview}</p>
                </motion.section>
              )}

              {hasStrengths && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.6, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Силни страни
                  </h4>
                  <ul className="space-y-1">
                    {interpretation.strengths.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: revealPhase >= 4 ? 1 : 0,
                          x: revealPhase >= 4 ? 0 : -20,
                        }}
                        transition={{ delay: 0.65 + i * 0.07, duration: 0.3 }}
                      >
                        <span style={{ color: theme.accentColor }}>&#x25C8;</span> {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {hasChallenges && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.7, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Предизвикателства
                  </h4>
                  <ul className="space-y-1">
                    {interpretation.challenges.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: revealPhase >= 4 ? 1 : 0,
                          x: revealPhase >= 4 ? 0 : -20,
                        }}
                        transition={{ delay: 0.75 + i * 0.07, duration: 0.3 }}
                      >
                        <span style={{ color: theme.accentColor }}>&#x25C8;</span> {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {hasAspectInsights && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.8, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-2 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Аспекти
                  </h4>
                  <ul className="space-y-2">
                    {interpretation.aspectInsights.map((item, i) => (
                      <motion.li
                        key={item}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: revealPhase >= 4 ? 1 : 0,
                          x: revealPhase >= 4 ? 0 : -20,
                        }}
                        transition={{ delay: 0.85 + i * 0.07, duration: 0.3 }}
                      >
                        <span style={{ color: theme.accentColor }}>&#x25C8;</span> {item}
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              )}

              {hasGrowth && (
                <motion.section
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: theme.accentColor.replace(/[\d.]+\)$/, '0.3)') }}
                  initial={{ opacity: 0, y: 20, x: -15 }}
                  animate={{
                    opacity: revealPhase >= 4 ? 1 : 0,
                    y: revealPhase >= 4 ? 0 : 20,
                    x: revealPhase >= 4 ? 0 : -15,
                  }}
                  transition={{ delay: 0.9, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h4
                    className="mb-1 text-xs font-bold uppercase tracking-[0.25em]"
                    style={{ color: theme.accentColor, textShadow: `0 0 8px ${theme.glowColor}` }}
                  >
                    Насока за развитие
                  </h4>
                  <p>{interpretation.growth}</p>
                </motion.section>
              )}
            </motion.div>

            {isRising && !birthTimeKnown && (
              <div className="mt-4 border border-amber-500/30 bg-amber-500/10 p-3"
                style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}
              >
                <p className="text-xs text-amber-300">
                  Часът на раждане е приблизителен, затова и тълкуването на възходящия знак е ориентировъчно.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
