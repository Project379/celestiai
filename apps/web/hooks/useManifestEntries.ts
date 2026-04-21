'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LunarPhaseId } from '@/lib/moon-phase'
import type { ManifestEntry } from '@/lib/manifest/types'

const STORAGE_KEY = 'celestia.manifest.entries.v1'

export type ManifestEntriesErrorCode = 'ERR-DI-001' | 'ERR-DI-002'

export interface ManifestEntriesError {
  code: ManifestEntriesErrorCode
  message: string
}

const ERROR_MESSAGES: Record<ManifestEntriesErrorCode, string> = {
  'ERR-DI-001':
    'Не успяхме да запазим страницата в дневника. Опитай отново. Код: ERR-DI-001.',
  'ERR-DI-002':
    'Не успяхме да заредим дневника. Опитай отново. Код: ERR-DI-002.',
}

/**
 * Backend-swap boundary. Today: localStorage. Tomorrow: Supabase.
 * Return shape stays the same — the UI never knows which is underneath.
 *
 * Error IDs emitted by this hook (see PRE_LAUNCH_PREREQS.md item 2 for
 * the monitoring-swap path when Sentry/equivalent ships):
 *   ERR-DI-001 — localStorage write failed (quota exceeded or storage disabled)
 *   ERR-DI-002 — localStorage read corruption (invalid JSON)
 *
 * When the API exists, replace the effect body with a fetch and replace
 * saveEntry with a POST; no component changes required. The ERR-DI-NNN
 * namespace extends with ERR-DI-003+ for server paths (see §8.4 plan).
 */
export function useManifestEntries() {
  const [entries, setEntries] = useState<ManifestEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<ManifestEntriesError | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ManifestEntry[]
        setEntries(Array.isArray(parsed) ? parsed : [])
      }
    } catch (e) {
      console.error('[ERR-DI-002] useManifestEntries read corruption:', e)
      setError({ code: 'ERR-DI-002', message: ERROR_MESSAGES['ERR-DI-002'] })
    }
    setIsLoaded(true)
  }, [])

  const persist = (next: ManifestEntry[]) => {
    setEntries(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch (e) {
      console.error('[ERR-DI-001] useManifestEntries write failed:', e)
      setError({ code: 'ERR-DI-001', message: ERROR_MESSAGES['ERR-DI-001'] })
    }
  }

  const saveEntry = useCallback(
    (input: {
      date: string
      phaseId: LunarPhaseId
      phaseName: string
      intentions: [string, string, string]
    }): ManifestEntry => {
      const now = new Date().toISOString()
      const existing = entries.find(e => e.date === input.date)
      let saved: ManifestEntry
      if (existing) {
        saved = {
          ...existing,
          phaseId: input.phaseId,
          phaseName: input.phaseName,
          intentions: input.intentions,
          updatedAt: now,
        }
        persist(entries.map(e => (e.id === existing.id ? saved : e)))
      } else {
        saved = {
          id: `mf_${now}_${Math.random().toString(36).slice(2, 8)}`,
          date: input.date,
          phaseId: input.phaseId,
          phaseName: input.phaseName,
          intentions: input.intentions,
          createdAt: now,
          updatedAt: now,
        }
        persist([saved, ...entries])
      }
      return saved
    },
    [entries],
  )

  const deleteEntry = useCallback(
    (id: string) => {
      persist(entries.filter(e => e.id !== id))
    },
    [entries],
  )

  const findByDate = useCallback(
    (date: string) => entries.find(e => e.date === date) ?? null,
    [entries],
  )

  const clearError = useCallback(() => setError(null), [])

  return { entries, isLoaded, error, saveEntry, deleteEntry, findByDate, clearError }
}
