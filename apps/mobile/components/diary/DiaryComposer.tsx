import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useUser } from '@clerk/expo'
import * as Crypto from 'expo-crypto'
import { ALL_LUNAR_PHASES, getLunarPhase, type LunarPhaseId } from '@stellaeum/core/moon-phase'
import {
  getCheckInDirections,
  DIARY_MOODS,
  DIARY_TOPICS,
  getCheckInAnotherPrompt,
  getCheckInTopicPrompt,
  selectReflectionQuestion,
  type DiaryDirection,
  type DiaryQuestionHistoryItem,
} from '@stellaeum/core/diary/flow'
import { getManifestPromptSelection, MANIFEST_PROMPTS } from '@stellaeum/core/diary/prompts'
import { getDiaryDate } from '@stellaeum/core/diary/time'
import type { CheckInIteration, CreateDiaryEntryV2Input, DiaryEntryV2, UpdateDiaryEntryV2Input } from '@stellaeum/core/diary/v2'
import { color, font, pressFeedback, rhythm } from '@/components/design-system/tokens'
import { composerKey } from '@/lib/diary/storage'
import type { MobileDiarySaveState } from '@/hooks/useDiaryEntriesV2'

export type MobileComposerMode = 'check_in' | 'note' | 'lunar_practice'

type Draft = {
  id: string; mode: MobileComposerMode; title: string; mood: number | null
  topics: CreateDiaryEntryV2Input['topics']; focusTopic: CreateDiaryEntryV2Input['topics'][number] | null; checkStep: number
  iterations: CheckInIteration[]
  reflectionQuestionId: string | null; reflectionQuestion: string | null; rejectedQuestionIds: string[]
  reflectionAnswer: string; direction: DiaryDirection | null
  detailAnswer: string; noteBody: string; phaseId: LunarPhaseId; variantIndex: number
  lunarAnswers: [string, string, string]; nextStep: string
}

type StoredDraft = { accountId: string; baseRevision: number | null; pendingOperation: 'upsert'; draft: Draft }

interface Props {
  mode: MobileComposerMode
  entry?: DiaryEntryV2 | null
  source?: CreateDiaryEntryV2Input['source']
  saveState?: MobileDiarySaveState
  questionHistory?: readonly DiaryQuestionHistoryItem[]
  onCreate: (input: CreateDiaryEntryV2Input) => Promise<DiaryEntryV2>
  onUpdate: (entry: DiaryEntryV2, patch: Omit<UpdateDiaryEntryV2Input, 'revision'>) => Promise<DiaryEntryV2>
  onClose: () => void
  onSaved: (entry: DiaryEntryV2) => void
}

function fresh(mode: MobileComposerMode): Draft {
  return { id: Crypto.randomUUID(), mode, title: '', mood: null, topics: [], focusTopic: null, checkStep: 0, iterations: [], reflectionQuestionId: null, reflectionQuestion: null, rejectedQuestionIds: [], reflectionAnswer: '', direction: null, detailAnswer: '', noteBody: '', phaseId: getLunarPhase().id, variantIndex: 0, lunarAnswers: ['', '', ''], nextStep: '' }
}

function normalizeStoredDraft(value: Partial<Draft>, mode: MobileComposerMode): Draft {
  const normalized = { ...fresh(mode), ...value, mode }
  return {
    ...normalized,
    topics: Array.isArray(value.topics) ? value.topics : [],
    iterations: Array.isArray(value.iterations) ? value.iterations : [],
    rejectedQuestionIds: Array.isArray(value.rejectedQuestionIds) ? value.rejectedQuestionIds : [],
    lunarAnswers: Array.isArray(value.lunarAnswers) && value.lunarAnswers.length === 3
      ? value.lunarAnswers as [string, string, string]
      : ['', '', ''],
  }
}

function fromEntry(entry: DiaryEntryV2): Draft {
  if (entry.kind === 'check_in') {
    const content = entry.content as { focusTopic?: Draft['focusTopic']; reflectionQuestionId?: string | null; reflectionQuestion?: string | null; skippedQuestionIds?: string[]; reflectionAnswer?: string; direction?: Draft['direction']; detailAnswer?: string; iterations?: CheckInIteration[] }
    const legacyIteration = content.reflectionQuestionId && content.reflectionQuestion && content.reflectionAnswer?.trim() && content.direction && content.direction !== 'finish'
      ? [{ topic: content.focusTopic ?? entry.topics[0] ?? 'other', direction: content.direction, questionId: content.reflectionQuestionId, question: content.reflectionQuestion, answer: content.reflectionAnswer, skippedQuestionIds: content.skippedQuestionIds ?? [] }]
      : []
    return { ...fresh('check_in'), id: entry.id, title: entry.title ?? '', mood: entry.mood, topics: entry.topics, focusTopic: content.focusTopic ?? entry.topics[0] ?? null, checkStep: 4, iterations: content.iterations ?? legacyIteration, reflectionQuestionId: null, reflectionQuestion: null, rejectedQuestionIds: [], reflectionAnswer: '', direction: null, detailAnswer: content.detailAnswer ?? '', nextStep: entry.nextStep?.text ?? '' }
  }
  if (entry.kind === 'note') return { ...fresh('note'), id: entry.id, title: entry.title ?? '', mood: entry.mood, topics: entry.topics, noteBody: (entry.content as { body?: string }).body ?? '', nextStep: entry.nextStep?.text ?? '' }
  const content = entry.content as { answers?: string[]; intentions?: string[]; promptId?: string }
  const promptId = entry.promptId ?? content.promptId ?? `${entry.phaseId ?? 'new'}:0`
  return { ...fresh('lunar_practice'), id: entry.id, title: entry.title ?? '', mood: entry.mood, topics: entry.topics, phaseId: (entry.phaseId ?? 'new') as LunarPhaseId, variantIndex: Number(promptId.split(':').at(-1)) || 0, lunarAnswers: [content.answers?.[0] ?? content.intentions?.[0] ?? '', content.answers?.[1] ?? content.intentions?.[1] ?? '', content.answers?.[2] ?? content.intentions?.[2] ?? ''], nextStep: entry.nextStep?.text ?? '' }
}

function meaningful(draft: Draft) {
  return Boolean(draft.mood || draft.title.trim() || draft.reflectionAnswer.trim() || draft.detailAnswer.trim() || draft.iterations.some((item) => item.answer.trim()) || draft.noteBody.trim() || draft.lunarAnswers.some((value) => value.trim()))
}

const labelStyle = { fontFamily: font.displayRegular, fontSize: 14, color: color.text, marginBottom: 8 } as const
const inputStyle = { fontFamily: font.body, fontSize: 16, lineHeight: 25, color: color.text, borderBottomWidth: 1, borderBottomColor: 'rgba(184,118,62,0.42)', paddingVertical: 8, minHeight: 44 } as const

export function DiaryComposer({ mode, entry, source = null, saveState, questionHistory = [], onCreate, onUpdate, onClose, onSaved }: Props) {
  const { user } = useUser()
  const accountId = user?.id
  const timezone = entry?.timezone ?? 'Europe/Sofia'
  const storageKey = accountId ? composerKey(accountId, mode) : null
  const [draft, setDraft] = useState<Draft>(() => entry ? fromEntry(entry) : fresh(mode))
  const [localState, setLocalState] = useState<MobileDiarySaveState>('idle')
  const serverEntry = useRef<DiaryEntryV2 | null>(entry ?? null)
  const hydratedEntryId = useRef<string | null>(entry?.id ?? null)
  const saveChain = useRef(Promise.resolve())
  const lastQueued = useRef('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (entry) {
      if (hydratedEntryId.current === entry.id) return
      const next = fromEntry(entry)
      setDraft(next)
      serverEntry.current = entry
      hydratedEntryId.current = entry.id
      return
    }
    hydratedEntryId.current = null
    if (!storageKey) return
    void AsyncStorage.getItem(storageKey).then((value) => {
      if (!value) return setDraft(fresh(mode))
      const parsed = JSON.parse(value) as Draft | StoredDraft
      setDraft(normalizeStoredDraft('draft' in parsed ? parsed.draft : parsed, mode))
    }).catch(() => setDraft(fresh(mode)))
  }, [entry, mode, storageKey])

  const prompt = useMemo(() => getManifestPromptSelection(draft.phaseId, 0, draft.variantIndex), [draft.phaseId, draft.variantIndex])
  const build = useCallback((value: Draft, status: 'draft' | 'completed'): CreateDiaryEntryV2Input => {
    const occurredAt = serverEntry.current?.occurredAt ?? new Date().toISOString()
    const entryDate = serverEntry.current?.entryDate ?? getDiaryDate(new Date(occurredAt), timezone)
    const selected = getManifestPromptSelection(value.phaseId, 0, value.variantIndex)
    const common = { id: value.id, kind: value.mode, status, occurredAt, entryDate, timezone, title: value.title.trim() || null, mood: value.mood, topics: value.topics, source: serverEntry.current?.source ?? source, relatedEntryId: serverEntry.current?.relatedEntryId ?? null, nextStep: value.nextStep.trim() ? { text: value.nextStep.trim(), status: 'pending' as const, revisitOn: null } : null }
    if (value.mode === 'note') return { ...common, kind: 'note', content: { version: 1, body: value.noteBody }, phaseId: null, phaseName: null, promptId: null, promptVersion: null }
    if (value.mode === 'lunar_practice') {
      const phase = ALL_LUNAR_PHASES.find((item) => item.id === value.phaseId)!
      return { ...common, kind: 'lunar_practice', content: { version: 1, promptId: selected.id, promptVersion: 1, heading: selected.prompt.heading, lead: selected.prompt.lead, fieldLabels: selected.prompt.fieldLabels, answers: value.lunarAnswers }, phaseId: phase.id, phaseName: phase.name, promptId: selected.id, promptVersion: 1 }
    }
    const last = value.iterations.at(-1)
    return { ...common, kind: 'check_in', content: { version: 1, flowVersion: 'check-in-v3', currentStep: status === 'completed' ? 'close' : value.checkStep === 0 ? 'mood' : value.checkStep === 1 ? 'topic' : value.checkStep === 2 ? 'direction' : value.checkStep === 3 ? 'reflection' : 'another', focusTopic: value.focusTopic, questionVersion: 1, skippedQuestionIds: (last?.skippedQuestionIds ?? value.rejectedQuestionIds).slice(-10), reflectionQuestionId: last?.questionId ?? value.reflectionQuestionId, reflectionQuestion: last?.question ?? value.reflectionQuestion, reflectionAnswer: last?.answer ?? value.reflectionAnswer, direction: last?.direction ?? value.direction, detailQuestion: null, detailAnswer: value.detailAnswer, iterations: value.iterations }, phaseId: null, phaseName: null, promptId: null, promptVersion: null }
  }, [source, timezone])

  const chooseDirection = (direction: DiaryDirection, excludeQuestionIds = draft.rejectedQuestionIds ?? [], preserveAnswer = true) => {
    if (direction === 'finish') { setDraft((current) => ({ ...current, direction, checkStep: 4 })); return }
    const focusTopic = draft.focusTopic ?? 'other'
    const history = [...draft.iterations.map((iteration, index) => ({ entryId: `${draft.id}:draft:${index}`, questionId: iteration.questionId, skippedQuestionIds: iteration.skippedQuestionIds, topics: [iteration.topic], direction: iteration.direction, mood: draft.mood })), ...questionHistory]
    const question = selectReflectionQuestion({ entryId: `${draft.id}:${draft.iterations.length}`, mood: draft.mood, topics: draft.topics, focusTopic, direction, history, excludeQuestionIds })
    setDraft((current) => ({ ...current, focusTopic, direction, checkStep: 3, reflectionQuestionId: question?.id ?? null, reflectionQuestion: question?.text ?? null, rejectedQuestionIds: excludeQuestionIds, reflectionAnswer: preserveAnswer && direction === current.direction ? current.reflectionAnswer : '', nextStep: preserveAnswer && direction === 'step' && direction === current.direction ? current.reflectionAnswer : '' }))
  }

  const chooseAnotherQuestion = () => {
    const previousRejected = draft.rejectedQuestionIds ?? []
    const rejected = draft.reflectionQuestionId ? [...previousRejected, draft.reflectionQuestionId] : previousRejected
    chooseDirection(draft.direction ?? 'understand', rejected, false)
  }

  const commitIteration = () => {
    if (!draft.focusTopic || !draft.direction || draft.direction === 'finish' || !draft.reflectionQuestionId || !draft.reflectionQuestion || !draft.reflectionAnswer.trim()) return
    const iteration: CheckInIteration = { topic: draft.focusTopic, direction: draft.direction, questionId: draft.reflectionQuestionId, question: draft.reflectionQuestion, answer: draft.reflectionAnswer.trim(), skippedQuestionIds: draft.rejectedQuestionIds.slice(-10) }
    setDraft((current) => ({ ...current, iterations: [...current.iterations, iteration], topics: current.topics.includes(iteration.topic) ? current.topics : [...current.topics, iteration.topic], nextStep: iteration.direction === 'step' ? iteration.answer : current.nextStep, checkStep: 4 }))
  }

  const startAnotherIteration = () => setDraft((current) => ({ ...current, checkStep: 1, focusTopic: null, direction: null, reflectionQuestionId: null, reflectionQuestion: null, reflectionAnswer: '', rejectedQuestionIds: [] }))

  const updateIterationAnswer = (index: number, answer: string) => setDraft((current) => {
    const iterations = current.iterations.map((iteration, iterationIndex) => iterationIndex === index ? { ...iteration, answer } : iteration)
    const latestStep = [...iterations].reverse().find((iteration) => iteration.direction === 'step')
    return { ...current, iterations, nextStep: latestStep?.answer ?? current.nextStep }
  })

  const persist = useCallback(async (value: Draft, status: 'draft' | 'completed') => {
    const input = build(value, status)
    const current = serverEntry.current
    let saved: DiaryEntryV2
    if (current?.kind === 'legacy_lunar') saved = await onUpdate(current, { content: { version: 1, intentions: value.lunarAnswers }, title: value.title.trim() || null })
    else if (current) {
      const { id: _id, kind: _kind, occurredAt: _occurredAt, entryDate: _entryDate, timezone: _timezone, ...patch } = input
      saved = await onUpdate(current, patch)
    } else saved = await onCreate(input)
    serverEntry.current = saved
    setLocalState('saved')
    return saved
  }, [build, onCreate, onUpdate])

  useEffect(() => {
    if (!storageKey || !meaningful(draft)) return
    void AsyncStorage.setItem(storageKey, JSON.stringify({ accountId: accountId!, baseRevision: serverEntry.current?.revision ?? null, pendingOperation: 'upsert', draft } satisfies StoredDraft))
    setLocalState('saved-device')
    const snapshot = JSON.stringify(draft)
    if (snapshot === lastQueued.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      lastQueued.current = snapshot
      const value = JSON.parse(snapshot) as Draft
      saveChain.current = saveChain.current.then(() => persist(value, serverEntry.current?.status === 'completed' ? 'completed' : 'draft')).then(() => undefined).catch(() => setLocalState('attention'))
    }, 900)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [accountId, draft, persist, storageKey])

  const complete = async () => {
    if (timer.current) clearTimeout(timer.current)
    setLocalState('saving')
    await saveChain.current
    try { const saved = await persist(draft, 'completed'); if (storageKey) await AsyncStorage.removeItem(storageKey); onSaved(saved) }
    catch { setLocalState('attention') }
  }

  const shownState = saveState ?? localState
  const stateLabel = shownState === 'saving' ? 'Запазване…' : shownState === 'saved' ? 'Запазено' : shownState === 'saved-device' ? 'Запазено на устройството' : shownState === 'attention' ? 'Нуждае се от внимание' : ''

  return <View style={{ borderWidth: 1, borderColor: 'rgba(226,232,240,0.1)', borderRadius: 18, padding: 18, gap: rhythm.group }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontFamily: font.displaySemibold, fontSize: 21, color: color.text }}>{mode === 'check_in' ? 'Проверка със себе си' : mode === 'note' ? 'Свободен запис' : 'Лунен дневник'}</Text><Pressable onPress={onClose}><Text style={{ color: color.faint }}>Затвори</Text></Pressable></View>
    {mode === 'check_in' && <View style={{ gap: rhythm.group }}>
      <Text style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: color.faint }}>Размисъл {Math.min(draft.iterations.length + 1, 8)}</Text>
      {draft.checkStep === 0 && <View style={{ gap: 18 }}><ChoiceGroup label="Как се чувстваш днес?" items={DIARY_MOODS.map((item) => ({ value: String(item.value), label: item.label }))} selected={draft.mood ? String(draft.mood) : null} onSelect={(value) => setDraft((d) => ({ ...d, mood: Number(value) }))} /><View style={{ flexDirection: 'row', gap: 20 }}><Action label="Продължи →" disabled={draft.mood === null} onPress={() => setDraft((d) => ({ ...d, checkStep: 1 }))} /><Action label="Пропусни" muted onPress={() => setDraft((d) => ({ ...d, checkStep: 1 }))} /></View></View>}
      {draft.checkStep === 1 && <View style={{ gap: 18 }}><ChoiceGroup label={getCheckInTopicPrompt(draft.mood)} items={DIARY_TOPICS} selected={null} onSelect={(value) => setDraft((current) => { const topic = value as Draft['focusTopic']; return { ...current, focusTopic: topic, topics: topic && !current.topics.includes(topic) ? [...current.topics, topic] : current.topics, checkStep: 2 } })} />{draft.iterations.length === 0 && <Action label="← Назад" muted onPress={() => setDraft((d) => ({ ...d, checkStep: 0 }))} />}</View>}
      {draft.checkStep === 2 && <View style={{ gap: 18 }}><ChoiceGroup label="Как искаш да разгледаш тази тема?" items={getCheckInDirections(draft.focusTopic, draft.mood).map((item) => ({ value: item.value, label: item.label }))} selected={draft.direction} onSelect={(value) => chooseDirection(value as DiaryDirection)} /><Action label="← Назад" muted onPress={() => setDraft((d) => ({ ...d, checkStep: 1 }))} /></View>}
      {draft.checkStep === 3 && draft.reflectionQuestion && draft.direction !== 'finish' && <View style={{ gap: 14 }}><Field label={draft.reflectionQuestion} value={draft.reflectionAnswer} onChange={(value) => setDraft((d) => ({ ...d, reflectionAnswer: value, nextStep: d.direction === 'step' ? value : d.nextStep }))} /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Action label="Друг въпрос" muted onPress={chooseAnotherQuestion} /><Action label="Продължи →" disabled={!draft.reflectionAnswer.trim()} onPress={commitIteration} /></View></View>}
      {draft.checkStep === 4 && <View style={{ gap: 18 }}>{draft.iterations.length > 0 && <View style={{ gap: 18 }}><Text style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: color.faint }}>Записани размисли</Text>{draft.iterations.map((iteration, index) => <Field key={`${iteration.questionId}:${index}`} label={iteration.question} value={iteration.answer} onChange={(answer) => updateIterationAnswer(index, answer)} />)}</View>}<Text style={{ fontFamily: font.displayRegular, fontSize: 19, lineHeight: 27, color: color.text }}>{getCheckInAnotherPrompt(draft.mood)}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{draft.iterations.length < 8 && <Action label="Добави още нещо" onPress={startAnotherIteration} />}<Action label="Готово" disabled={!meaningful(draft) || shownState === 'saving'} onPress={() => void complete()} /></View></View>}
    </View>}
    {mode === 'note' && <View style={{ gap: rhythm.group }}><Field label="Заглавие (по желание)" value={draft.title} onChange={(value) => setDraft((d) => ({ ...d, title: value }))} singleLine /><Field label="Пиши свободно" value={draft.noteBody} onChange={(value) => setDraft((d) => ({ ...d, noteBody: value }))} tall /><MoodTopics draft={draft} setDraft={setDraft} /></View>}
    {mode === 'lunar_practice' && <View style={{ gap: rhythm.group }}><Text style={labelStyle}>Избери практика</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{ALL_LUNAR_PHASES.map((phase) => <Chip key={phase.id} label={phase.intention} selected={draft.phaseId === phase.id} onPress={() => setDraft((d) => ({ ...d, phaseId: phase.id, variantIndex: 0 }))} />)}</View><Text style={labelStyle}>Избери въпрос</Text><View style={{ gap: 7 }}>{MANIFEST_PROMPTS[draft.phaseId].map((item, index) => <Chip key={item.heading} label={item.heading} selected={draft.variantIndex === index} onPress={() => setDraft((d) => ({ ...d, variantIndex: index }))} />)}</View><View><Text style={{ fontFamily: font.displaySemibold, fontSize: 20, color: color.bronzeText }}>{prompt.prompt.heading}</Text><Text style={{ marginTop: 7, fontFamily: font.body, lineHeight: 23, color: color.muted }}>{prompt.prompt.lead}</Text></View>{prompt.prompt.fieldLabels.map((label, index) => <Field key={label} label={label} value={draft.lunarAnswers[index]} placeholder={prompt.prompt.placeholders[index]} onChange={(value) => setDraft((d) => { const answers = [...d.lunarAnswers] as [string, string, string]; answers[index] = value; return { ...d, lunarAnswers: answers } })} />)}<MoodTopics draft={draft} setDraft={setDraft} /></View>}
    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.08)', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 11, color: shownState === 'attention' ? '#fda4af' : color.faint }}>{stateLabel}</Text>{mode !== 'check_in' && <Pressable disabled={!meaningful(draft) || shownState === 'saving'} onPress={() => void complete()} style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: meaningful(draft) ? 1 : 0.35 })}><Text style={{ fontFamily: font.displaySemibold, color: color.bronzeText }}>Завърши</Text></Pressable>}</View>
  </View>
}

function Field({ label, value, onChange, placeholder, singleLine = false, tall = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; singleLine?: boolean; tall?: boolean }) { return <View><Text style={labelStyle}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={color.faint} multiline={!singleLine} maxLength={20_000} textAlignVertical="top" style={{ ...inputStyle, minHeight: tall ? 170 : inputStyle.minHeight }} /></View> }
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => ({ borderWidth: 1, borderColor: selected ? 'rgba(251,191,36,0.65)' : 'rgba(148,163,184,0.2)', backgroundColor: selected ? 'rgba(251,191,36,0.08)' : 'transparent', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, ...pressFeedback(pressed) })}><Text style={{ fontSize: 12, color: selected ? color.bronzeText : color.muted }}>{label}</Text></Pressable> }
function ChoiceGroup({ label, items, selected, onSelect }: { label: string; items: readonly { value: string; label: string }[]; selected: string | null; onSelect: (value: string) => void }) { return <View><Text style={labelStyle}>{label}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{items.map((item) => <Chip key={item.value} label={item.label} selected={selected === item.value} onPress={() => onSelect(item.value)} />)}</View></View> }
function TopicGroup({ draft, setDraft }: { draft: Draft; setDraft: Dispatch<SetStateAction<Draft>> }) { return <View><Text style={labelStyle}>Кое повлия най-много на деня ти?</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{DIARY_TOPICS.map((topic) => <Chip key={topic.value} label={topic.label} selected={draft.topics.includes(topic.value)} onPress={() => setDraft((d) => { const topics = d.topics.includes(topic.value) ? d.topics.filter((item) => item !== topic.value) : [...d.topics, topic.value]; return { ...d, topics, focusTopic: d.focusTopic && topics.includes(d.focusTopic) ? d.focusTopic : topics[0] ?? null } })} />)}</View></View> }
function MoodTopics({ draft, setDraft }: { draft: Draft; setDraft: Dispatch<SetStateAction<Draft>> }) { return <View style={{ gap: 18 }}><ChoiceGroup label="Настроение (по желание)" items={DIARY_MOODS.map((item) => ({ value: String(item.value), label: String(item.value) }))} selected={draft.mood ? String(draft.mood) : null} onSelect={(value) => setDraft((d) => ({ ...d, mood: Number(value) }))} /><TopicGroup draft={draft} setDraft={setDraft} /></View> }
function Action({ label, onPress, disabled = false, muted = false }: { label: string; onPress: () => void; disabled?: boolean; muted?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({ ...pressFeedback(pressed), opacity: disabled ? 0.35 : 1 })}><Text style={{ color: muted ? color.faint : color.bronzeText }}>{label}</Text></Pressable> }
