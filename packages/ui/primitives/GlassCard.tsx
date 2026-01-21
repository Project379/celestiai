import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
}

/**
 * Glassmorphism card component for cosmic theme.
 * Uses CSS variables from globals.css for consistent theming.
 */
export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`
        bg-surface-glass/15
        backdrop-blur-glass
        border border-white/10
        rounded-2xl
        p-6
        shadow-xl
        ${className}
      `.trim()}
    >
      {children}
    </div>
  )
}
