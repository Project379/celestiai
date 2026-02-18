'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PrivacySettingsContentProps {
  deletedAt: string | null
  deletionScheduledAt: string | null
}

function formatBgDate(dateStr: string): string {
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Sofia',
  }).format(new Date(dateStr))
}

export function PrivacySettingsContent({
  deletedAt,
  deletionScheduledAt,
}: PrivacySettingsContentProps) {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)

  const hasPendingDeletion = deletedAt !== null

  async function handleExport() {
    setIsExporting(true)
    try {
      const res = await fetch('/api/gdpr/export')
      if (!res.ok) {
        console.error('[Export] Failed:', res.status)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'celestia-data-export.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[Export] Error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  function handleOpenDeleteDialog() {
    dialogRef.current?.showModal()
  }

  function handleCloseDeleteDialog() {
    dialogRef.current?.close()
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/gdpr/delete-account', { method: 'POST' })
      if (res.ok) {
        dialogRef.current?.close()
        router.refresh()
      } else {
        const data = await res.json()
        console.error('[Delete] Error:', data.error)
      }
    } catch (err) {
      console.error('[Delete] Error:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCancelDeletion() {
    setIsCancelling(true)
    try {
      const res = await fetch('/api/gdpr/delete-account', { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        const data = await res.json()
        console.error('[Cancel Deletion] Error:', data.error)
      }
    } catch (err) {
      console.error('[Cancel Deletion] Error:', err)
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Back link */}
      <Link
        href="/settings"
        className="mb-6 inline-flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-white"
      >
        &larr; Настройки
      </Link>

      <h1 className="mb-8 text-3xl font-bold text-slate-100">
        Поверителност и данни
      </h1>

      {/* Data Export Section */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Експорт на данни
        </h2>
        <p className="mb-5 text-sm text-white/60">
          Изтеглете копие на всички ваши данни във формат JSON.
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {isExporting ? 'Изтегляне...' : 'Изтегли данните'}
        </button>
      </div>

      {/* Account Deletion Section */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <h2 className="mb-3 text-lg font-semibold text-white">
          Изтриване на акаунт
        </h2>

        {!hasPendingDeletion ? (
          <>
            <p className="mb-5 text-sm text-white/60">
              Внимание: Заявката за изтриване включва 30-дневен гратисен период.
              През този период можете да отмените заявката.
            </p>
            <button
              type="button"
              onClick={handleOpenDeleteDialog}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-5 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
            >
              Заявка за изтриване
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-sm text-amber-300">
                Вашият акаунт е маркиран за изтриване.
              </p>
              {deletionScheduledAt && (
                <p className="mt-1 text-sm text-amber-300/80">
                  Данните ви ще бъдат окончателно изтрити на:{' '}
                  <span className="font-medium text-amber-200">
                    {formatBgDate(deletionScheduledAt)}
                  </span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleCancelDeletion}
              disabled={isCancelling}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {isCancelling ? 'Отменяне...' : 'Отмени изтриването'}
            </button>
          </div>
        )}
      </div>

      {/* Privacy policy link */}
      <div className="mt-8">
        <Link
          href="/privacy"
          className="text-sm text-purple-400 underline transition-colors hover:text-purple-300"
        >
          Прочетете нашата Политика за поверителност
        </Link>
      </div>

      {/* Confirmation dialog */}
      <dialog
        ref={dialogRef}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1a] p-6 text-white backdrop:bg-black/60"
      >
        <h3 className="mb-2 text-lg font-semibold text-white">
          Сигурни ли сте?
        </h3>
        <p className="mb-6 text-sm text-white/60">
          Вашият акаунт ще бъде деактивиран незабавно и всички данни ще бъдат
          изтрити след 30 дни.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-500 disabled:opacity-50"
          >
            {isDeleting ? 'Изтриване...' : 'Да, изтрий акаунта ми'}
          </button>
          <button
            type="button"
            onClick={handleCloseDeleteDialog}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10"
          >
            Отказ
          </button>
        </div>
      </dialog>
    </div>
  )
}
