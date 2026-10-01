#!/usr/bin/env node
/**
 * test-birth-data-edit-migration — proves 20261001160000_birth_data_edit_invalidation.sql
 * does what the founder-approved design says, against the REAL production
 * schema and data, inside one BEGIN/ROLLBACK transaction (nothing persists).
 *
 *   node --env-file=apps/web/.env.local apps/web/scripts/diagnostics/test-birth-data-edit-migration.mjs
 *   node --env-file=apps/web/.env.local apps/web/scripts/diagnostics/test-birth-data-edit-migration.mjs --naive
 *
 * `--naive` applies the WRONG migration (ADD COLUMN ... NOT NULL DEFAULT now())
 * instead of the file. It exists to prove the backfill test can fail: against
 * the naive variant "existing readings are NOT stale" must be RED. Run it
 * first; then run without the flag, which must be all green.
 *
 * Trap this avoids (advisor): inside one transaction now() is constant, so
 * fixtures written with default timestamps would equal a DEFAULT now() marker
 * and the naive run would pass for the wrong reason. The backfill test
 * therefore counts EXISTING production rows (real past generated_at values);
 * the RPC tests use explicit/clock_timestamp() ordering.
 *
 * Exit: 0 all pass · 1 any assertion failed · 2 setup error.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const NAIVE = process.argv.includes('--naive')
const MIGRATION = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../supabase/migrations/20261001160000_birth_data_edit_invalidation.sql',
)
const ROLLBACK = '__ROLLBACK__'

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL')
  process.exit(2)
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 15 })

let failed = 0
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
  if (!ok) failed++
}

try {
  await sql.begin(async (tx) => {
    await run(tx)
    // Unconditional rollback — NOTHING in this script may ever commit to production.
    throw new Error(ROLLBACK)
  }).catch((e) => {
    if (e?.message !== ROLLBACK) throw e
  })
} catch (e) {
  console.error('SETUP ERROR:', e)
  await sql.end()
  process.exit(2)
}
await sql.end()
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed === 0 ? 0 : 1)

async function run(tx) {
  {
    // ── apply the migration (or the naive variant) ──────────────────────
    if (NAIVE) {
      console.log('── NAIVE variant: ADD COLUMN birth_data_edited_at NOT NULL DEFAULT now() ──')
      await tx.unsafe(
        'ALTER TABLE public.charts ADD COLUMN birth_data_edited_at timestamptz NOT NULL DEFAULT now()',
      )
    } else {
      console.log('── applying the real migration file ──')
      await tx.unsafe(readFileSync(MIGRATION, 'utf8'))
    }

    // ── 1. backfill: existing derived rows are NOT stale after the migration ─
    const [{ n: readings }] = await tx`select count(*)::int n from public.ai_readings`
    const [{ n: staleReadings }] = await tx`
      select count(*)::int n from public.ai_readings r
      join public.charts c on c.id = r.chart_id where r.generated_at < c.birth_data_edited_at`
    const [{ n: staleHoro }] = await tx`
      select count(*)::int n from public.daily_horoscopes h
      join public.charts c on c.id = h.chart_id where h.generated_at < c.birth_data_edited_at`
    check('non-vacuous: production has existing readings to test against', readings > 0, `${readings} ai_readings`)
    check('existing readings are NOT stale right after the migration', staleReadings === 0, `${staleReadings} stale`)
    check('existing daily horoscopes are NOT stale right after the migration', staleHoro === 0, `${staleHoro} stale`)
    if (NAIVE) return // the remaining checks need the real function

    // ── fixtures (rolled back) ──────────────────────────────────────────
    const U = 'test_user_bde_' + Date.now()
    await tx`insert into public.users (clerk_id) values (${U})`
    const mk = async (name, createdAt) =>
      (await tx`
        insert into public.charts (user_id, name, city_name, latitude, longitude, birth_date, birth_time, birth_time_known, created_at)
        values (${U}, ${name}, 'София', 42.6977, 23.3219, '1990-03-14', '08:30', true, ${createdAt})
        returning id`)[0].id
    const older = await mk('older', '2026-01-01T00:00:00Z')
    const active = await mk('active', '2026-02-01T00:00:00Z') // latest created_at => the active chart
    const edit = async (chartId, changes, isFree = false) =>
      (await tx`select public.apply_birth_data_edit(${U}, ${chartId}, ${tx.json(changes)}, ${isFree}) r`)[0].r
    const marker = async (id) => (await tx`select birth_data_edited_at m from public.charts where id=${id}`)[0].m

    // ── 2. name-only and no-op edits never bump the marker ──────────────
    const before = await marker(active)
    let r = await edit(active, { name: 'renamed' })
    check('name-only edit: birth_data_changed=false, marker untouched',
      r.birth_data_changed === false && (await marker(active)).getTime() === before.getTime())
    r = await edit(active, { birth_date: '1990-03-14T00:00:00.000Z', birth_time: '08:30', latitude: 42.6977 })
    check('no-op birth edit (same values): not an invalidating edit', r.birth_data_changed === false && r.quota_exempt === false)
    const [{ n: ledger0 }] = await tx`select count(*)::int n from public.birth_data_edits where user_id=${U}`
    check('no edit rows recorded for name-only / no-op saves', ledger0 === 0, `${ledger0} rows`)

    // ── 3. quota exemption: first 2 invalidating edits exempt, third is NOT ─
    const e1 = await edit(active, { birth_date: '1990-03-15T00:00:00.000Z' })
    const e2 = await edit(active, { birth_date: '1990-03-16T00:00:00.000Z' })
    const e3 = await edit(active, { birth_date: '1990-03-17T00:00:00.000Z' })
    check('edit 1 on the active chart is quota-exempt', e1.birth_data_changed && e1.quota_exempt === true)
    check('edit 2 on the active chart is quota-exempt', e2.quota_exempt === true)
    check('THIRD edit inside 30 days is NOT quota-exempt (claims quota normally)', e3.birth_data_changed && e3.quota_exempt === false)
    // The "triggering edit" of a stale row = the chart's LATEST edit, whose edited_at
    // equals the chart's marker. Compared in SQL: a JS Date would truncate the
    // marker's microseconds and make an equality lookup miss.
    const [trig] = await tx`
      select e.quota_exempt, (e.edited_at = c.birth_data_edited_at) is_marker
      from public.birth_data_edits e join public.charts c on c.id = e.chart_id
      where e.chart_id = ${active} order by e.edited_at desc limit 1`
    check('triggering edit (latest; edited_at == marker) carries quota_exempt=false',
      trig?.is_marker === true && trig?.quota_exempt === false)

    // ── 4. non-active chart: never exempt, never regrants ───────────────
    await tx`update public.users set free_oracle_used_at = now() where clerk_id=${U}`
    const o = await edit(older, { birth_date: '1991-01-01T00:00:00.000Z' }, true)
    check('edit to a NON-active chart: quota_exempt=false', o.birth_data_changed && o.quota_exempt === false)
    check('edit to a NON-active chart: no free regrant', o.regrant_granted === false)

    // ── 5. free regrant: once ever, active chart only ───────────────────
    await tx`delete from public.birth_data_edits where chart_id=${active}` // reset exemption window for clarity
    const g1 = await edit(active, { birth_date: '1992-01-01T00:00:00.000Z' }, true)
    const [u1] = await tx`select free_oracle_used_at u, free_oracle_edit_regrant_used_at g from public.users where clerk_id=${U}`
    check('first active edit by a free user who used their reading grants the regrant',
      g1.regrant_granted === true && u1.u === null && u1.g !== null)
    await tx`update public.users set free_oracle_used_at = now() where clerk_id=${U}` // they spend the new reading
    const g2 = await edit(active, { birth_date: '1992-01-02T00:00:00.000Z' }, true)
    const [u2] = await tx`select free_oracle_used_at u from public.users where clerk_id=${U}`
    check('later edit: regrant NOT granted again (once ever); reading stays used/locked',
      g2.regrant_granted === false && u2.u !== null)

    // ── 6. staleness ordering ──────────────────────────────────────────
    await tx`insert into public.ai_readings (chart_id, user_id, topic, content, expires_at, model_version, generated_at)
             values (${active}, ${U}, 'general', 'old', now() + interval '7 days', 't', ${new Date(Date.now() - 86400000).toISOString()})`
    await edit(active, { birth_date: '1993-01-01T00:00:00.000Z' })
    const [{ stale }] = await tx`
      select (r.generated_at < c.birth_data_edited_at) stale from public.ai_readings r
      join public.charts c on c.id=r.chart_id where r.chart_id=${active} and r.topic='general'`
    check('a reading generated before an edit is stale after it', stale === true)

    // ── 7. derived caches: calc dropped, uncollected recs dropped, collected kept ─
    const [crystal] = await tx`select id from public.crystals limit 1`
    if (crystal) {
      await tx`insert into public.crystal_recommendations (user_id, chart_id, crystal_id, trigger_type, reason_code, reason_text_en, valid_from, valid_until, collected_at)
               values (${U}, ${active}, ${crystal.id}, 'natal', 'bde_collected', 'x', now(), now() + interval '1 day', now()),
                      (${U}, ${active}, ${crystal.id}, 'natal', 'bde_uncollected', 'x', now(), now() + interval '1 day', null)`
      await edit(active, { birth_date: '1994-01-01T00:00:00.000Z' })
      const recs = await tx`select reason_code from public.crystal_recommendations where user_id=${U} order by 1`
      check('uncollected crystal recommendation deleted, collected one kept',
        recs.length === 1 && recs[0].reason_code === 'bde_collected', JSON.stringify(recs.map((x) => x.reason_code)))
    } else {
      console.log('SKIP  crystal recommendation check (no crystals rows)')
    }

    // ── 8. security posture ────────────────────────────────────────────
    const [rls] = await tx`select relrowsecurity r from pg_class where oid='public.birth_data_edits'::regclass`
    const [pol] = await tx`select count(*)::int n from pg_policies where schemaname='public' and tablename='birth_data_edits'`
    check('birth_data_edits has RLS enabled and ZERO policies (service-role only)', rls.r === true && pol.n === 0)
    const sig = 'public.apply_birth_data_edit(text,uuid,jsonb,boolean)'
    const [pr] = await tx`select has_function_privilege('anon', ${sig}, 'EXECUTE') a,
                                 has_function_privilege('authenticated', ${sig}, 'EXECUTE') b,
                                 has_function_privilege('service_role', ${sig}, 'EXECUTE') s`
    check('apply_birth_data_edit: anon/authenticated cannot execute, service_role can', !pr.a && !pr.b && pr.s)
  }
}
