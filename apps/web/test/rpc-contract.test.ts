import { describe, expect, it } from 'vitest'
import { checkContract, parseFunctions, parseRpcCalls } from '../../../scripts/lib/rpc-contract.mjs'

/**
 * Unit tests for scripts/check-rpc-contract.mjs's parser/comparer. Red-first
 * case: the exact mistake that nearly shipped (a 4-argument call to a function
 * that had become 3-argument) must be reported. The live run against the real
 * tree is `pnpm run check:rpc-contract` (part of check:all).
 */

const mig = (file: string, sql: string) => ({ file, sql })

describe('parseFunctions', () => {
  it('reads parameter names and DEFAULTs; the NEWEST migration definition wins', () => {
    const fns = parseFunctions([
      mig('a.sql', 'CREATE OR REPLACE FUNCTION public.f(p_a text, p_b boolean) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;'),
      mig('b.sql', 'CREATE OR REPLACE FUNCTION public.f(p_a text, p_c integer DEFAULT 5) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;'),
    ])
    expect(fns.get('f')).toEqual({ file: 'b.sql', params: [{ name: 'p_a', hasDefault: false }, { name: 'p_c', hasDefault: true }] })
  })

  it('handles multi-line parameter lists, comments, and a function with no parameters', () => {
    const fns = parseFunctions([
      mig('a.sql', `-- comment (with parens)\nCREATE FUNCTION public.g(\n  p_x uuid, -- trailing, comma\n  p_y numeric(10, 2) DEFAULT 1.5\n) RETURNS void AS $$ BEGIN END $$ LANGUAGE plpgsql;\nCREATE FUNCTION public.h() RETURNS void AS $$ BEGIN END $$ LANGUAGE plpgsql;`),
    ])
    expect(fns.get('g')?.params).toEqual([{ name: 'p_x', hasDefault: false }, { name: 'p_y', hasDefault: true }])
    expect(fns.get('h')?.params).toEqual([])
  })
})

describe('parseRpcCalls', () => {
  it('reads literal names and object keys, including multi-line calls, shorthand keys and trailing commas', () => {
    const src = `const { data } = await supabase.rpc(\n  'my_fn',\n  {\n    p_user_id: userId,\n    p_limit,\n    'p_quoted': 1,\n  },\n)`
    const [call] = parseRpcCalls(src, 'x.ts')
    expect(call).toMatchObject({ name: 'my_fn', keys: ['p_user_id', 'p_limit', 'p_quoted'] })
  })

  it('reports (does not silently pass) calls it cannot read: dynamic name, spread, variable args', () => {
    const calls = parseRpcCalls(`supabase.rpc(name, {})\nsupabase.rpc('a', { ...args })\nsupabase.rpc('b', args)`, 'x.ts')
    expect(calls.map((c: { note?: string }) => c.note)).toEqual([
      'dynamic function name',
      'argument object uses a spread',
      'arguments are not an object literal',
    ])
  })

  it('an rpc call with no arguments object has no keys', () => {
    expect(parseRpcCalls(`supabase.rpc('nullary')`, 'x.ts')[0]).toMatchObject({ name: 'nullary', keys: [] })
  })
})

describe('checkContract', () => {
  const fns = parseFunctions([
    mig('m.sql', 'CREATE FUNCTION public.apply_birth_data_edit(p_user_id text, p_chart_id uuid, p_changes jsonb) RETURNS jsonb AS $$ SELECT 1 $$ LANGUAGE sql;'),
  ])

  it('RED-FIRST: a 4-argument call to the now-3-argument function is a violation (the mistake that nearly shipped)', () => {
    const calls = parseRpcCalls(
      `await supabase.rpc('apply_birth_data_edit', { p_user_id: u, p_chart_id: c, p_changes: ch, p_is_free: f })`,
      'core.ts',
    )
    const { violations } = checkContract(fns, calls)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatch(/unknown argument\(s\) \[p_is_free\]/)
  })

  it('a missing required argument is a violation; an omitted DEFAULT argument is fine', () => {
    const fns2 = parseFunctions([mig('m.sql', 'CREATE FUNCTION public.f(p_a text, p_b int DEFAULT 1) RETURNS int AS $$ SELECT 1 $$ LANGUAGE sql;')])
    expect(checkContract(fns2, parseRpcCalls(`s.rpc('f', {})`, 'x.ts')).violations[0]).toMatch(/missing required argument\(s\) \[p_a\]/)
    expect(checkContract(fns2, parseRpcCalls(`s.rpc('f', { p_a: 1 })`, 'x.ts')).violations).toEqual([])
  })

  it('an RPC with no migration is a violation; a matching call passes', () => {
    expect(checkContract(fns, parseRpcCalls(`s.rpc('nope', {})`, 'x.ts')).violations[0]).toMatch(/no CREATE FUNCTION/)
    expect(
      checkContract(fns, parseRpcCalls(`s.rpc('apply_birth_data_edit', { p_user_id: 1, p_chart_id: 2, p_changes: 3 })`, 'x.ts')).violations,
    ).toEqual([])
  })

  it('an unreadable call is skipped and listed, but an unknown function name is still a violation', () => {
    const { violations, skipped } = checkContract(fns, parseRpcCalls(`s.rpc('nope', { ...x })`, 'x.ts'))
    expect(skipped).toHaveLength(1)
    expect(violations[0]).toMatch(/no CREATE FUNCTION/)
  })
})
