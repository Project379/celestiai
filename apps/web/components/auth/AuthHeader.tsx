'use client'

import { motion } from 'framer-motion'

export function AuthHeader() {
  return (
    <motion.div
      className="mb-8 text-center"
      initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: [0.22, 0.68, 0.35, 1] }}
    >
      {/* Logo with cosmic gradient */}
      <h1
        className="text-4xl font-bold tracking-tight"
        style={{
          background: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 50%, #6366F1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.4))',
        }}
      >
        Celestia AI
      </h1>

      {/* Bulgarian tagline */}
      <motion.p
        className="mt-2 text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        Твоят астрологичен приятел
      </motion.p>
    </motion.div>
  )
}
