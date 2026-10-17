import { z } from 'zod'

export const DIARY_TIMEZONE_DEFAULT = 'Europe/Sofia'
export const DIARY_CONTENT_VERSION = 1
export const DIARY_TEXT_MAX = 20_000
export const DIARY_PAGE_SIZE = 20
export const diaryFeelingSchema = z.enum(['sad', 'anxious', 'mixed', 'calm', 'joyful'])
export type DiaryFeeling = z.infer<typeof diaryFeelingSchema>

export const diaryEntryKindSchema = z.enum([
  'legacy_lunar',
  'check_in',
  'note',
  'lunar_practice',
])
export const diaryEntryStatusSchema = z.enum(['draft', 'completed'])
export const diaryTopicSchema = z.enum([
  'work',
  'relationships',
  'health',
  'progress',
  'other',
])
export const diaryStepStatusSchema = z.enum(['pending', 'done', 'carried', 'let_go'])
export const diarySourceTypeSchema = z.enum(['today', 'moon', 'oracle', 'circle', 'crystal'])

const optionalText = (max: number) => z.string().trim().max(max).nullable()

export const diarySourceSchema = z.object({
  type: diarySourceTypeSchema,
  id: z.string().max(160).nullable().default(null),
  label: z.string().trim().min(1).max(160),
  path: z.string().startsWith('/').max(300).nullable().default(null),
})

export const diaryNextStepSchema = z.object({
  text: z.string().trim().min(1).max(500),
  status: diaryStepStatusSchema.default('pending'),
  revisitOn: z.string().date().nullable().default(null),
})

export const checkInIterationSchema = z.object({
  topic: diaryTopicSchema,
  direction: z.enum(['express', 'understand', 'step', 'calm', 'support', 'appreciate']),
  questionId: z.string().max(80),
  question: z.string().max(500),
  answer: z.string().max(DIARY_TEXT_MAX),
  skippedQuestionIds: z.array(z.string().max(80)).max(10).default([]),
})

export const checkInContentSchema = z.object({
  version: z.literal(DIARY_CONTENT_VERSION),
  feeling: diaryFeelingSchema.nullable().optional(),
  flowVersion: z.enum(['check-in-v1', 'check-in-v2', 'check-in-v3']),
  currentStep: z.enum(['mood', 'topic', 'reflection', 'direction', 'another', 'close']),
  focusTopic: diaryTopicSchema.nullable().optional(),
  questionVersion: z.number().int().positive().optional(),
  skippedQuestionIds: z.array(z.string().max(80)).max(10).optional(),
  reflectionQuestionId: z.string().max(80).nullable(),
  reflectionQuestion: z.string().max(500).nullable(),
  reflectionAnswer: z.string().max(DIARY_TEXT_MAX),
  direction: z.enum(['express', 'understand', 'step', 'calm', 'support', 'appreciate', 'finish']).nullable(),
  detailQuestion: z.string().max(500).nullable(),
  detailAnswer: z.string().max(DIARY_TEXT_MAX),
  iterations: z.array(checkInIterationSchema).max(8).optional(),
})

export const noteContentSchema = z.object({
  version: z.literal(DIARY_CONTENT_VERSION),
  feeling: diaryFeelingSchema.nullable().optional(),
  body: z.string().max(DIARY_TEXT_MAX),
})

const lunarAnswersSchema = z.tuple([
  z.string().max(2_000),
  z.string().max(2_000),
  z.string().max(2_000),
])

export const lunarPracticeContentSchema = z.object({
  version: z.literal(DIARY_CONTENT_VERSION),
  feeling: diaryFeelingSchema.nullable().optional(),
  promptId: z.string().max(100),
  promptVersion: z.literal(1),
  heading: z.string().max(200),
  lead: z.string().max(1_000),
  fieldLabels: z.tuple([z.string().max(120), z.string().max(120), z.string().max(120)]),
  answers: lunarAnswersSchema,
})

export const legacyLunarContentSchema = z.object({
  version: z.literal(DIARY_CONTENT_VERSION),
  intentions: lunarAnswersSchema,
})

export type CheckInContent = z.infer<typeof checkInContentSchema>
export type CheckInIteration = z.infer<typeof checkInIterationSchema>
export type NoteContent = z.infer<typeof noteContentSchema>
export type LunarPracticeContent = z.infer<typeof lunarPracticeContentSchema>
export type DiaryContent = CheckInContent | NoteContent | LunarPracticeContent

const createDiaryEntryV2BaseSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(['check_in', 'note', 'lunar_practice']),
  status: diaryEntryStatusSchema,
  occurredAt: z.string().datetime({ offset: true }),
  entryDate: z.string().date(),
  timezone: z.string().trim().min(1).max(80),
  title: optionalText(200).default(null),
  mood: z.number().int().min(1).max(5).nullable().default(null),
  topics: z.array(diaryTopicSchema).max(5).default([]),
  content: z.union([checkInContentSchema, noteContentSchema, lunarPracticeContentSchema]),
  phaseId: optionalText(80).default(null),
  phaseName: optionalText(120).default(null),
  promptId: optionalText(100).default(null),
  promptVersion: z.number().int().positive().nullable().default(null),
  source: diarySourceSchema.nullable().default(null),
  relatedEntryId: z.string().uuid().nullable().default(null),
  nextStep: diaryNextStepSchema.nullable().default(null),
})

export const createDiaryEntryV2Schema = createDiaryEntryV2BaseSchema.superRefine((value, ctx) => {
  const contentMatches =
    (value.kind === 'check_in' && checkInContentSchema.safeParse(value.content).success) ||
    (value.kind === 'note' && noteContentSchema.safeParse(value.content).success) ||
    (value.kind === 'lunar_practice' && lunarPracticeContentSchema.safeParse(value.content).success)
  if (!contentMatches) {
    ctx.addIssue({ code: 'custom', path: ['content'], message: 'Съдържанието не съответства на вида запис' })
  }
  if (value.status === 'completed') {
    const hasText = value.kind === 'check_in'
      ? checkInContentSchema.parse(value.content).reflectionAnswer.trim().length > 0 ||
        checkInContentSchema.parse(value.content).detailAnswer.trim().length > 0 ||
        checkInContentSchema.parse(value.content).iterations?.some((iteration) => iteration.answer.trim().length > 0) === true
      : value.kind === 'note'
        ? noteContentSchema.parse(value.content).body.trim().length > 0
        : lunarPracticeContentSchema.parse(value.content).answers.some((answer) => answer.trim().length > 0)
    if (!hasText && value.mood === null) {
      ctx.addIssue({ code: 'custom', path: ['content'], message: 'Добави текст или настроение' })
    }
  }
})

export const updateDiaryEntryV2Schema = createDiaryEntryV2BaseSchema
  .omit({ id: true, kind: true, occurredAt: true, entryDate: true, timezone: true })
  .partial()
  .extend({
    revision: z.number().int().positive(),
    content: z.union([
      checkInContentSchema,
      noteContentSchema,
      lunarPracticeContentSchema,
      legacyLunarContentSchema,
    ]).optional(),
  })

export const deleteDiaryEntryV2Schema = z.object({ revision: z.coerce.number().int().positive() })

export const diaryListQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  kind: diaryEntryKindSchema.optional(),
  mood: z.coerce.number().int().min(1).max(5).optional(),
  topic: diaryTopicSchema.optional(),
  status: diaryEntryStatusSchema.optional(),
  query: z.string().trim().max(120).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export const diaryReminderPreferenceSchema = z.object({
  enabled: z.boolean(),
  localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().trim().min(1).max(80),
})

export interface DiaryEntryV2 {
  id: string
  kind: z.infer<typeof diaryEntryKindSchema>
  status: z.infer<typeof diaryEntryStatusSchema>
  occurredAt: string
  entryDate: string
  timezone: string
  title: string | null
  mood: number | null
  topics: z.infer<typeof diaryTopicSchema>[]
  content: DiaryContent | Record<string, unknown>
  phaseId: string | null
  phaseName: string | null
  promptId: string | null
  promptVersion: number | null
  source: z.infer<typeof diarySourceSchema> | null
  relatedEntryId: string | null
  nextStep: z.infer<typeof diaryNextStepSchema> | null
  revision: number
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface DiaryEntryPage {
  entries: DiaryEntryV2[]
  nextCursor: string | null
}

export interface DiaryWeeklySummary {
  from: string
  to: string
  entryCount: number
  moods: Record<string, number>
  feelings?: Record<string, number>
  topics: Record<string, number>
  practices: Record<string, number>
  steps: Record<string, number>
}

export const diaryEntryV2Schema = z.object({
  id: z.string().uuid(),
  kind: diaryEntryKindSchema,
  status: diaryEntryStatusSchema,
  occurredAt: z.string().datetime({ offset: true }),
  entryDate: z.string().date(),
  timezone: z.string(),
  title: z.string().nullable(),
  mood: z.number().int().min(1).max(5).nullable(),
  topics: z.array(diaryTopicSchema),
  content: z.record(z.string(), z.unknown()),
  phaseId: z.string().nullable(),
  phaseName: z.string().nullable(),
  promptId: z.string().nullable(),
  promptVersion: z.number().int().positive().nullable(),
  source: diarySourceSchema.nullable(),
  relatedEntryId: z.string().uuid().nullable(),
  nextStep: diaryNextStepSchema.nullable(),
  revision: z.number().int().positive(),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
})

export const diaryEntryPageSchema = z.object({
  entries: z.array(diaryEntryV2Schema),
  nextCursor: z.string().nullable(),
})

export const diaryWeeklySummarySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
  entryCount: z.number().int().nonnegative(),
  moods: z.record(z.string(), z.number().int().nonnegative()),
  feelings: z.record(z.string(), z.number().int().nonnegative()).default({}),
  topics: z.record(z.string(), z.number().int().nonnegative()),
  practices: z.record(z.string(), z.number().int().nonnegative()),
  steps: z.record(z.string(), z.number().int().nonnegative()),
})

export type CreateDiaryEntryV2Input = z.infer<typeof createDiaryEntryV2Schema>
export type UpdateDiaryEntryV2Input = z.infer<typeof updateDiaryEntryV2Schema>
export type DiaryListQuery = z.infer<typeof diaryListQuerySchema>
export type DiaryReminderPreferenceInput = z.infer<typeof diaryReminderPreferenceSchema>
