'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

interface DashboardTileProps {
  href: string
  eyebrow: string
  title: ReactNode
  hint?: ReactNode
  locked?: boolean
  accent?: 'amber' | 'violet' | 'rose' | 'slate'
}

const ACCENT_BORDER: Record<NonNullable<DashboardTileProps['accent']>, string> = {
  amber:  'border-amber-300/25 hover:border-amber-200/50',
  violet: 'border-violet-400/25 hover:border-violet-300/50',
  rose:   'border-rose-400/20 hover:border-rose-300/50',
  slate:  'border-slate-700/60 hover:border-slate-500/70',
}

const ACCENT_EYEBROW: Record<NonNullable<DashboardTileProps['accent']>, string> = {
  amber:  'text-amber-300/90',
  violet: 'text-violet-300/90',
  rose:   'text-rose-300/90',
  slate:  'text-slate-400',
}

/**
 * Bento launchpad tile — Layer C of the Днес hybrid dashboard
 * (MOBILE_UX_RESEARCH §2.1). Scan-in-one-second card: eyebrow label +
 * title + optional hint. Taps through to a full destination.
 */
export function DashboardTile({
  href,
  eyebrow,
  title,
  hint,
  locked = false,
  accent = 'slate',
}: DashboardTileProps) {
  return (
    <Link
      href={href}
      className={`group relative flex h-full flex-col justify-between rounded-2xl border bg-transparent p-5 transition-all duration-300 ${ACCENT_BORDER[accent]}`}
    >
      <p className={`font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] ${ACCENT_EYEBROW[accent]}`}>
        {eyebrow}
      </p>

      <div className="mt-3">
        <p className="font-display text-[15px] font-light leading-[1.35] text-slate-100 group-hover:text-white">
          {title}
        </p>
        {hint ? (
          <p className="mt-1 font-display text-[12px] font-light leading-[1.5] text-slate-500 group-hover:text-slate-400">
            {hint}
          </p>
        ) : null}
      </div>

      {locked ? (
        <span
          aria-hidden
          className="absolute right-3 top-3 font-cinzel text-[9px] uppercase tracking-[0.3em] text-slate-500"
        >
          premium
        </span>
      ) : null}
    </Link>
  )
}
