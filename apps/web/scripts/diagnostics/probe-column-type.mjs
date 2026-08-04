#!/usr/bin/env node
/**
 * probe-column-type — diagnose a cryptic Postgres error on a single
 * column by throwing canonical literals at it and reading back error
 * codes + messages.
 *
 * Use when a form submission errors with something like "malformed
 * range literal", "invalid input syntax for type X", "value too long
 * for type char", and you want to confirm the live runtime column
 * type versus whatever the ORM schema declared. Faster than querying
 * information_schema when you only care about one column.
 *
 * Configure the PROBE_* constants at the top of the file, then run:
 *   node --env-file=apps/web/.env.example.local \
 *        apps/web/scripts/diagnostics/probe-column-type.mjs
 *
 * Shipped config targets charts.approximate_time_range with the four
 * enum-ish values the birth-data form sends ("morning", "afternoon",
 * "evening", "night") plus literal shapes for every Postgres range
 * type so the precise range variant can be pinpointed if the column
 * turns out to be a range. Replace PROBE_TABLE / PROBE_COLUMN /
 * PROBE_VALUES / BASE_ROW for the next schema-drift investigation.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY via env (service
 * role bypasses RLS so the probe sees schema-level errors, not RLS
 * 0-row rejects).
 *
 * First diagnostic run used this probe to identify charts.
 * approximate_time_range as a tstzrange column that Drizzle declared
 * as text — see 2026-04-20 premium-matrix-follow-up §7 Bug 1.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(2)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── PROBE CONFIG ──────────────────────────────────────────────────
// Edit this block for the next investigation.

const PROBE_TABLE = 'charts'
const PROBE_COLUMN = 'approximate_time_range'
const PROBE_USER_ID = 'uat-probe-column-type'

/**
 * Minimum valid row shape for the table, excluding the target column.
 * Each probe merges in { [PROBE_COLUMN]: value } before inserting.
 */
const BASE_ROW = {
  user_id: PROBE_USER_ID,
  name: 'probe-column-type',
  birth_date: '1990-01-01T00:00:00Z',
  birth_time_known: false,
  latitude: 0,
  longitude: 0,
  city_name: 'Probe',
}

/**
 * FK-satisfying setup. Runs once before probes so probe errors aren't
 * dominated by FK-violation noise.
 */
async function setup() {
  await supabase
    .from('users')
    .upsert(
      { clerk_id: PROBE_USER_ID, subscription_tier: 'free' },
      { onConflict: 'clerk_id' },
    )
}

async function teardown() {
  await supabase.from(PROBE_TABLE).delete().eq('user_id', PROBE_USER_ID)
  await supabase.from('users').delete().eq('clerk_id', PROBE_USER_ID)
}

/** Values to throw at the column. Label is cosmetic, prints in log. */
const PROBE_VALUES = [
  { label: 'morning (enum value sent by birth-data form)', value: 'morning' },
  { label: 'afternoon', value: 'afternoon' },
  { label: 'evening', value: 'evening' },
  { label: 'night', value: 'night' },
  { label: 'null', value: null },
  { label: 'int4range [0,1)', value: '[0,1)' },
  { label: 'numrange [0.0,1.0)', value: '[0.0,1.0)' },
  { label: 'daterange [2024-01-01,2024-01-02)', value: '[2024-01-01,2024-01-02)' },
  {
    label: 'tsrange [2024-01-01 00:00,2024-01-02 00:00)',
    value: '[2024-01-01 00:00,2024-01-02 00:00)',
  },
  {
    label: 'tstzrange [2024-01-01 00:00+00,2024-01-02 00:00+00)',
    value: '[2024-01-01 00:00+00,2024-01-02 00:00+00)',
  },
]

// ─── end config ───────────────────────────────────────────────────

async function probeInsert({ label, value }) {
  const payload = { ...BASE_ROW, [PROBE_COLUMN]: value }
  const { data, error } = await supabase
    .from(PROBE_TABLE)
    .insert(payload)
    .select()
    .single()

  console.log(`\n--- probe: ${label} ---`)
  console.log(`payload.${PROBE_COLUMN}:`, JSON.stringify(value))
  if (error) {
    console.log('error.code:', error.code)
    console.log('error.message:', error.message)
    console.log('error.details:', error.details ?? '-')
    console.log('error.hint:', error.hint ?? '-')
  } else {
    console.log('inserted id:', data?.id)
    if (data?.id) {
      await supabase.from(PROBE_TABLE).delete().eq('id', data.id)
      console.log('(cleaned up)')
    }
  }
}

async function readExisting() {
  const { data } = await supabase
    .from(PROBE_TABLE)
    .select(`id, ${PROBE_COLUMN}`)
    .not(PROBE_COLUMN, 'is', null)
    .limit(3)
  console.log(`\n--- existing non-null ${PROBE_TABLE}.${PROBE_COLUMN} (sample up to 3) ---`)
  console.log(JSON.stringify(data ?? [], null, 2))
}

async function main() {
  console.log(`probe-column-type: ${PROBE_TABLE}.${PROBE_COLUMN}`)
  await setup()
  try {
    await readExisting()
    for (const probe of PROBE_VALUES) {
      await probeInsert(probe)
    }
  } finally {
    await teardown()
  }
}

main().catch((err) => {
  console.error('probe crashed:', err)
  teardown().finally(() => process.exit(1))
})
