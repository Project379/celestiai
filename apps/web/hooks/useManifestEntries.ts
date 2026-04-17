'use client'

import { useCallback, useEffect, useState } from 'react'
import type { LunarPhaseId } from '@/lib/moon-phase'
import type { ManifestEntry } from '@/lib/manifest/types'

const STORAGE_KEY = 'celestia.manifest.entries.v1'

/**
 * Backend-swap boundary. Today: localStorage. Tomorrow: Supabase.
 * Return shape stays the same — the UI never knows which is underneath.
 *
 * When the API exists, replace the effect body with a fetch and replace
 * saveEntry with a POST; no component changes required.
 */
export function useManifestEntries() {
  const [entries, setEntries] = useState<ManifestEntry[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ManifestEntry[]
        setEntries(Array.isArray(parsed) ? parsed : [])
      }
    } catch {
      // corrupted storage — start clean
    }
    setIsLoaded(true)
  }, [])

  const persist = (next: ManifestEntry[]) => {
    setEntries(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // quota exceeded — silent; UI state is still updated
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

  return { entries, isLoaded, saveEntry, deleteEntry, findByDate }
}
