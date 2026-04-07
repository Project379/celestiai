'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function AuthFormWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 0.68, 0.35, 1] }}
    >
      {children}
    </motion.div>
  )
}
