'use client'

import { motion } from 'framer-motion'

/** Three orbiting bodies - violet / indigo / amber - editorial color palette. */
const ORBIT_PLANETS = [
  { delay: 0,   size: 5, color: '#c4b5fd', orbit: 48, duration: 3.2 },
  { delay: 0.6, size: 4, color: '#818cf8', orbit: 66, duration: 4.8 },
  { delay: 1.2, size: 5, color: '#fbbf24', orbit: 84, duration: 6.4 },
] as const

export function LoadingAnimation() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: 200, height: 200 }}>
        {/* Orbit rings - quiet hairlines */}
        {ORBIT_PLANETS.map((planet, i) => (
          <div
            key={`ring-${i}`}
            className="absolute rounded-full border border-white/[0.04]"
            style={{
              width: planet.orbit * 2,
              height: planet.orbit * 2,
              left: 100 - planet.orbit,
              top: 100 - planet.orbit,
            }}
          />
        ))}

        {/* Orbiting bodies */}
        {ORBIT_PLANETS.map((planet, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: planet.orbit * 2,
              height: planet.orbit * 2,
              left: 100 - planet.orbit,
              top: 100 - planet.orbit,
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: planet.duration,
              ease: 'linear',
              repeat: Infinity,
              delay: planet.delay,
            }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: planet.size,
                height: planet.size,
                backgroundColor: planet.color,
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                boxShadow: `0 0 ${planet.size * 3}px ${planet.color}99`,
              }}
            />
          </motion.div>
        ))}

        {/* Center - rotating amber diamond instead of solid blob */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ opacity: 0, scale: 0.6, filter: 'blur(6px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: [0.22, 0.68, 0.35, 1] }}
        >
          {/* Outer violet halo */}
          <span
            aria-hidden
            className="absolute inset-0 -m-4 rounded-full bg-violet-500/[0.12] blur-xl"
          />
          {/* Rotating diamond */}
          <motion.span
            aria-hidden
            className="relative block h-3 w-3 rotate-45 bg-amber-300/90 shadow-[0_0_22px_rgba(251,191,36,0.75)]"
            animate={{ rotate: 405 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      </div>

      {/* Editorial label */}
      <motion.div
        className="mt-8 flex flex-col items-center gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        <div className="flex items-center gap-3" aria-hidden>
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/40" />
          <span className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/40" />
        </div>
        <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-400">
          Celestia
        </p>
        <p className="font-display text-[13px] font-light italic text-slate-500">
          подреждa звездите…
        </p>
      </motion.div>

      {/* Pulsing dot trio */}
      <div className="mt-4 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1 w-1 rotate-45 bg-amber-300/70"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.25, 0.85] }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.22,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  )
}
