import Link from 'next/link'
import { PREMIUM_CTA } from '@/lib/tier/locked-copy'

/**
 * The single free-tier locked-state primitive for web (tier item 5).
 *
 * `PremiumLock` renders the conversion panel — a short reason line plus a
 * CTA into `/pricing`. Every non-Oracle locked surface (crystals grid,
 * recommendations monthly arc, Кръг affordances) and the Oracle
 * `CapReachedNotice` render through this, passing their own reason copy.
 *
 * `LockBadge` is the small padlock glyph for a locked tile / row where a
 * full panel would be too heavy.
 *
 * Applied to: Oracle (`CapReachedNotice`), recommendations (monthly arc),
 * crystals (grid + collect), and Кръг (2nd saved profile, connection
 * invite, connection report) — web + mobile. (tier items 4 & 5, 2026-09-01)
 */

interface PremiumLockProps {
  title: string
  /** Optional second line. */
  sub?: string
  /** CTA label; defaults to the shared "Отключи Премиум". */
  cta?: string
  /** Where the CTA points; defaults to /pricing. */
  href?: string
  /** `panel` (default) is the bordered card; `bare` drops the card chrome. */
  variant?: 'panel' | 'bare'
  className?: string
}

export function PremiumLock({
  title,
  sub,
  cta = PREMIUM_CTA,
  href = '/pricing',
  variant = 'panel',
  className = '',
}: PremiumLockProps) {
  return (
    <div
      role="status"
      className={[
        variant === 'panel'
          ? 'rounded-2xl border border-white/[0.05] bg-white/[0.015] px-7 py-8'
          : '',
        className,
      ].join(' ')}
    >
      <div className="mb-4 flex items-center justify-center gap-3">
        <span aria-hidden className="h-px max-w-[40px] flex-1 bg-amber-300/30" />
        <LockBadge />
        <span aria-hidden className="h-px max-w-[40px] flex-1 bg-amber-300/30" />
      </div>

      <p className="text-center text-[15px] font-light leading-7 text-slate-300/90">
        {title}
      </p>
      {sub ? (
        <p className="mt-2 text-center text-[14px] font-light leading-7 text-slate-400">
          {sub}
        </p>
      ) : null}

      <div className="mt-6 flex justify-center">
        <Link
          href={href}
          className="rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-7 py-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition-colors hover:border-amber-200 hover:bg-amber-400/15"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}

/** Small padlock glyph — the locked affordance on a tile or list row. */
export function LockBadge({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={[
        'inline-flex h-4 w-4 items-center justify-center text-amber-300/80',
        className,
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-3.5 w-3.5">
        <rect x="5" y="11" width="14" height="9" rx="1.5" strokeWidth={1.6} />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeWidth={1.6} strokeLinecap="round" />
      </svg>
    </span>
  )
}
