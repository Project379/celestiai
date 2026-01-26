import { z } from 'zod'

/**
 * Approximate time ranges for when exact birth time is unknown
 * Per CONTEXT.md specifications:
 * - morning: 06:00-12:00
 * - afternoon: 12:00-18:00
 * - evening: 18:00-24:00
 * - night: 00:00-06:00
 */
export const approximateTimeRanges = [
  'morning',
  'afternoon',
  'evening',
  'night',
] as const

export type ApproximateTimeRange = (typeof approximateTimeRanges)[number]

/**
 * Birth data validation schema with Bulgarian error messages
 * Used for both API validation (safeParse) and React Hook Form (zodResolver)
 */
export const birthDataSchema = z
  .object({
    name: z
      .string({ error: 'Molia, vavedete ime' })
      .min(1, { error: 'Molia, vavedete ime' })
      .max(100, { error: 'Imeto ne mozhe da e po-dalgo ot 100 simvola' }),

    birthDate: z
      .string({ error: 'Molia, izberete data na razhdane' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: 'Datata triabva da e vav format YYYY-MM-DD',
      })
      .refine(
        (val) => {
          const date = new Date(val)
          return !isNaN(date.getTime())
        },
        { error: 'Nevalidna data' }
      )
      .refine(
        (val) => {
          const date = new Date(val)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          return date <= today
        },
        { error: 'Datata triabva da e v minaloto' }
      ),

    birthTimeKnown: z.boolean({ error: 'Molia, posochete dali znaete chasa na razhdane' }),

    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        error: 'Chasat triabva da e vav format HH:MM',
      })
      .nullable()
      .optional(),

    approximateTimeRange: z
      .enum(approximateTimeRanges, {
        error: 'Izberete validna stoinost za priblizitelen period',
      })
      .nullable()
      .optional(),

    cityId: z.string().uuid({ error: 'Nevliden identifikator na grad' }).nullable().optional(),

    cityName: z
      .string({ error: 'Molia, izberete naseleno miasto' })
      .min(1, { error: 'Molia, izberete naseleno miasto' }),

    latitude: z
      .number({ error: 'Molia, vavedete shirina' })
      .min(-90, { error: 'Shirinata triabva da e mezhdu -90 i 90' })
      .max(90, { error: 'Shirinata triabva da e mezhdu -90 i 90' }),

    longitude: z
      .number({ error: 'Molia, vavedete dalzhina' })
      .min(-180, { error: 'Dalzhinata triabva da e mezhdu -180 i 180' })
      .max(180, { error: 'Dalzhinata triabva da e mezhdu -180 i 180' }),

    manualCoordinates: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Conditional validation: if time is known, birthTime is required
    if (data.birthTimeKnown === true) {
      if (!data.birthTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'Molia, vavedete chas ili izberete priblizitelen period',
          path: ['birthTime'],
        })
      }
    }
    // If time is unknown, approximateTimeRange is required
    if (data.birthTimeKnown === false) {
      if (!data.approximateTimeRange) {
        ctx.addIssue({
          code: 'custom',
          message: 'Molia, vavedete chas ili izberete priblizitelen period',
          path: ['approximateTimeRange'],
        })
      }
    }
  })

/**
 * TypeScript type inferred from the schema
 */
export type BirthData = z.infer<typeof birthDataSchema>

/**
 * Schema for creating new birth data
 * Same as birthDataSchema for creation operations
 */
export const createBirthDataSchema = birthDataSchema

/**
 * Schema for updating birth data
 * All fields are optional for PATCH operations
 */
export const updateBirthDataSchema = z
  .object({
    name: z
      .string()
      .min(1, { error: 'Molia, vavedete ime' })
      .max(100, { error: 'Imeto ne mozhe da e po-dalgo ot 100 simvola' })
      .optional(),

    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: 'Datata triabva da e vav format YYYY-MM-DD',
      })
      .refine(
        (val) => {
          const date = new Date(val)
          return !isNaN(date.getTime())
        },
        { error: 'Nevalidna data' }
      )
      .refine(
        (val) => {
          const date = new Date(val)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          return date <= today
        },
        { error: 'Datata triabva da e v minaloto' }
      )
      .optional(),

    birthTimeKnown: z.boolean().optional(),

    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        error: 'Chasat triabva da e vav format HH:MM',
      })
      .nullable()
      .optional(),

    approximateTimeRange: z
      .enum(approximateTimeRanges, {
        error: 'Izberete validna stoinost za priblizitelen period',
      })
      .nullable()
      .optional(),

    cityId: z.string().uuid({ error: 'Nevliden identifikator na grad' }).nullable().optional(),

    cityName: z.string().min(1, { error: 'Molia, izberete naseleno miasto' }).optional(),

    latitude: z
      .number()
      .min(-90, { error: 'Shirinata triabva da e mezhdu -90 i 90' })
      .max(90, { error: 'Shirinata triabva da e mezhdu -90 i 90' })
      .optional(),

    longitude: z
      .number()
      .min(-180, { error: 'Dalzhinata triabva da e mezhdu -180 i 180' })
      .max(180, { error: 'Dalzhinata triabva da e mezhdu -180 i 180' })
      .optional(),

    manualCoordinates: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Only validate time/range relationship if birthTimeKnown is being updated
    if (data.birthTimeKnown !== undefined) {
      if (data.birthTimeKnown === true && data.birthTime === undefined) {
        // When setting birthTimeKnown to true, birthTime should be provided
        // But we allow it to be omitted if it's already set in the database
        // This will be validated at the database level if needed
      }
      if (data.birthTimeKnown === false && data.approximateTimeRange === undefined) {
        // Similarly, allow omission if already set
      }
    }
  })

export type UpdateBirthData = z.infer<typeof updateBirthDataSchema>
