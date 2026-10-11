'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { CreateDiaryEntryV2Input, DiaryEntryV2, UpdateDiaryEntryV2Input } from '@stellaeum/core/diary/v2'
import { DIARY_TOPICS, getDiaryEntryDisplayTitle, getDiaryOracleSuggestion, type DiaryQuestionHistoryItem } from '@stellaeum/core/diary/flow'
import { DiaryComposer, type ComposerMode } from './DiaryComposer'

interface Props {
  entries: DiaryEntryV2[]
  openedEntry?: DiaryEntryV2 | null
  onCloseOpenedEntry?: () => void
  onCreate: (input: CreateDiaryEntryV2Input) => Promise<DiaryEntryV2>
  onDelete: (entry: DiaryEntryV2) => Promise<boolean>
  onUpdate: (entry: DiaryEntryV2, patch: Omit<UpdateDiaryEntryV2Input, 'revision'>) => Promise<DiaryEntryV2>
  onDateSelect: (date: string | null) => void
  questionHistory: readonly DiaryQuestionHistoryItem[]
}

const MOODS = ['—', 'Много тежко', 'Трудно', 'Смесено', 'Добре', 'Много добре']

function entrySections(entry: DiaryEntryV2): { label?: string; text: string }[] {
  if (entry.kind === 'legacy_lunar') return ((entry.content as { intentions?: string[] }).intentions ?? []).map((text) => ({ text }))
  if (entry.kind === 'note') return [{ text: (entry.content as { body?: string }).body ?? '' }]
  if (entry.kind === 'lunar_practice') {
    const content = entry.content as { fieldLabels?: string[]; answers?: string[] }
    return (content.answers ?? []).map((text, index) => ({ label: content.fieldLabels?.[index], text }))
  }
  const content = entry.content as { iterations?: { question: string; answer: string }[]; reflectionQuestion?: string | null; reflectionAnswer?: string; detailQuestion?: string | null; detailAnswer?: string }
  if (content.iterations?.length) return content.iterations.map((iteration) => ({ label: iteration.question, text: iteration.answer }))
  return [
    { label: content.reflectionQuestion ?? undefined, text: content.reflectionAnswer ?? '' },
    { label: content.detailQuestion ?? undefined, text: content.detailAnswer ?? '' },
  ]
}

export function DiaryHistory({ openedEntry, onCloseOpenedEntry, entries, onCreate, onDelete, onUpdate, onDateSelect, questionHistory }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const completed = entries.filter((entry) => entry.status === 'completed')
  const selectedEntry = entries.find((entry) => entry.id === (openedEntry?.id ?? selectedId)) ?? openedEntry ?? null
  return (
    <section className="space-y-7">
      <DiaryCalendar entries={completed} onDateSelect={onDateSelect} />
      {completed.length === 0 ? <p className="text-sm text-slate-500">Все още няма завършени записи.</p> : (
        <ul className="divide-y divide-slate-300/10">
          {completed.map((entry) => (
            <li key={entry.id} className="py-5">
              <button type="button" onClick={() => setSelectedId(entry.id)} className="flex w-full items-start justify-between gap-4 text-left">
                <p className="font-display text-base text-slate-200">{getDiaryEntryDisplayTitle(entry)}</p>
                <span className="text-slate-500">›</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedEntry && <DiaryEntryDialog
        entry={selectedEntry}
        confirmDelete={confirmDelete === selectedEntry.id}
        isEditing={editingId === selectedEntry.id}
        onClose={() => { setSelectedId(null); setEditingId(null); setConfirmDelete(null); onCloseOpenedEntry?.() }}
        onEdit={() => setEditingId(selectedEntry.id)}
        onCancelEdit={() => setEditingId(null)}
        onDelete={() => setConfirmDelete(selectedEntry.id)}
        onCancelDelete={() => setConfirmDelete(null)}
        onConfirmDelete={() => void onDelete(selectedEntry).then((ok) => { if (ok) { setSelectedId(null); setConfirmDelete(null); onCloseOpenedEntry?.() } })}
        onUpdate={onUpdate}
        onCreate={onCreate}
        questionHistory={questionHistory}
      />}
    </section>
  )
}

function DiaryEntryDialog({ entry, confirmDelete, isEditing, onClose, onEdit, onCancelEdit, onDelete, onCancelDelete, onConfirmDelete, onUpdate, onCreate, questionHistory }: {
  entry: DiaryEntryV2
  confirmDelete: boolean
  isEditing: boolean
  onClose: () => void
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
  onUpdate: Props['onUpdate']
  onCreate: Props['onCreate']
  questionHistory: Props['questionHistory']
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [onClose])

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={getDiaryEntryDisplayTitle(entry)}>
    <button type="button" aria-label="Затвори записа" onClick={onClose} className="absolute inset-0 cursor-default" />
    <article className={`relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#0b1020] shadow-2xl sm:rounded-[2rem] ${isEditing ? 'p-3 sm:p-5' : 'px-6 pb-8 pt-6 sm:px-10 sm:py-9'}`}>
      {isEditing ? <DiaryComposer
        mode={(entry.kind === 'check_in' ? 'check_in' : entry.kind === 'note' ? 'note' : 'lunar_practice') as ComposerMode}
        entry={entry}
        questionHistory={questionHistory}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onClose={onCancelEdit}
        onSaved={() => onCancelEdit()}
      /> : <>
      <header className="mb-8 flex items-start justify-between gap-5">
        <div><p className="text-xs text-slate-500">{entry.entryDate}{entry.mood ? ` · ${MOODS[entry.mood]}` : ''}</p><h2 className="mt-3 font-display text-3xl leading-tight text-slate-100">{getDiaryEntryDisplayTitle(entry)}</h2></div>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-300/10 px-3 py-1.5 text-sm text-slate-400">Затвори</button>
      </header>
      <div className="space-y-6">
        {entrySections(entry).filter((section) => section.text).map((section, index) => <div key={index}>{section.label && <p className="mb-2 text-xs text-amber-300/70">{section.label}</p>}<p className="whitespace-pre-wrap font-display text-[17px] leading-8 text-slate-200">{section.text}</p></div>)}
        {entry.topics.length > 0 && <p className="text-xs text-slate-500">{entry.topics.map((topic) => DIARY_TOPICS.find((item) => item.value === topic)?.label ?? topic).join(' · ')}</p>}
        {entry.nextStep && <div className="rounded-2xl border border-violet-300/15 bg-violet-400/5 p-5"><p className="text-sm text-slate-200">{entry.nextStep.text}</p>{entry.nextStep.status === 'pending' && <div className="mt-4 flex flex-wrap gap-4 text-xs"><button onClick={() => void onUpdate(entry, { nextStep: { ...entry.nextStep!, status: 'done' } })} className="text-emerald-300">Изпълних я</button><button onClick={() => void onUpdate(entry, { nextStep: { ...entry.nextStep!, status: 'carried' } })} className="text-amber-300">Все още искам</button><button onClick={() => void onUpdate(entry, { nextStep: { ...entry.nextStep!, status: 'let_go' } })} className="text-slate-400">Отказвам се от нея</button></div>}</div>}
        {entry.source?.path && <Link href={entry.source.path} className="inline-block text-xs text-violet-300">Към {entry.source.label} →</Link>}
        <ExploreLinks entry={entry} />
      </div>
      <footer className="mt-9 flex flex-wrap items-center gap-4 border-t border-slate-300/10 pt-5 text-sm">
        <button type="button" onClick={onEdit} className="text-amber-300">Редактирай</button>
        {confirmDelete ? <><span className="text-slate-400">Да се изтрие?</span><button type="button" onClick={onConfirmDelete} className="text-rose-300">Да</button><button type="button" onClick={onCancelDelete} className="text-slate-400">Не</button></> : <button type="button" onClick={onDelete} className="text-slate-500">Изтрий</button>}
      </footer>
      </>}
    </article>
  </div>
}

function ExploreLinks({ entry }: { entry: DiaryEntryV2 }) {
  const suggestion = getDiaryOracleSuggestion(entry)
  const openOracle = () => window.dispatchEvent(new CustomEvent('oracle:open', { detail: { topic: suggestion.topic } }))
  return <div className="space-y-4"><aside className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-5"><p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/70">{suggestion.eyebrow}</p><h3 className="mt-2 font-display text-lg text-slate-100">{suggestion.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{suggestion.description}</p><button type="button" onClick={openOracle} className="mt-4 text-sm text-amber-300">{suggestion.action} →</button></aside><div className="flex flex-wrap gap-4 text-xs">{entry.topics.includes('relationships') && <Link href="/circle" className="text-violet-300">Отвори Кръг</Link>}{entry.source?.type === 'crystal' && <Link href="/you/crystals" className="text-violet-300">Виж кристалите</Link>}</div></div>
}

function DiaryCalendar({ entries, onDateSelect }: { entries: DiaryEntryV2[]; onDateSelect: (date: string | null) => void }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const model = useMemo(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
    const prefix = (first.getDay() + 6) % 7
    const byDate = new Map<string, DiaryEntryV2[]>()
    for (const entry of entries) byDate.set(entry.entryDate, [...(byDate.get(entry.entryDate) ?? []), entry])
    return { first, days, prefix, byDate }
  }, [entries, monthOffset])
  const label = new Intl.DateTimeFormat('bg-BG', { month: 'long', year: 'numeric' }).format(model.first)
  return <div className="rounded-2xl border border-slate-300/10 p-4"><div className="mb-4 flex items-center justify-between"><button onClick={() => setMonthOffset((v) => v - 1)} className="text-slate-400">←</button><p className="font-display capitalize text-slate-300">{label}</p><button onClick={() => setMonthOffset((v) => v + 1)} className="text-slate-400">→</button></div><div className="grid grid-cols-7 gap-1 text-center text-xs">{['Пн','Вт','Ср','Чт','Пт','Сб','Нд'].map((day) => <span key={day} className="pb-2 text-slate-600">{day}</span>)}{Array.from({ length: model.prefix }).map((_, index) => <span key={`empty-${index}`} />)}{Array.from({ length: model.days }).map((_, index) => { const day = index + 1; const date = `${model.first.getFullYear()}-${String(model.first.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const dayEntries = model.byDate.get(date) ?? []; const mood = dayEntries.find((item) => item.mood)?.mood; return <button key={date} onClick={() => onDateSelect(dayEntries.length ? date : null)} className={`relative rounded-lg py-2 ${dayEntries.length ? 'bg-amber-400/10 text-amber-200' : 'text-slate-500'}`}><span>{day}</span>{dayEntries.length > 0 && <span className="absolute right-1 top-0.5 text-[8px] text-slate-400">{dayEntries.length}</span>}{mood && <span className="mx-auto mt-1 block h-1 w-1 rounded-full bg-violet-300" />}</button> })}</div></div>
}
