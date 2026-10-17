'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  diaryEntryPageSchema,
  diaryEntryV2Schema,
  DIARY_PAGE_SIZE,
  type CreateDiaryEntryV2Input,
  type DiaryEntryV2,
  type DiaryListQuery,
  type UpdateDiaryEntryV2Input,
} from '@stellaeum/core/diary/v2'

export type DiarySaveState = 'idle' | 'saving' | 'saved' | 'saved-device' | 'attention'

type PendingMutation =
  | { key: string; operation: 'create'; entryId: string; payload: CreateDiaryEntryV2Input; queuedAt: string }
  | { key: string; operation: 'update'; entryId: string; payload: UpdateDiaryEntryV2Input; queuedAt: string }
  | { key: string; operation: 'delete'; entryId: string; revision: number; queuedAt: string }

export interface DiaryConflict {
  operation: 'update' | 'delete'
  local: DiaryEntryV2
  current: DiaryEntryV2 | null
}

class HttpError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`Diary request failed: ${status}`)
  }
}

function localEntry(input: CreateDiaryEntryV2Input): DiaryEntryV2 {
  const now = new Date().toISOString()
  return {
    ...input,
    content: input.content,
    revision: 1,
    completedAt: input.status === 'completed' ? now : null,
    createdAt: now,
    updatedAt: now,
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { ...init.headers, 'Content-Type': 'application/json' } : init?.headers,
  })
  if (!response.ok) {
    let body: unknown = null
    try { body = await response.json() } catch { /* empty body */ }
    throw new HttpError(response.status, body)
  }
  if (response.status === 204) return null
  return response.json()
}

function mergeById(entries: DiaryEntryV2[], entry: DiaryEntryV2) {
  const found = entries.some((item) => item.id === entry.id)
  const next = found ? entries.map((item) => item.id === entry.id ? entry : item) : [entry, ...entries]
  return next.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id)).slice(0, DIARY_PAGE_SIZE)
}

export function useDiaryEntries(filters: Partial<DiaryListQuery> = {}) {
  const { user } = useUser()
  const userId = user?.id ?? null
  const queueKey = userId ? `stellaeum.diary.pending.v2.${userId}` : null
  const [entries, setEntries] = useState<DiaryEntryV2[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStates, setSaveStates] = useState<Record<string, DiarySaveState>>({})
  const [conflict, setConflict] = useState<DiaryConflict | null>(null)
  const flushing = useRef(false)
  const loadVersion = useRef(0)
  const [pagination, setPagination] = useState({ scope: '', cursors: [null] as (string | null)[], index: 0 })

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
    }
    return params.toString()
  }, [filters])

  const scope = `${userId}:${queryString}`
  const pageIndex = pagination.scope === scope ? pagination.index : 0
  const pageCursors = pagination.scope === scope ? pagination.cursors : [null]
  const cursor = pageCursors[pageIndex] ?? null
  useEffect(() => {
    setPagination({ scope, cursors: [null], index: 0 })
  }, [scope])

  const readQueue = useCallback((): PendingMutation[] => {
    if (!queueKey) return []
    try { return JSON.parse(localStorage.getItem(queueKey) ?? '[]') as PendingMutation[] } catch { return [] }
  }, [queueKey])

  const writeQueue = useCallback((queue: PendingMutation[]) => {
    if (!queueKey) return
    if (queue.length) localStorage.setItem(queueKey, JSON.stringify(queue))
    else localStorage.removeItem(queueKey)
  }, [queueKey])

  const enqueue = useCallback((mutation: PendingMutation) => {
    const queue = readQueue()
    const createIndex = queue.findIndex((item) => item.entryId === mutation.entryId && item.operation === 'create')
    if (createIndex >= 0 && mutation.operation === 'update') {
      const create = queue[createIndex] as Extract<PendingMutation, { operation: 'create' }>
      queue[createIndex] = {
        ...create,
        payload: { ...create.payload, ...mutation.payload } as CreateDiaryEntryV2Input,
        queuedAt: mutation.queuedAt,
      }
    } else if (mutation.operation === 'delete' && createIndex >= 0) {
      queue.splice(createIndex, 1)
    } else {
      const previous = queue.findIndex((item) => item.entryId === mutation.entryId && item.operation === mutation.operation)
      if (previous >= 0) queue[previous] = mutation
      else queue.push(mutation)
    }
    writeQueue(queue)
  }, [readQueue, writeQueue])

  const load = useCallback(async () => {
    if (!userId) return
    const version = ++loadVersion.current
    setIsLoading(true)
    setEntries([])
    setNextCursor(null)
    try {
      const params = new URLSearchParams(queryString)
      params.set('limit', String(DIARY_PAGE_SIZE))
      if (cursor) params.set('cursor', cursor)
      const page = diaryEntryPageSchema.parse(await request(`/api/diary/v2/entries?${params}`))
      if (version !== loadVersion.current) return
      setEntries(page.entries)
      setNextCursor(page.nextCursor)
      setError(null)
    } catch {
      if (version !== loadVersion.current) return
      setError('Не успяхме да заредим дневника.')
    } finally {
      if (version === loadVersion.current) setIsLoading(false)
    }
  }, [cursor, queryString, userId])

  const flushQueue = useCallback(async () => {
    if (!queueKey || flushing.current || !navigator.onLine) return
    flushing.current = true
    const queue = readQueue()
    const remaining: PendingMutation[] = []
    for (let index = 0; index < queue.length; index += 1) {
      const mutation = queue[index]!
      try {
        let saved: DiaryEntryV2 | null = null
        if (mutation.operation === 'create') {
          saved = diaryEntryV2Schema.parse(await request('/api/diary/v2/entries', {
            method: 'POST', body: JSON.stringify(mutation.payload),
          }))
        } else if (mutation.operation === 'update') {
          saved = diaryEntryV2Schema.parse(await request(`/api/diary/v2/entries/${mutation.entryId}`, {
            method: 'PATCH', body: JSON.stringify(mutation.payload),
          }))
        } else {
          await request(`/api/diary/v2/entries/${mutation.entryId}?revision=${mutation.revision}`, { method: 'DELETE' })
          setEntries((current) => current.filter((entry) => entry.id !== mutation.entryId))
        }
        if (saved) setEntries((current) => mergeById(current, saved!))
        setSaveStates((states) => ({ ...states, [mutation.entryId]: 'saved' }))
      } catch (cause) {
        if (cause instanceof HttpError && cause.status === 409) {
          const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
          const local = entries.find((entry) => entry.id === mutation.entryId)
          if (local) setConflict({ operation: mutation.operation === 'delete' ? 'delete' : 'update', local, current: current.success ? current.data : null })
          setSaveStates((states) => ({ ...states, [mutation.entryId]: 'attention' }))
        } else {
          remaining.push(mutation, ...queue.slice(index + 1))
        }
        break
      }
    }
    writeQueue(remaining)
    flushing.current = false
  }, [entries, queueKey, readQueue, writeQueue])

  useEffect(() => {
    if (!userId) return
    let active = true
    void flushQueue().finally(() => { if (active) void load() })
    const online = () => void flushQueue().then(() => { if (active) void load() })
    window.addEventListener('online', online)
    return () => { active = false; ++loadVersion.current; window.removeEventListener('online', online) }
    // Reload when the account or filters change; mutation callbacks handle their own cache updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, queryString, cursor])

  const createEntry = useCallback(async (input: CreateDiaryEntryV2Input) => {
    const local = localEntry(input)
    setSaveStates((states) => ({ ...states, [input.id]: 'saving' }))
    try {
      const saved = diaryEntryV2Schema.parse(await request('/api/diary/v2/entries', {
        method: 'POST', body: JSON.stringify(input),
      }))
      setEntries((current) => mergeById(current, saved))
      setSaveStates((states) => ({ ...states, [input.id]: 'saved' }))
      return saved
    } catch (cause) {
      if (!(cause instanceof HttpError)) {
        enqueue({ key: crypto.randomUUID(), operation: 'create', entryId: input.id, payload: input, queuedAt: new Date().toISOString() })
        setEntries((current) => mergeById(current, local))
        setSaveStates((states) => ({ ...states, [input.id]: 'saved-device' }))
        return local
      }
      if (cause instanceof HttpError && cause.status === 409) {
        const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
        setConflict({ operation: 'update', local, current: current.success ? current.data : null })
      }
      setSaveStates((states) => ({ ...states, [input.id]: 'attention' }))
      throw cause
    }
  }, [enqueue])

  const updateEntry = useCallback(async (local: DiaryEntryV2, patch: Omit<UpdateDiaryEntryV2Input, 'revision'>) => {
    const payload = { ...patch, revision: local.revision }
    setSaveStates((states) => ({ ...states, [local.id]: 'saving' }))
    try {
      const saved = diaryEntryV2Schema.parse(await request(`/api/diary/v2/entries/${local.id}`, {
        method: 'PATCH', body: JSON.stringify(payload),
      }))
      setEntries((current) => mergeById(current, saved))
      setSaveStates((states) => ({ ...states, [local.id]: 'saved' }))
      return saved
    } catch (cause) {
      const pendingLocal = { ...local, ...patch, updatedAt: new Date().toISOString() }
      if (cause instanceof HttpError && cause.status === 409) {
        const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
        setConflict({ operation: 'update', local: pendingLocal, current: current.success ? current.data : null })
      } else if (!(cause instanceof HttpError)) {
        enqueue({ key: crypto.randomUUID(), operation: 'update', entryId: local.id, payload, queuedAt: new Date().toISOString() })
        setEntries((current) => mergeById(current, pendingLocal))
        setSaveStates((states) => ({ ...states, [local.id]: 'saved-device' }))
        return pendingLocal
      }
      setSaveStates((states) => ({ ...states, [local.id]: 'attention' }))
      throw cause
    }
  }, [enqueue])

  const deleteEntry = useCallback(async (entry: DiaryEntryV2) => {
    setSaveStates((states) => ({ ...states, [entry.id]: 'saving' }))
    try {
      await request(`/api/diary/v2/entries/${entry.id}?revision=${entry.revision}`, { method: 'DELETE' })
      setEntries((current) => current.filter((item) => item.id !== entry.id))
      if (userId) {
        const key = `stellaeum.diary.composer.v2.${userId}.${entry.kind}`
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = JSON.parse(stored)
          if ((parsed.draft ?? parsed).id === entry.id) localStorage.removeItem(key)
        }
      }
      return true
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 409) {
        const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
        setConflict({ operation: 'delete', local: entry, current: current.success ? current.data : null })
      } else if (!(cause instanceof HttpError)) {
        enqueue({ key: crypto.randomUUID(), operation: 'delete', entryId: entry.id, revision: entry.revision, queuedAt: new Date().toISOString() })
        setEntries((current) => current.filter((item) => item.id !== entry.id))
        setSaveStates((states) => ({ ...states, [entry.id]: 'saved-device' }))
        return true
      }
      setSaveStates((states) => ({ ...states, [entry.id]: 'attention' }))
      return false
    }
  }, [enqueue, userId])

  const resolveWithServer = useCallback(() => {
    if (conflict?.current) setEntries((current) => mergeById(current, conflict.current!))
    else if (conflict) setEntries((current) => current.filter((entry) => entry.id !== conflict.local.id))
    setConflict(null)
  }, [conflict])

  const saveConflictAsNew = useCallback(async () => {
    if (!conflict) return
    const now = new Date().toISOString()
    const isLegacy = conflict.local.kind === 'legacy_lunar'
    const copy: CreateDiaryEntryV2Input = {
      id: crypto.randomUUID(),
      kind: isLegacy ? 'note' : conflict.local.kind as CreateDiaryEntryV2Input['kind'],
      status: conflict.local.status,
      occurredAt: now,
      entryDate: conflict.local.entryDate,
      timezone: conflict.local.timezone,
      title: isLegacy ? conflict.local.phaseName : conflict.local.title,
      mood: conflict.local.mood,
      topics: conflict.local.topics,
      content: isLegacy
        ? { version: 1, body: ((conflict.local.content as { intentions?: string[] }).intentions ?? []).join('\n\n') }
        : conflict.local.content as CreateDiaryEntryV2Input['content'],
      phaseId: isLegacy ? null : conflict.local.phaseId,
      phaseName: isLegacy ? null : conflict.local.phaseName,
      promptId: isLegacy ? null : conflict.local.promptId,
      promptVersion: isLegacy ? null : conflict.local.promptVersion,
      source: conflict.local.source,
      relatedEntryId: conflict.local.relatedEntryId,
      nextStep: conflict.local.nextStep,
    }
    await createEntry(copy)
    setConflict(null)
  }, [conflict, createEntry])

  return {
    entries, nextCursor, isLoading, error, saveStates, conflict,
    createEntry, updateEntry, deleteEntry,
    pageNumber: pageIndex + 1,
    hasPreviousPage: pageIndex > 0,
    nextPage: () => {
      if (!isLoading && nextCursor) setPagination({ scope, cursors: [...pageCursors.slice(0, pageIndex + 1), nextCursor], index: pageIndex + 1 })
    },
    previousPage: () => {
      if (!isLoading && pageIndex > 0) setPagination({ scope, cursors: pageCursors, index: pageIndex - 1 })
    },
    refresh: load,
    resolveWithServer, saveConflictAsNew, dismissConflict: () => setConflict(null),
  }
}
