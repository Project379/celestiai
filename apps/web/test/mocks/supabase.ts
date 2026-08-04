import { vi } from 'vitest'

/**
 * Minimal fake Supabase query builder for webhook/route unit tests.
 *
 * Real supabase-js query builders are thenable at every point in the chain
 * (`.eq()`, `.single()`, `.insert()` all implement PromiseLike), so `await`
 * resolves whichever chain the calling code happens to build. This mock
 * mirrors that: every chain method is a no-op returning the same builder,
 * and `.then()` resolves with whatever result was queued for that
 * `.from(table)` call. Queue results per table with `push()`; each `.from()`
 * call for a table shifts the next queued result (FIFO), so a test can
 * script a sequence like "select finds nothing, then insert succeeds" the
 * same way ensureUserRecord's real create-on-miss flow does.
 *
 * Reused across the Stripe and RevenueCat webhook suites; extend `push()`
 * calls for the remaining four risk areas (chart, oracle, GDPR, rate limit)
 * rather than building a second mock.
 */

type QueryResult = { data: unknown; error: unknown }

const CHAIN_METHODS = ['select', 'eq', 'insert', 'update', 'delete', 'single', 'maybeSingle'] as const

function makeBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {}
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder)
  }
  builder.then = (
    onFulfilled?: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onFulfilled, onRejected)
  return builder
}

export function createMockSupabase() {
  const queues = new Map<string, QueryResult[]>()

  function push(table: string, result: Partial<QueryResult>) {
    const entry: QueryResult = { data: null, error: null, ...result }
    const existing = queues.get(table) ?? []
    existing.push(entry)
    queues.set(table, existing)
  }

  const from = vi.fn((table: string) => {
    const queue = queues.get(table)
    const result = queue?.shift() ?? { data: null, error: null }
    return makeBuilder(result)
  })

  return { from, push }
}

export type MockSupabase = ReturnType<typeof createMockSupabase>
