import { vi } from 'vitest'

export interface Query {
  table: string
  filters: Record<string, unknown>
  operation: string
  values?: Record<string, unknown>
  columns?: string
}

/** Execute at await-time so concurrent queries retain their own filters. */
export function mockSupabase(resolve: (query: Query) => { data?: unknown; error?: unknown }) {
  const queries: Query[] = []
  const from = vi.fn((table: string) => {
    const query: Query = { table, filters: {}, operation: 'select' }
    const chain = {
      select(columns?: string) { query.columns = columns; return chain },
      eq(key: string, value: unknown) { query.filters[key] = value; return chain },
      in(key: string, value: unknown) { query.filters[key] = value; return chain },
      gte(key: string, value: unknown) { query.filters[key] = value; return chain },
      order() { return chain },
      limit() { return chain },
      maybeSingle() { return chain },
      single() { return chain },
      insert(values: Record<string, unknown>) { query.operation = 'insert'; query.values = values; return chain },
      update(values: Record<string, unknown>) { query.operation = 'update'; query.values = values; return chain },
      upsert(values: Record<string, unknown>) { query.operation = 'upsert'; query.values = values; return chain },
      then(onfulfilled: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) {
        queries.push(query)
        return Promise.resolve().then(() => ({ data: null, error: null, ...resolve(query) })).then(onfulfilled, onrejected)
      },
    }
    return chain
  })
  return { from, queries }
}
