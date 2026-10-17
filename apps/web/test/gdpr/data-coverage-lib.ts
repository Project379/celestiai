/**
 * Pure helpers for the data-coverage gate (test/gdpr/data-coverage.test.ts).
 *
 * The gate answers one question mechanically: does every table that holds a
 * user's data appear in (a) the account-deletion path and (b) the GDPR export?
 * "Holds a user's data" = the table has a user-owned column, found by reading the
 * SQL migrations (supabase/migrations). A new table in a new migration therefore
 * lands in the gate automatically; nobody has to remember a checklist.
 *
 * LIMITS (stated, not hidden):
 *  - Only tables with a CREATE TABLE in a tracked migration are visible. The 16
 *    Drizzle-era tables were captured by 20260826150000_capture_untracked_tables.sql,
 *    so they are; a future table created by hand in the dashboard is invisible
 *    (MIGRATION-PROCESS-GAP in .planning/PLACEHOLDERS.md).
 *  - "In the deletion path" means the source contains `.from('<table>')` in the
 *    cleanup cron, the diary deletion helper or the delete-account route, OR the
 *    owner column is a foreign key to users(clerk_id) ON DELETE CASCADE (the cron
 *    ends by deleting the users row). Likewise "in the export" means
 *    `.from('<table>')` in the export route. It does not prove the query is correct.
 */

/** Columns that mean "this row belongs to / was created by a user". */
const OWNER_COLUMN = /^(user_id|clerk_id|clerk_user_id|owner_id|requested_by|generated_by|created_by|invited_by|[a-z_]*_user_id)$/

export type Coverage = {
  /** table -> its owner columns, for every table that has one */
  owned: Record<string, string[]>
  /** table -> true when an owner column cascades from users(clerk_id) */
  cascadesFromUsers: Record<string, boolean>
}

function stripComments(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of body) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) parts.push(cur)
  return parts
}

const CASCADE_FROM_USERS = /references\s+(?:public\.)?"?users"?\s*\(\s*clerk_id\s*\)\s*on\s+delete\s+cascade/i

/** Read tables and their owner columns out of an ordered list of migration files. */
export function analyzeMigrations(migrations: string[]): Coverage {
  const columns: Record<string, Set<string>> = {}
  const cascades: Record<string, Set<string>> = {}
  const dropped = new Set<string>()
  const add = (t: string, c: string) => (columns[t] ??= new Set()).add(c)

  for (const raw of migrations) {
    const sql = stripComments(raw)

    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?\s*\(/gi)) {
      const table = m[1]!
      let depth = 1
      let i = m.index! + m[0].length
      const start = i
      while (depth > 0 && i < sql.length) {
        if (sql[i] === '(') depth++
        if (sql[i] === ')') depth--
        i++
      }
      for (const def of splitTopLevel(sql.slice(start, i - 1))) {
        const trimmed = def.trim()
        const col = /^"?(\w+)"?\s+[a-z]/i.exec(trimmed)?.[1]
        if (col && !/^(primary|foreign|unique|constraint|check|exclude)$/i.test(col)) {
          add(table, col)
          if (OWNER_COLUMN.test(col) && CASCADE_FROM_USERS.test(trimmed)) (cascades[table] ??= new Set()).add(col)
        }
        const fk = /foreign\s+key\s*\(\s*"?(\w+)"?\s*\)\s*references[\s\S]*$/i.exec(trimmed)
        if (fk && CASCADE_FROM_USERS.test(trimmed)) (cascades[table] ??= new Set()).add(fk[1]!)
      }
    }

    for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?(\w+)"?\s+add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?([^;]*)/gi)) {
      add(m[1]!, m[2]!)
      if (OWNER_COLUMN.test(m[2]!) && CASCADE_FROM_USERS.test(m[3]!)) (cascades[m[1]!] ??= new Set()).add(m[2]!)
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?"?(\w+)"?\s+add\s+(?:constraint\s+\w+\s+)?foreign\s+key\s*\(\s*"?(\w+)"?\s*\)([^;]*)/gi)) {
      if (CASCADE_FROM_USERS.test(m[3]!)) (cascades[m[1]!] ??= new Set()).add(m[2]!)
    }
    for (const m of sql.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi)) dropped.add(m[1]!)
  }

  const owned: Record<string, string[]> = {}
  const cascadesFromUsers: Record<string, boolean> = {}
  for (const [table, cols] of Object.entries(columns)) {
    if (dropped.has(table)) continue
    const ownerCols = [...cols].filter((c) => OWNER_COLUMN.test(c)).sort()
    if (ownerCols.length === 0) continue
    owned[table] = ownerCols
    cascadesFromUsers[table] = ownerCols.some((c) => cascades[table]?.has(c))
  }
  return { owned, cascadesFromUsers }
}

const fromCall = (table: string) => new RegExp(`from\\(\\s*['"]${table}['"]\\s*\\)`)

export type AllowlistEntry = { deletion?: string; export?: string }

export type Gap = { table: string; missing: 'deletion' | 'export'; ownerColumns: string[] }

/**
 * Tables with an owner column that are missing from the deletion path or the export
 * and are NOT covered by an allowlist entry for that side.
 */
export function findCoverageGaps(
  coverage: Coverage,
  deletionSource: string,
  exportSource: string,
  allowlist: Record<string, AllowlistEntry>,
): Gap[] {
  const gaps: Gap[] = []
  for (const [table, ownerColumns] of Object.entries(coverage.owned)) {
    const inDeletion = fromCall(table).test(deletionSource) || coverage.cascadesFromUsers[table] === true
    const inExport = fromCall(table).test(exportSource)
    if (!inDeletion && !allowlist[table]?.deletion) gaps.push({ table, missing: 'deletion', ownerColumns })
    if (!inExport && !allowlist[table]?.export) gaps.push({ table, missing: 'export', ownerColumns })
  }
  return gaps
}

/** Allowlist hygiene: entries must name real tables, carry a real reason, and not be stale. */
export function findAllowlistProblems(
  coverage: Coverage,
  deletionSource: string,
  exportSource: string,
  allowlist: Record<string, AllowlistEntry>,
): string[] {
  const problems: string[] = []
  for (const [table, entry] of Object.entries(allowlist)) {
    if (!coverage.owned[table]) {
      problems.push(`${table}: allowlisted but has no owner column in any migration (typo, dropped table, or no longer needed)`)
      continue
    }
    for (const side of ['deletion', 'export'] as const) {
      const reason = entry[side]
      if (reason === undefined) continue
      if (reason.trim().length < 20) problems.push(`${table}.${side}: reason too short to be a reason`)
      const covered =
        side === 'deletion'
          ? fromCall(table).test(deletionSource) || coverage.cascadesFromUsers[table] === true
          : fromCall(table).test(exportSource)
      if (covered) problems.push(`${table}.${side}: allowlisted but the table IS covered now — remove the allowlist entry`)
    }
  }
  return problems
}
