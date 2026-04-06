'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PlanetPosition, PointData } from '@celestia/astrology/client'
import { ZODIAC_SIGNS_BG, PLANETS_BG } from '@celestia/astrology/client'
import type { ZodiacSign } from '@celestia/astrology/client'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

interface BigThreeCardsProps {
  sun: PlanetPosition
  moon: PlanetPosition
  ascendant: PointData
  birthTimeKnown: boolean
  onSelect?: (type: 'sun' | 'moon' | 'rising') => void
  selected?: 'sun' | 'moon' | 'rising' | null
}

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

// Glyphs now use <CelestialIcon> components from icons/CelestialIcons

interface BigThreeCardProps {
  iconName: string
  title: string
  sign: string
  degree: number
  trait: string
  color: string
  isApproximate?: boolean
  isSelected?: boolean
  onClick?: () => void
}

const AURA_COLORS: Record<string, { border: string; bg: string; glow: string; aura: string; gradient: string; menacing: string[] }> = {
  yellow: {
    border: 'rgba(250, 204, 21, 0.5)',
    bg: 'rgba(250, 204, 21, 0.12)',
    glow: '0 0 20px rgba(250, 204, 21, 0.3)',
    aura: 'rgba(250, 204, 21, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(250, 204, 21, 0.08), rgba(239, 68, 68, 0.04))',
    menacing: ['\u2736', '\u2600', '\u2727'],
  },
  slate: {
    border: 'rgba(148, 163, 184, 0.5)',
    bg: 'rgba(148, 163, 184, 0.12)',
    glow: '0 0 20px rgba(148, 163, 184, 0.3)',
    aura: 'rgba(148, 163, 184, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(148, 163, 184, 0.08), rgba(100, 116, 139, 0.04))',
    menacing: ['\u263D', '\u2726', '\u2735'],
  },
  cyan: {
    border: 'rgba(34, 211, 238, 0.5)',
    bg: 'rgba(34, 211, 238, 0.12)',
    glow: '0 0 20px rgba(34, 211, 238, 0.3)',
    aura: 'rgba(34, 211, 238, 0.25)',
    gradient: 'linear-gradient(135deg, rgba(34, 211, 238, 0.08), rgba(99, 102, 241, 0.04))',
    menacing: ['\u2197', '\u2604', '\u2738'],
  },
}

const SIGN_TO_ELEMENT: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
}

const ELEMENT_PARTICLE_COLORS: Record<string, number[][]> = {
  fire:  [[255, 100, 30], [239, 68, 68], [251, 191, 36]],
  earth: [[16, 185, 129], [163, 160, 68], [146, 115, 79]],
  air:   [[34, 211, 238], [125, 211, 252], [165, 180, 252]],
  water: [[59, 130, 246], [139, 92, 246], [99, 102, 241]],
}

/** Tiny canvas burst that fires once on selection, element-themed */
function CardParticleBurst({ sign, active }: { sign: string; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const parent = canvas.parentElement
    if (!parent) return
    const rect = parent.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const w = rect.width
    const h = rect.height
    const el = SIGN_TO_ELEMENT[sign.toLowerCase()] || 'fire'
    const colors = ELEMENT_PARTICLE_COLORS[el]

    type P = { x: number; y: number; vx: number; vy: number; size: number; life: number; color: number[] }
    const particles: P[] = []

    // Burst from center
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1.5 + Math.random() * 4
      const c = colors[Math.floor(Math.random() * colors.length)]
      particles.push({
        x: w / 2, y: h / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 0.8 + Math.random() * 2,
        life: 1.0,
        color: c,
      })
    }

    // Element-specific extra particles
    if (el === 'fire') {
      for (let i = 0; i < 10; i++) {
        const c = colors[Math.floor(Math.random() * colors.length)]
        particles.push({
          x: Math.random() * w, y: h,
          vx: (Math.random() - 0.5) * 1,
          vy: -(1 + Math.random() * 2.5),
          size: 0.5 + Math.random() * 1.5,
          life: 1.0,
          color: c,
        })
      }
    } else if (el === 'air') {
      for (let i = 0; i < 8; i++) {
        const c = colors[Math.floor(Math.random() * colors.length)]
        particles.push({
          x: 0, y: Math.random() * h,
          vx: 1.5 + Math.random() * 2,
          vy: (Math.random() - 0.5) * 1,
          size: 0.5 + Math.random() * 1.5,
          life: 1.0,
          color: c,
        })
      }
    }

    let frame = 0
    const draw = () => {
      frame++
      ctx.clearRect(0, 0, w, h)
      let alive = false

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.96
        p.vy *= 0.96
        p.life -= 0.018

        if (el === 'fire') p.vy -= 0.05
        if (el === 'air') p.vy += Math.sin(frame * 0.08) * 0.1
        if (el === 'water') p.vx += Math.sin(frame * 0.06 + p.y * 0.05) * 0.08

        if (p.life <= 0) continue
        alive = true

        const a = p.life * p.life
        // Glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3)
        grad.addColorStop(0, `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${a * 0.3})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2)
        ctx.fill()
        // Core
        ctx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${a})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      if (alive) {
        animRef.current = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [sign, active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 rounded-xl"
      aria-hidden="true"
    />
  )
}

function BigThreeCard({
  iconName,
  title,
  sign,
  degree,
  trait,
  color,
  isApproximate,
  isSelected,
  onClick,
}: BigThreeCardProps) {
  const auraStyle = AURA_COLORS[color] || AURA_COLORS.slate

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      animate={isSelected ? {
        scale: 1.02,
        borderColor: auraStyle.border,
        backgroundColor: auraStyle.bg,
      } : {
        scale: 1,
        borderColor: 'rgba(51, 65, 85, 0.5)',
        backgroundColor: 'rgba(30, 41, 59, 0.3)',
      }}
      transition={{ duration: 0.3 }}
      className={`
        w-full rounded-xl border p-4 text-left relative overflow-hidden
        backdrop-blur-sm
        focus:outline-none focus:ring-2 focus:ring-purple-500/50
        ${!isSelected ? 'hover:border-slate-600/50 hover:bg-slate-800/50' : ''}
      `}
      style={{ willChange: 'transform' }}
      aria-pressed={isSelected}
    >
      {/* GPU-composited aura glow — uses opacity animation instead of boxShadow */}
      <div
        className="pointer-events-none absolute -inset-[1px] rounded-xl transition-opacity duration-300"
        style={{
          opacity: isSelected ? 1 : 0,
          boxShadow: `0 0 20px ${auraStyle.aura}, 0 0 50px ${auraStyle.aura.replace(/[\d.]+\)$/, '0.1)')}, inset 0 0 15px ${auraStyle.aura}`,
          animation: isSelected ? 'aura-glow 2s ease-in-out infinite' : 'none',
          willChange: isSelected ? 'opacity' : 'auto',
        }}
      />
      {/* Stand-style energy burst on select */}
      <AnimatePresence>
        {isSelected && (
          <>
            {/* Expanding ring burst */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-xl"
              initial={{ opacity: 0.9, scale: 0.85 }}
              animate={{ opacity: 0, scale: 2.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              style={{ border: `2px solid ${auraStyle.aura}` }}
            />
            {/* Inner gradient wash */}
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ background: auraStyle.gradient }}
            />
            {/* Floating menacing symbols */}
            <div className="pointer-events-none absolute -right-1 -top-1 z-20">
              {auraStyle.menacing.map((symbol, i) => (
                <motion.span
                  key={i}
                  className="absolute text-sm font-bold"
                  style={{ color: auraStyle.aura, right: i * 14 }}
                  initial={{ opacity: 0, y: 0, scale: 0.3 }}
                  animate={{
                    opacity: [0, 0.9, 0],
                    y: [0, -25, -50],
                    rotate: [0, -12, -18],
                    scale: [0.3, 1.1, 0.5],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, delay: i * 0.2, ease: 'easeOut' }}
                >
                  {symbol}
                </motion.span>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Element-aware particle burst */}
      <CardParticleBurst sign={sign} active={!!isSelected} />

      <div className="relative z-10">
        <div className="mb-2 flex items-center justify-between">
          <span className={`inline-flex items-center gap-2 text-sm font-medium ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
            <motion.span
              className="leading-none"
              animate={isSelected ? { scale: [1, 1.4, 1], rotate: [0, 10, 0] } : {}}
              transition={{ duration: 0.5 }}
            >
              <CelestialIcon name={iconName} size={18} />
            </motion.span>
            <span>{isApproximate ? '~' : ''}{title}</span>
          </span>
          {isApproximate && (
            <span className="text-xs text-slate-500" title="приблизително">
              ?
            </span>
          )}
        </div>
        <div className="mb-1 text-lg font-semibold text-slate-100">
          <span className="inline-flex items-center gap-2">
            <CelestialIcon name={sign.toLowerCase()} size={22} />
            <span>{ZODIAC_SIGNS_BG[sign as ZodiacSign]}</span>
          </span>
          <span className="ml-2 text-sm font-normal text-slate-400">
            {Math.floor(degree)}°
          </span>
        </div>
        <div className={`text-sm ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
          {trait}
        </div>
      </div>
    </motion.button>
  )
}

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
        iconName="sun"
        title={PLANETS_BG.sun}
        sign={sun.sign}
        degree={sun.signDegree}
        trait={SIGN_TRAITS[sun.sign as ZodiacSign]}
        color="yellow"
        isSelected={selected === 'sun'}
        onClick={() => onSelect?.('sun')}
      />
      <BigThreeCard
        iconName="moon"
        title={PLANETS_BG.moon}
        sign={moon.sign}
        degree={moon.signDegree}
        trait={SIGN_TRAITS[moon.sign as ZodiacSign]}
        color="slate"
        isSelected={selected === 'moon'}
        onClick={() => onSelect?.('moon')}
      />
      <BigThreeCard
        iconName="rising"
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
