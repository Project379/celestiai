import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import type { LunarPhaseId } from '@stellaeum/core/moon-phase'
import type { ManifestEntry } from '@stellaeum/core/diary/types'

import { ApiError, useApiClient } from '@/lib/api/client'
import { logError } from '@/lib/monitoring/logError'

/**
 * Mobile-side lunar diary entries hook — server-backed via /api/diary/*.
 * P.4-b TanStack reimplementation of apps/web/hooks/useManifestEntries.ts.
 *
 * Per HT 3 ratification, this hook preserves two behavioral properties of
 * the web counterpart:
 *   (a) Optimistic updates with rollback on error — implemented via
 *       useMutation `onMutate` snapshot + `onError` revert.
 *   (b) The 5-code error taxonomy (ERR-DI-002/003/004/007/008) surfaced
 *       through parsed response bodies rather than generic mutation.error.
 *       Server responses include `{ code: 'ERR-DI-XXX', error: '...' }` on
 *       5xx paths; mapError() parses those into the typed
 *       ManifestEntriesError shape. Network failures (no Response) fall
 *       through to ERR-DI-008.
 *
 * ERR-DI-002 is web-localStorage-specific and unreachable on mobile (which
 * is network-only). The code is retained in the union for contract parity;
 * no emission path exists.
 */

type ServerDiaryRow = {
  id: string
  user_id: string
  entry_date: string
  phase_id: string
  phase_name: string
  intentions: string[]
  created_at: string
  updated_at: string
}

function rowToEntry(row: ServerDiaryRow): ManifestEntry {
  return {
    id: row.id,
    date: row.entry_date,
    phaseId: row.phase_id as LunarPhaseId,
    phaseName: row.phase_name,
    intentions: row.intentions as [string, string, string],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type ManifestEntriesErrorCode =
  | 'ERR-DI-002'
  | 'ERR-DI-003'
  | 'ERR-DI-004'
  | 'ERR-DI-007'
  | 'ERR-DI-008'

export interface ManifestEntriesError {
  code: ManifestEntriesErrorCode
  message: string
}

const ERROR_MESSAGES: Record<ManifestEntriesErrorCode, string> = {
  'ERR-DI-002':
    'Не успяхме да заредим дневника. Опитай отново. Код: ERR-DI-002.',
  'ERR-DI-003':
    'Не успяхме да запазим страницата в дневника. Опитай отново. Код: ERR-DI-003.',
  'ERR-DI-004':
    'Не успяхме да заредим дневника. Опитай отново. Код: ERR-DI-004.',
  'ERR-DI-007':
    'Не успяхме да изтрием страницата. Опитай отново. Код: ERR-DI-007.',
  'ERR-DI-008':
    'Няма връзка със сървъра. Провери интернет връзката и опитай отново. Код: ERR-DI-008.',
}

export interface SaveEntryInput {
  date: string
  phaseId: LunarPhaseId
  phaseName: string
  intentions: [string, string, string]
}

const ENTRIES_KEY = ['diary', 'entries'] as const

function mapError(err: unknown, op: 'GET' | 'POST' | 'DELETE'): ManifestEntriesError {
  if (err instanceof ApiError) {
    const body = err.body as { code?: string } | null
    const code = body?.code
    if (code === 'ERR-DI-003' || code === 'ERR-DI-004' || code === 'ERR-DI-007') {
      return { code, message: ERROR_MESSAGES[code] }
    }
    const opCode: ManifestEntriesErrorCode =
      op === 'GET' ? 'ERR-DI-004' : op === 'POST' ? 'ERR-DI-003' : 'ERR-DI-007'
    return { code: opCode, message: ERROR_MESSAGES[opCode] }
  }
  return { code: 'ERR-DI-008', message: ERROR_MESSAGES['ERR-DI-008'] }
}

export function useManifestEntries() {
  const queryClient = useQueryClient()
  const { apiFetch } = useApiClient()

  const query = useQuery<ManifestEntry[], ManifestEntriesError>({
    queryKey: ENTRIES_KEY,
    queryFn: async () => {
      try {
        const rows = (await apiFetch('/api/diary/entries')) as ServerDiaryRow[]
        return rows.map(rowToEntry)
      } catch (err) {
        const mapped = mapError(err, 'GET')
        logError(mapped.code, err)
        throw mapped
      }
    },
  })

  const saveMutation = useMutation<
    ManifestEntry,
    ManifestEntriesError,
    SaveEntryInput,
    { previousEntries: ManifestEntry[] }
  >({
    mutationFn: async (input) => {
      try {
        const result = (await apiFetch('/api/diary/entries', {
          method: 'POST',
          body: JSON.stringify({
            entryDate: input.date,
            phaseId: input.phaseId,
            phaseName: input.phaseName,
            intentions: input.intentions,
          }),
        })) as ServerDiaryRow & { created: boolean }
        return rowToEntry(result)
      } catch (err) {
        const mapped = mapError(err, 'POST')
        logError(mapped.code, err)
        throw mapped
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY })
      const previous = queryClient.getQueryData<ManifestEntry[]>(ENTRIES_KEY) ?? []
      const now = new Date().toISOString()
      const existing = previous.find((e) => e.date === input.date)
      const optimistic: ManifestEntry = existing
        ? {
            ...existing,
            phaseId: input.phaseId,
            phaseName: input.phaseName,
            intentions: input.intentions,
            updatedAt: now,
          }
        : {
            id: `tmp_${now}_${Math.random().toString(36).slice(2, 8)}`,
            date: input.date,
            phaseId: input.phaseId,
            phaseName: input.phaseName,
            intentions: input.intentions,
            createdAt: now,
            updatedAt: now,
          }
      queryClient.setQueryData<ManifestEntry[]>(
        ENTRIES_KEY,
        existing
          ? previous.map((e) => (e.id === existing.id ? optimistic : e))
          : [optimistic, ...previous],
      )
      return { previousEntries: previous }
    },
    onError: (_err, _input, context) => {
      if (context) {
        queryClient.setQueryData(ENTRIES_KEY, context.previousEntries)
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
    onSuccess: (serverEntry) => {
      // Reconcile by date — matches the server's (user_id, entry_date) unique
      // index; mirrors the web hook's reconciliation logic.
      queryClient.setQueryData<ManifestEntry[]>(ENTRIES_KEY, (prev = []) => {
        const hasSameDate = prev.some((e) => e.date === serverEntry.date)
        if (hasSameDate) {
          return prev.map((e) => (e.date === serverEntry.date ? serverEntry : e))
        }
        return [serverEntry, ...prev]
      })
    },
  })

  const deleteMutation = useMutation<
    void,
    ManifestEntriesError,
    string,
    { previousEntries: ManifestEntry[] }
  >({
    mutationFn: async (id) => {
      // Optimistic-only rows never made it to the server — drop locally only.
      if (id.startsWith('tmp_')) return
      try {
        await apiFetch(`/api/diary/entries/${encodeURIComponent(id)}`, { method: 'DELETE' })
      } catch (err) {
        // 404 = already gone, treat as success (matches web hook semantics)
        if (err instanceof ApiError && err.status === 404) return
        const mapped = mapError(err, 'DELETE')
        logError(mapped.code, err)
        throw mapped
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY })
      const previous = queryClient.getQueryData<ManifestEntry[]>(ENTRIES_KEY) ?? []
      queryClient.setQueryData<ManifestEntry[]>(
        ENTRIES_KEY,
        previous.filter((e) => e.id !== id),
      )
      return { previousEntries: previous }
    },
    onError: (_err, _id, context) => {
      if (context) {
        queryClient.setQueryData(ENTRIES_KEY, context.previousEntries)
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    },
  })

  const entries = query.data ?? []
  const isLoaded = !query.isPending
  // Show the most recent failure across save/delete/query. Mutation errors
  // shadow the query error until clearError() resets them.
  const error: ManifestEntriesError | null =
    saveMutation.error ?? deleteMutation.error ?? query.error ?? null

  const clearError = () => {
    saveMutation.reset()
    deleteMutation.reset()
  }

  const findByDate = (date: string) =>
    entries.find((e) => e.date === date) ?? null

  return {
    entries,
    isLoaded,
    error,
    saveEntry: (input: SaveEntryInput) => saveMutation.mutate(input),
    deleteEntry: (id: string) => deleteMutation.mutate(id),
    findByDate,
    clearError,
  }
}
