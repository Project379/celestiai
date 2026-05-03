'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
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
  const { closeUserProfile } = useClerk()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const [portalLoading, setPortalLoading] = useState(false)

  const isFree = tier === 'free'
  const isExpired =
    isFree &&
    subscriptionExpiresAt !== null &&
    new Date(subscriptionExpiresAt) < new Date()
  const isActive = !isFree && subscriptionData !== null && !subscriptionData.cancelAtPeriodEnd
  const isCancelling = !isFree && subscriptionData !== null && subscriptionData.cancelAtPeriodEnd

  const planName =
    subscriptionData?.interval === 'year'
      ? 'Stellaeum Премиум (Годишен)'
      : 'Stellaeum Премиум (Месечен)'

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
    <div className="px-6 py-8">
      <p className="mb-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-500">
        Профил
      </p>
      <h1 className="mb-8 font-display text-2xl font-semibold tracking-tight text-slate-100">
        Абонамент
      </h1>

      {/* State A: Free user */}
      {isFree && !isExpired && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-full border border-slate-200/10 bg-white/[0.04] px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
              Безплатен план
            </span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            С Премиум получаваш пълен транзитен анализ, планетарни влияния, неограничени четения от Оракула и приоритетно обслужване.
          </p>
          <Link
            href="/pricing"
            onClick={() => closeUserProfile()}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-gradient-to-br from-violet-600/90 via-violet-700/80 to-indigo-800/80 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(167,139,250,0.22)] transition-all hover:border-amber-300/50 hover:shadow-[0_0_32px_rgba(167,139,250,0.32)] focus:outline-none focus:ring-2 focus:ring-amber-300/40"
          >
            Отключи Премиум
          </Link>
        </div>
      )}

      {/* State D: Expired subscription */}
      {isExpired && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-rose-300">
              Изтекъл абонамент
            </span>
          </div>
          {subscriptionExpiresAt && (
            <p className="mb-4 text-sm text-slate-400">
              Абонаментът ти изтече на{' '}
              <span className="text-slate-200">{formatBgDateFromString(subscriptionExpiresAt)}</span>.
            </p>
          )}
          <p className="mb-6 text-sm leading-relaxed text-slate-400">
            Абонирай се отново и продължи да се наслаждаваш на пълния достъп до Stellaeum.
          </p>
          <Link
            href="/pricing"
            onClick={() => closeUserProfile()}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-gradient-to-br from-violet-600/90 via-violet-700/80 to-indigo-800/80 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(167,139,250,0.22)] transition-all hover:border-amber-300/50 hover:shadow-[0_0_32px_rgba(167,139,250,0.32)] focus:outline-none focus:ring-2 focus:ring-amber-300/40"
          >
            Абонирай се отново
          </Link>
        </div>
      )}

      {/* State B: Active subscription */}
      {isActive && subscriptionData && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-base font-medium text-slate-100">{planName}</span>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300">
              Активен
            </span>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-slate-200/[0.06] pb-3">
              <span className="text-slate-500">Следващо плащане</span>
              <span className="text-slate-200">{formatBgDate(subscriptionData.currentPeriodEnd)}</span>
            </div>
            {subscriptionData.paymentMethodBrand && subscriptionData.paymentMethodLast4 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Метод на плащане</span>
                <span className="capitalize text-slate-200">
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
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:border-violet-300/30 hover:bg-violet-500/[0.07] hover:text-white disabled:opacity-50"
            >
              {portalLoading ? 'Зареждане...' : 'Управление на плащанията'}
            </button>
            <button
              type="button"
              onClick={handleOpenCancelDialog}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 bg-rose-500/[0.05] px-4 py-2 text-sm font-medium text-rose-300 transition-all hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
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
            <span className="font-display text-base font-medium text-slate-100">{planName}</span>
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-amber-300">
              Отменен
            </span>
          </div>

          <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-4 py-3">
            <p className="text-sm text-amber-200">
              Премиум достъпът ти изтича на{' '}
              <span className="font-medium">{formatBgDate(subscriptionData.currentPeriodEnd)}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReactivate}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-300/30 bg-gradient-to-br from-violet-600/90 via-violet-700/80 to-indigo-800/80 px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-amber-300/50 disabled:opacity-50"
            >
              {isPending ? 'Зареждане...' : 'Възстанови абонамент'}
            </button>
            <button
              type="button"
              onClick={handleOpenPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:border-violet-300/30 hover:bg-violet-500/[0.07] hover:text-white disabled:opacity-50"
            >
              {portalLoading ? 'Зареждане...' : 'Управление на плащанията'}
            </button>
          </div>
        </div>
      )}

      {/* Cancellation dialog */}
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-slate-200/10 bg-[#0b0915] p-6 text-slate-100 backdrop:bg-black/60"
      >
        <h3 className="mb-2 font-display text-lg font-semibold text-slate-100">
          Сигурен/а ли си, че искаш да се откажеш?
        </h3>
        {subscriptionData && (
          <p className="mb-5 text-sm text-slate-400">
            Достъпът ти до премиум функциите ще продължи до{' '}
            <span className="text-slate-200">{formatBgDate(subscriptionData.currentPeriodEnd)}</span>.
          </p>
        )}

        <div className="mb-6">
          <p className="mb-3 text-sm text-slate-400">
            Защо се отказваш? <span className="text-slate-600">(по желание)</span>
          </p>
          <div className="flex flex-col gap-2">
            {[
              { value: 'too_expensive', label: 'Твърде скъпо' },
              { value: 'not_using_enough', label: 'Не използвам достатъчно' },
              { value: 'not_meeting_expectations', label: 'Не отговаря на очакванията' },
              { value: 'other', label: 'Друга причина' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCancelReason(cancelReason === value ? '' : value)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                  cancelReason === value
                    ? 'border-violet-400/50 bg-violet-500/[0.12] text-white'
                    : 'border-slate-200/10 bg-white/[0.03] text-slate-400 hover:border-slate-200/20 hover:bg-white/[0.06] hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-rose-500 disabled:opacity-50"
          >
            {isPending ? 'Отказване...' : 'Потвърди отказ'}
          </button>
          <button
            type="button"
            onClick={handleCloseCancelDialog}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.06]"
          >
            Запази абонамент
          </button>
        </div>
      </dialog>
    </div>
  )
}
