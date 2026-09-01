import Link from 'next/link'
import type { CapReachedReason } from '@/hooks/useOracleReading'

interface CapReachedNoticeProps {
  cap: number
  reason?: CapReachedReason
}

/**
 * The Oracle conversion surface for the FREE tier.
 *
 * Frozen tier definition (2026-09-01): free gets ONE `general` reading for
 * the lifetime of the account. love/career/health and regenerate are
 * premium. This surface is reached two ways, both routed here by the
 * `code: 'CAP_REACHED'` 429 from /api/oracle/generate:
 *   - free_used            — the one free reading is spent
 *   - premium_topic        — a free user tapped love / career / health
 *   - premium_regenerate   — a free user hit "Ново четене"
 *
 * `cap` is retained for the legacy monthly-cap wording (no `reason`) so an
 * older server response still renders sensibly.
 *
 * NOTE: this component should be folded into the shared locked-state
 * component (TIER-DEFINITION-2026-09-01.md item 5) when that lands.
 */
export function CapReachedNotice({ cap, reason }: CapReachedNoticeProps) {
  const copy = ((): { title: string; sub: string } => {
    switch (reason) {
      case 'premium_topic':
        return {
          title: 'Четенията за любов, кариера и здраве са в Премиум.',
          sub: 'Личностното четене остава безплатно.',
        }
      case 'premium_regenerate':
        return {
          title: 'Ново четене има само в Премиум.',
          sub: 'С Премиум получаваш ново четене, когато поискаш.',
        }
      case 'free_used':
        return {
          title: 'Това беше безплатното ти четене от Оракула.',
          sub: 'С Премиум получаваш неограничени четения по всички теми.',
        }
      default:
        return {
          title: `Достигна лимита от ${cap} безплатни четения.`,
          sub: 'Премиум го премахва.',
        }
    }
  })()

  return (
    <div
      className="rounded-2xl border border-white/[0.05] bg-white/[0.015] px-7 py-8"
      role="status"
    >
      <div className="mb-4 flex items-center justify-center gap-3">
        <span aria-hidden className="h-px max-w-[40px] flex-1 bg-amber-300/30" />
        <span
          aria-hidden
          className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
        />
        <span aria-hidden className="h-px max-w-[40px] flex-1 bg-amber-300/30" />
      </div>

      <p className="text-center text-[15px] font-light leading-7 text-slate-300/90">
        {copy.title}
      </p>
      <p className="mt-2 text-center text-[14px] font-light leading-7 text-slate-400">
        {copy.sub}
      </p>

      <div className="mt-6 flex justify-center">
        <Link
          href="/pricing"
          className="rounded-full border border-amber-300/40 bg-gradient-to-b from-amber-400/20 to-amber-500/5 px-7 py-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-200 transition-colors hover:border-amber-200 hover:bg-amber-400/15"
        >
          Отключи Премиум
        </Link>
      </div>
    </div>
  )
}
