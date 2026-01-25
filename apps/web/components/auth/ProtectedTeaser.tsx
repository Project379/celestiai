'use client'

import { SignInButton } from '@clerk/nextjs'
import { ReactNode } from 'react'

interface ProtectedTeaserProps {
  /** The content to show blurred as a teaser */
  children: ReactNode
  /** Custom CTA text (Bulgarian) */
  ctaText?: string
  /** Custom button text (Bulgarian) */
  buttonText?: string
}

/**
 * ProtectedTeaser - Shows blurred content with sign-in CTA for unauthenticated users.
 *
 * Per CONTEXT.md: "Unauthenticated access: show teaser with overlay CTA
 * ("Sign in to view your chart")"
 *
 * Usage:
 * ```tsx
 * // In a protected page, wrap content for unauthenticated users
 * if (!userId) {
 *   return (
 *     <ProtectedTeaser>
 *       <ChartPreview />
 *     </ProtectedTeaser>
 *   )
 * }
 * ```
 */
export function ProtectedTeaser({
  children,
  ctaText = 'Влезте, за да видите съдържанието',
  buttonText = 'Вход',
}: ProtectedTeaserProps) {
  return (
    <div className="relative">
      {/* Blurred teaser content */}
      <div
        className="pointer-events-none select-none blur-sm"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay with sign-in CTA */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px]">
        <div className="mx-4 max-w-sm rounded-xl border border-slate-700/50 bg-slate-900/90 p-6 text-center shadow-2xl backdrop-blur-xl">
          {/* Lock icon */}
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* CTA text */}
          <p className="mb-4 text-slate-300">{ctaText}</p>

          {/* Sign in button */}
          <SignInButton mode="modal">
            <button
              type="button"
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:from-purple-500 hover:to-violet-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              {buttonText}
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  )
}
