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
  // Set only when the DELETE response's subscriptionStillCancelled is
  // non-null — the account-deletion request cancels an active Stripe
  // subscription (cancel_at_period_end) as a side effect, and undoing the
  // deletion does NOT resubscribe the user (a deliberate choice — "cancel
  // my deletion" and "resume billing me" are different intents). Without
  // this, a user who cancels their deletion would reasonably assume
  // Premium is restored and be surprised when it lapses silently at
  // period end. router.refresh() below will re-fetch deletionScheduledAt
  // as null, so this state — not that prop — keeps the banner visible
  // long enough to say so.
  const [subscriptionNotice, setSubscriptionNotice] = useState<{ accessUntil: string } | null>(null)

  if ((!deletionScheduledAt && !subscriptionNotice) || dismissed) return null

  async function handleCancel() {
    setIsPending(true)
    try {
      const res = await fetch('/api/gdpr/delete-account', { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.subscriptionStillCancelled?.accessUntil) {
          setSubscriptionNotice(data.subscriptionStillCancelled)
        } else {
          setDismissed(true)
        }
        router.refresh()
      }
    } finally {
      setIsPending(false)
    }
  }

  if (subscriptionNotice) {
    return (
      <div className="relative z-40 border-b border-amber-400/30 bg-amber-500/[0.08] px-4 py-2.5 text-center">
        <p className="font-display text-[13px] text-amber-200/95">
          Акаунтът е възстановен. Абонаментът ти обаче остава прекратен — Премиум достъпът продължава до{' '}
          <span className="font-medium text-amber-100">{formatBgDate(subscriptionNotice.accessUntil)}</span>
          {', '}след което спира. За да го подновиш, отвори менюто на акаунта си →{' '}
          <span className="font-medium text-amber-100">„Абонамент“</span>.{' '}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-[3px] transition-colors hover:text-amber-200"
          >
            Разбрах
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="relative z-40 border-b border-rose-400/30 bg-rose-500/[0.08] px-4 py-2.5 text-center">
      <p className="font-display text-[13px] text-rose-200/95">
        Акаунтът ти ще бъде изтрит на{' '}
        <span className="font-medium text-rose-100">{formatBgDate(deletionScheduledAt!)}</span>.{' '}
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className="font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-[3px] transition-colors hover:text-amber-200 disabled:opacity-50"
        >
          {isPending ? 'Отменяме...' : 'Отмени изтриването'}
        </button>
      </p>
    </div>
  )
}
