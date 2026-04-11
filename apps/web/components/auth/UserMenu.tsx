'use client'

import { UserButton, ClerkLoaded, ClerkLoading } from '@clerk/nextjs'
import { useCallback, useState } from 'react'
import { AccountSubscriptionPage } from './AccountSubscriptionPage'
import { LogoutConfirmDialog } from './LogoutConfirmDialog'

export function UserMenu() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const handleOpenLogout = useCallback(() => {
    setShowLogoutDialog(true)
  }, [])

  const handleCloseLogout = useCallback(() => {
    setShowLogoutDialog(false)
  }, [])

  return (
    <div className="flex items-center gap-4">
      <ClerkLoading>
        <div className="h-9 w-9 animate-pulse rounded-full bg-slate-800" />
      </ClerkLoading>
      <ClerkLoaded>
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-9 w-9 ring-2 ring-purple-500/50 hover:ring-purple-400/70 transition-all',
              userButtonPopoverCard: 'bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-xl',
              userButtonPopoverActionButton: 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50',
              userButtonPopoverActionButtonText: 'text-slate-300',
              userButtonPopoverActionButtonIcon: 'text-slate-400',
              userButtonPopoverFooter: 'hidden',
              userButtonPopoverActionButton__signOut: 'hidden',
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
