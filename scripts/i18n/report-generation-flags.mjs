#!/usr/bin/env node
/**
 * Reads bg_generation_flags (the runtime Bulgarian generation-quality safety
 * net — see apps/web/lib/ai/check-bg-output.ts and
 * .planning/i18n/MODEL_CAPABILITY_LOG.md) and prints a per-day failure-rate
 * summary plus a breakdown by flagged word, so recurring stems (e.g. the
 * съсредоточ- pattern) are visible without reading every row by hand.
 *
 * Read-only. Uses the service-role key directly against PostgREST — same
 * access pattern as the curl audit commands in .planning/SECURITY-MODEL.md.
 * No new dependency: plain fetch, no @supabase/supabase-js needed for a
 * read-only report script.
 *
 * Usage: node scripts/i18n/report-generation-flags.mjs [--days N]
 * Reads NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the
 * environment, falling back to apps/web/.env.local if unset.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnvFallback() {
  const envPath = resolve(__dirname, '../../apps/web/.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  loadEnvFallback()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (checked env and apps/web/.env.local).')
  process.exit(1)
}

const daysArg = process.argv.indexOf('--days')
const days = daysArg !== -1 ? Number(process.argv[daysArg + 1]) : 30
const since = new Date(Date.now() - days * 86_400_000).toISOString()

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/bg_generation_flags?select=created_at,source,flagged_count,flagged_words&created_at=gte.${since}&order=created_at.asc`,
  {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  }
)

if (!res.ok) {
  console.error(`Query failed: ${res.status} ${res.statusText}`)
  console.error(await res.text())
  process.exit(1)
}

const rows = await res.json()

if (rows.length === 0) {
  console.log(`No rows in the last ${days} day(s).`)
  process.exit(0)
}

// Per-day, per-source breakdown. Date bucket = UTC calendar day of created_at.
const byDay = new Map() // `${date}|${source}` -> { total, flagged }
const wordCounts = new Map() // word -> count

for (const row of rows) {
  const date = row.created_at.slice(0, 10)
  const key = `${date}|${row.source}`
  const bucket = byDay.get(key) ?? { total: 0, flagged: 0 }
  bucket.total += 1
  if (row.flagged_count > 0) bucket.flagged += 1
  byDay.set(key, bucket)

  for (const word of row.flagged_words ?? []) {
    wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
  }
}

console.log(`bg_generation_flags — last ${days} day(s), ${rows.length} generation(s) total\n`)

console.log('date        source      total  flagged  rate')
console.log('----        ------      -----  -------  ----')
for (const [key, { total, flagged }] of [...byDay.entries()].sort()) {
  const [date, source] = key.split('|')
  const rate = ((flagged / total) * 100).toFixed(1)
  console.log(
    `${date}  ${source.padEnd(10)}  ${String(total).padStart(5)}  ${String(flagged).padStart(7)}  ${rate.padStart(4)}%`
  )
}

const totalAll = rows.length
const flaggedAll = rows.filter((r) => r.flagged_count > 0).length
console.log(`\nOverall: ${flaggedAll}/${totalAll} flagged (${((flaggedAll / totalAll) * 100).toFixed(1)}%)`)

if (wordCounts.size > 0) {
  console.log('\nFlagged words by frequency (are failures concentrated on specific stems?):')
  const sorted = [...wordCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [word, count] of sorted) {
    console.log(`  ${String(count).padStart(3)}x  ${word}`)
  }
} else {
  console.log('\nNo flagged words in this window.')
}
