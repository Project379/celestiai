/**
 * RPC contract: do the `.rpc('name', { args })` call sites in the code match the
 * newest `CREATE [OR REPLACE] FUNCTION public.name(<params>)` in
 * supabase/migrations? (VERIFICATION-SURFACE-GAPS.md §14.)
 *
 * Why this exists: route/core tests run against a mocked Supabase client whose
 * rpc() returns whatever was queued for a function NAME, whatever arguments are
 * passed. So a call with the wrong arity or a renamed argument is invisible to
 * the test suite and 500s in production on first use. This is a static,
 * database-free, network-free check that closes exactly that gap between the
 * code and the migration FILES. It does NOT prove the migration is applied in
 * production (audit-hand-applied-schema.mjs covers that, on demand).
 *
 * Pure functions (no I/O) so they are unit-testable; scripts/check-rpc-contract.mjs
 * does the file walking.
 */

function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

/** Split `s` at top-level commas (ignoring commas inside (), [], {} and quotes). */
function splitTopLevel(s) {
  const parts = []
  let depth = 0
  let quote = null
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quote) {
      cur += c
      if (c === '\\' && quote !== "'") { cur += s[++i] ?? '' } else if (c === quote) quote = null
      continue
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; cur += c; continue }
    if (c === '(' || c === '[' || c === '{') depth++
    if (c === ')' || c === ']' || c === '}') depth--
    if (c === ',' && depth === 0) { parts.push(cur); cur = ''; continue }
    cur += c
  }
  if (cur.trim()) parts.push(cur)
  return parts
}

/**
 * Newest definition per function from migration files given in ORDER
 * ([{ file, sql }], oldest first). Returns Map<name, { params, file }> where
 * params = [{ name, hasDefault }].
 */
export function parseFunctions(migrations) {
  const functions = new Map()
  for (const { file, sql } of migrations) {
    const text = stripSqlComments(sql)
    const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?"?([a-zA-Z_][\w]*)"?\s*\(/gi
    let m
    while ((m = re.exec(text))) {
      const name = m[1]
      let i = re.lastIndex
      let depth = 1
      const start = i
      while (i < text.length && depth > 0) {
        if (text[i] === '(') depth++
        else if (text[i] === ')') depth--
        i++
      }
      const inner = text.slice(start, i - 1).trim()
      const params = inner
        ? splitTopLevel(inner).map((raw) => {
            const tokens = raw.trim().split(/\s+/)
            let k = 0
            if (/^(IN|OUT|INOUT|VARIADIC)$/i.test(tokens[0])) k = 1
            const pname = tokens[k].replace(/"/g, '')
            return { name: pname, hasDefault: /\bDEFAULT\b|(^|\s)=(\s|$)/i.test(raw) }
          })
        : []
      functions.set(name, { params, file }) // later migration wins
    }
  }
  return functions
}

/**
 * Finds `.rpc('name', { ... })` call sites in a TS/TSX source. Returns
 * [{ file, line, name, keys: string[] | null, note?: string }] where keys is null
 * when the argument list could not be statically read (spread, variable, dynamic
 * name) — those are reported as skipped, never silently passed.
 */
export function parseRpcCalls(source, file) {
  const calls = []
  const re = /\.rpc\(\s*/g
  let m
  while ((m = re.exec(source))) {
    const line = source.slice(0, m.index).split('\n').length
    let i = re.lastIndex
    const q = source[i]
    if (q !== "'" && q !== '"' && q !== '`') {
      calls.push({ file, line, name: null, keys: null, note: 'dynamic function name' })
      continue
    }
    const end = source.indexOf(q, i + 1)
    const name = source.slice(i + 1, end)
    i = end + 1
    // after the name: `,` then an object literal, or `)`
    while (/\s/.test(source[i] ?? '')) i++
    if (source[i] === ')') { calls.push({ file, line, name, keys: [] }); continue }
    if (source[i] !== ',') { calls.push({ file, line, name, keys: null, note: 'unreadable arguments' }); continue }
    i++
    while (/\s/.test(source[i] ?? '')) i++
    if (source[i] !== '{') { calls.push({ file, line, name, keys: null, note: 'arguments are not an object literal' }); continue }
    // read the balanced object literal
    let depth = 0
    let j = i
    let quote = null
    for (; j < source.length; j++) {
      const c = source[j]
      if (quote) { if (c === '\\') j++; else if (c === quote) quote = null; continue }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue }
      if (c === '/' && source[j + 1] === '/') { j = source.indexOf('\n', j); if (j < 0) break; continue }
      if (c === '/' && source[j + 1] === '*') { j = source.indexOf('*/', j) + 1; continue }
      if (c === '{' || c === '(' || c === '[') depth++
      else if (c === '}' || c === ')' || c === ']') { depth--; if (depth === 0) break }
    }
    const body = source.slice(i + 1, j)
    const entries = splitTopLevel(
      body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1'),
    )
      .map((e) => e.trim())
      .filter(Boolean)
    if (entries.some((e) => e.startsWith('...'))) {
      calls.push({ file, line, name, keys: null, note: 'argument object uses a spread' })
      continue
    }
    const keys = entries.map((e) => {
      const km = /^(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*(?::|$)/.exec(e)
      return km ? (km[1] ?? km[2] ?? km[3]) : null
    })
    if (keys.some((k) => k === null)) {
      calls.push({ file, line, name, keys: null, note: 'argument object has a computed key' })
      continue
    }
    calls.push({ file, line, name, keys })
  }
  return calls
}

/** Compare call sites with the function definitions. Returns { violations, skipped }. */
export function checkContract(functions, calls) {
  const violations = []
  const skipped = []
  for (const c of calls) {
    const where = `${c.file}:${c.line}`
    if (c.name === null || c.keys === null) {
      skipped.push(`${where} .rpc(${c.name ?? '?'}) — ${c.note}`)
      if (c.name === null) continue
      if (!functions.has(c.name)) violations.push(`${where} .rpc('${c.name}') — no CREATE FUNCTION for it in supabase/migrations`)
      continue
    }
    const fn = functions.get(c.name)
    if (!fn) {
      violations.push(`${where} .rpc('${c.name}') — no CREATE FUNCTION for it in supabase/migrations`)
      continue
    }
    const known = new Set(fn.params.map((p) => p.name))
    const unknown = c.keys.filter((k) => !known.has(k))
    const missing = fn.params.filter((p) => !p.hasDefault && !c.keys.includes(p.name)).map((p) => p.name)
    if (unknown.length || missing.length) {
      violations.push(
        `${where} .rpc('${c.name}') does not match ${fn.file}: ` +
          (unknown.length ? `unknown argument(s) [${unknown.join(', ')}] ` : '') +
          (missing.length ? `missing required argument(s) [${missing.join(', ')}] ` : '') +
          `(function takes: ${fn.params.map((p) => p.name + (p.hasDefault ? '?' : '')).join(', ') || 'no arguments'})`,
      )
    }
  }
  return { violations, skipped }
}
