'use client'

import { motion } from 'framer-motion'
import { CrystalGem, type GemVariant } from './CrystalGem'

interface CrystalCardProps {
  slug: string
  name: string
  tagline: string
  variant: GemVariant
  primary: string
  secondary: string
  accent?: string | null
  rarity: string
  discovered?: boolean
  highlight?: boolean
  onClick?: () => void
}

/**
 * Grid tile for the collection. Gems rotate subtly on hover and darken
 * when not yet discovered so the user gets a "Pokédex silhouette" effect
 * — the shape is visible, the colour is not.
 */
export function CrystalCard({
  slug,
  name,
  tagline,
  variant,
  primary,
  secondary,
  accent,
  rarity,
  discovered = true,
  highlight = false,
  onClick,
}: CrystalCardProps) {
  const rarityLabel: Record<string, string> = {
    common: 'Обикновен',
    uncommon: 'Рядък',
    rare: 'Ценен',
    legendary: 'Легендарен',
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`
        group relative flex flex-col items-center overflow-hidden rounded-2xl border
        px-4 pb-4 pt-6 text-center transition-colors duration-300
        ${
          highlight
            ? 'border-amber-300/40 bg-amber-500/[0.04]'
            : 'border-white/10 bg-white/[0.03]'
        }
        hover:border-white/25 hover:bg-white/[0.06]
        focus:outline-none focus:ring-2 focus:ring-amber-300/30
      `}
    >
      {highlight && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-amber-300/10 via-transparent to-transparent"
        />
      )}
      <div className={`relative ${discovered ? '' : 'opacity-25 saturate-0'}`}>
        <motion.div
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <CrystalGem
            variant={variant}
            primary={primary}
            secondary={secondary}
            accent={accent}
            size={112}
            seed={slug}
          />
        </motion.div>
      </div>

      <p className="mt-2 font-display text-[15px] font-medium tracking-tight text-slate-100">
        {discovered ? name : '???'}
      </p>
      <p className="mt-0.5 min-h-[32px] font-display text-[11.5px] font-light leading-snug text-slate-400">
        {discovered ? tagline : 'Непознат камък'}
      </p>

      <span className="mt-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        {rarityLabel[rarity] ?? rarity}
      </span>
    </motion.button>
  )
}
