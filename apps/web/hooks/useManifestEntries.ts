'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LunarPhaseId } from '@/lib/moon-phase'
import type { ManifestEntry } from '@/lib/manifest/types'

/**
 * Diary entries hook — server-backed since §8.5 (prior: localStorage).
 *
 * Reads / writes go through `/api/diary/*` (wired in §8.4). Optimistic
 * state updates with rollback on failure; no offline queue (acknowledged
 * scope bound from the §8.0 plan).
 *
 * Error IDs surfaced by this hook (see PRE_LAUNCH_PREREQS.md item 2 for
 * the monitoring-swap path when Sentry/equivalent ships):
 *
 *   ERR-DI-002 — localStorage read corruption.
 *     Defensive-retain post §8.5 hook swap: no current code path reads
 *     the abandoned `celestia.manifest.entries.v1` key, but the registry
 *     entry is kept available for any future code path (debugging,
 *     migration, adjacent hook) that touches the stale data still
 *     present in user browsers per §8.0 Implementation Decision 1.
 *   ERR-DI-003 — POST upsert failed (server 5xx from /api/diary/entries).
 *   ERR-DI-004 — GET list failed (server 5xx from /api/diary/entries).
 *   ERR-DI-007 — DELETE failed (server 5xx from /api/diary/entries/[id]).
 *   ERR-DI-008 — Network-class failure (fetch rejected; offline / DNS /
 *     TLS). Differentiated from 003/004/007 because the user can take
 *     a specific action (check connection) rather than just retry —
 *     the copy register frames cause + action rather than the generic
 *     "не успяхме да..." template.
 *
 *   ERR-DI-001 removed in §8.5 — no localStorage writes remain.
 *
 * Banner clears on any successful server op (mirrors the "ed0f606
 * cleared 001 on successful retry" pattern from §8.1).
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

/**
 * Server row → client `ManifestEntry` adapter. Server shape is snake_case
 * per `DiaryEntryRow` in `packages/core/src/diary/entries.ts`; client
 * shape is camelCase + uses `date` rather than `entry_date` per
 * `apps/web/lib/manifest/types.ts`. The public `ManifestEntry` type is
 * unchanged by §8.5; the adapter is private to this hook.
 */
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

export function useManifestEntries() {
  const [entries, setEntries] = useState<ManifestEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<ManifestEntriesError | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/diary/entries')
        if (!res.ok) {
          if (!cancelled) {
            console.error(
              '[ERR-DI-004] GET /api/diary/entries non-ok:',
              res.status,
            )
            setError({
              code: 'ERR-DI-004',
              message: ERROR_MESSAGES['ERR-DI-004'],
            })
          }
        } else {
          const rows = (await res.json()) as ServerDiaryRow[]
          if (!cancelled) {
            setEntries(rows.map(rowToEntry))
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error(
            '[ERR-DI-008] GET /api/diary/entries network failure:',
            e,
          )
          setError({
            code: 'ERR-DI-008',
            message: ERROR_MESSAGES['ERR-DI-008'],
          })
        }
      } finally {
        if (!cancelled) setIsLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const saveEntry = useCallback(
    async (input: {
      date: string
      phaseId: LunarPhaseId
      phaseName: string
      intentions: [string, string, string]
    }): Promise<void> => {
      const snapshot = entries
      const now = new Date().toISOString()
      const existing = entries.find(e => e.date === input.date)

      // Optimistic entry: preserve id on same-date re-write (matches the
      // server's upsert-in-place behavior), else use a `tmp_` id that
      // gets replaced once the POST resolves.
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

      setEntries(
        existing
          ? entries.map(e => (e.id === existing.id ? optimistic : e))
          : [optimistic, ...entries],
      )

      try {
        const res = await fetch('/api/diary/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entryDate: input.date,
            phaseId: input.phaseId,
            phaseName: input.phaseName,
            intentions: input.intentions,
          }),
        })

        if (!res.ok) {
          console.error(
            '[ERR-DI-003] POST /api/diary/entries non-ok:',
            res.status,
          )
          setEntries(snapshot)
          setError({
            code: 'ERR-DI-003',
            message: ERROR_MESSAGES['ERR-DI-003'],
          })
          return
        }

        const saved = (await res.json()) as ServerDiaryRow & {
          created: boolean
        }
        const serverEntry = rowToEntry(saved)

        // Reconcile by date — matches the server's (user_id, entry_date)
        // unique index. Id-based merge would drift on rapid double-submit
        // (POST2's tmp id gets stale once POST1 replaces it); date-based
        // merge gives eventual consistency — whichever POST resolves
        // last wins the displayed row, which matches what's on the
        // server after both upserts.
        setEntries(prev => {
          const hasSameDate = prev.some(e => e.date === serverEntry.date)
          if (hasSameDate) {
            return prev.map(e =>
              e.date === serverEntry.date ? serverEntry : e,
            )
          }
          return [serverEntry, ...prev]
        })
        setError(null)
      } catch (e) {
        console.error(
          '[ERR-DI-008] POST /api/diary/entries network failure:',
          e,
        )
        setEntries(snapshot)
        setError({
          code: 'ERR-DI-008',
          message: ERROR_MESSAGES['ERR-DI-008'],
        })
      }
    },
    [entries],
  )

  const deleteEntry = useCallback(
    async (id: string): Promise<void> => {
      // Skip server call for optimistic entries that never landed — they
      // don't exist on the server, so a DELETE would 404 (harmless but
      // unnecessary). Just drop the optimistic row.
      if (id.startsWith('tmp_')) {
        setEntries(entries.filter(e => e.id !== id))
        return
      }

      const snapshot = entries
      setEntries(entries.filter(e => e.id !== id))

      try {
        const res = await fetch(
          `/api/diary/entries/${encodeURIComponent(id)}`,
          { method: 'DELETE' },
        )
        // 204 (deleted) or 404 (already gone) — both are success from
        // the user's perspective. Anything else rolls back.
        if (!res.ok && res.status !== 404) {
          console.error(
            '[ERR-DI-007] DELETE /api/diary/entries/[id] non-ok:',
            res.status,
          )
          setEntries(snapshot)
          setError({
            code: 'ERR-DI-007',
            message: ERROR_MESSAGES['ERR-DI-007'],
          })
          return
        }
        setError(null)
      } catch (e) {
        console.error(
          '[ERR-DI-008] DELETE /api/diary/entries/[id] network failure:',
          e,
        )
        setEntries(snapshot)
        setError({
          code: 'ERR-DI-008',
          message: ERROR_MESSAGES['ERR-DI-008'],
        })
      }
    },
    [entries],
  )

  const findByDate = useCallback(
    (date: string) => entries.find(e => e.date === date) ?? null,
    [entries],
  )

  const clearError = useCallback(() => setError(null), [])

  return {
    entries,
    isLoaded,
    error,
    saveEntry,
    deleteEntry,
    findByDate,
    clearError,
  }
}
