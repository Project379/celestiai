import { z } from 'zod'

/**
 * Diary endpoint validators (§8.4).
 *
 * Matches the Bulgarian-error register established in `birth-data.ts`:
 * terse, declarative, no technical jargon. Field errors surface to the
 * user as 400 responses shaped `{ error: 'Невалидни данни', details: {...} }`
 * per the POST /api/birth-data handler pattern.
 *
 * §8.2-sealed bounds this implements:
 *   - Decision A2 — entry_date is client-submitted; Zod enforces a
 *     self-contained future bound (≤ today + 1 day). The additional
 *     "≥ users.created_at" bound lives in the route handler (DB lookup
 *     required; Zod can't see it). Both bounds surface through the same
 *     400-response Bulgarian-error channel.
 *   - Decision B — exactly 3 intentions, each 1..500 chars. Zod is the
 *     user-facing voice; the DB CHECK constraints are a silent guardrail
 *     that surface as ERR-DI-003 (generic write failed) if ever tripped.
 *   - Decision D — phase_id validated as the 8-member LunarPhaseId enum.
 *     Kept in sync manually with the DB COMMENT on diary_entries.phase_id.
 *
 * Reference: .planning/phases/08-diary-persistence/08-02-SCHEMA.md.
 */

// Hardcoded to the 8 LunarPhaseId values the DB COMMENT documents.
// Cross-package import avoided so the validator module stays lean and
// runtime-free of core-side moon-phase logic; the cost is that adding a
// new phase requires updating this list + the DB COMMENT in lockstep.
const LUNAR_PHASE_IDS = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
] as const

const ENTRY_DATE_FUTURE_SLACK_MS = 24 * 60 * 60 * 1000 // 1 day

const entryDateSchema = z
  .string({ error: 'Моля, посочи дата' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    error: 'Датата трябва да е във формат YYYY-MM-DD',
  })
  .refine(
    (val) => !Number.isNaN(new Date(val + 'T00:00:00Z').getTime()),
    { error: 'Невалидна дата' },
  )
  .refine(
    (val) => {
      const [y, m, d] = val.split('-').map(Number)
      const entryUtc = Date.UTC(y!, m! - 1, d!)
      return entryUtc <= Date.now() + ENTRY_DATE_FUTURE_SLACK_MS
    },
    {
      error: 'Датата е твърде напред във времето',
    },
  )

const intentionSchema = z
  .string({ error: 'Моля, попълни и трите намерения' })
  .min(1, { error: 'Моля, попълни и трите намерения' })
  .max(500, { error: 'Текстът е твърде дълъг — макс. 500 символа' })

const intentionsTupleSchema = z.tuple(
  [intentionSchema, intentionSchema, intentionSchema],
  { error: 'Намеренията трябва да са точно три' },
)

const phaseIdSchema = z.enum(LUNAR_PHASE_IDS, {
  error: 'Невалидна лунна фаза',
})

const phaseNameSchema = z
  .string({ error: 'Липсва име на лунната фаза' })
  .min(1, { error: 'Липсва име на лунната фаза' })
  .max(100, { error: 'Името на фазата е твърде дълго' })

/**
 * POST /api/diary/entries — create-or-update for (user_id, entry_date).
 * The upsert semantic is enforced at DB level by the UNIQUE
 * (user_id, entry_date) constraint; the route handler reports whether
 * the row was created vs updated via the HTTP status.
 */
export const createDiaryEntrySchema = z.object({
  entryDate: entryDateSchema,
  phaseId: phaseIdSchema,
  phaseName: phaseNameSchema,
  intentions: intentionsTupleSchema,
})

export type CreateDiaryEntryBody = z.infer<typeof createDiaryEntrySchema>

/**
 * PATCH /api/diary/entries/[id] — partial update.
 *
 * Current scope: only intentions are updatable. phase_id/phase_name
 * snapshot semantics on PATCH are a §8.4 commit-2 founder decision;
 * this schema will widen if the decision goes toward "update to
 * current phase on re-write," otherwise stays intentions-only.
 */
export const updateDiaryEntrySchema = z.object({
  intentions: intentionsTupleSchema.optional(),
})

export type UpdateDiaryEntryBody = z.infer<typeof updateDiaryEntrySchema>
