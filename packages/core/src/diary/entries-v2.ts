import { createCoreSupabaseClient } from '../lib/supabase'
import type {
  CreateDiaryEntryV2Input,
  DiaryEntryPage,
  DiaryEntryV2,
  DiaryListQuery,
  DiaryReminderPreferenceInput,
  DiaryWeeklySummary,
  UpdateDiaryEntryV2Input,
} from './v2'
import { createDiaryEntryV2Schema, legacyLunarContentSchema } from './v2'

type DiaryRow = {
  id: string
  user_id: string
  kind: DiaryEntryV2['kind']
  status: DiaryEntryV2['status']
  occurred_at: string
  entry_date: string
  timezone: string
  title: string | null
  mood: number | null
  topics: DiaryEntryV2['topics'] | null
  content: DiaryEntryV2['content'] | null
  phase_id: string | null
  phase_name: string | null
  prompt_id: string | null
  prompt_version: number | null
  source: DiaryEntryV2['source'] | null
  related_entry_id: string | null
  next_step: DiaryEntryV2['nextStep'] | null
  intentions: string[] | null
  revision: number
  completed_at: string | null
  created_at: string
  updated_at: string
}

type Cursor = { occurredAt: string; id: string }

export type DiaryWriteResult =
  | { ok: true; entry: DiaryEntryV2; created?: boolean }
  | { ok: false; error: 'NOT_FOUND' }
  | { ok: false; error: 'CONFLICT'; current: DiaryEntryV2 }
  | { ok: false; error: 'INVALID_RELATED_ENTRY' }
  | { ok: false; error: 'INVALID_CONTENT' }
  | { ok: false; error: 'WRITE_FAILED'; message: string }

export type DiaryDeleteResult =
  | { ok: true }
  | { ok: false; error: 'NOT_FOUND' }
  | { ok: false; error: 'CONFLICT'; current: DiaryEntryV2 }
  | { ok: false; error: 'DELETE_FAILED'; message: string }

function rowToEntry(row: DiaryRow): DiaryEntryV2 {
  const legacyContent = row.kind === 'legacy_lunar'
    ? { version: 1, intentions: row.intentions ?? [] }
    : {}
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    occurredAt: row.occurred_at,
    entryDate: row.entry_date,
    timezone: row.timezone,
    title: row.title,
    mood: row.mood,
    topics: row.topics ?? [],
    content: row.content && Object.keys(row.content).length > 0 ? row.content : legacyContent,
    phaseId: row.phase_id,
    phaseName: row.phase_name,
    promptId: row.prompt_id,
    promptVersion: row.prompt_version,
    source: row.source,
    relatedEntryId: row.related_entry_id,
    nextStep: row.next_step,
    revision: row.revision,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeCursor(cursor: string | undefined): Cursor | null {
  if (!cursor) return null
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as Cursor
    if (!value.occurredAt || !value.id) return null
    return value
  } catch {
    return null
  }
}

function collectText(value: unknown, output: string[]): void {
  if (typeof value === 'string') output.push(value)
  else if (Array.isArray(value)) value.forEach((item) => collectText(item, output))
  else if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectText(item, output))
  }
}

function buildSearchText(input: {
  title?: string | null
  content?: unknown
  phaseName?: string | null
  nextStep?: unknown
}): string {
  const values: string[] = []
  collectText(input.title, values)
  collectText(input.content, values)
  collectText(input.phaseName, values)
  collectText(input.nextStep, values)
  return values.join(' ').slice(0, 60_000)
}

async function ownsRelatedEntry(userId: string, relatedEntryId: string | null | undefined) {
  if (!relatedEntryId) return true
  const supabase = createCoreSupabaseClient()
  const { data } = await supabase
    .from('diary_entries')
    .select('id')
    .eq('id', relatedEntryId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

function createRow(userId: string, input: CreateDiaryEntryV2Input) {
  const now = new Date().toISOString()
  return {
    id: input.id,
    user_id: userId,
    kind: input.kind,
    status: input.status,
    occurred_at: input.occurredAt,
    entry_date: input.entryDate,
    timezone: input.timezone,
    title: input.title,
    mood: input.mood,
    topics: input.topics,
    content: input.content,
    phase_id: input.phaseId,
    phase_name: input.phaseName,
    prompt_id: input.promptId,
    prompt_version: input.promptVersion,
    source: input.source,
    related_entry_id: input.relatedEntryId,
    next_step: input.nextStep,
    search_text: buildSearchText(input),
    completed_at: input.status === 'completed' ? now : null,
    revision: 1,
  }
}

export async function createDiaryEntryV2(
  userId: string,
  input: CreateDiaryEntryV2Input,
): Promise<DiaryWriteResult> {
  if (!(await ownsRelatedEntry(userId, input.relatedEntryId))) {
    return { ok: false, error: 'INVALID_RELATED_ENTRY' }
  }
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('diary_entries')
    .insert(createRow(userId, input))
    .select('*')
    .single()

  if (!error && data) return { ok: true, entry: rowToEntry(data as DiaryRow), created: true }

  if ((error as { code?: string } | null)?.code === '23505') {
    const { data: existing } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('id', input.id)
      .eq('user_id', userId)
      .maybeSingle()
    if (existing) return { ok: true, entry: rowToEntry(existing as DiaryRow), created: false }
  }
  console.error('[core/diary/v2] create failed:', error)
  return { ok: false, error: 'WRITE_FAILED', message: error?.message ?? 'unknown' }
}

export async function getDiaryEntryV2(userId: string, id: string): Promise<DiaryEntryV2 | null> {
  const supabase = createCoreSupabaseClient()
  const { data } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  return data ? rowToEntry(data as DiaryRow) : null
}

export async function updateDiaryEntryV2(
  userId: string,
  id: string,
  input: UpdateDiaryEntryV2Input,
): Promise<DiaryWriteResult> {
  if (!(await ownsRelatedEntry(userId, input.relatedEntryId))) {
    return { ok: false, error: 'INVALID_RELATED_ENTRY' }
  }
  const current = await getDiaryEntryV2(userId, id)
  if (!current) return { ok: false, error: 'NOT_FOUND' }
  if (current.revision !== input.revision) return { ok: false, error: 'CONFLICT', current }

  const merged = {
    ...current,
    ...input,
    revision: current.revision + 1,
    completedAt:
      input.status === 'draft'
        ? null
        : input.status === 'completed' && !current.completedAt
        ? new Date().toISOString()
        : current.completedAt,
  }
  const validMerged = current.kind === 'legacy_lunar'
    ? (!input.content || legacyLunarContentSchema.safeParse(input.content).success)
    : createDiaryEntryV2Schema.safeParse({
        id: current.id,
        kind: current.kind,
        status: merged.status,
        occurredAt: current.occurredAt,
        entryDate: current.entryDate,
        timezone: current.timezone,
        title: merged.title,
        mood: merged.mood,
        topics: merged.topics,
        content: merged.content,
        phaseId: merged.phaseId,
        phaseName: merged.phaseName,
        promptId: merged.promptId,
        promptVersion: merged.promptVersion,
        source: merged.source,
        relatedEntryId: merged.relatedEntryId,
        nextStep: merged.nextStep,
      }).success
  if (!validMerged) return { ok: false, error: 'INVALID_CONTENT' }
  const patch: Record<string, unknown> = {
    status: merged.status,
    title: merged.title,
    mood: merged.mood,
    topics: merged.topics,
    content: merged.content,
    phase_id: merged.phaseId,
    phase_name: merged.phaseName,
    prompt_id: merged.promptId,
    prompt_version: merged.promptVersion,
    source: merged.source,
    related_entry_id: merged.relatedEntryId,
    next_step: merged.nextStep,
    completed_at: merged.completedAt,
    search_text: buildSearchText(merged),
    revision: merged.revision,
  }
  if (current.kind === 'legacy_lunar' && input.content) {
    const intentions = (input.content as { intentions?: string[] }).intentions
    if (intentions?.length === 3) patch.intentions = intentions
  }
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('diary_entries')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('revision', input.revision)
    .select('*')
    .maybeSingle()

  if (data) return { ok: true, entry: rowToEntry(data as DiaryRow) }
  if (error) {
    console.error('[core/diary/v2] update failed:', error)
    return { ok: false, error: 'WRITE_FAILED', message: error.message }
  }
  const latest = await getDiaryEntryV2(userId, id)
  return latest
    ? { ok: false, error: 'CONFLICT', current: latest }
    : { ok: false, error: 'NOT_FOUND' }
}

export async function deleteDiaryEntryV2(
  userId: string,
  id: string,
  revision: number,
): Promise<DiaryDeleteResult> {
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .eq('revision', revision)
    .select('id')
    .maybeSingle()
  if (data) return { ok: true }
  if (error) {
    console.error('[core/diary/v2] delete failed:', error)
    return { ok: false, error: 'DELETE_FAILED', message: error.message }
  }
  const latest = await getDiaryEntryV2(userId, id)
  return latest
    ? { ok: false, error: 'CONFLICT', current: latest }
    : { ok: false, error: 'NOT_FOUND' }
}

export async function listDiaryEntriesV2(
  userId: string,
  options: DiaryListQuery,
): Promise<DiaryEntryPage> {
  const cursor = decodeCursor(options.cursor)
  const supabase = createCoreSupabaseClient()
  let query = supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(options.limit + 1)

  if (options.kind) query = query.eq('kind', options.kind)
  if (options.status) query = query.eq('status', options.status)
  if (options.mood) query = query.eq('mood', options.mood)
  if (options.topic) query = query.contains('topics', [options.topic])
  if (options.from) query = query.gte('entry_date', options.from)
  if (options.to) query = query.lte('entry_date', options.to)
  if (options.query) query = query.ilike('search_text', `%${options.query.replace(/[\\%_]/g, '\\$&')}%`)
  if (cursor) {
    query = query.or(
      `occurred_at.lt.${cursor.occurredAt},and(occurred_at.eq.${cursor.occurredAt},id.lt.${cursor.id})`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as DiaryRow[]
  const hasMore = rows.length > options.limit
  const visible = hasMore ? rows.slice(0, options.limit) : rows
  const last = visible.at(-1)
  return {
    entries: visible.map(rowToEntry),
    nextCursor: hasMore && last
      ? encodeCursor({ occurredAt: last.occurred_at, id: last.id })
      : null,
  }
}

export async function summarizeDiaryWeek(
  userId: string,
  from: string,
  to: string,
): Promise<DiaryWeeklySummary> {
  const supabase = createCoreSupabaseClient()
  const rows: { mood: number | null; topics: string[] | null; prompt_id: string | null; next_step: unknown }[] = []
  const pageSize = 1_000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('mood,topics,prompt_id,next_step')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('entry_date', from)
      .lte('entry_date', to)
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < pageSize) break
  }
  const summary: DiaryWeeklySummary = {
    from,
    to,
    entryCount: rows.length,
    moods: {},
    topics: {},
    practices: {},
    steps: {},
  }
  for (const row of rows) {
    if (row.mood) summary.moods[String(row.mood)] = (summary.moods[String(row.mood)] ?? 0) + 1
    for (const topic of (row.topics as string[] | null) ?? []) {
      summary.topics[topic] = (summary.topics[topic] ?? 0) + 1
    }
    if (row.prompt_id) summary.practices[row.prompt_id] = (summary.practices[row.prompt_id] ?? 0) + 1
    const step = row.next_step as { status?: string } | null
    if (step?.status) summary.steps[step.status] = (summary.steps[step.status] ?? 0) + 1
  }
  return summary
}

export async function listAllDiaryEntriesV2(
  userId: string,
  supabase = createCoreSupabaseClient(),
): Promise<DiaryEntryV2[]> {
  const result: DiaryEntryV2[] = []
  const pageSize = 1_000
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    const rows = (data ?? []) as DiaryRow[]
    result.push(...rows.map(rowToEntry))
    if (rows.length < pageSize) break
  }
  return result
}

export async function getDiaryReminderPreference(userId: string) {
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('diary_reminder_preferences')
    .select('enabled,local_time,timezone,next_due_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ?? { enabled: false, local_time: '20:00:00', timezone: 'Europe/Sofia', next_due_at: null }
}

export async function setDiaryReminderPreference(
  userId: string,
  input: DiaryReminderPreferenceInput,
  nextDueAt: string | null,
) {
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('diary_reminder_preferences')
    .upsert({
      user_id: userId,
      enabled: input.enabled,
      local_time: input.localTime,
      timezone: input.timezone,
      next_due_at: nextDueAt,
    }, { onConflict: 'user_id' })
    .select('enabled,local_time,timezone,next_due_at')
    .single()
  if (error) throw error
  return data
}
