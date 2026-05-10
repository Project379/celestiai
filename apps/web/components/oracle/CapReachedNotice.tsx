interface CapReachedNoticeProps {
  cap: number
}

/**
 * Free-tier monthly-cap surface for the Oracle panel.
 *
 * Web port of apps/mobile/components/oracle/CapReachedNotice.tsx
 * (B.0f-2-fix-1, 2026-05-10). Text-only notice with no CTA — RevenueCat
 * isn't wired yet and a button that opens nothing or web checkout would
 * be dead UX (founder ratification, SR 7). Bulgarian copy is unified
 * across web and mobile per Variant 2 ratification:
 *   «Изчерпа {cap} безплатни четения за този месец.»
 *   «Звездите ще говорят отново идния месец.»
 *
 * Closes REVISIT-23 (web cap-reached path silently swallowed 429).
 */
export function CapReachedNotice({ cap }: CapReachedNoticeProps) {
  return (
    <div
      className="rounded-2xl border border-white/[0.05] bg-white/[0.015] px-7 py-8"
      role="status"
    >
      <div className="mb-4 flex items-center justify-center gap-3">
        <span
          aria-hidden
          className="h-px max-w-[40px] flex-1 bg-amber-300/30"
        />
        <span
          aria-hidden
          className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.7)]"
        />
        <span
          aria-hidden
          className="h-px max-w-[40px] flex-1 bg-amber-300/30"
        />
      </div>

      <p className="text-center text-[15px] font-light leading-7 text-slate-300/90">
        Изчерпа {cap} безплатни четения за този месец.
      </p>
      <p className="mt-2 text-center text-[14px] font-light leading-7 text-slate-400">
        Звездите ще говорят отново идния месец.
      </p>
    </div>
  )
}
