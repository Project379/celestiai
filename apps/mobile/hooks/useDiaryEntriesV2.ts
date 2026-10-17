import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useUser } from '@clerk/expo'
import * as Crypto from 'expo-crypto'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  diaryEntryPageSchema,
  diaryEntryV2Schema,
  DIARY_PAGE_SIZE,
  type CreateDiaryEntryV2Input,
  type DiaryEntryPage,
  type DiaryEntryV2,
  type DiaryListQuery,
  type UpdateDiaryEntryV2Input,
} from '@stellaeum/core/diary/v2'
import { ApiError, useApiClient } from '@/lib/api/client'
import { enqueueDiaryMutation, readDiaryQueue, removeComposerDraft, writeDiaryQueue } from '@/lib/diary/storage'

export type MobileDiarySaveState = 'idle' | 'saving' | 'saved' | 'saved-device' | 'attention'
export interface MobileDiaryConflict { operation: 'update' | 'delete'; local: DiaryEntryV2; current: DiaryEntryV2 | null }

function localEntry(input: CreateDiaryEntryV2Input): DiaryEntryV2 {
  const now = new Date().toISOString()
  return { ...input, content: input.content, revision: 1, completedAt: input.status === 'completed' ? now : null, createdAt: now, updatedAt: now }
}

export function useDiaryEntriesV2(filters: Partial<DiaryListQuery> = {}) {
  const { user } = useUser()
  const userId = user?.id ?? null
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()
  const [saveStates, setSaveStates] = useState<Record<string, MobileDiarySaveState>>({})
  const [conflict, setConflict] = useState<MobileDiaryConflict | null>(null)
  const flushing = useRef(false)
  const serializedFilters = useMemo(() => JSON.stringify(filters), [filters])
  const scope = `${userId}:${serializedFilters}`
  const [pagination, setPagination] = useState({ scope: '', cursors: [null] as (string | null)[], index: 0 })
  const pageIndex = pagination.scope === scope ? pagination.index : 0
  const pageCursors = pagination.scope === scope ? pagination.cursors : [null]
  const cursor = pageCursors[pageIndex] ?? null
  useEffect(() => {
    setPagination({ scope, cursors: [null], index: 0 })
  }, [scope])
  const queryKey = useMemo(() => ['diary-v2', userId, serializedFilters, cursor] as const, [serializedFilters, userId, cursor])

  const query = useQuery({
    queryKey,
    enabled: Boolean(userId),
    gcTime: 0,
    queryFn: async () => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') params.set(key, String(value))
      params.set('limit', String(DIARY_PAGE_SIZE))
      if (cursor) params.set('cursor', cursor)
      return diaryEntryPageSchema.parse(await apiFetch(`/api/diary/v2/entries?${params}`))
    },
  })

  const entries = useMemo(() => query.data?.entries ?? [], [query.data])

  const updateCache = useCallback((entry: DiaryEntryV2 | null, removeId?: string) => {
    queryClient.setQueryData<DiaryEntryPage>(queryKey, (current) => {
      if (!current) return current
      return {
        ...current,
        entries: current.entries
          .filter((item) => item.id !== removeId && item.id !== entry?.id)
          .concat(entry ? [entry] : [])
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id))
          .slice(0, DIARY_PAGE_SIZE),
      }
    })
  }, [queryClient, queryKey])

  const flushQueue = useCallback(async () => {
    if (!userId || flushing.current) return
    flushing.current = true
    const queue = await readDiaryQueue(userId)
    const remaining = [] as typeof queue
    for (let index = 0; index < queue.length; index += 1) {
      const mutation = queue[index]!
      try {
        if (mutation.operation === 'create') {
          const saved = diaryEntryV2Schema.parse(await apiFetch('/api/diary/v2/entries', { method: 'POST', body: JSON.stringify(mutation.payload) }))
          updateCache(saved)
        } else if (mutation.operation === 'update') {
          const saved = diaryEntryV2Schema.parse(await apiFetch(`/api/diary/v2/entries/${mutation.entryId}`, { method: 'PATCH', body: JSON.stringify(mutation.payload) }))
          updateCache(saved)
        } else {
          await apiFetch(`/api/diary/v2/entries/${mutation.entryId}?revision=${mutation.revision}`, { method: 'DELETE' })
          updateCache(null, mutation.entryId)
        }
        setSaveStates((states) => ({ ...states, [mutation.entryId]: 'saved' }))
      } catch (cause) {
        if (cause instanceof ApiError && cause.status === 409) {
          const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
          const local = entries.find((entry) => entry.id === mutation.entryId)
          if (local) setConflict({ operation: mutation.operation === 'delete' ? 'delete' : 'update', local, current: current.success ? current.data : null })
          setSaveStates((states) => ({ ...states, [mutation.entryId]: 'attention' }))
        } else remaining.push(mutation, ...queue.slice(index + 1))
        break
      }
    }
    await writeDiaryQueue(userId, remaining)
    flushing.current = false
  }, [apiFetch, entries, updateCache, userId])

  useEffect(() => {
    void flushQueue()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void flushQueue().then(() => query.refetch())
    })
    return () => subscription.remove()
  }, [flushQueue, query.refetch])

  const createEntry = useCallback(async (input: CreateDiaryEntryV2Input) => {
    if (!userId) throw new Error('Missing user')
    setSaveStates((states) => ({ ...states, [input.id]: 'saving' }))
    try {
      const saved = diaryEntryV2Schema.parse(await apiFetch('/api/diary/v2/entries', { method: 'POST', body: JSON.stringify(input) }))
      updateCache(saved)
      setSaveStates((states) => ({ ...states, [input.id]: 'saved' }))
      return saved
    } catch (cause) {
      if (!(cause instanceof ApiError)) {
        await enqueueDiaryMutation(userId, { key: Crypto.randomUUID(), operation: 'create', entryId: input.id, payload: input, queuedAt: new Date().toISOString() })
        const local = localEntry(input)
        updateCache(local)
        setSaveStates((states) => ({ ...states, [input.id]: 'saved-device' }))
        return local
      }
      if (cause instanceof ApiError && cause.status === 409) {
        const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
        setConflict({ operation: 'update', local: localEntry(input), current: current.success ? current.data : null })
      }
      setSaveStates((states) => ({ ...states, [input.id]: 'attention' }))
      throw cause
    }
  }, [apiFetch, updateCache, userId])

  const updateEntry = useCallback(async (local: DiaryEntryV2, patch: Omit<UpdateDiaryEntryV2Input, 'revision'>) => {
    if (!userId) throw new Error('Missing user')
    const payload = { ...patch, revision: local.revision }
    setSaveStates((states) => ({ ...states, [local.id]: 'saving' }))
    try {
      const saved = diaryEntryV2Schema.parse(await apiFetch(`/api/diary/v2/entries/${local.id}`, { method: 'PATCH', body: JSON.stringify(payload) }))
      updateCache(saved)
      setSaveStates((states) => ({ ...states, [local.id]: 'saved' }))
      return saved
    } catch (cause) {
      const pending = { ...local, ...patch, updatedAt: new Date().toISOString() }
      if (cause instanceof ApiError && cause.status === 409) {
        const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
        setConflict({ operation: 'update', local: pending, current: current.success ? current.data : null })
      } else if (!(cause instanceof ApiError)) {
        await enqueueDiaryMutation(userId, { key: Crypto.randomUUID(), operation: 'update', entryId: local.id, payload, queuedAt: new Date().toISOString() })
        updateCache(pending)
        setSaveStates((states) => ({ ...states, [local.id]: 'saved-device' }))
        return pending
      }
      setSaveStates((states) => ({ ...states, [local.id]: 'attention' }))
      throw cause
    }
  }, [apiFetch, updateCache, userId])

  const deleteEntry = useCallback(async (entry: DiaryEntryV2) => {
    if (!userId) return false
    try {
      await apiFetch(`/api/diary/v2/entries/${entry.id}?revision=${entry.revision}`, { method: 'DELETE' })
      updateCache(null, entry.id)
      await removeComposerDraft(userId, entry.kind, entry.id)
      return true
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        const current = diaryEntryV2Schema.safeParse((cause.body as { current?: unknown })?.current)
        setConflict({ operation: 'delete', local: entry, current: current.success ? current.data : null })
      } else if (!(cause instanceof ApiError)) {
        await enqueueDiaryMutation(userId, { key: Crypto.randomUUID(), operation: 'delete', entryId: entry.id, revision: entry.revision, queuedAt: new Date().toISOString() })
        updateCache(null, entry.id)
        return true
      }
      return false
    }
  }, [apiFetch, updateCache, userId])

  const resolveWithServer = () => {
    if (conflict?.current) updateCache(conflict.current)
    else if (conflict) updateCache(null, conflict.local.id)
    setConflict(null)
  }

  const saveConflictAsNew = useCallback(async () => {
    if (!conflict) return
    const isLegacy = conflict.local.kind === 'legacy_lunar'
    const now = new Date().toISOString()
    await createEntry({
      id: Crypto.randomUUID(),
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
    })
    setConflict(null)
  }, [conflict, createEntry])

  return {
    entries, isLoading: query.isPending, error: query.error, saveStates, conflict,
    createEntry, updateEntry, deleteEntry, resolveWithServer, saveConflictAsNew,
    dismissConflict: () => setConflict(null), flushQueue,
    pageNumber: pageIndex + 1,
    isFetching: query.isFetching,
    hasNextPage: Boolean(query.data?.nextCursor),
    hasPreviousPage: pageIndex > 0,
    nextPage: () => {
      if (!query.isFetching && query.data?.nextCursor) setPagination({ scope, cursors: [...pageCursors.slice(0, pageIndex + 1), query.data.nextCursor], index: pageIndex + 1 })
    },
    previousPage: () => {
      if (!query.isFetching && pageIndex > 0) setPagination({ scope, cursors: pageCursors, index: pageIndex - 1 })
    },
    refresh: query.refetch,
  }
}
