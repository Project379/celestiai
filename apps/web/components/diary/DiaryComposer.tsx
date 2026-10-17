'use client'

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'

import { ALL_LUNAR_PHASES, getLunarPhase, type LunarPhaseId } from '@stellaeum/core/moon-phase'
import {
  DIARY_MOODS,
  DIARY_TOPICS,
  getCheckInDirections,
  getDiaryFeeling,
  getCompletedCheckInIterations,
  getCheckInAnotherPrompt,
  getCheckInTopicPrompt,
  selectReflectionQuestion,
  type DiaryDirection,
  type DiaryQuestionHistoryItem,
} from '@stellaeum/core/diary/flow'
import { getManifestPromptSelection, MANIFEST_PROMPTS } from '@stellaeum/core/diary/prompts'
import { getDiaryDate } from '@stellaeum/core/diary/time'
import type {
  CreateDiaryEntryV2Input,
  CheckInIteration,
  DiaryFeeling,
  DiaryEntryV2,
  UpdateDiaryEntryV2Input,
} from '@stellaeum/core/diary/v2'
import type { DiarySaveState } from '@/hooks/useDiaryEntries'
import { DiaryUnsavedDialog } from './DiaryUnsavedDialog'

export type ComposerMode = 'check_in' | 'note' | 'lunar_practice'

interface DraftData {
  id: string
  mode: ComposerMode
  title: string
  mood: number | null
  feeling: DiaryFeeling | null
  topics: CreateDiaryEntryV2Input['topics']
  focusTopic: CreateDiaryEntryV2Input['topics'][number] | null
  checkStep: number
  iterations: CheckInIteration[]
  reflectionQuestionId: string | null
  reflectionQuestion: string | null
  rejectedQuestionIds: string[]
  reflectionAnswer: string
  direction: DiaryDirection | null
  detailAnswer: string
  noteBody: string
  phaseId: LunarPhaseId
  variantIndex: number
  lunarAnswers: [string, string, string]
  nextStep: string
}

interface Props {
  mode: ComposerMode
  entry?: DiaryEntryV2 | null
  source?: CreateDiaryEntryV2Input['source']
  saveState?: DiarySaveState
  questionHistory?: readonly DiaryQuestionHistoryItem[]
  onCreate: (input: CreateDiaryEntryV2Input) => Promise<DiaryEntryV2>
  onUpdate: (entry: DiaryEntryV2, patch: Omit<UpdateDiaryEntryV2Input, 'revision'>) => Promise<DiaryEntryV2>
  closeRequestRef?: { current: (() => void) | null }
  onClose: () => void
  onSaved: (entry: DiaryEntryV2) => void
}

function newDraft(mode: ComposerMode): DraftData {
  const phase = getLunarPhase()
  return {
    id: crypto.randomUUID(), mode, title: '', mood: null, feeling: null, topics: [], focusTopic: null, checkStep: 0,
    iterations: [], reflectionQuestionId: null, reflectionQuestion: null, rejectedQuestionIds: [],
    reflectionAnswer: '', direction: null, detailAnswer: '', noteBody: '',
    phaseId: phase.id, variantIndex: 0, lunarAnswers: ['', '', ''], nextStep: '',
  }
}

function draftFromEntry(entry: DiaryEntryV2): DraftData {
  if (entry.kind === 'check_in') {
    const content = entry.content as {
      focusTopic?: DraftData['focusTopic']; reflectionQuestionId?: string | null
      reflectionQuestion?: string | null; reflectionAnswer?: string
      skippedQuestionIds?: string[]; direction?: DraftData['direction']; detailAnswer?: string
      iterations?: CheckInIteration[]
    }
    const legacyIteration = content.reflectionQuestionId && content.reflectionQuestion && content.reflectionAnswer?.trim() && content.direction && content.direction !== 'finish'
      ? [{ topic: content.focusTopic ?? entry.topics[0] ?? 'other', direction: content.direction, questionId: content.reflectionQuestionId, question: content.reflectionQuestion, answer: content.reflectionAnswer, skippedQuestionIds: content.skippedQuestionIds ?? [] }]
      : []
    return {
      ...newDraft('check_in'), id: entry.id, title: entry.title ?? '', mood: entry.mood, feeling: getDiaryFeeling(entry),
      topics: entry.topics, focusTopic: content.focusTopic ?? entry.topics[0] ?? null,
      checkStep: 4, iterations: content.iterations ?? legacyIteration, reflectionQuestionId: null,
      reflectionQuestion: content.reflectionQuestion ?? null, rejectedQuestionIds: content.skippedQuestionIds ?? [],
      reflectionAnswer: '', direction: null, detailAnswer: content.detailAnswer ?? '',
      nextStep: entry.nextStep?.text ?? '',
    }
  }
  if (entry.kind === 'note') {
    return {
      ...newDraft('note'), id: entry.id, title: entry.title ?? '', mood: entry.mood, feeling: getDiaryFeeling(entry),
      topics: entry.topics, noteBody: (entry.content as { body?: string }).body ?? '',
      nextStep: entry.nextStep?.text ?? '',
    }
  }
  const content = entry.content as {
    answers?: string[]; promptId?: string
  }
  const promptId = entry.promptId ?? content.promptId ?? `${entry.phaseId ?? 'new'}:0`
  const variantIndex = Number(promptId.split(':').at(-1)) || 0
  return {
    ...newDraft('lunar_practice'), id: entry.id, title: entry.title ?? '', mood: entry.mood, feeling: getDiaryFeeling(entry),
    topics: entry.topics, phaseId: (entry.phaseId ?? 'new') as LunarPhaseId,
    variantIndex, lunarAnswers: [
      content.answers?.[0] ?? (content as { intentions?: string[] }).intentions?.[0] ?? '',
      content.answers?.[1] ?? (content as { intentions?: string[] }).intentions?.[1] ?? '',
      content.answers?.[2] ?? (content as { intentions?: string[] }).intentions?.[2] ?? '',
    ], nextStep: entry.nextStep?.text ?? '',
  }
}

function hasMeaningfulContent(draft: DraftData) {
  return Boolean(
    draft.mood || draft.title.trim() || draft.reflectionAnswer.trim() || draft.detailAnswer.trim() ||
    draft.iterations.some((iteration) => iteration.answer.trim()) ||
    draft.noteBody.trim() || draft.lunarAnswers.some((answer) => answer.trim()),
  )
}

const inputClass = 'w-full border-b border-amber-300/30 bg-transparent px-0 py-2 font-display text-[15px] leading-7 text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-300/70'
const chipClass = 'rounded-full border px-3 py-1.5 font-display text-xs transition-colors'

export function DiaryComposer({ mode, entry, source = null, questionHistory = [], onCreate, onUpdate, onClose, onSaved, closeRequestRef }: Props) {
  const timezone = entry?.timezone ?? 'Europe/Sofia'
  const [draft, setDraft] = useState<DraftData>(() => entry ? draftFromEntry(entry) : newDraft(mode))
  const [localState, setLocalState] = useState<DiarySaveState>('idle')
  const [showClosePrompt, setShowClosePrompt] = useState(false)
  const serverEntry = useRef<DiaryEntryV2 | null>(entry ?? null)
  const initialSnapshot = useRef(JSON.stringify(draft))
  const saving = useRef(false)
  const hasChanges = JSON.stringify(draft) !== initialSnapshot.current

  const prompt = useMemo(
    () => getManifestPromptSelection(draft.phaseId, 0, draft.variantIndex),
    [draft.phaseId, draft.variantIndex],
  )
  const buildInput = useCallback((value: DraftData, status: 'draft' | 'completed'): CreateDiaryEntryV2Input => {
    const occurredAt = serverEntry.current?.occurredAt ?? new Date().toISOString()
    const entryDate = serverEntry.current?.entryDate ?? getDiaryDate(new Date(occurredAt), timezone)
    const selected = getManifestPromptSelection(value.phaseId, 0, value.variantIndex)
    const nextStep = value.nextStep.trim()
      ? { text: value.nextStep.trim(), status: 'pending' as const, revisitOn: null }
      : null
    const common = {
      id: value.id, kind: value.mode, status, occurredAt, entryDate, timezone,
      title: value.title.trim() || null, mood: value.mood, topics: value.topics,
      source: serverEntry.current?.source ?? source,
      relatedEntryId: serverEntry.current?.relatedEntryId ?? null,
      nextStep,
    }
    if (value.mode === 'note') {
      return { ...common, kind: 'note', content: { version: 1, feeling: value.feeling, body: value.noteBody }, phaseId: null, phaseName: null, promptId: null, promptVersion: null }
    }
    if (value.mode === 'lunar_practice') {
      const phase = ALL_LUNAR_PHASES.find((item) => item.id === value.phaseId)!
      return {
        ...common, kind: 'lunar_practice',
        content: {
          version: 1, feeling: value.feeling, promptId: selected.id, promptVersion: 1,
          heading: selected.prompt.heading, lead: selected.prompt.lead,
          fieldLabels: selected.prompt.fieldLabels, answers: value.lunarAnswers,
        },
        phaseId: value.phaseId, phaseName: phase.name,
        promptId: selected.id, promptVersion: 1,
      }
    }
    const iterations = getCompletedCheckInIterations(value)
    const lastIteration = iterations.at(-1)
    return {
      ...common, kind: 'check_in',
      content: {
        version: 1, feeling: value.feeling, flowVersion: 'check-in-v3', currentStep: status === 'completed' ? 'close' : value.checkStep === 0 ? 'mood' : value.checkStep === 1 ? 'topic' : value.checkStep === 2 ? 'direction' : value.checkStep === 3 ? 'reflection' : 'another',
        focusTopic: value.focusTopic, questionVersion: 1,
        skippedQuestionIds: (lastIteration?.skippedQuestionIds ?? value.rejectedQuestionIds).slice(-10),
        reflectionQuestionId: lastIteration?.questionId ?? value.reflectionQuestionId,
        reflectionQuestion: lastIteration?.question ?? value.reflectionQuestion,
        reflectionAnswer: lastIteration?.answer ?? value.reflectionAnswer,
        direction: lastIteration?.direction ?? value.direction,
        detailQuestion: null, detailAnswer: value.detailAnswer,
        iterations,
      },
      phaseId: null, phaseName: null, promptId: null, promptVersion: null,
    }
  }, [source, timezone])

  const chooseDirection = (direction: DiaryDirection, excludeQuestionIds = draft.rejectedQuestionIds ?? [], preserveAnswer = true) => {
    if (direction === 'finish') {
      setDraft((current) => ({ ...current, direction, checkStep: 4 }))
      return
    }
    const focusTopic = draft.focusTopic ?? 'other'
    const question = selectReflectionQuestion({
      entryId: `${draft.id}:${draft.iterations.length}`,
      mood: draft.mood,
      topics: draft.topics,
      focusTopic,
      direction,
      history: [
        ...draft.iterations.map((iteration, index) => ({ entryId: `${draft.id}:draft:${index}`, questionId: iteration.questionId, skippedQuestionIds: iteration.skippedQuestionIds, topics: [iteration.topic], direction: iteration.direction, mood: draft.mood })),
        ...questionHistory,
      ],
      excludeQuestionIds,
    })
    setDraft((current) => ({
      ...current,
      focusTopic,
      direction,
      checkStep: 3,
      reflectionQuestionId: question?.id ?? null,
      reflectionQuestion: question?.text ?? null,
      rejectedQuestionIds: excludeQuestionIds,
      reflectionAnswer: preserveAnswer && direction === current.direction ? current.reflectionAnswer : '',

    }))
  }

  const chooseAnotherQuestion = () => {
    const previousRejected = draft.rejectedQuestionIds ?? []
    const rejected = draft.reflectionQuestionId
      ? [...previousRejected, draft.reflectionQuestionId]
      : previousRejected
    chooseDirection(draft.direction ?? 'understand', rejected, false)
  }

  const commitIteration = () => {
    if (!draft.focusTopic || !draft.direction || draft.direction === 'finish' || !draft.reflectionQuestionId || !draft.reflectionQuestion || !draft.reflectionAnswer.trim()) return
    const iteration: CheckInIteration = {
      topic: draft.focusTopic,
      direction: draft.direction,
      questionId: draft.reflectionQuestionId,
      question: draft.reflectionQuestion,
      answer: draft.reflectionAnswer.trim(),
      skippedQuestionIds: draft.rejectedQuestionIds.slice(-10),
    }
    setDraft((current) => ({
      ...current,
      iterations: [...current.iterations, iteration],
      topics: current.topics.includes(iteration.topic) ? current.topics : [...current.topics, iteration.topic],
      nextStep: iteration.direction === 'step' ? iteration.answer : current.nextStep,
      checkStep: 4,
    }))
  }

  const startAnotherIteration = () => setDraft((current) => ({
    ...current, checkStep: 1, focusTopic: null, direction: null,
    reflectionQuestionId: null, reflectionQuestion: null, reflectionAnswer: '', rejectedQuestionIds: [],
  }))

  const updateIterationAnswer = (index: number, answer: string) => setDraft((current) => {
    const iterations = current.iterations.map((iteration, iterationIndex) =>
      iterationIndex === index ? { ...iteration, answer } : iteration,
    )
    const latestStep = [...iterations].reverse().find((iteration) => iteration.direction === 'step')
    return { ...current, iterations, nextStep: latestStep?.answer ?? current.nextStep }
  })

  const persist = useCallback(async (value: DraftData, status: 'draft' | 'completed') => {
    const input = buildInput(value, status)
    const current = serverEntry.current
    let saved: DiaryEntryV2
    if (current) {
      if (current.kind === 'legacy_lunar') {
        saved = await onUpdate(current, {
          content: { version: 1, intentions: value.lunarAnswers },
          title: value.title.trim() || null,
        })
      } else {
        const { id: _id, kind: _kind, occurredAt: _occurredAt, entryDate: _entryDate, timezone: _timezone, ...patch } = input
        saved = await onUpdate(current, patch)
      }
    } else saved = await onCreate(input)
    serverEntry.current = saved
    setLocalState('saved')
    return saved
  }, [buildInput, onCreate, onUpdate])

  const complete = async () => {
    if (saving.current) return
    saving.current = true
    setLocalState('saving')
    try {
      const saved = await persist(draft, 'completed')
      initialSnapshot.current = JSON.stringify(draft)
      onSaved(saved)
    } catch { setLocalState('attention') }
    finally { saving.current = false }
  }

  const requestClose = () => {
    if (saving.current) return
    if (!hasChanges) { onClose(); return }
    setShowClosePrompt(true)
  }
  useImperativeHandle(closeRequestRef, () => requestClose)
  useEffect(() => {
    if (!hasChanges) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [hasChanges])

  const canComplete = hasMeaningfulContent(draft)
  const shownState = localState
  const stateLabel = shownState === 'saving' ? 'Запазване…' : shownState === 'saved' ? 'Запазено' : shownState === 'attention' ? 'Не успяхме да запазим. Опитай отново.' : hasChanges ? 'Незапазени промени' : ''

  return (
    <section className="rounded-2xl border border-slate-300/10 bg-slate-950/35 p-5 sm:p-7">
      <div className="mb-7 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl text-slate-100">
          {mode === 'check_in' ? 'Проверка със себе си' : mode === 'note' ? 'Свободен запис' : 'Лунен дневник'}
        </h2>
        <button type="button" onClick={requestClose} className="text-sm text-slate-400 hover:text-slate-200">Затвори</button>
      </div>

      {mode === 'check_in' && (
        <div className="space-y-7">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-600">Размисъл {Math.min(draft.iterations.length + 1, 8)}</p>
          {draft.checkStep === 0 && <div>
            <p className="mb-3 font-display text-lg text-slate-200">Как се чувстваш днес?</p>
            <div className="flex flex-wrap gap-2">{DIARY_MOODS.map((item) => <button key={item.value} type="button" onClick={() => setDraft((d) => ({ ...d, mood: item.value, feeling: item.feeling }))} className={`${chipClass} ${draft.feeling === item.feeling ? 'border-amber-300/70 bg-amber-400/10 text-amber-200' : 'border-slate-500/25 text-slate-400'}`}>{item.label}</button>)}</div>
            <div className="mt-6 flex gap-5"><button type="button" disabled={draft.mood === null} onClick={() => setDraft((d) => ({ ...d, checkStep: 1 }))} className="text-sm text-amber-300 disabled:opacity-40">Продължи →</button><button type="button" onClick={() => setDraft((d) => ({ ...d, checkStep: 1 }))} className="text-xs text-slate-500">Пропусни</button></div>
          </div>}
          {draft.checkStep === 1 && <div>
            <p className="mb-3 font-display text-lg text-slate-200">{getCheckInTopicPrompt(draft.mood, draft.feeling)}</p>
            <div className="flex flex-wrap gap-2">{DIARY_TOPICS.map((topic) => <button key={topic.value} type="button" onClick={() => setDraft((current) => ({ ...current, focusTopic: topic.value, topics: current.topics.includes(topic.value) ? current.topics : [...current.topics, topic.value], checkStep: 2 }))} className={`${chipClass} border-slate-500/25 text-slate-300 hover:border-violet-300/50`}>{topic.label}</button>)}</div>
            {draft.iterations.length === 0 && <button type="button" onClick={() => setDraft((d) => ({ ...d, checkStep: 0 }))} className="mt-5 text-xs text-slate-500">← Назад</button>}
          </div>}
          {draft.checkStep === 2 && (
            <div>
              <p className="mb-1 font-display text-lg text-slate-200">Как искаш да разгледаш тази тема?</p>
              <p className="mb-3 text-xs text-slate-500">{DIARY_TOPICS.find((item) => item.value === draft.focusTopic)?.label}</p>
              <div className="flex flex-wrap gap-2">
                {getCheckInDirections(draft.focusTopic, draft.mood, draft.feeling).map((item) => <button key={item.value} type="button" onClick={() => chooseDirection(item.value)} className={`${chipClass} ${draft.direction === item.value ? 'border-amber-300/70 bg-amber-400/10 text-amber-200' : 'border-slate-500/25 text-slate-400'}`}>{item.label}</button>)}
              </div>
              <button type="button" onClick={() => setDraft((d) => ({ ...d, checkStep: 1 }))} className="mt-5 text-xs text-slate-500">← Назад</button>
            </div>
          )}
          {draft.checkStep === 3 && draft.reflectionQuestion && draft.direction !== 'finish' && (
            <div>
              <label className="font-display text-lg text-slate-200">{draft.reflectionQuestion}</label>
              <textarea className={`${inputClass} mt-2 min-h-24 resize-y`} value={draft.reflectionAnswer} onChange={(event) => setDraft((d) => ({ ...d, reflectionAnswer: event.target.value, nextStep: d.direction === 'step' ? event.target.value : d.nextStep }))} maxLength={20_000} />
              <div className="mt-4 flex items-center justify-between gap-4"><button type="button" onClick={chooseAnotherQuestion} className="text-xs text-slate-500 hover:text-slate-300">Друг въпрос</button><button type="button" disabled={!draft.reflectionAnswer.trim()} onClick={commitIteration} className="text-sm text-amber-300 disabled:opacity-40">Продължи →</button></div>
            </div>
          )}
          {draft.checkStep === 4 && <div>
            {draft.iterations.length > 0 && <div className="mb-8 space-y-6"><p className="text-xs uppercase tracking-[0.18em] text-slate-600">Записани размисли</p>{draft.iterations.map((iteration, index) => <label key={`${iteration.questionId}:${index}`} className="block"><span className="font-display text-sm text-slate-300">{iteration.question}</span><textarea className={`${inputClass} mt-2 min-h-20 resize-y`} value={iteration.answer} onChange={(event) => updateIterationAnswer(index, event.target.value)} maxLength={20_000} /></label>)}</div>}
            <p className="font-display text-lg text-slate-200">{getCheckInAnotherPrompt(draft.mood, draft.feeling)}</p>
            <div className="mt-5 flex flex-wrap gap-3">{draft.iterations.length < 8 && <button type="button" onClick={startAnotherIteration} className="rounded-full border border-violet-300/35 px-4 py-2 text-sm text-violet-200">Добави още нещо</button>}</div>
          </div>}
        </div>
      )}

      {mode === 'note' && (
        <div className="space-y-7">
          <input className={inputClass} value={draft.title} onChange={(event) => setDraft((d) => ({ ...d, title: event.target.value }))} placeholder="Заглавие (по желание)" maxLength={200} />
          <textarea autoFocus className={`${inputClass} min-h-52 resize-y`} value={draft.noteBody} onChange={(event) => setDraft((d) => ({ ...d, noteBody: event.target.value }))} placeholder="Пиши свободно…" maxLength={20_000} />
          <MoodAndTopics draft={draft} setDraft={setDraft} />
        </div>
      )}

      {mode === 'lunar_practice' && (
        <div className="space-y-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">Практика
              <select className="mt-1 w-full rounded-lg border border-slate-500/20 bg-slate-950 p-2 text-sm text-slate-200" value={draft.phaseId} onChange={(event) => setDraft((d) => ({ ...d, phaseId: event.target.value as LunarPhaseId, variantIndex: 0 }))}>
                {ALL_LUNAR_PHASES.map((phase) => <option key={phase.id} value={phase.id}>{phase.name} · {phase.intention}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-400">Въпрос
              <select className="mt-1 w-full rounded-lg border border-slate-500/20 bg-slate-950 p-2 text-sm text-slate-200" value={draft.variantIndex} onChange={(event) => setDraft((d) => ({ ...d, variantIndex: Number(event.target.value) }))}>
                {MANIFEST_PROMPTS[draft.phaseId].map((item, index) => <option key={index} value={index}>{item.heading}</option>)}
              </select>
            </label>
          </div>
          <div><h3 className="font-display text-lg text-amber-200">{prompt.prompt.heading}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{prompt.prompt.lead}</p></div>
          {prompt.prompt.fieldLabels.map((label, index) => <label key={label} className="block text-sm text-slate-300">{label}<textarea className={`${inputClass} mt-1 min-h-16 resize-y`} value={draft.lunarAnswers[index]} placeholder={prompt.prompt.placeholders[index]} onChange={(event) => setDraft((d) => { const answers = [...d.lunarAnswers] as [string, string, string]; answers[index] = event.target.value; return { ...d, lunarAnswers: answers } })} maxLength={2_000} /></label>)}
          <MoodAndTopics draft={draft} setDraft={setDraft} />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300/10 pt-5">
        <span className={`text-xs ${shownState === 'attention' ? 'text-rose-300' : 'text-slate-500'}`}>{stateLabel}</span>
        <button type="button" disabled={!canComplete || shownState === 'saving'} onClick={() => void complete()} className="rounded-full border border-amber-300/40 px-5 py-2 text-sm text-amber-200 disabled:opacity-40">Запази</button>
      </div>
      {showClosePrompt && <DiaryUnsavedDialog canSave={canComplete} saving={shownState === 'saving'} failed={shownState === 'attention'} onSave={() => void complete()} onDiscard={onClose} onContinue={() => setShowClosePrompt(false)} />}
    </section>
  )
}

function TopicPicker({ draft, setDraft }: { draft: DraftData; setDraft: Dispatch<SetStateAction<DraftData>> }) {
  return <div><p className="mb-3 font-display text-sm text-slate-300">Кое повлия най-много на деня ти?</p><div className="flex flex-wrap gap-2">{DIARY_TOPICS.map((topic) => { const selected = draft.topics.includes(topic.value); return <button key={topic.value} type="button" onClick={() => setDraft((d) => { const topics = selected ? d.topics.filter((item) => item !== topic.value) : [...d.topics, topic.value]; return { ...d, topics, focusTopic: topics.includes(d.focusTopic as typeof topic.value) ? d.focusTopic : topics[0] ?? null } })} className={`${chipClass} ${selected ? 'border-violet-300/60 bg-violet-400/10 text-violet-200' : 'border-slate-500/25 text-slate-400'}`}>{topic.label}</button> })}</div></div>
}

function MoodAndTopics({ draft, setDraft }: { draft: DraftData; setDraft: Dispatch<SetStateAction<DraftData>> }) {
  return <div className="space-y-5"><div><p className="mb-3 font-display text-sm text-slate-300">Как се чувстваш? (по желание)</p><div className="flex flex-wrap gap-2">{DIARY_MOODS.map((mood) => <button key={mood.value} type="button" onClick={() => setDraft((d) => ({ ...d, mood: mood.value, feeling: mood.feeling }))} className={`${chipClass} ${draft.feeling === mood.feeling ? 'border-amber-300/70 text-amber-200' : 'border-slate-500/25 text-slate-400'}`}>{mood.label}</button>)}</div></div><TopicPicker draft={draft} setDraft={setDraft} /></div>
}
