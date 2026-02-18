'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SubscriptionData {
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: number
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
  interval: 'month' | 'year' | null
}

interface SettingsContentProps {
  tier: string
  subscriptionData: SubscriptionData | null
  subscriptionExpiresAt: string | null
}

function formatBgDate(timestamp: number): string {
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Sofia',
  }).format(new Date(timestamp * 1000))
}

function formatBgDateFromString(dateStr: string): string {
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Sofia',
  }).format(new Date(dateStr))
}

export function SettingsContent({ tier, subscriptionData, subscriptionExpiresAt }: SettingsContentProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [portalLoading, setPortalLoading] = useState(false)

  // Determine which state to render
  const isFree = tier === 'free'
  const isExpired =
    isFree &&
    subscriptionExpiresAt !== null &&
    new Date(subscriptionExpiresAt) < new Date()
  const isActive = !isFree && subscriptionData !== null && !subscriptionData.cancelAtPeriodEnd
  const isCancelling = !isFree && subscriptionData !== null && subscriptionData.cancelAtPeriodEnd

  const planName =
    subscriptionData?.interval === 'year'
      ? 'Celestia Премиум (Годишен)'
      : 'Celestia Премиум (Месечен)'

  async function handleOpenPortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('[Portal] No URL returned:', data.error)
      }
    } catch (err) {
      console.error('[Portal] Error opening portal:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  function handleOpenCancelDialog() {
    dialogRef.current?.showModal()
  }

  function handleCloseCancelDialog() {
    dialogRef.current?.close()
    setCancelReason('')
  }

  async function handleConfirmCancel() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/stripe/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason || undefined }),
        })
        if (res.ok) {
          dialogRef.current?.close()
          setCancelReason('')
          router.refresh()
        } else {
          const data = await res.json()
          console.error('[Cancel] Error:', data.error)
        }
      } catch (err) {
        console.error('[Cancel] Error:', err)
      }
    })
  }

  async function handleReactivate() {
    startTransition(async () => {
      try {
        const res = await fetch('/api/stripe/cancel', { method: 'DELETE' })
        if (res.ok) {
          router.refresh()
        } else {
          const data = await res.json()
          console.error('[Reactivate] Error:', data.error)
        }
      } catch (err) {
        console.error('[Reactivate] Error:', err)
      }
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold text-slate-100">Настройки</h1>

      {/* Subscription card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="mb-5 text-lg font-semibold text-white">Абонамент</h2>

        {/* State A: Free user */}
        {isFree && !isExpired && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full bg-slate-700/60 px-3 py-1 text-sm font-medium text-slate-300">
                Безплатен план
              </span>
            </div>
            <p className="mb-6 text-sm text-white/60">
              С премиум абонамент получавате достъп до пълен транзитен анализ, планетарни влияния, неограничени четения от Оракула и приоритетно обслужване.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              Отключи Премиум
            </Link>
          </div>
        )}

        {/* State D: Expired subscription */}
        {isExpired && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-400">
                Изтекъл абонамент
              </span>
            </div>
            {subscriptionExpiresAt && (
              <p className="mb-4 text-sm text-white/60">
                Абонаментът ви изтече на{' '}
                <span className="text-white/80">{formatBgDateFromString(subscriptionExpiresAt)}</span>.
              </p>
            )}
            <p className="mb-6 text-sm text-white/60">
              Абонирайте се отново, за да продължите да се наслаждавате на пълния достъп до Celestia.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              Абонирай се отново
            </Link>
          </div>
        )}

        {/* State B: Active subscription */}
        {isActive && subscriptionData && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base font-medium text-white">{planName}</span>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                Активен
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-white/50">Следващо плащане</span>
                <span className="text-white/90">{formatBgDate(subscriptionData.currentPeriodEnd)}</span>
              </div>
              {subscriptionData.paymentMethodBrand && subscriptionData.paymentMethodLast4 && (
                <div className="flex items-center justify-between">
                  <span className="text-white/50">Метод на плащане</span>
                  <span className="text-white/90 capitalize">
                    {subscriptionData.paymentMethodBrand} &bull;&bull;&bull;&bull; {subscriptionData.paymentMethodLast4}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                {portalLoading ? 'Зареждане...' : 'Управление на плащанията'}
              </button>
              <button
                type="button"
                onClick={handleOpenCancelDialog}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
              >
                Отказ от абонамент
              </button>
            </div>
          </div>
        )}

        {/* State C: Cancelling subscription */}
        {isCancelling && subscriptionData && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base font-medium text-white">{planName}</span>
              <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                Отменен
              </span>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-sm text-amber-300">
                Премиум достъпът ви изтича на{' '}
                <span className="font-medium">{formatBgDate(subscriptionData.currentPeriodEnd)}</span>.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReactivate}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 disabled:opacity-50"
              >
                {isPending ? 'Зареждане...' : 'Възстанови абонамент'}
              </button>
              <button
                type="button"
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                {portalLoading ? 'Зареждане...' : 'Управление на плащанията'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy and data link */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <Link
          href="/settings/privacy"
          className="flex items-center justify-between text-white/80 transition-colors hover:text-white"
        >
          <div>
            <h2 className="text-lg font-semibold text-white">Поверителност и данни</h2>
            <p className="mt-1 text-sm text-white/50">
              Експорт на данни, изтриване на акаунт, политика за поверителност
            </p>
          </div>
          <span className="text-white/40">&rarr;</span>
        </Link>
      </div>

      {/* Cancellation dialog */}
      <dialog
        ref={dialogRef}
        className="rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 text-white backdrop:bg-black/60 max-w-md w-full"
      >
        <h3 className="mb-2 text-lg font-semibold text-white">
          Сигурни ли сте, че искате да се откажете?
        </h3>
        {subscriptionData && (
          <p className="mb-5 text-sm text-white/60">
            Достъпът ви до премиум функциите ще продължи до{' '}
            <span className="text-white/80">{formatBgDate(subscriptionData.currentPeriodEnd)}</span>.
          </p>
        )}

        {/* Optional reason dropdown */}
        <div className="mb-6">
          <label htmlFor="cancel-reason" className="mb-2 block text-sm text-white/60">
            Защо се отказвате? <span className="text-white/30">(по желание)</span>
          </label>
          <select
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none"
          >
            <option value="">Изберете причина...</option>
            <option value="too_expensive">Твърде скъпо</option>
            <option value="not_using_enough">Не използвам достатъчно</option>
            <option value="not_meeting_expectations">Не отговаря на очакванията ми</option>
            <option value="other">Друга причина</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-500 disabled:opacity-50"
          >
            {isPending ? 'Отказване...' : 'Потвърди отказ'}
          </button>
          <button
            type="button"
            onClick={handleCloseCancelDialog}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10"
          >
            Запази абонамент
          </button>
        </div>
      </dialog>
    </div>
  )
}
