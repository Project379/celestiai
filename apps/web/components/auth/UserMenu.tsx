'use client'

import { UserButton } from '@clerk/nextjs'
import { useState, useCallback } from 'react'
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
      <UserButton
        appearance={{
          elements: {
            avatarBox: 'h-9 w-9 ring-2 ring-purple-500/50 hover:ring-purple-400/70 transition-all',
            userButtonPopoverCard: 'bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-xl',
            userButtonPopoverActionButton: 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/50',
            userButtonPopoverActionButtonText: 'text-slate-300',
            userButtonPopoverActionButtonIcon: 'text-slate-400',
            userButtonPopoverFooter: 'hidden',
          },
        }}
      >
        {/* Custom menu item for logout with confirmation */}
        <UserButton.MenuItems>
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

      <LogoutConfirmDialog
        isOpen={showLogoutDialog}
        onClose={handleCloseLogout}
      />
    </div>
  )
}
