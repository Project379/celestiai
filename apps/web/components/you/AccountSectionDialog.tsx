'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function AccountSectionDialog({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    if (!dialog.open) dialog.showModal()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return <dialog
    ref={dialogRef}
    aria-label={title}
    onClose={(event) => { if (event.target === event.currentTarget) onClose() }}
    onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close() }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#08060f] p-0 text-slate-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
  >
    <div className="px-5 pb-6 sm:px-8 sm:pb-8">
      <div className="sticky top-0 z-10 flex justify-end bg-[#08060f] py-4">
        <button type="button" autoFocus onClick={() => dialogRef.current?.close()} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">Затвори</button>
      </div>
      {children}
    </div>
  </dialog>
}
