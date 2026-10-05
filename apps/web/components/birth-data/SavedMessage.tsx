'use client'

import { useEffect } from 'react'
import { BIRTH_DATA_SAVED_MESSAGE } from '@stellaeum/core/i18n/strings/birth-data'

/** How long the post-save message stays on screen before dismissing itself. */
export const SAVED_MESSAGE_VISIBLE_MS = 4000

/**
 * The single message shown after a successful birth-data edit (approved copy,
 * shared with mobile via @stellaeum/core). It auto-dismisses after ~4s, and a
 * tap/click (or Enter / Space / Escape when focused) dismisses it early. It is a
 * polite live region, so screen readers announce it when it appears without
 * stealing focus. It is rendered in normal flow with no entrance animation, so
 * prefers-reduced-motion needs no special handling.
 */
export function SavedMessage({ onDismiss }: { onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, SAVED_MESSAGE_VISIBLE_MS)
    return () => window.clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      onClick={onDismiss}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault()
          onDismiss()
        }
      }}
      className="mb-8 cursor-pointer border-l border-amber-300/40 bg-gradient-to-r from-amber-300/[0.05] via-transparent to-violet-400/[0.04] px-5 py-4 font-display text-[14px] leading-relaxed text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
    >
      {BIRTH_DATA_SAVED_MESSAGE}
    </div>
  )
}
