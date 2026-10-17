'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function DiaryUnsavedDialog({ canSave, saving, failed, onSave, onDiscard, onContinue }: {
  canSave: boolean
  saving: boolean
  failed: boolean
  onSave: () => void
  onDiscard: () => void
  onContinue: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal()
  }, [])

  return createPortal(<dialog ref={dialogRef} aria-labelledby="diary-unsaved-title"
    onKeyDown={(event) => event.stopPropagation()}
    onCancel={(event) => { event.preventDefault(); if (!saving) onContinue() }}
    className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-white/10 bg-[#0b1020] p-6 shadow-2xl backdrop:bg-slate-950/80 backdrop:backdrop-blur-sm">
    <h3 id="diary-unsaved-title" className="font-display text-xl text-slate-100">Незапазени промени</h3>
    <p className="mt-3 text-sm text-slate-400">Искаш ли да запазиш промените?</p>
    <div className="mt-6 flex flex-wrap gap-4 text-sm">
      <button type="button" disabled={!canSave || saving} onClick={onSave} className="text-amber-200 disabled:opacity-40">Запази</button>
      <button type="button" disabled={saving} onClick={onDiscard} className="text-rose-300 disabled:opacity-40">Отхвърли промените</button>
      <button type="button" autoFocus disabled={saving} onClick={onContinue} className="text-slate-400 disabled:opacity-40">Продължи да пишеш</button>
    </div>
    {failed && <p role="alert" className="mt-4 text-sm text-rose-300">Не успяхме да запазим промените. Опитай отново.</p>}
  </dialog>, document.body)
}
