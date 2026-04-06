'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CelestialCanvas, CONSTELLATIONS, type ConstellationData } from './CelestialCanvas'

/**
 * Interactive celestial background with clickable constellations.
 *
 * Constellation interactivity (click targets, hover, info panels) is only
 * enabled on the dashboard. Other pages get the animated sky without the
 * interactive overlay — this avoids competing animation loops on heavy
 * pages like the natal chart.
 */
export function CelestialBackground() {
  const pathname = usePathname()
  const interactive = pathname === '/dashboard' || pathname === '/' || pathname === '/sign-in' || pathname === '/sign-up'

  const mouseRef = useRef<{ x: number; y: number }>({ x: -1000, y: -1000 })
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedConstellation, setSelectedConstellation] = useState<ConstellationData | null>(null)
  // Use ref for high-frequency position updates from canvas (avoids 60fps re-renders)
  const positionsRef = useRef<Map<string, { x: number; y: number; stars: { sx: number; sy: number }[] }>>(new Map())
  // State version only bumped on significant changes (resize) to trigger button repositioning
  const [positionsVersion, setPositionsVersion] = useState(0)
  // Track mouse globally for parallax — always active for smooth star movement
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  // Bump positionsVersion on window resize so buttons reposition
  useEffect(() => {
    if (!interactive) return
    const handler = () => setPositionsVersion(v => v + 1)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [interactive])

  // Close on Escape
  useEffect(() => {
    if (!selectedConstellation) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedConstellation(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedConstellation])

  const handlePositionsUpdate = useCallback(
    (positions: Map<string, { x: number; y: number; stars: { sx: number; sy: number }[] }>) => {
      const prev = positionsRef.current
      positionsRef.current = positions
      // Only trigger React re-render on first update (empty → populated)
      if (prev.size === 0 && positions.size > 0) {
        setPositionsVersion(v => v + 1)
      }
    },
    []
  )

  const handleConstellationClick = useCallback((id: string) => {
    const c = CONSTELLATIONS.find(c => c.id === id)
    if (c) setSelectedConstellation(prev => prev?.id === id ? null : c)
  }, [])

  // Compute panel position near the constellation
  const panelPosition = (() => {
    if (!selectedConstellation) return { x: 0, y: 0 }
    const pos = positionsRef.current.get(selectedConstellation.id)
    if (!pos) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const panelW = 340, panelH = 320
    let x = pos.x + 40
    let y = pos.y - panelH / 2
    // Clamp to viewport
    if (x + panelW > window.innerWidth - 20) x = pos.x - panelW - 40
    if (y < 80) y = 80
    if (y + panelH > window.innerHeight - 20) y = window.innerHeight - panelH - 20
    if (x < 20) x = 20
    return { x, y }
  })()

  return (
    <>
      {/* Layer 1: Canvas background (behind everything) */}
      <div className="fixed inset-0 z-[-1]">
        <CelestialCanvas
          className="absolute inset-0"
          interactive
          starCount={350}
          externalMouseRef={mouseRef}
          hoveredConstellationId={interactive ? hoveredId : null}
          selectedConstellationId={interactive ? (selectedConstellation?.id ?? null) : null}
          onPositionsUpdate={interactive ? handlePositionsUpdate : undefined}
        />
      </div>

      {/* Layer 2: Constellation click targets — only on dashboard */}
      {interactive && (
        <div className="pointer-events-none fixed inset-0 z-[15]" key={positionsVersion}>
          {CONSTELLATIONS.map(c => {
            const pos = positionsRef.current.get(c.id)
            if (!pos) return null
            return (
              <button
                key={c.id}
                className="pointer-events-auto absolute flex items-center justify-center transition-transform duration-200 hover:scale-125"
                style={{
                  left: pos.x - 16,
                  top: pos.y - 16,
                  width: 32,
                  height: 32,
                }}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleConstellationClick(c.id)}
                aria-label={`${c.name} — натисни за информация`}
              >
                {/* Subtle pulsing ring target */}
                <span
                  className="absolute h-6 w-6 rounded-full border transition-opacity duration-200"
                  style={{
                    borderColor: hoveredId === c.id ? 'rgba(200,220,255,0.6)' : 'rgba(200,220,255,0.15)',
                    opacity: hoveredId === c.id ? 0.8 : 0.3,
                    animation: 'pulse 3s ease-in-out infinite',
                    willChange: 'opacity',
                  }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: hoveredId === c.id ? 'rgba(200,220,255,0.9)' : 'rgba(200,220,255,0.3)',
                    boxShadow: hoveredId === c.id
                      ? '0 0 8px rgba(200,220,255,0.6), 0 0 16px rgba(200,220,255,0.3)'
                      : 'none',
                  }}
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Layer 3: Info panel overlay (above everything) — only on dashboard */}
      <AnimatePresence>
        {selectedConstellation && (
          <>
            {/* Backdrop click-to-close */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-[59]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedConstellation(null)}
              style={{ background: 'rgba(0,0,0,0.2)' }}
            />
            {/* Panel */}
            <motion.div
              key={selectedConstellation.id}
              className="fixed z-[60] w-[340px] backdrop-blur-xl"
              style={{
                left: panelPosition.x,
                top: panelPosition.y,
                background: 'linear-gradient(135deg, rgba(8, 12, 28, 0.94), rgba(12, 18, 35, 0.9))',
                border: '1px solid rgba(200, 220, 255, 0.12)',
                clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
              }}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
                scale: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
              }}
              role="dialog"
              aria-label={selectedConstellation.name}
            >
              {/* Top accent line */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: 'linear-gradient(90deg, rgba(200,220,255,0.4), transparent 70%)' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
              {/* Left accent line */}
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-[1px]"
                style={{ background: 'linear-gradient(180deg, rgba(200,220,255,0.4), transparent 70%)' }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              />
              {/* Corner accents */}
              <div
                className="absolute top-0 right-0 w-[16px] h-[16px] pointer-events-none"
                style={{ background: 'linear-gradient(225deg, rgba(200,220,255,0.15), transparent)' }}
              />
              <div
                className="absolute bottom-0 left-0 w-[16px] h-[16px] pointer-events-none"
                style={{ background: 'linear-gradient(45deg, rgba(200,220,255,0.15), transparent)' }}
              />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <motion.h3
                      className="text-lg font-bold text-slate-100 tracking-wide"
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      {selectedConstellation.name}
                    </motion.h3>
                    <motion.p
                      className="text-xs text-slate-500 font-medium tracking-widest uppercase"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {selectedConstellation.latin}
                    </motion.p>
                  </div>
                  <button
                    onClick={() => setSelectedConstellation(null)}
                    className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    aria-label="Затвори"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Constellation mini-map */}
                <motion.div
                  className="mb-4 flex justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                >
                  <ConstellationMiniMap constellation={selectedConstellation} />
                </motion.div>

                {/* Info rows */}
                <motion.div
                  className="space-y-2.5 text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35 }}
                >
                  <p className="text-slate-300 leading-relaxed">
                    {selectedConstellation.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <InfoChip label="Сезон" value={selectedConstellation.season} />
                    <InfoChip label="Най-ярка" value={selectedConstellation.brightestStar} />
                    {selectedConstellation.element && (
                      <InfoChip label="Стихия" value={selectedConstellation.element} />
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ─── Mini SVG drawing of the constellation pattern ─── */
function ConstellationMiniMap({ constellation }: { constellation: ConstellationData }) {
  const padding = 20
  const size = 100
  const stars = constellation.stars
  const minX = Math.min(...stars.map(s => s.dx))
  const maxX = Math.max(...stars.map(s => s.dx))
  const minY = Math.min(...stars.map(s => s.dy))
  const maxY = Math.max(...stars.map(s => s.dy))
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1
  const scale = Math.min((size - padding * 2) / rangeX, (size - padding * 2) / rangeY)

  const mapped = stars.map(s => ({
    x: (s.dx - minX - rangeX / 2) * scale + size / 2,
    y: (s.dy - minY - rangeY / 2) * scale + size / 2,
    mag: s.mag,
    name: s.name,
  }))

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="opacity-80">
      {/* Connection lines */}
      {constellation.lines.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={mapped[a].x} y1={mapped[a].y}
          x2={mapped[b].x} y2={mapped[b].y}
          stroke="rgba(200,220,255,0.35)"
          strokeWidth={1}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
        />
      ))}
      {/* Stars */}
      {mapped.map((s, i) => {
        const r = Math.max(1.5, 4 - s.mag * 0.5)
        return (
          <motion.circle
            key={i}
            cx={s.x} cy={s.y} r={r}
            fill="rgba(220,230,255,0.9)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.04, type: 'spring', stiffness: 300 }}
          >
            {s.name && <title>{s.name}</title>}
          </motion.circle>
        )
      })}
    </svg>
  )
}

/* ─── Small info chip ─── */
function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-white/5 bg-white/[0.03] px-2.5 py-1.5">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <span className="block text-xs text-slate-300 leading-snug mt-0.5">{value}</span>
    </div>
  )
}
