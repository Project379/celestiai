'use client'

import { useClerk } from '@clerk/nextjs'
import { useState, useCallback, useEffect, useRef } from 'react'

interface LogoutConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function LogoutConfirmDialog({ isOpen, onClose }: LogoutConfirmDialogProps) {
  const { signOut } = useClerk()
  const [isLoading, setIsLoading] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  const handleSignOut = useCallback(async () => {
    setIsLoading(true)
    try {
      await signOut({ redirectUrl: '/' })
    } catch (error) {
      console.error('Sign out error:', error)
      setIsLoading(false)
    }
  }, [signOut])

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect()
    if (rect && (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )) {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className="fixed inset-0 z-[100] m-auto max-w-md rounded-xl border border-slate-700/50 bg-slate-900/95 p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
            <svg
              className="h-6 w-6 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-100">
            Изход от профила
          </h2>
          <p className="mt-2 text-slate-400">
            Сигурни ли сте, че искате да излезете?
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
          >
            Отказ
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isLoading}
            className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Изход...
              </span>
            ) : (
              'Изход'
            )}
          </button>
        </div>
      </div>
    </dialog>
  )
}
