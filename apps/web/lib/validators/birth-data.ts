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
      .string({ error: 'Моля, въведете име' })
      .min(1, { error: 'Моля, въведете име' })
      .max(100, { error: 'Името не може да е по-дълго от 100 символа' }),

    birthDate: z
      .string({ error: 'Моля, изберете дата на раждане' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: 'Датата трябва да е във формат YYYY-MM-DD',
      })
      .refine(
        (val) => {
          const date = new Date(val)
          return !isNaN(date.getTime())
        },
        { error: 'Невалидна дата' }
      )
      .refine(
        (val) => {
          const date = new Date(val)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          return date <= today
        },
        { error: 'Датата трябва да е в миналото' }
      ),

    birthTimeKnown: z.boolean({ error: 'Моля, посочете дали знаете часа на раждане' }),

    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        error: 'Часът трябва да е във формат HH:MM',
      })
      .nullable()
      .optional(),

    approximateTimeRange: z
      .enum(approximateTimeRanges, {
        error: 'Изберете валидна стойност за приблизителен период',
      })
      .nullable()
      .optional(),

    cityId: z.string().uuid({ error: 'Невалиден идентификатор на град' }).nullable().optional(),

    cityName: z
      .string({ error: 'Моля, изберете населено място' })
      .min(1, { error: 'Моля, изберете населено място' }),

    latitude: z
      .number({ error: 'Моля, въведете ширина' })
      .min(-90, { error: 'Ширината трябва да е между -90 и 90' })
      .max(90, { error: 'Ширината трябва да е между -90 и 90' }),

    longitude: z
      .number({ error: 'Моля, въведете дължина' })
      .min(-180, { error: 'Дължината трябва да е между -180 и 180' })
      .max(180, { error: 'Дължината трябва да е между -180 и 180' }),

    manualCoordinates: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Conditional validation: if time is known, birthTime is required
    if (data.birthTimeKnown === true) {
      if (!data.birthTime) {
        ctx.addIssue({
          code: 'custom',
          message: 'Моля, въведете час или изберете приблизителен период',
          path: ['birthTime'],
        })
      }
    }
    // If time is unknown, approximateTimeRange is required
    if (data.birthTimeKnown === false) {
      if (!data.approximateTimeRange) {
        ctx.addIssue({
          code: 'custom',
          message: 'Моля, въведете час или изберете приблизителен период',
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
      .min(1, { error: 'Моля, въведете име' })
      .max(100, { error: 'Името не може да е по-дълго от 100 символа' })
      .optional(),

    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        error: 'Датата трябва да е във формат YYYY-MM-DD',
      })
      .refine(
        (val) => {
          const date = new Date(val)
          return !isNaN(date.getTime())
        },
        { error: 'Невалидна дата' }
      )
      .refine(
        (val) => {
          const date = new Date(val)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          return date <= today
        },
        { error: 'Датата трябва да е в миналото' }
      )
      .optional(),

    birthTimeKnown: z.boolean().optional(),

    birthTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        error: 'Часът трябва да е във формат HH:MM',
      })
      .nullable()
      .optional(),

    approximateTimeRange: z
      .enum(approximateTimeRanges, {
        error: 'Изберете валидна стойност за приблизителен период',
      })
      .nullable()
      .optional(),

    cityId: z.string().uuid({ error: 'Невалиден идентификатор на град' }).nullable().optional(),

    cityName: z.string().min(1, { error: 'Моля, изберете населено място' }).optional(),

    latitude: z
      .number()
      .min(-90, { error: 'Ширината трябва да е между -90 и 90' })
      .max(90, { error: 'Ширината трябва да е между -90 и 90' })
      .optional(),

    longitude: z
      .number()
      .min(-180, { error: 'Дължината трябва да е между -180 и 180' })
      .max(180, { error: 'Дължината трябва да е между -180 и 180' })
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
