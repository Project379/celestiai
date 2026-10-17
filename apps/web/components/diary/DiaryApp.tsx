'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bell } from 'lucide-react'
import { getDiaryDate } from '@stellaeum/core/diary/time'
import { DIARY_TOPICS, type DiaryDirection, type DiaryQuestionHistoryItem } from '@stellaeum/core/diary/flow'
import { getDiaryReviewPeriod, shiftDiaryReviewPeriod } from '@stellaeum/core/diary/review'
import { DIARY_PAGE_SIZE, diaryWeeklySummarySchema, type DiaryEntryV2, type DiaryListQuery, type DiaryWeeklySummary } from '@stellaeum/core/diary/v2'
import { useDiaryEntries } from '@/hooks/useDiaryEntries'
import { DiaryComposer, type ComposerMode } from './DiaryComposer'
import { DiaryHistory } from './DiaryHistory'
import { DiaryWeeklyReview } from './DiaryWeeklyReview'
import { ensureWebPushSubscription } from '@/lib/notifications/ensureWebPush'

const MODE_LABEL: Record<ComposerMode, string> = {
  check_in: 'Проверка със себе си', note: 'Пиши свободно', lunar_practice: 'Лунен дневник',
}

const SOURCE_TYPES = new Set(['today', 'moon', 'oracle', 'circle', 'crystal'])

export function DiaryApp() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<ComposerMode | null>(null)
  const [openedEntry, setOpenedEntry] = useState<DiaryEntryV2 | null>(null)
  const [editing, setEditing] = useState<DiaryEntryV2 | null>(null)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [showReminderSettings, setShowReminderSettings] = useState(false)
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderError, setReminderError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<DiaryListQuery['kind']>()
  const [topic, setTopic] = useState<DiaryListQuery['topic']>()
  const [date, setDate] = useState<string | null>(null)
  const filters = useMemo<Partial<DiaryListQuery>>(() => ({
    query: query || undefined, kind, topic, from: date ?? undefined, to: date ?? undefined, limit: DIARY_PAGE_SIZE,
  }), [date, kind, query, topic])
  const diary = useDiaryEntries(filters)
  const [summary, setSummary] = useState<DiaryWeeklySummary | null>(null)
  const [summaryError, setSummaryError] = useState(false)
  const [reviewDate, setReviewDate] = useState<string | null>(null)
  const [reminder, setReminder] = useState({ enabled: false, localTime: '20:00', timezone: 'Europe/Sofia' })
  const currentPeriod = getDiaryReviewPeriod(getDiaryDate(new Date(), reminder.timezone))
  const reviewPeriod = getDiaryReviewPeriod(reviewDate ?? currentPeriod.from)

  const source = useMemo(() => {
    const type = searchParams.get('source')
    const label = searchParams.get('sourceLabel')
    if (!type || !label || !SOURCE_TYPES.has(type)) return null
    const path = searchParams.get('sourcePath')
    return {
      type: type as 'today' | 'moon' | 'oracle' | 'circle' | 'crystal',
      id: searchParams.get('sourceId'), label,
      path: path?.startsWith('/') ? path : null,
    }
  }, [searchParams])

  useEffect(() => {
    fetch('/api/diary/v2/preferences')
      .then((res) => res.ok ? res.json() : null)
      .then((value) => value && setReminder({ enabled: Boolean(value.enabled), localTime: value.localTime ?? '20:00', timezone: value.timezone ?? 'Europe/Sofia' }))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let active = true
    setSummary(null)
    setSummaryError(false)
    fetch(`/api/diary/v2/summary?from=${reviewPeriod.from}&to=${reviewPeriod.to}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Diary summary failed')
        return diaryWeeklySummarySchema.parse(await response.json())
      })
      .then((value) => { if (active) setSummary(value) })
      .catch(() => { if (active) setSummaryError(true) })
    return () => { active = false }
  }, [reviewPeriod.from, reviewPeriod.to, diary.entries])

  const saveReminder = async (next = reminder) => {
    setReminderSaving(true)
    setReminderError(null)
    try {
      if (next.enabled) {
        const subscribed = await ensureWebPushSubscription()
        if (!subscribed) { setReminderError('Разреши известията в браузъра, за да включиш напомнянето.'); return }
      }
      const response = await fetch('/api/diary/v2/preferences', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
      })
      if (!response.ok) throw new Error('Reminder preference failed')
      const pushResponse = await fetch('/api/push/preferences', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'diary', enabled: next.enabled }),
      })
      if (!pushResponse.ok) throw new Error('Push preference failed')
      setReminder(next)
    } catch { setReminderError('Не успяхме да запазим настройката. Опитай отново.') }
    finally { setReminderSaving(false) }
  }

  const [creationError, setCreationError] = useState<string | null>(null)
  const openComposer = async (selected: ComposerMode) => {
    setShowCreateMenu(false)
    setCreationError(null)
    if (selected !== 'check_in') { setMode(selected); return }
    try {
      const today = getDiaryDate()
      const page = await fetch(`/api/diary/v2/entries?kind=check_in&from=${today}&to=${today}&limit=1`).then((response) => { if (!response.ok) throw new Error('Diary lookup failed'); return response.json() }) as { entries: DiaryEntryV2[] }
      if (page.entries[0]) { setMode(null); setEditing(null); setOpenedEntry(page.entries[0]) }
      else setMode('check_in')
    } catch { setCreationError('Не успяхме да проверим днешния запис. Опитай отново.') }
  }

  const completed = diary.entries.filter((entry) => entry.status === 'completed')
  const pendingStep = completed.find((entry) => entry.nextStep?.status === 'pending')
  const activeEntry = editing
  const questionHistory = useMemo<DiaryQuestionHistoryItem[]>(() => diary.entries
    .filter((entry) => entry.kind === 'check_in')
    .flatMap((entry) => {
      const content = entry.content as { reflectionQuestionId?: string | null; skippedQuestionIds?: string[]; direction?: DiaryDirection | null; iterations?: { topic: DiaryEntryV2['topics'][number]; direction: Exclude<DiaryDirection, 'finish'>; questionId: string; skippedQuestionIds?: string[] }[] }
      if (content.iterations?.length) return content.iterations.map((iteration, index) => ({ entryId: `${entry.id}:${index}`, questionId: iteration.questionId, skippedQuestionIds: iteration.skippedQuestionIds ?? [], topics: [iteration.topic], direction: iteration.direction, mood: entry.mood }))
      return [{ entryId: entry.id, questionId: content.reflectionQuestionId ?? null, skippedQuestionIds: content.skippedQuestionIds ?? [], topics: entry.topics, direction: content.direction ?? null, mood: entry.mood }]
    }), [diary.entries])

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-6">
      <header className="relative mb-9 pr-28">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Дневник</p>
        <h1 className="mt-3 font-display text-4xl text-slate-100">Как се чувстваш днес?</h1>
        <p className="mt-3 max-w-xl font-display text-[15px] leading-7 text-slate-400">Отдели време за себе си, пиши свободно или избери лунна практика.</p>
        <div className="absolute right-0 top-1 flex gap-2">
          <button type="button" aria-label="Настройки на известията" aria-expanded={showReminderSettings} aria-controls="diary-reminder-settings" onClick={() => { setShowReminderSettings((shown) => !shown); setShowCreateMenu(false) }} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-amber-200 transition-colors hover:bg-amber-300/15"><Bell className="h-5 w-5" aria-hidden="true" />{reminder.enabled && <span aria-hidden="true" className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-200" />}</button>
          {!mode && !editing && <button type="button" aria-label="Нов запис" onClick={() => { setShowCreateMenu((shown) => !shown); setShowReminderSettings(false) }} className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-2xl font-light text-amber-200 transition-colors hover:bg-amber-300/15">+</button>}
        </div>
      </header>

      {showReminderSettings && <section id="diary-reminder-settings" aria-label="Известия за дневника" className="mb-7 space-y-4 rounded-2xl border border-amber-300/15 bg-slate-950/60 p-5">
        <div className="flex items-center justify-between gap-4"><h2 className="font-display text-lg text-slate-100">Известия за дневника</h2><button type="button" onClick={() => setShowReminderSettings(false)} className="text-xs text-slate-400">Затвори</button></div>
        <p className="text-sm text-slate-400">Напомняне за размисъл, ако още нямаш завършен запис за деня.</p>
        <label className="flex items-center justify-between gap-4 text-sm text-slate-200">Вечерно напомняне<input type="checkbox" checked={reminder.enabled} disabled={reminderSaving} onChange={(event) => void saveReminder({ ...reminder, enabled: event.target.checked })} /></label>
        {reminder.enabled && <label className="flex items-center justify-between gap-4 text-sm text-slate-400">Час<input type="time" value={reminder.localTime} disabled={reminderSaving} onChange={(event) => { if (event.target.value) void saveReminder({ ...reminder, localTime: event.target.value }) }} className="rounded-lg border border-slate-300/10 bg-slate-950 px-3 py-2 text-slate-200" /></label>}
        {reminderSaving && <p role="status" className="text-xs text-slate-500">Запазване…</p>}
        {reminderError && <p role="alert" className="text-sm text-rose-300">{reminderError}</p>}
      </section>}

      {pendingStep && !mode && !editing && <div className="mb-6 rounded-2xl border border-violet-300/15 bg-violet-400/5 p-4"><p className="text-xs uppercase tracking-widest text-violet-300">Следваща стъпка от дневника</p><p className="mt-2 text-xs leading-5 text-slate-400">Това е действието, което записа в проверката си. Можеш да го изпълниш, отложиш или отмениш.</p><p className="mt-2 font-display text-slate-200">{pendingStep.nextStep!.text}</p><div className="mt-3 flex flex-wrap gap-4 text-xs"><button onClick={() => void diary.updateEntry(pendingStep, { nextStep: { ...pendingStep.nextStep!, status: 'done' } })} className="text-emerald-300">Изпълних я</button><button onClick={() => void diary.updateEntry(pendingStep, { nextStep: { ...pendingStep.nextStep!, status: 'carried', revisitOn: getDiaryDate(new Date(Date.now() + 86_400_000), pendingStep.timezone) } })} className="text-amber-300">Отлагам за утре</button><button onClick={() => void diary.updateEntry(pendingStep, { nextStep: { ...pendingStep.nextStep!, status: 'let_go' } })} className="text-slate-400">Отказвам се от нея</button></div></div>}

      {showCreateMenu && !mode && !editing && <div className="mb-9 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur-xl">{(Object.keys(MODE_LABEL) as ComposerMode[]).map((item) => <button key={item} onClick={() => { void openComposer(item) }} className="flex w-full items-center justify-between border-b border-white/[0.06] px-5 py-4 text-left last:border-0 hover:bg-white/[0.035]"><span className="font-display text-base text-slate-200">{MODE_LABEL[item]}</span><span className="text-slate-600">›</span></button>)}</div>}

      {(mode || activeEntry) && <div className="mb-10"><DiaryComposer key={activeEntry?.id ?? mode}
        mode={activeEntry ? (activeEntry.kind === 'check_in' ? 'check_in' : activeEntry.kind === 'note' ? 'note' : 'lunar_practice') : mode!}
        entry={activeEntry}
        source={source}
        questionHistory={questionHistory}
        saveState={activeEntry ? diary.saveStates[activeEntry.id] : undefined}
        onCreate={diary.createEntry}
        onUpdate={diary.updateEntry}
        onClose={() => { setMode(null); setEditing(null) }}
        onSaved={() => { setMode(null); setEditing(null); void diary.refresh() }}
      /></div>}

      {creationError && <p role="alert" className="mb-4 text-sm text-rose-300">{creationError}</p>}

      <DiaryWeeklyReview period={reviewPeriod} summary={summary?.from === reviewPeriod.from && summary.to === reviewPeriod.to ? summary : null} error={summaryError} canGoNext={reviewPeriod.from < currentPeriod.from} onPrevious={() => setReviewDate(shiftDiaryReviewPeriod(reviewPeriod, -1).from)} onNext={() => setReviewDate(shiftDiaryReviewPeriod(reviewPeriod, 1).from)} />

      <section className="mb-7 flex flex-wrap gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси" className="min-w-44 flex-1 rounded-xl border border-slate-300/10 bg-slate-950/30 px-4 py-2 text-sm text-slate-200 outline-none" />
        <select value={kind ?? ''} onChange={(event) => setKind((event.target.value || undefined) as DiaryListQuery['kind'])} className="rounded-xl border border-slate-300/10 bg-slate-950 px-3 py-2 text-sm text-slate-300"><option value="">Всички</option><option value="check_in">Проверки</option><option value="note">Свободни</option><option value="lunar_practice">Лунни</option><option value="legacy_lunar">Стари лунни</option></select>
        <select value={topic ?? ''} onChange={(event) => setTopic((event.target.value || undefined) as DiaryListQuery['topic'])} className="rounded-xl border border-slate-300/10 bg-slate-950 px-3 py-2 text-sm text-slate-300"><option value="">Всички теми</option>{DIARY_TOPICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        {date && <button onClick={() => setDate(null)} className="text-xs text-amber-300">Изчисти датата</button>}
      </section>

      {diary.error ? <p className="text-sm text-rose-300">{diary.error}</p> : diary.isLoading && diary.entries.length === 0 ? <p className="text-sm text-slate-500">Зареждане…</p> : <DiaryHistory entries={diary.entries} openedEntry={openedEntry} onCloseOpenedEntry={() => setOpenedEntry(null)} onCreate={diary.createEntry} onDelete={diary.deleteEntry} onUpdate={diary.updateEntry} onDateSelect={setDate} questionHistory={questionHistory} />}
      {(diary.hasPreviousPage || diary.nextCursor) && <nav aria-label="Страници на дневника" className="mt-6 flex items-center justify-between gap-4 text-sm">
        <button type="button" onClick={diary.previousPage} disabled={!diary.hasPreviousPage || diary.isLoading} className="text-amber-300 disabled:opacity-30">← Предишна</button>
        <span aria-live="polite" className="text-slate-500">Страница {diary.pageNumber}</span>
        <button type="button" onClick={diary.nextPage} disabled={!diary.nextCursor || diary.isLoading} className="text-amber-300 disabled:opacity-30">Следваща →</button>
      </nav>}

      <footer className="mt-12 space-y-5 border-t border-slate-300/10 pt-7">
        <div className="flex gap-4 text-xs"><a href="/api/diary/v2/export?format=markdown" className="text-amber-300">Markdown</a><a href="/api/diary/v2/export?format=json" className="text-amber-300">JSON</a></div>
      </footer>

      {diary.conflict && <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-rose-300/25 bg-slate-950 p-5 shadow-2xl"><h2 className="font-display text-lg text-slate-100">Записът е променен другаде</h2><div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2"><div><p className="mb-1 text-slate-500">Твоят вариант</p><p className="line-clamp-5 whitespace-pre-wrap">{JSON.stringify(diary.conflict.local.content, null, 2)}</p></div><div><p className="mb-1 text-slate-500">Запазеният вариант</p><p className="line-clamp-5 whitespace-pre-wrap">{diary.conflict.current ? JSON.stringify(diary.conflict.current.content, null, 2) : 'Изтрит'}</p></div></div><div className="mt-5 flex flex-wrap gap-4 text-sm"><button onClick={diary.resolveWithServer} className="text-amber-300">Зареди запазения</button><button onClick={() => void diary.saveConflictAsNew()} className="text-amber-300">Запази моя като нов</button><button onClick={() => { if (diary.conflict) setEditing({ ...diary.conflict.local, revision: diary.conflict.current?.revision ?? diary.conflict.local.revision }); diary.dismissConflict() }} className="text-slate-500">Сравни и реши ръчно</button></div></div>}
    </div>
  )
}
