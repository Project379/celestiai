'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface DeletionPendingBannerProps {
  deletionScheduledAt: string | null
}

function formatBgDate(iso: string): string {
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Sofia',
  }).format(new Date(iso))
}

/**
 * Persistent grace-period banner (B.0h-2). Mounts in every authed layout
 * whenever the account has a pending deletion — per ratification, this is
 * a full-access undo window, not a restricted state, so the banner's only
 * job is visibility + a one-tap way out. Cancel-deletion lives in the
 * banner itself, not buried in settings.
 */
export function DeletionPendingBanner({ deletionScheduledAt }: DeletionPendingBannerProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!deletionScheduledAt || dismissed) return null

  async function handleCancel() {
    setIsPending(true)
    try {
      const res = await fetch('/api/gdpr/delete-account', { method: 'DELETE' })
      if (res.ok) {
        setDismissed(true)
        router.refresh()
      }
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="relative z-40 border-b border-rose-400/30 bg-rose-500/[0.08] px-4 py-2.5 text-center">
      <p className="font-display text-[13px] text-rose-200/95">
        Акаунтът ви ще бъде изтрит на{' '}
        <span className="font-medium text-rose-100">{formatBgDate(deletionScheduledAt)}</span>.{' '}
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-[3px] transition-colors hover:text-amber-200 disabled:opacity-50"
        >
          {isPending ? 'Отменяме...' : 'Отменете изтриването'}
        </button>
      </p>
    </div>
  )
}
