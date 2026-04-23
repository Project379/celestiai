import { createCoreSupabaseClient } from '../lib/supabase'

/**
 * Core-layer operations for public.diary_entries.
 *
 * Mirrors the shape of `packages/core/src/charts/birth-data.ts`:
 *   - Input types mirror Zod-inferred shapes from the web validator
 *     layer (apps/web/lib/validators/diary.ts). The schemas stay in
 *     web because Bulgarian error messages are UX-coupled; core
 *     consumes already-validated payloads.
 *   - Results are discriminated unions `{ ok: true, data } |
 *     { ok: false, error: 'CODE', ... }` so callers can exhaustively
 *     handle failure modes without string comparisons on thrown errors.
 *   - Supabase client is the service-role one (`createCoreSupabaseClient`),
 *     bypassing RLS. User isolation is enforced via explicit
 *     `.eq('user_id', userId)` on every read/write. The RLS policies on
 *     public.diary_entries exist for direct client-side @supabase/supabase-js
 *     traffic (future, §8.5+) as defense-in-depth; the API layer goes
 *     through core which uses service-role.
 *
 * §8 refs:
 *   - Schema: .planning/phases/08-diary-persistence/08-02-SCHEMA.md
 *   - §8.4 scope: .planning/phases/08-diary-persistence/00-PLAN.md §8.4
 *   - Explicit user_id (no DB DEFAULT): §8.3 post-seal correction
 */

// ─── Input types ─────────────────────────────────────────────────────

export interface UpsertDiaryEntryInput {
  /** YYYY-MM-DD in the user's local timezone (§A sealed A2). */
  entryDate: string
  /** Snapshot of LunarPhaseId at write time. */
  phaseId: string
  /** Snapshot of the Bulgarian phase name at write time. */
  phaseName: string
  /** Exactly 3 elements, each 1..500 chars — enforced by Zod + DB CHECK. */
  intentions: [string, string, string]
}

export interface UpdateDiaryEntryInput {
  /**
   * PATCH currently accepts only intentions. phase_id/phase_name
   * snapshot semantics on re-write are a §8.4 commit-2 founder
   * decision; until sealed, update() leaves both untouched.
   */
  intentions?: [string, string, string]
}

// ─── Row type ────────────────────────────────────────────────────────

export interface DiaryEntryRow {
  id: string
  user_id: string
  /** ISO date YYYY-MM-DD. */
  entry_date: string
  phase_id: string
  phase_name: string
  /** DB CHECK guarantees length === 3 and each element char_length ∈ [1, 500]. */
  intentions: string[]
  created_at: string
  updated_at: string
}

// ─── Result unions ───────────────────────────────────────────────────

export type UpsertDiaryEntryResult =
  | { ok: true; data: DiaryEntryRow; created: boolean }
  | { ok: false; error: 'UPSERT_FAILED'; message: string }

export type DiaryEntryByIdResult =
  | { ok: true; data: DiaryEntryRow }
  | { ok: false; error: 'NOT_FOUND' }

export type UpdateDiaryEntryResult =
  | { ok: true; data: DiaryEntryRow }
  | { ok: false; error: 'NOT_FOUND' }
  | { ok: false; error: 'UPDATE_FAILED'; message: string }

export type DeleteDiaryEntryResult =
  | { ok: true }
  | { ok: false; error: 'DELETE_FAILED'; message: string }

export type DeleteUserDiaryEntriesResult =
  | { ok: true }
  | { ok: false; error: 'DELETE_FAILED'; message: string }

// ─── Operations ──────────────────────────────────────────────────────

/**
 * List the caller's diary entries, newest first.
 * Optional phaseId filter supports the variant-rotation count query in §8.8.
 */
export async function listDiaryEntries(
  userId: string,
  options: { phaseId?: string } = {},
): Promise<DiaryEntryRow[]> {
  const supabase = createCoreSupabaseClient()
  let query = supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (options.phaseId) {
    query = query.eq('phase_id', options.phaseId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[core/diary/entries] list failed:', error)
    throw error
  }

  return (data ?? []) as DiaryEntryRow[]
}

/**
 * POST-semantic create with upsert-on-conflict at (user_id, entry_date).
 *
 * Returns { created: true } if a new row was inserted, { created: false }
 * if an existing row was updated. The route handler uses this to pick
 * HTTP 201 vs 200 semantics (surfaced to founder in §8.4 commit 2 for
 * confirmation).
 *
 * user_id is passed explicitly from the authenticated caller (per
 * §8.3 post-seal correction; no DB DEFAULT, NOT NULL violation is the
 * loud failure mode for omission).
 */
export async function upsertDiaryEntry(
  userId: string,
  input: UpsertDiaryEntryInput,
): Promise<UpsertDiaryEntryResult> {
  const supabase = createCoreSupabaseClient()

  // Look up any existing row for this (user_id, entry_date) so we can
  // report accurate created:true/false and so the UPDATE path does not
  // touch created_at (which DEFAULT now() would on a fresh INSERT path).
  const { data: existing } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_date', input.entryDate)
    .maybeSingle()

  if (existing) {
    // Same-date re-write: update intentions + phase snapshot per
    // current-client behaviour. Phase-snapshot semantics on re-write
    // are a §8.4 commit-2 question; this mirrors the current client
    // which takes the current phase into the row on re-write.
    // `updated_at` is maintained by the diary_entries_updated_at trigger
    // calling public.set_updated_at() — no explicit set needed.
    const { data, error } = await supabase
      .from('diary_entries')
      .update({
        phase_id: input.phaseId,
        phase_name: input.phaseName,
        intentions: input.intentions,
      })
      .eq('id', (existing as DiaryEntryRow).id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) {
      console.error('[core/diary/entries] upsert-update failed:', error)
      return {
        ok: false,
        error: 'UPSERT_FAILED',
        message: error?.message ?? 'unknown',
      }
    }

    return { ok: true, data: data as DiaryEntryRow, created: false }
  }

  // No existing row for this (user_id, entry_date): insert a new one.
  // user_id is supplied explicitly (no DB DEFAULT per §8.3 correction).
  const { data, error } = await supabase
    .from('diary_entries')
    .insert({
      user_id: userId,
      entry_date: input.entryDate,
      phase_id: input.phaseId,
      phase_name: input.phaseName,
      intentions: input.intentions,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[core/diary/entries] upsert-insert failed:', error)
    return {
      ok: false,
      error: 'UPSERT_FAILED',
      message: error?.message ?? 'unknown',
    }
  }

  return { ok: true, data: data as DiaryEntryRow, created: true }
}

/**
 * Read a single diary entry by id, scoped to the caller.
 * NOT_FOUND is a legitimate response, not a failure — the route
 * handler returns 404 on this variant rather than an ERR-DI-NNN 5xx.
 */
export async function getDiaryEntry(
  userId: string,
  id: string,
): Promise<DiaryEntryByIdResult> {
  const supabase = createCoreSupabaseClient()
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return { ok: false, error: 'NOT_FOUND' }
  }
  return { ok: true, data: data as DiaryEntryRow }
}

/**
 * Patch-update: currently only intentions. phase_id/phase_name snapshot
 * semantics on PATCH are a §8.4 commit-2 founder decision — if sealed
 * to "preserve original phase," this function does not need to change.
 * If sealed to "update to current phase," PATCH input widens and this
 * function amends. Until then, PATCH does not accept phase changes.
 */
export async function updateDiaryEntry(
  userId: string,
  id: string,
  input: UpdateDiaryEntryInput,
): Promise<UpdateDiaryEntryResult> {
  const supabase = createCoreSupabaseClient()
  const updateData: Record<string, unknown> = {}

  if (input.intentions !== undefined) {
    updateData.intentions = input.intentions
  }

  if (Object.keys(updateData).length === 0) {
    // Nothing to update — return current row as-if updated.
    // Matches the "PATCH with empty body" semantic without a DB roundtrip.
    return getDiaryEntry(userId, id)
  }

  // updated_at is maintained by the diary_entries_updated_at trigger.
  const { data, error } = await supabase
    .from('diary_entries')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    // Distinguish "row not found" (affects 0 rows) from actual DB error.
    // .single() after update returns PGRST116 when the filter matches
    // zero rows; any other error is a real failure.
    if (error.code === 'PGRST116') {
      return { ok: false, error: 'NOT_FOUND' }
    }
    console.error('[core/diary/entries] update failed:', error)
    return { ok: false, error: 'UPDATE_FAILED', message: error.message }
  }

  if (!data) {
    return { ok: false, error: 'NOT_FOUND' }
  }

  return { ok: true, data: data as DiaryEntryRow }
}

/**
 * Delete a single diary entry by id, scoped to the caller.
 */
export async function deleteDiaryEntry(
  userId: string,
  id: string,
): Promise<DeleteDiaryEntryResult> {
  const supabase = createCoreSupabaseClient()
  const { error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[core/diary/entries] delete failed:', error)
    return { ok: false, error: 'DELETE_FAILED', message: error.message }
  }

  return { ok: true }
}

/**
 * Delete every diary entry belonging to a user — bulk cascade for
 * GDPR account deletion (§8.7). Called from the Vercel cron
 * `cleanup-deleted-accounts` after the 30-day grace window expires.
 *
 * Idempotent at the row-count level: zero matching rows is still
 * `{ ok: true }`. Failure is a real Supabase error, not "no rows
 * matched." Callers on the cascade path wrap in their own try/catch
 * so a diary-specific failure does not abort the per-user loop.
 */
export async function deleteUserDiaryEntries(
  userId: string,
): Promise<DeleteUserDiaryEntriesResult> {
  const supabase = createCoreSupabaseClient()
  const { error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('user_id', userId)

  if (error) {
    console.error('[core/diary/entries] bulk delete failed:', error)
    return { ok: false, error: 'DELETE_FAILED', message: error.message }
  }

  return { ok: true }
}
