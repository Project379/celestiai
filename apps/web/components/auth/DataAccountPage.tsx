'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SubscriptionOverview } from '@/lib/stripe/subscription-overview'

function formatBgDate(iso: string): string {
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Sofia',
  }).format(new Date(iso))
}

function formatBgDateFromUnixSeconds(seconds: number): string {
  return formatBgDate(new Date(seconds * 1000).toISOString())
}

function upcomingDeletionDate(): string {
  return formatBgDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
}

/**
 * Custom "Данни и акаунт" UserProfilePage (B.0h-2/B.0h-3). Covers the two
 * GDPR surfaces that previously had zero UI anywhere on web:
 * GET /api/gdpr/export (download) and POST/DELETE /api/gdpr/delete-account
 * (request / cancel). The persistent grace-period banner (mounted in the
 * protected layout) owns cancellation once a request is pending — this
 * page's dialog only requests it, and shows a friendly note instead of a
 * raw 409 if the user double-submits.
 */
export function DataAccountPage() {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [exportState, setExportState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [deleteState, setDeleteState] = useState<'idle' | 'loading' | 'error' | 'already-pending'>('idle')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionOverview | null>(null)
  const [cancelSubState, setCancelSubState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  // Fetched once on mount so the dialog can decide, the moment it opens,
  // whether to show the paid-time-remaining disclosure below — not fetched
  // lazily on dialog-open, since that would add a loading flash to the
  // one moment this disclosure most needs to already be visible.
  useEffect(() => {
    let isMounted = true
    fetch('/api/stripe/subscription', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) setSubscription(data)
      })
      .catch(() => {
        // Silent — absence of subscription data just means the disclosure
        // below doesn't show; it never blocks account deletion itself.
      })
    return () => {
      isMounted = false
    }
  }, [])

  // "платен абонамент" (paid subscription) must be literally true — a
  // trialing subscriber has paid nothing yet, so excluded deliberately.
  // Only Stripe-billed subscriptions apply here; store-billed (RevenueCat/
  // Google Play/App Store) subscriptions already get their own separate
  // warning below, since we can't cancel those server-side at all.
  const paidTimeRemaining =
    subscription?.subscriptionProvider === 'stripe' &&
    subscription.subscriptionData?.status === 'active' &&
    subscription.subscriptionData.currentPeriodEnd * 1000 > Date.now()
      ? subscription.subscriptionData
      : null

  // "Cancel instead" is an alternative to deletion, not a step before it —
  // deletion still cuts access immediately regardless of subscription
  // status (existing product behavior, unrelated to this fix), so
  // cancelling and THEN deleting right away would not actually preserve
  // the remaining paid time. The button closes the dialog without
  // deleting anything; the user keeps their account and keeps access
  // until the period ends naturally.
  const handleCancelSubscriptionInstead = useCallback(async () => {
    setCancelSubState('loading')
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      if (!res.ok) throw new Error('cancel failed')
      const periodEnd = paidTimeRemaining?.currentPeriodEnd
      dialogRef.current?.close()
      setCancelSubState('idle')
      setSubscription(null)
      setSuccessMessage(
        periodEnd
          ? `Абонаментът е прекратен. Достъпът ти продължава до ${formatBgDateFromUnixSeconds(periodEnd)}.`
          : 'Абонаментът е прекратен.'
      )
    } catch {
      setCancelSubState('error')
    }
  }, [paidTimeRemaining?.currentPeriodEnd])

  const handleExport = useCallback(async () => {
    setExportState('loading')
    try {
      const res = await fetch('/api/gdpr/export')
      if (!res.ok) throw new Error('export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'stellaeum-data-export.json'
      a.click()
      URL.revokeObjectURL(url)
      setExportState('idle')
    } catch {
      setExportState('error')
    }
  }, [])

  const handleOpenDialog = useCallback(() => {
    setDeleteState('idle')
    dialogRef.current?.showModal()
  }, [])

  const handleCloseDialog = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    setDeleteState('loading')
    try {
      const res = await fetch('/api/gdpr/delete-account', { method: 'POST' })
      const data = await res.json()
      if (res.status === 409) {
        setDeleteState('already-pending')
        return
      }
      if (!res.ok) throw new Error('delete request failed')
      dialogRef.current?.close()
      setSuccessMessage(
        `Заявката е приета. Акаунтът ще бъде изтрит на ${formatBgDate(data.scheduledDeletion)}, освен ако не отмениш заявката преди това.`
      )
      router.refresh()
    } catch {
      setDeleteState('error')
    }
  }, [router])

  return (
    <div className="px-6 py-8">
      <p className="mb-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-500">
        Профил
      </p>
      <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight text-slate-100">
        Данни и акаунт
      </h1>

      {successMessage && (
        <div className="mb-6 rounded-lg border border-amber-300/25 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-sm text-amber-200">{successMessage}</p>
        </div>
      )}

      <section className="mb-10">
        <p className="mb-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
          Изтегляне на данни
        </p>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Изтегли копие на данните си — профил, натални карти, четения от Оракула, хороскопи и записи в дневника — като JSON файл.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={exportState === 'loading'}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:border-violet-300/30 hover:bg-violet-500/[0.07] hover:text-white disabled:opacity-50"
        >
          {exportState === 'loading' ? 'Подготвяме файла...' : 'Изтегли данните си'}
        </button>
        {exportState === 'error' && (
          <p className="mt-2 text-sm text-rose-300">
            Не успяхме да подготвим данните ти. Опитай отново.
          </p>
        )}
      </section>

      <section>
        <p className="mb-3 font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-rose-300/80">
          Изтриване на акаунта
        </p>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Заявката за изтриване спира достъпа ти до Премиум функциите веднага, но данните се пазят за 30 дни — можеш да отмениш по всяко време през този период.
        </p>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Ако имаш активен абонамент през Google Play или App Store, изтриването на акаунта не го прекратява — откажи го отделно през съответния магазин.
        </p>
        <button
          type="button"
          onClick={handleOpenDialog}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/[0.05] px-4 py-2 text-sm font-medium text-rose-300 transition-all hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
        >
          Заяви изтриване на акаунта
        </button>
      </section>

      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-slate-200/10 bg-[#0b0915] p-6 text-slate-100 backdrop:bg-black/60"
      >
        <h3 className="mb-3 font-display text-lg font-semibold text-slate-100">
          Изтриване на акаунта
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-slate-400">
          Акаунтът ти и всички свързани с него данни ще бъдат изтрити безвъзвратно на{' '}
          <span className="text-slate-200">{upcomingDeletionDate()}</span>. До тогава можеш да отмениш заявката по всяко време.
        </p>

        {paidTimeRemaining && (
          <div className="mb-6 rounded-lg border border-amber-300/25 bg-amber-500/[0.06] px-4 py-3">
            <p className="text-sm leading-relaxed text-amber-200">
              <span className="font-semibold">
                Имаш платен абонамент, валиден до {formatBgDateFromUnixSeconds(paidTimeRemaining.currentPeriodEnd)}.
              </span>{' '}
              Ако изтриеш акаунта сега, губиш достъпа и оставащото платено време, без възстановяване на сумата.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-amber-200">
              За да запазиш достъпа до {formatBgDateFromUnixSeconds(paidTimeRemaining.currentPeriodEnd)}: първо прекрати абонамента, после изтрий акаунта.
            </p>
            <button
              type="button"
              onClick={handleCancelSubscriptionInstead}
              disabled={cancelSubState === 'loading'}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition-all hover:border-amber-300/70 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {cancelSubState === 'loading' ? 'Прекратяваме...' : 'Прекрати абонамента вместо това'}
            </button>
            {cancelSubState === 'error' && (
              <p className="mt-2 text-sm text-rose-300">Не успяхме да прекратим абонамента. Опитай отново.</p>
            )}
          </div>
        )}

        {deleteState === 'already-pending' && (
          <p className="mb-4 text-sm text-amber-300">
            Вече има чакаща заявка за изтриване — виж лентата в горната част на страницата, за да я отмениш.
          </p>
        )}
        {deleteState === 'error' && (
          <p className="mb-4 text-sm text-rose-300">Заявката не се изпрати. Опитай отново.</p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={deleteState === 'loading'}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-rose-500 disabled:opacity-50"
          >
            {deleteState === 'loading' ? 'Изпращане...' : 'Изтриване на акаунта'}
          </button>
          <button
            type="button"
            onClick={handleCloseDialog}
            disabled={deleteState === 'loading'}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.06]"
          >
            Отказ
          </button>
        </div>
      </dialog>
    </div>
  )
}
