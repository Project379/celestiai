'use client'

import { useAuth, SignInButton } from '@clerk/nextjs'
import { useEffect, useState, useRef } from 'react'

/**
 * SessionExpiryModal - Shows a modal when session expires instead of hard redirect.
 *
 * Per CONTEXT.md: "Session expiry: soft prompt modal ("Your session expired. Sign in to continue.")
 * - preserves page context"
 *
 * This component tracks if the user was previously signed in and shows the modal
 * when they become signed out (session expired).
 */
export function SessionExpiryModal() {
  const { isLoaded, isSignedIn } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const wasSignedInRef = useRef(false)

  useEffect(() => {
    if (!isLoaded) return

    // Track if user was signed in
    if (isSignedIn) {
      wasSignedInRef.current = true
    }

    // If user was signed in but now isn't, session expired
    if (wasSignedInRef.current && !isSignedIn) {
      setShowModal(true)
    }
  }, [isLoaded, isSignedIn])

  // Don't render anything until we need to show the modal
  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expiry-title"
    >
      <div className="mx-4 max-w-md rounded-xl border border-slate-700/50 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <svg
            className="h-7 w-7 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2
            id="session-expiry-title"
            className="text-xl font-semibold text-slate-100"
          >
            Сесията ви изтече
          </h2>
          <p className="mt-2 text-slate-400">
            Влезте отново, за да продължите
          </p>
        </div>

        {/* Action */}
        <div className="mt-6">
          <SignInButton mode="modal">
            <button
              type="button"
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-3 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              Вход
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  )
}
