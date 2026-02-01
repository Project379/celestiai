import { z } from 'zod'

/**
 * Schema for chart calculation API request
 * Only requires chartId - birth data is fetched from the database
 */
export const chartCalculationSchema = z.object({
  chartId: z.string().uuid({ error: 'Невалиден идентификатор' }),
})

export type ChartCalculationInput = z.infer<typeof chartCalculationSchema>
