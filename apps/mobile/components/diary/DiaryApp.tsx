import { useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useLocalSearchParams } from 'expo-router'
import { getDiaryDate } from '@stellaeum/core/diary/time'
import { DIARY_TOPICS, getDiaryEntryDisplayTitle, getDiaryOracleSuggestion, type DiaryDirection, type DiaryQuestionHistoryItem } from '@stellaeum/core/diary/flow'
import { diaryWeeklySummarySchema, type CreateDiaryEntryV2Input, type DiaryEntryV2, type DiaryListQuery, type DiaryWeeklySummary, type UpdateDiaryEntryV2Input } from '@stellaeum/core/diary/v2'
import { color, font, pressFeedback, rhythm } from '@/components/design-system/tokens'
import { useDiaryEntriesV2 } from '@/hooks/useDiaryEntriesV2'
import { useApiClient } from '@/lib/api/client'
import { shareDiaryExport } from '@/lib/diary/export'
import { maybePromptPushPermission } from '@/lib/notifications/maybePromptPushPermission'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { DiaryComposer, type MobileComposerMode } from './DiaryComposer'

const MODE_LABEL: Record<MobileComposerMode, string> = { check_in: 'Проверка със себе си', note: 'Пиши свободно', lunar_practice: 'Лунен дневник' }
const SOURCE_TYPES = new Set(['today', 'moon', 'oracle', 'circle', 'crystal'])

export function DiaryApp() {
  const params = useLocalSearchParams<{ mode?: string; source?: string; sourceId?: string; sourceLabel?: string; sourcePath?: string }>()
  const [mode, setMode] = useState<MobileComposerMode | null>(null)
  const [editing, setEditing] = useState<DiaryEntryV2 | null>(null)
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [openedEntry, setOpenedEntry] = useState<DiaryEntryV2 | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [queryText, setQueryText] = useState('')
  const [kind, setKind] = useState<DiaryListQuery['kind']>()
  const [topic, setTopic] = useState<DiaryListQuery['topic']>()
  const [date, setDate] = useState<string | null>(null)
  const filters = useMemo(() => ({ query: queryText || undefined, kind, topic, from: date ?? undefined, to: date ?? undefined, limit: 50 }), [date, kind, queryText, topic])
  const diary = useDiaryEntriesV2(filters)
  const { apiFetch, apiFetchRaw } = useApiClient()
  const { push } = useGuardedNavigation()
  const [summary, setSummary] = useState<DiaryWeeklySummary | null>(null)
  const [reminder, setReminder] = useState({ enabled: false, localTime: '20:00', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Sofia' })
  const [showReminderTime, setShowReminderTime] = useState(false)
  const source = useMemo<CreateDiaryEntryV2Input['source']>(() => {
    if (!params.source || !params.sourceLabel || !SOURCE_TYPES.has(params.source)) return null
    return { type: params.source as 'today' | 'moon' | 'oracle' | 'circle' | 'crystal', id: params.sourceId ?? null, label: params.sourceLabel, path: params.sourcePath?.startsWith('/') ? params.sourcePath : null }
  }, [params.source, params.sourceId, params.sourceLabel, params.sourcePath])

  useEffect(() => {
    const to = getDiaryDate()
    const date = new Date(`${to}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - 6)
    void apiFetch(`/api/diary/v2/summary?from=${date.toISOString().slice(0, 10)}&to=${to}`)
      .then((value) => { const parsed = diaryWeeklySummarySchema.safeParse(value); if (parsed.success) setSummary(parsed.data) })
      .catch(() => {})
    void apiFetch('/api/diary/v2/preferences').then((value) => {
      const data = value as { enabled?: boolean; localTime?: string; timezone?: string }
      setReminder({ enabled: Boolean(data.enabled), localTime: data.localTime ?? '20:00', timezone: data.timezone ?? 'Europe/Sofia' })
    }).catch(() => {})
  }, [apiFetch])

  const saveReminder = async (next: typeof reminder) => {
    try {
      if (next.enabled) await maybePromptPushPermission(apiFetch)
      await apiFetch('/api/diary/v2/preferences', { method: 'PATCH', body: JSON.stringify(next) })
      await apiFetch('/api/push/preferences', { method: 'PATCH', body: JSON.stringify({ category: 'diary', enabled: next.enabled }) })
      setReminder(next)
    }
    catch { Alert.alert('Напомняне', 'Не успяхме да запазим настройката.') }
  }

  const [creationError, setCreationError] = useState<string | null>(null)
  const openComposer = async (selected: MobileComposerMode) => {
    setShowCreateMenu(false)
    setCreationError(null)
    if (selected !== 'check_in') { setMode(selected); return }
    try {
      const today = getDiaryDate()
      const page = await apiFetch(`/api/diary/v2/entries?kind=check_in&from=${today}&to=${today}&limit=1`) as { entries: DiaryEntryV2[] }
      if (page.entries[0]) { setMode(null); setEditing(null); setSelectedEntryId(page.entries[0].id); setOpenedEntry(page.entries[0]) }
      else setMode('check_in')
    } catch { setCreationError('Не успяхме да проверим днешния запис. Опитай отново.') }
  }

  const drafts = diary.entries.filter((entry) => entry.status === 'draft')
  const completed = diary.entries.filter((entry) => entry.status === 'completed')
  const pending = completed.find((entry) => entry.nextStep?.status === 'pending')
  const selectedEntry = diary.entries.find((entry) => entry.id === selectedEntryId) ?? openedEntry ?? null
  const questionHistory = useMemo<DiaryQuestionHistoryItem[]>(() => diary.entries
    .filter((entry) => entry.kind === 'check_in')
    .flatMap((entry) => {
      const content = entry.content as { reflectionQuestionId?: string | null; skippedQuestionIds?: string[]; direction?: DiaryDirection | null; iterations?: { topic: DiaryEntryV2['topics'][number]; direction: Exclude<DiaryDirection, 'finish'>; questionId: string; skippedQuestionIds?: string[] }[] }
      if (content.iterations?.length) return content.iterations.map((iteration, index) => ({ entryId: `${entry.id}:${index}`, questionId: iteration.questionId, skippedQuestionIds: iteration.skippedQuestionIds ?? [], topics: [iteration.topic], direction: iteration.direction, mood: entry.mood }))
      return [{ entryId: entry.id, questionId: content.reflectionQuestionId ?? null, skippedQuestionIds: content.skippedQuestionIds ?? [], topics: entry.topics, direction: content.direction ?? null, mood: entry.mood }]
    }), [diary.entries])

  return <View style={{ gap: rhythm.group }}>
    <View style={{ position: 'relative', alignItems: 'center', gap: 8, paddingHorizontal: 50 }}><Text style={{ fontFamily: font.displayRegular, fontSize: 13, letterSpacing: 1.4, textTransform: 'uppercase', color: color.bronzeText }}>Дневник</Text><Text style={{ fontFamily: font.displaySemibold, fontSize: 31, color: color.text }}>Как си днес?</Text><Text style={{ fontFamily: font.body, color: color.muted, textAlign: 'center' }}>Провери се, пиши свободно или следвай Луната.</Text>{!mode && !editing && <Pressable accessibilityLabel="Нов запис" onPress={() => setShowCreateMenu((shown) => !shown)} style={({ pressed }) => ({ position: 'absolute', right: 0, top: 0, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(184,118,62,0.5)', backgroundColor: 'rgba(184,118,62,0.1)', alignItems: 'center', justifyContent: 'center', ...pressFeedback(pressed) })}><Text style={{ fontSize: 28, fontWeight: '300', lineHeight: 31, color: color.bronzeText }}>+</Text></Pressable>}</View>

    {pending && !mode && !editing && <View style={{ borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', borderRadius: 16, padding: 16 }}><Text style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: '#c4b5fd' }}>Следваща стъпка от дневника</Text><Text style={{ marginTop: 8, fontSize: 12, lineHeight: 19, color: color.muted }}>Това е действието, което записа в проверката си. Можеш да го изпълниш, отложиш или отмениш.</Text><Text style={{ marginTop: 8, fontFamily: font.body, color: color.text }}>{pending.nextStep!.text}</Text><View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}><SmallAction label="Изпълних я" onPress={() => void diary.updateEntry(pending, { nextStep: { ...pending.nextStep!, status: 'done' } })} /><SmallAction label="Отлагам за утре" onPress={() => void diary.updateEntry(pending, { nextStep: { ...pending.nextStep!, status: 'carried', revisitOn: getDiaryDate(new Date(Date.now() + 86_400_000), pending.timezone) } })} /><SmallAction label="Отказвам се от нея" muted onPress={() => void diary.updateEntry(pending, { nextStep: { ...pending.nextStep!, status: 'let_go' } })} /></View></View>}

    {showCreateMenu && !mode && !editing && <View style={{ overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(226,232,240,0.1)', borderRadius: 18, backgroundColor: 'rgba(11,16,32,0.92)' }}>{(Object.keys(MODE_LABEL) as MobileComposerMode[]).map((item) => <Pressable key={item} onPress={() => { void openComposer(item) }} style={({ pressed }) => ({ paddingHorizontal: 18, paddingVertical: 17, borderBottomWidth: item === 'lunar_practice' ? 0 : 1, borderBottomColor: 'rgba(226,232,240,0.07)', flexDirection: 'row', justifyContent: 'space-between', ...pressFeedback(pressed) })}><Text style={{ fontFamily: font.displaySemibold, color: color.text }}>{MODE_LABEL[item]}</Text><Text style={{ color: color.faint }}>›</Text></Pressable>)}</View>}

    {(mode || editing) && <DiaryComposer mode={editing ? (editing.kind === 'check_in' ? 'check_in' : editing.kind === 'note' ? 'note' : 'lunar_practice') : mode!} entry={editing} source={source} saveState={editing ? diary.saveStates[editing.id] : undefined} questionHistory={questionHistory} onCreate={diary.createEntry} onUpdate={diary.updateEntry} onClose={() => { setMode(null); setEditing(null) }} onSaved={() => { setMode(null); setEditing(null); void diary.refresh() }} />}

    {creationError && <Text accessibilityRole="alert" style={{ color: '#fda4af' }}>{creationError}</Text>}
    {drafts.length > 0 && !mode && !editing && <View><Text style={sectionLabel}>Чернови</Text>{drafts.map((draft) => <View key={draft.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.08)' }}><Pressable onPress={() => setEditing(draft)} style={{ flex: 1 }}><Text style={{ color: color.text }}>{draft.title || MODE_LABEL[draft.kind as MobileComposerMode] || 'Чернова'}</Text></Pressable><SmallAction label="Изтрий" onPress={() => Alert.alert('Изтриване на чернова', 'Черновата ще бъде изтрита завинаги.', [{ text: 'Отказ', style: 'cancel' }, { text: 'Изтрий', style: 'destructive', onPress: () => { void diary.deleteEntry(draft) } }])} /></View>)}</View>}

    {summary && summary.entryCount > 0 && <WeeklySummaryCard summary={summary} />}

    <View style={{ gap: 10 }}><TextInput value={queryText} onChangeText={setQueryText} placeholder="Търси" placeholderTextColor={color.faint} style={{ borderWidth: 1, borderColor: 'rgba(226,232,240,0.1)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: color.text }} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}><FilterChip label="Всички" selected={!kind} onPress={() => setKind(undefined)} /><FilterChip label="Проверки" selected={kind === 'check_in'} onPress={() => setKind('check_in')} /><FilterChip label="Свободни" selected={kind === 'note'} onPress={() => setKind('note')} /><FilterChip label="Лунни" selected={kind === 'lunar_practice'} onPress={() => setKind('lunar_practice')} /></View><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{DIARY_TOPICS.map((item) => <FilterChip key={item.value} label={item.label} selected={topic === item.value} onPress={() => setTopic(topic === item.value ? undefined : item.value)} />)}</View></View>

    <DiaryCalendar entries={completed} selectedDate={date} onSelect={setDate} />
    {date && <SmallAction label="Изчисти датата" onPress={() => setDate(null)} />}
    <View><Text style={sectionLabel}>Записи</Text>{diary.isLoading && completed.length === 0 ? <Text style={{ color: color.faint }}>Зареждане…</Text> : completed.map((entry) => <DiaryRow key={entry.id} entry={entry} onPress={() => { setOpenedEntry(null); setSelectedEntryId(entry.id) }} />)}{diary.hasNextPage && <SmallAction label="Още записи" onPress={() => void diary.fetchNextPage()} />}</View>

    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.08)', paddingTop: 18, gap: 14 }}><Pressable onPress={() => void saveReminder({ ...reminder, enabled: !reminder.enabled })} style={({ pressed }) => ({ flexDirection: 'row', justifyContent: 'space-between', ...pressFeedback(pressed) })}><Text style={{ color: color.muted }}>Вечерно напомняне</Text><Text style={{ color: reminder.enabled ? color.bronzeText : color.faint }}>{reminder.enabled ? 'Вкл.' : 'Изкл.'}</Text></Pressable>{reminder.enabled && <><SmallAction label={`Час · ${reminder.localTime}`} onPress={() => setShowReminderTime(true)} />{showReminderTime && <DateTimePicker mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} value={new Date(`2020-01-01T${reminder.localTime}:00`)} onChange={(_, date) => { if (Platform.OS !== 'ios') setShowReminderTime(false); if (date) { const localTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; void saveReminder({ ...reminder, localTime }) } }} />}</>}<View style={{ flexDirection: 'row', gap: 20 }}><SmallAction label="Markdown" onPress={() => void shareDiaryExport(apiFetchRaw, 'markdown').catch(() => Alert.alert('Експорт', 'Не успяхме да подготвим файла.'))} /><SmallAction label="JSON" onPress={() => void shareDiaryExport(apiFetchRaw, 'json').catch(() => Alert.alert('Експорт', 'Не успяхме да подготвим файла.'))} /></View></View>

    <DiaryEntryModal
      entry={selectedEntry}
      onClose={() => { setSelectedEntryId(null); setOpenedEntry(null) }}
      onDelete={() => {
        if (!selectedEntry) return
        Alert.alert('Изтриване', 'Записът ще бъде изтрит завинаги.', [
          { text: 'Отказ', style: 'cancel' },
          { text: 'Изтрий', style: 'destructive', onPress: () => { void diary.deleteEntry(selectedEntry).then((ok) => { if (ok) { setSelectedEntryId(null); setOpenedEntry(null) } }) } },
        ])
      }}
      onStep={(status) => { if (selectedEntry?.nextStep) void diary.updateEntry(selectedEntry, { nextStep: { ...selectedEntry.nextStep, status } }) }}
      onNavigate={(path) => { setSelectedEntryId(null); setOpenedEntry(null); push(path as never) }}
      onCreate={diary.createEntry}
      onUpdate={diary.updateEntry}
      questionHistory={questionHistory}
      onRefresh={diary.refresh}
    />

    <Modal visible={Boolean(diary.conflict)} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)', padding: 20 }}>
        <View style={{ borderRadius: 18, backgroundColor: '#0b1020', padding: 20, gap: 15 }}>
          <Text style={{ fontFamily: font.displaySemibold, fontSize: 19, color: color.text }}>Записът е променен другаде</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: color.faint }}>Твоят вариант</Text><Text numberOfLines={6} style={{ marginTop: 5, fontSize: 12, color: color.muted }}>{diary.conflict ? JSON.stringify(diary.conflict.local.content, null, 2) : ''}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: color.faint }}>Запазеният вариант</Text><Text numberOfLines={6} style={{ marginTop: 5, fontSize: 12, color: color.muted }}>{diary.conflict?.current ? JSON.stringify(diary.conflict.current.content, null, 2) : 'Изтрит'}</Text></View>
          </View>
          <SmallAction label="Зареди запазения вариант" onPress={diary.resolveWithServer} />
          <SmallAction label="Запази моя като нов" onPress={() => void diary.saveConflictAsNew()} />
          {diary.conflict?.current && <SmallAction label="Сравни и реши ръчно" muted onPress={() => { if (diary.conflict?.current) setEditing({ ...diary.conflict.local, revision: diary.conflict.current.revision }); diary.dismissConflict() }} />}
        </View>
      </View>
    </Modal>
  </View>
}

const sectionLabel = { marginBottom: 10, fontFamily: font.displayRegular, fontSize: 12, letterSpacing: 1.3, textTransform: 'uppercase', color: color.bronzeText } as const

function WeeklySummaryCard({ summary }: { summary: DiaryWeeklySummary }) {
  const moodEntries = Object.entries(summary.moods)
  const moodCount = moodEntries.reduce((total, [, count]) => total + count, 0)
  const moodAverage = moodCount ? moodEntries.reduce((total, [mood, count]) => total + Number(mood) * count, 0) / moodCount : null
  const topics = Object.entries(summary.topics).sort((left, right) => right[1] - left[1]).slice(0, 3)
  const steps = Object.values(summary.steps).reduce((total, count) => total + count, 0)
  return <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 26, padding: 20, gap: 20 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={{ fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: color.faint }}>Седмичен преглед</Text><Text style={{ marginTop: 6, fontFamily: font.displaySemibold, fontSize: 20, color: color.text }}>Последните 7 дни</Text></View><View style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 11, paddingVertical: 6 }}><Text style={{ fontSize: 11, color: color.muted }}>{summary.entryCount} {summary.entryCount === 1 ? 'запис' : 'записа'}</Text></View></View><View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Text style={{ fontFamily: font.displaySemibold, fontSize: 28, color: color.text }}>{moodAverage ? moodAverage.toFixed(1) : '—'}</Text><Text style={{ marginTop: 3, fontSize: 11, color: color.faint }}>Настроение{moodAverage ? ' от 5' : ''}</Text></View><View style={{ flex: 1 }}><Text style={{ fontFamily: font.displaySemibold, fontSize: 28, color: color.text }}>{steps}</Text><Text style={{ marginTop: 3, fontSize: 11, color: color.faint }}>Лични стъпки</Text></View></View><View><Text style={{ fontSize: 11, color: color.faint }}>Водещи теми</Text><View style={{ marginTop: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{topics.length ? topics.map(([topic, count]) => <View key={topic} style={{ borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.055)', paddingHorizontal: 10, paddingVertical: 6 }}><Text style={{ fontSize: 11, color: color.muted }}>{DIARY_TOPICS.find((item) => item.value === topic)?.label ?? topic} · {count}</Text></View>) : <Text style={{ color: color.faint }}>—</Text>}</View></View></View>
}

function SmallAction({ label, onPress, muted = false }: { label: string; onPress: () => void; muted?: boolean }) { return <Pressable onPress={onPress} style={({ pressed }) => pressFeedback(pressed)}><Text style={{ fontSize: 13, color: muted ? color.faint : color.bronzeText }}>{label}</Text></Pressable> }
function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => ({ borderWidth: 1, borderColor: selected ? 'rgba(184,118,62,0.6)' : 'rgba(148,163,184,0.18)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, ...pressFeedback(pressed) })}><Text style={{ fontSize: 11, color: selected ? color.bronzeText : color.faint }}>{label}</Text></Pressable> }

function DiaryRow({ entry, onPress }: { entry: DiaryEntryV2; onPress: () => void }) {
  return <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(226,232,240,0.08)', paddingVertical: 14 }}>
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...pressFeedback(pressed) })}>
      <Text style={{ flex: 1, fontFamily: font.displaySemibold, color: color.text }}>{getDiaryEntryDisplayTitle(entry)}</Text>
      <Text style={{ marginLeft: 16, color: color.faint }}>›</Text>
    </Pressable>
  </View>
}

function diaryEntrySections(entry: DiaryEntryV2): { label?: string; text: string }[] {
  if (entry.kind === 'note') return [{ text: (entry.content as { body?: string }).body ?? '' }]
  if (entry.kind === 'check_in') {
    const content = entry.content as { iterations?: { question: string; answer: string }[]; reflectionQuestion?: string | null; reflectionAnswer?: string; detailQuestion?: string | null; detailAnswer?: string }
    if (content.iterations?.length) return content.iterations.map((iteration) => ({ label: iteration.question, text: iteration.answer }))
    return [{ label: content.reflectionQuestion ?? undefined, text: content.reflectionAnswer ?? '' }, { label: content.detailQuestion ?? undefined, text: content.detailAnswer ?? '' }]
  }
  const content = entry.content as { fieldLabels?: string[]; answers?: string[]; intentions?: string[] }
  const answers = content.answers ?? content.intentions ?? []
  return answers.map((text, index) => ({ label: content.fieldLabels?.[index], text }))
}

function DiaryEntryModal({ entry, onClose, onDelete, onStep, onNavigate, onCreate, onUpdate, questionHistory, onRefresh }: {
  entry: DiaryEntryV2 | null
  onClose: () => void
  onDelete: () => void
  onStep: (status: 'done' | 'carried' | 'let_go') => void
  onNavigate: (path: string) => void
  onCreate: (input: CreateDiaryEntryV2Input) => Promise<DiaryEntryV2>
  onUpdate: (entry: DiaryEntryV2, patch: Omit<UpdateDiaryEntryV2Input, 'revision'>) => Promise<DiaryEntryV2>
  questionHistory: readonly DiaryQuestionHistoryItem[]
  onRefresh: () => Promise<unknown>
}) {
  const [isEditing, setIsEditing] = useState(false)
  useEffect(() => { setIsEditing(false) }, [entry?.id])
  if (!entry) return null
  const oracleSuggestion = getDiaryOracleSuggestion(entry)
  const close = () => { setIsEditing(false); onClose() }
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,6,23,0.78)' }}>
      <Pressable onPress={close} style={{ flex: 1 }} accessibilityLabel="Затвори записа" />
      <View style={{ maxHeight: '92%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: 'rgba(226,232,240,0.1)', backgroundColor: '#0b1020', paddingHorizontal: isEditing ? 10 : 22, paddingTop: isEditing ? 10 : 20, paddingBottom: isEditing ? 10 : 28 }}>
        {isEditing ? <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><DiaryComposer mode={entry.kind === 'check_in' ? 'check_in' : entry.kind === 'note' ? 'note' : 'lunar_practice'} entry={entry} questionHistory={questionHistory} onCreate={onCreate} onUpdate={onUpdate} onClose={() => setIsEditing(false)} onSaved={() => { setIsEditing(false); void onRefresh() }} /></ScrollView> : <>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <View style={{ flex: 1 }}><Text style={{ fontSize: 11, color: color.faint }}>{entry.entryDate}{entry.mood ? ` · ${entry.mood}/5` : ''}</Text><Text style={{ marginTop: 9, fontFamily: font.displaySemibold, fontSize: 27, lineHeight: 34, color: color.text }}>{getDiaryEntryDisplayTitle(entry)}</Text></View>
          <SmallAction label="Затвори" muted onPress={onClose} />
        </View>
        <ScrollView style={{ marginTop: 24 }} contentContainerStyle={{ paddingBottom: 12, gap: 18 }} showsVerticalScrollIndicator={false}>
          {diaryEntrySections(entry).filter((section) => section.text).map((section, index) => <View key={index} style={{ gap: 7 }}>{section.label && <Text style={{ fontSize: 12, color: color.bronzeText }}>{section.label}</Text>}<Text style={{ fontFamily: font.body, fontSize: 17, lineHeight: 28, color: color.text }}>{section.text}</Text></View>)}
          {entry.topics.length > 0 && <Text style={{ fontSize: 11, color: color.faint }}>{entry.topics.map((topic) => DIARY_TOPICS.find((item) => item.value === topic)?.label ?? topic).join(' · ')}</Text>}
          {entry.nextStep?.status === 'pending' && <View style={{ gap: 10, borderWidth: 1, borderColor: 'rgba(167,139,250,0.18)', borderRadius: 16, padding: 15 }}><Text style={{ color: color.text }}>{entry.nextStep.text}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}><SmallAction label="Изпълних я" onPress={() => onStep('done')} /><SmallAction label="Отлагам за утре" onPress={() => onStep('carried')} /><SmallAction label="Отказвам се от нея" muted onPress={() => onStep('let_go')} /></View></View>}
          {entry.source?.path && <SmallAction label={`Към ${entry.source.label}`} onPress={() => onNavigate(entry.source!.path!)} />}
          <View style={{ borderWidth: 1, borderColor: 'rgba(251,191,36,0.16)', backgroundColor: 'rgba(251,191,36,0.035)', borderRadius: 18, padding: 16, gap: 8 }}><Text style={{ fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: color.bronzeText }}>{oracleSuggestion.eyebrow}</Text><Text style={{ fontFamily: font.displaySemibold, fontSize: 18, lineHeight: 24, color: color.text }}>{oracleSuggestion.title}</Text><Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 22, color: color.muted }}>{oracleSuggestion.description}</Text><View style={{ marginTop: 5 }}><SmallAction label={`${oracleSuggestion.action} →`} onPress={() => onNavigate(`/oracle?topic=${oracleSuggestion.topic}`)} /></View></View>
          {(entry.topics.includes('relationships') || entry.source?.type === 'crystal') && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>{entry.topics.includes('relationships') && <SmallAction label="Отвори Кръг" onPress={() => onNavigate('/circle')} />}{entry.source?.type === 'crystal' && <SmallAction label="Виж кристалите" onPress={() => onNavigate('/you/crystals')} />}</View>}
        </ScrollView>
        <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.08)', paddingTop: 17, flexDirection: 'row', gap: 20 }}><SmallAction label="Редактирай" onPress={() => setIsEditing(true)} /><SmallAction label="Изтрий" muted onPress={onDelete} /></View>
        </>}
      </View>
    </View>
  </Modal>
}

function DiaryCalendar({ entries, selectedDate, onSelect }: { entries: DiaryEntryV2[]; selectedDate: string | null; onSelect: (date: string) => void }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const monthDate = new Date(); monthDate.setDate(1); monthDate.setMonth(monthDate.getMonth() + monthOffset)
  const year = monthDate.getFullYear(); const month = monthDate.getMonth(); const days = new Date(year, month + 1, 0).getDate(); const prefix = (new Date(year, month, 1).getDay() + 6) % 7
  const counts = new Map<string, number>(); entries.forEach((entry) => counts.set(entry.entryDate, (counts.get(entry.entryDate) ?? 0) + 1))
  return <View style={{ borderWidth: 1, borderColor: 'rgba(226,232,240,0.08)', borderRadius: 16, padding: 13 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><SmallAction label="‹" onPress={() => setMonthOffset((value) => value - 1)} /><Text style={{ ...sectionLabel, marginBottom: 0, textAlign: 'center' }}>{new Intl.DateTimeFormat('bg-BG', { month: 'long', year: 'numeric' }).format(monthDate)}</Text><SmallAction label="›" onPress={() => setMonthOffset((value) => value + 1)} /></View><View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap' }}>{Array.from({ length: prefix }).map((_, index) => <View key={`e-${index}`} style={{ width: '14.28%', height: 32 }} />)}{Array.from({ length: days }).map((_, index) => { const day = index + 1; const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; return <Pressable key={date} onPress={() => onSelect(date)} style={{ width: '14.28%', height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: selectedDate === date ? 'rgba(184,118,62,0.18)' : 'transparent' }}><Text style={{ fontSize: 11, color: counts.has(date) ? color.bronzeText : color.faint }}>{day}{counts.has(date) ? ' •' : ''}</Text></Pressable> })}</View></View>
}
