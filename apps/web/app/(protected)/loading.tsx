'use client'

import { motion } from 'framer-motion'

const ORBIT_PLANETS = [
  { delay: 0, size: 6, color: '#a78bfa', orbit: 48, duration: 3 },
  { delay: 0.5, size: 4, color: '#6366f1', orbit: 64, duration: 4.5 },
  { delay: 1, size: 5, color: '#22d3ee', orbit: 80, duration: 6 },
]

export default function ProtectedLoading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgb(var(--color-background))]">
      {/* Subtle radial glow */}
      <div
        className="absolute"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.04) 40%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* Central star with pulse */}
        <div className="relative" style={{ width: 180, height: 180 }}>
          {/* Orbiting planets */}
          {ORBIT_PLANETS.map((planet, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                width: planet.orbit * 2,
                height: planet.orbit * 2,
                left: 90 - planet.orbit,
                top: 90 - planet.orbit,
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
                  boxShadow: `0 0 ${planet.size * 2}px ${planet.color}80`,
                }}
              />
            </motion.div>
          ))}

          {/* Orbit rings */}
          {ORBIT_PLANETS.map((planet, i) => (
            <div
              key={`ring-${i}`}
              className="absolute rounded-full border border-white/[0.04]"
              style={{
                width: planet.orbit * 2,
                height: planet.orbit * 2,
                left: 90 - planet.orbit,
                top: 90 - planet.orbit,
              }}
            />
          ))}

          {/* Central celestia logo */}
          <motion.div
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <motion.span
              className="text-xl font-bold text-white font-display"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              C
            </motion.span>
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.p
          className="mt-6 text-sm text-white/40 font-body tracking-wide"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Зареждане...
        </motion.p>

        {/* Animated dots */}
        <div className="mt-3 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-violet-400/60"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
