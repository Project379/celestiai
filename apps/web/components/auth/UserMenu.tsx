'use client'

import { UserButton, ClerkLoaded, ClerkLoading } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'
import { AccountSubscriptionPage } from './AccountSubscriptionPage'
import { LogoutConfirmDialog } from './LogoutConfirmDialog'

export function UserMenu() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  // Clerk's <ClerkLoaded>/<ClerkLoading> gate resolves differently on the
  // server (always "loading") vs. the client (real session state), which
  // causes a hydration mismatch on the rendered UserButton wrapper. Gate
  // the whole menu on a post-mount flag so the server and initial client
  // render both emit the placeholder, then swap in the real menu after
  // hydration.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleOpenLogout = useCallback(() => {
    setShowLogoutDialog(true)
  }, [])

  const handleCloseLogout = useCallback(() => {
    setShowLogoutDialog(false)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center">
        <div className="h-7 w-7 animate-pulse rounded-full bg-slate-800" />
      </div>
    )
  }

  return (
    <div className="flex items-center">
      <ClerkLoading>
        <div className="h-7 w-7 animate-pulse rounded-full bg-slate-800" />
      </ClerkLoading>
      <ClerkLoaded>
        <UserButton
          appearance={{
            elements: {
              // Avatar button in the header
              avatarBox:
                'h-8 w-8 ring-1 ring-slate-200/15 transition-all hover:ring-amber-300/60 hover:shadow-[0_0_20px_rgba(251,191,36,0.28)]',

              // Popover shell
              userButtonPopoverCard:
                'bg-[#08060f]/95 backdrop-blur-2xl border border-white/[0.06] shadow-[0_32px_80px_rgba(0,0,0,0.7)] rounded-2xl overflow-hidden',
              userButtonPopoverMain: 'bg-transparent',

              // User preview row (avatar + name + email)
              userPreview: 'border-b border-white/[0.05] pb-3 mb-1',
              userPreviewMainIdentifier:
                'font-display text-[15px] font-semibold text-slate-100',
              userPreviewSecondaryIdentifier:
                'font-display text-[12px] italic text-slate-500',
              userPreviewAvatarBox: 'ring-1 ring-amber-300/30',

              // Action rows - editorial hairline hover
              userButtonPopoverActions: 'gap-0',
              userButtonPopoverActionButton:
                'border-b border-white/[0.04] last:border-b-0 rounded-none px-4 py-3 text-slate-400 hover:bg-gradient-to-r hover:from-violet-500/[0.06] hover:via-transparent hover:to-amber-400/[0.04] hover:text-amber-200 transition-colors',
              userButtonPopoverActionButtonText:
                'font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em]',
              userButtonPopoverActionButtonIcon:
                'text-slate-500 group-hover:text-amber-300',
              userButtonPopoverFooter: 'hidden',
              userButtonPopoverActionButton__signOut: 'hidden',

              // ── Profile modal (opened from "Manage account") ──
              modalBackdrop: 'bg-[#04030a]/85 backdrop-blur-md',
              modalContent:
                'bg-[#08060f]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden',
              card: 'bg-transparent shadow-none border-0',

              // Headers
              headerTitle:
                'font-display text-[1.375rem] font-semibold tracking-tight text-slate-100',
              headerSubtitle:
                'font-display text-[13px] italic text-slate-400',

              // Navbar inside the profile modal (sidebar tabs)
              navbar:
                'bg-transparent border-r border-white/[0.05]',
              navbarButton:
                'rounded-none border-l-2 border-transparent px-4 py-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.30em] text-slate-500 hover:text-slate-200 hover:bg-white/[0.02] transition-colors',
              navbarButtonIcon: 'text-slate-500',
              navbarButton__active:
                'border-l-amber-300/80 bg-gradient-to-r from-violet-500/[0.08] via-transparent to-amber-400/[0.04] text-amber-200 shadow-[inset_0_0_24px_rgba(167,139,250,0.06)]',

              // Section titles inside pages
              profileSectionTitle:
                'border-b border-white/[0.05]',
              profileSectionTitleText:
                'font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/80',
              profileSectionContent: 'text-slate-300',
              profileSectionPrimaryButton:
                'font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-200 hover:text-amber-100',

              // Form fields (if they appear inside the profile)
              formFieldLabel:
                'font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500',
              formFieldInput:
                'border-0 border-b border-white/[0.08] bg-transparent text-slate-100 placeholder:text-slate-600 font-display text-[15px] px-1 py-2.5 rounded-none focus:border-amber-300/60 focus:ring-0',
              formButtonPrimary:
                'group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-6 py-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-100 transition-all hover:border-amber-300/80 hover:text-white hover:shadow-[0_0_28px_rgba(251,191,36,0.22)] normal-case shadow-none',
              formButtonReset:
                'font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 hover:text-amber-300 transition-colors',

              // Badges + chips
              badge:
                'border-0 bg-transparent font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300/80',

              // Dividers + alerts
              dividerLine: 'bg-white/[0.06]',
              dividerText:
                'font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500',
              alert: 'border-l border-rose-300/50 bg-rose-500/[0.04] rounded-none',
              alertText: 'font-display text-[13px] italic text-rose-300/90',
            },
            variables: {
              colorPrimary: '#fbbf24',
              colorText: '#e2e8f0',
              colorTextSecondary: '#64748b',
              colorBackground: '#08060f',
              colorInputBackground: 'transparent',
              colorInputText: '#e2e8f0',
              borderRadius: '0.75rem',
              fontFamily: 'var(--font-display)',
            },
          }}
        >
          <UserButton.UserProfilePage label="account" />
          <UserButton.UserProfilePage
            label="Абонамент"
            url="subscription"
            labelIcon={
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h8M8 12h8M8 17h5"
                />
              </svg>
            }
          >
            <AccountSubscriptionPage />
          </UserButton.UserProfilePage>
          <UserButton.UserProfilePage label="security" />
          <UserButton.MenuItems>
            <UserButton.Action label="manageAccount" />
            <UserButton.Action
              label="Изход"
              labelIcon={
                <svg
                  className="h-4 w-4"
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
              }
              onClick={handleOpenLogout}
            />
          </UserButton.MenuItems>
        </UserButton>
      </ClerkLoaded>

      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onClose={handleCloseLogout}
      />
    </div>
  )
}
