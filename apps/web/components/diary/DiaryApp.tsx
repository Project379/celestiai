'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getDiaryDate } from '@stellaeum/core/diary/time'
import { DIARY_TOPICS, type DiaryDirection, type DiaryQuestionHistoryItem } from '@stellaeum/core/diary/flow'
import { diaryWeeklySummarySchema, type DiaryEntryV2, type DiaryListQuery, type DiaryWeeklySummary } from '@stellaeum/core/diary/v2'
import { useDiaryEntries } from '@/hooks/useDiaryEntries'
import { DiaryComposer, type ComposerMode } from './DiaryComposer'
import { DiaryHistory } from './DiaryHistory'
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
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<DiaryListQuery['kind']>()
  const [topic, setTopic] = useState<DiaryListQuery['topic']>()
  const [date, setDate] = useState<string | null>(null)
  const filters = useMemo<Partial<DiaryListQuery>>(() => ({
    query: query || undefined, kind, topic, from: date ?? undefined, to: date ?? undefined, limit: 50,
  }), [date, kind, query, topic])
  const diary = useDiaryEntries(filters)
  const [summary, setSummary] = useState<DiaryWeeklySummary | null>(null)
  const [reminder, setReminder] = useState({ enabled: false, localTime: '20:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Sofia' })

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
    const to = getDiaryDate()
    const fromDate = new Date(`${to}T12:00:00Z`)
    fromDate.setUTCDate(fromDate.getUTCDate() - 6)
    const from = fromDate.toISOString().slice(0, 10)
    fetch(`/api/diary/v2/summary?from=${from}&to=${to}`)
      .then((res) => res.ok ? res.json() : null)
      .then((value) => { const parsed = diaryWeeklySummarySchema.safeParse(value); if (parsed.success) setSummary(parsed.data) })
      .catch(() => {})
    fetch('/api/diary/v2/preferences')
      .then((res) => res.ok ? res.json() : null)
      .then((value) => value && setReminder({ enabled: Boolean(value.enabled), localTime: value.localTime ?? '20:00', timezone: value.timezone ?? 'Europe/Sofia' }))
      .catch(() => {})
  }, [])

  const saveReminder = async (next = reminder) => {
    if (next.enabled) {
      const subscribed = await ensureWebPushSubscription()
      if (!subscribed) return
    }
    const response = await fetch('/api/diary/v2/preferences', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
    })
    if (response.ok) {
      await fetch('/api/push/preferences', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'diary', enabled: next.enabled }),
      })
      setReminder(next)
    }
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

  const drafts = diary.entries.filter((entry) => entry.status === 'draft')
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
      <header className="relative mb-9 pr-16">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Дневник</p>
        <h1 className="mt-3 font-display text-4xl text-slate-100">Как си днес?</h1>
        <p className="mt-3 max-w-xl font-display text-[15px] leading-7 text-slate-400">Провери се, пиши свободно или следвай ритъма на Луната.</p>
        {!mode && !editing && <button type="button" aria-label="Нов запис" onClick={() => setShowCreateMenu((shown) => !shown)} className="absolute right-0 top-1 flex h-11 w-11 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-2xl font-light text-amber-200 transition-colors hover:bg-amber-300/15">+</button>}
      </header>

      {pendingStep && !mode && !editing && <div className="mb-6 rounded-2xl border border-violet-300/15 bg-violet-400/5 p-4"><p className="text-xs uppercase tracking-widest text-violet-300">Следваща стъпка от дневника</p><p className="mt-2 text-xs leading-5 text-slate-400">Това е действието, което записа в проверката си. Можеш да го изпълниш, отложиш или отмениш.</p><p className="mt-2 font-display text-slate-200">{pendingStep.nextStep!.text}</p><div className="mt-3 flex flex-wrap gap-4 text-xs"><button onClick={() => void diary.updateEntry(pendingStep, { nextStep: { ...pendingStep.nextStep!, status: 'done' } })} className="text-emerald-300">Изпълних я</button><button onClick={() => void diary.updateEntry(pendingStep, { nextStep: { ...pendingStep.nextStep!, status: 'carried', revisitOn: getDiaryDate(new Date(Date.now() + 86_400_000), pendingStep.timezone) } })} className="text-amber-300">Отлагам за утре</button><button onClick={() => void diary.updateEntry(pendingStep, { nextStep: { ...pendingStep.nextStep!, status: 'let_go' } })} className="text-slate-400">Отказвам се от нея</button></div></div>}

      {showCreateMenu && !mode && !editing && <div className="mb-9 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl backdrop-blur-xl">{(Object.keys(MODE_LABEL) as ComposerMode[]).map((item) => <button key={item} onClick={() => { void openComposer(item) }} className="flex w-full items-center justify-between border-b border-white/[0.06] px-5 py-4 text-left last:border-0 hover:bg-white/[0.035]"><span className="font-display text-base text-slate-200">{MODE_LABEL[item]}</span><span className="text-slate-600">›</span></button>)}</div>}

      {(mode || activeEntry) && <div className="mb-10"><DiaryComposer
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
      {drafts.length > 0 && !mode && !editing && <section className="mb-9"><h2 className="mb-3 text-xs uppercase tracking-widest text-slate-500">Чернови</h2><div className="space-y-2">{drafts.map((draft) => <div key={draft.id} className="flex items-center gap-3 rounded-xl border border-slate-300/10 px-4 py-3"><button onClick={() => setEditing(draft)} className="flex flex-1 justify-between text-left"><span className="text-sm text-slate-300">{draft.title || MODE_LABEL[draft.kind as ComposerMode] || 'Чернова'}</span><span className="text-xs text-slate-600">{draft.entryDate}</span></button><button aria-label="Изтрий черновата" onClick={() => { if (window.confirm('Да изтрием ли тази чернова завинаги?')) void diary.deleteEntry(draft) }} className="text-xs text-rose-300">Изтрий</button></div>)}</div></section>}

      {summary && summary.entryCount > 0 && <WeeklySummaryCard summary={summary} />}

      <section className="mb-7 flex flex-wrap gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси" className="min-w-44 flex-1 rounded-xl border border-slate-300/10 bg-slate-950/30 px-4 py-2 text-sm text-slate-200 outline-none" />
        <select value={kind ?? ''} onChange={(event) => setKind((event.target.value || undefined) as DiaryListQuery['kind'])} className="rounded-xl border border-slate-300/10 bg-slate-950 px-3 py-2 text-sm text-slate-300"><option value="">Всички</option><option value="check_in">Проверки</option><option value="note">Свободни</option><option value="lunar_practice">Лунни</option><option value="legacy_lunar">Стари лунни</option></select>
        <select value={topic ?? ''} onChange={(event) => setTopic((event.target.value || undefined) as DiaryListQuery['topic'])} className="rounded-xl border border-slate-300/10 bg-slate-950 px-3 py-2 text-sm text-slate-300"><option value="">Всички теми</option>{DIARY_TOPICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        {date && <button onClick={() => setDate(null)} className="text-xs text-amber-300">Изчисти датата</button>}
      </section>

      {diary.error ? <p className="text-sm text-rose-300">{diary.error}</p> : diary.isLoading && diary.entries.length === 0 ? <p className="text-sm text-slate-500">Зареждане…</p> : <DiaryHistory entries={completed} openedEntry={openedEntry} onCloseOpenedEntry={() => setOpenedEntry(null)} onCreate={diary.createEntry} onDelete={diary.deleteEntry} onUpdate={diary.updateEntry} onDateSelect={setDate} questionHistory={questionHistory} />}
      {diary.nextCursor && <button onClick={diary.loadMore} className="mt-6 text-sm text-amber-300">Още записи</button>}

      <footer className="mt-12 space-y-5 border-t border-slate-300/10 pt-7">
        <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" checked={reminder.enabled} onChange={(event) => void saveReminder({ ...reminder, enabled: event.target.checked })} /> Вечерно напомняне</label>{reminder.enabled && <input type="time" value={reminder.localTime} onChange={(event) => { const next = { ...reminder, localTime: event.target.value }; setReminder(next); void saveReminder(next) }} className="rounded-lg border border-slate-300/10 bg-slate-950 px-2 py-1 text-sm text-slate-300" />}</div>
        <div className="flex gap-4 text-xs"><a href="/api/diary/v2/export?format=markdown" className="text-amber-300">Markdown</a><a href="/api/diary/v2/export?format=json" className="text-amber-300">JSON</a></div>
      </footer>

      {diary.conflict && <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-xl rounded-2xl border border-rose-300/25 bg-slate-950 p-5 shadow-2xl"><h2 className="font-display text-lg text-slate-100">Записът е променен другаде</h2><div className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-2"><div><p className="mb-1 text-slate-500">Твоят вариант</p><p className="line-clamp-5 whitespace-pre-wrap">{JSON.stringify(diary.conflict.local.content, null, 2)}</p></div><div><p className="mb-1 text-slate-500">Запазеният вариант</p><p className="line-clamp-5 whitespace-pre-wrap">{diary.conflict.current ? JSON.stringify(diary.conflict.current.content, null, 2) : 'Изтрит'}</p></div></div><div className="mt-5 flex flex-wrap gap-4 text-sm"><button onClick={diary.resolveWithServer} className="text-amber-300">Зареди запазения</button><button onClick={() => void diary.saveConflictAsNew()} className="text-amber-300">Запази моя като нов</button><button onClick={() => { if (diary.conflict) setEditing({ ...diary.conflict.local, revision: diary.conflict.current?.revision ?? diary.conflict.local.revision }); diary.dismissConflict() }} className="text-slate-500">Сравни и реши ръчно</button></div></div>}
    </div>
  )
}

function WeeklySummaryCard({ summary }: { summary: DiaryWeeklySummary }) {
  const moodEntries = Object.entries(summary.moods)
  const moodCount = moodEntries.reduce((total, [, count]) => total + count, 0)
  const moodAverage = moodCount
    ? moodEntries.reduce((total, [mood, count]) => total + Number(mood) * count, 0) / moodCount
    : null
  const topics = Object.entries(summary.topics)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
  const steps = Object.values(summary.steps).reduce((total, count) => total + count, 0)

  return <section className="mb-9 overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-white/[0.035] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:p-7">
    <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Седмичен преглед</p><h2 className="mt-2 font-display text-xl text-slate-100">Последните 7 дни</h2></div><span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-slate-400">{summary.entryCount} {summary.entryCount === 1 ? 'запис' : 'записа'}</span></div>
    <div className="mt-7 grid gap-6 sm:grid-cols-[0.8fr_1.4fr_0.8fr] sm:divide-x sm:divide-white/[0.07]">
      <div><p className="font-display text-3xl text-slate-100">{moodAverage ? moodAverage.toFixed(1) : '—'}</p><p className="mt-1 text-xs text-slate-500">Средно настроение{moodAverage ? ' от 5' : ''}</p></div>
      <div className="sm:px-6"><p className="text-xs text-slate-500">Водещи теми</p><div className="mt-3 flex flex-wrap gap-2">{topics.length ? topics.map(([topic, count]) => <span key={topic} className="rounded-full bg-white/[0.055] px-3 py-1.5 text-xs text-slate-300">{DIARY_TOPICS.find((item) => item.value === topic)?.label ?? topic} · {count}</span>) : <span className="text-sm text-slate-600">—</span>}</div></div>
      <div className="sm:pl-6"><p className="font-display text-3xl text-slate-100">{steps}</p><p className="mt-1 text-xs text-slate-500">Лични стъпки</p></div>
    </div>
  </section>
}
