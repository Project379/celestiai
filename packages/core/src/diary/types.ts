import type { LunarPhaseId } from '../lib/moon-phase'

/**
 * One diary session — 3 intentions written on a specific date, tied to
 * the lunar phase that was active when the user wrote them.
 *
 * Contract shape for the backend: when persistence moves from localStorage
 * to Supabase, the hook swaps internals, this type does not change.
 */
export interface ManifestEntry {
  id: string
  date: string
  phaseId: LunarPhaseId
  phaseName: string
  intentions: [string, string, string]
  createdAt: string
  updatedAt: string
}

export type ManifestDraft = {
  intentions: [string, string, string]
}
