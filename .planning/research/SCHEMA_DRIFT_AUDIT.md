# Schema Drift Audit — 2026-04-20

**Tool:** `apps/web/scripts/diagnostics/audit-schema-drift.mjs`
**Drizzle source of truth:** `packages/db/drizzle/meta/0009_snapshot.json` (latest committed)
**DB source of truth:** live Supabase Postgres via `DATABASE_URL`, `information_schema.columns`
**Outcome:** 13 columns drifted across 5 tables. Drizzle migrations do not represent production schema.

**Consequence:** triggers the reversal of `DRIZZLE_DECISION.md` round-11 — see §9 of that file. Strategy C (kill Drizzle, adopt Supabase CLI) adopted 2026-04-20.

---

## Raw audit output

```
Drizzle snapshot: packages/db/drizzle/meta/0009_snapshot.json
DB: postgresql://…@aws-1-eu-west-2.pooler.supabase.com:6543/postgres

[DRIFT]   charts.birth_date                drizzle=timestamp with time zone   db=date
[DRIFT]   charts.birth_time                drizzle=text                       db=time without time zone
[DRIFT]   charts.approximate_time_range    drizzle=text                       db=tstzrange
[DRIFT]   charts.latitude                  drizzle=real                       db=double precision
[DRIFT]   charts.longitude                 drizzle=real                       db=double precision
[DRIFT]   bulgarian_cities.latitude        drizzle=real                       db=double precision
[DRIFT]   bulgarian_cities.longitude       drizzle=real                       db=double precision
[DRIFT]   bulgarian_cities.population      drizzle=real                       db=integer
[DRIFT]   daily_horoscopes.date            drizzle=text                       db=date
[DRIFT]   daily_transits.date              drizzle=text                       db=date
[DRIFT]   users.subscription_tier          drizzle=text                       db=subscription_tier (PG enum)
[EXTRA IN DB]  users.subscription_status   drizzle=(not declared)             db=present in live DB
[EXTRA IN DB]  users.trial_claimed_at      drizzle=(not declared)             db=present in live DB

── per-table summary ──
  ai_readings                        10 scanned,  0 drifted  [ok]
  audit_logs                          5 scanned,  0 drifted  [ok]
  chart_calculations                  9 scanned,  0 drifted  [ok]
  charts                             13 scanned,  5 drifted  [DRIFT]
  bulgarian_cities                    9 scanned,  3 drifted  [DRIFT]
  crystal_listings                   14 scanned,  0 drifted  [ok]
  crystal_recommendations            12 scanned,  0 drifted  [ok]
  crystal_vendors                    10 scanned,  0 drifted  [ok]
  crystals                           23 scanned,  0 drifted  [ok]
  daily_horoscopes                    7 scanned,  1 drifted  [DRIFT]
  daily_transits                      4 scanned,  1 drifted  [DRIFT]
  processed_webhook_events            4 scanned,  0 drifted  [ok]
  push_subscriptions                  6 scanned,  0 drifted  [ok]
  user_crystals                       6 scanned,  0 drifted  [ok]
  user_daily_crystals                 5 scanned,  0 drifted  [ok]
  users                              10 scanned,  3 drifted  [DRIFT]

TOTAL: 13 drifted across 16 tables (147 columns scanned)
```

## Categorization

### Severe — causing runtime errors or latent data loss

1. **`charts.approximate_time_range`** — drizzle=text, db=tstzrange. Every birth-data submit with `birthTimeKnown: false` errors with Postgres `22P02 malformed range literal`. The raw Postgres error bubbles into the Bulgarian UI copy via `apps/web/app/api/birth-data/route.ts`. Zero non-null rows in production — no user has ever successfully saved through this path. Fix shipping via `supabase/migrations/` after Drizzle removal.

2. **`charts.birth_date`** — drizzle=`timestamp with time zone`, db=`date`. Writes of full ISO timestamps get silently truncated to date part. Works today because we only care about the calendar date, but a future reader expecting time-of-day info will be surprised.

3. **`charts.birth_time`** — drizzle=text, db=`time without time zone`. Writes of `"HH:MM"` strings parse cleanly by the PG time type. Reads return a Postgres-formatted time value. Works but semantically mismatched.

### Medium — precision or range mismatch, working but latent

4–7. **`charts.latitude/longitude` + `bulgarian_cities.latitude/longitude`** — drizzle=real (32-bit), db=double precision (64-bit). DB upcasts on write. No user-visible issue. If the Drizzle schema were ever the source for a regeneration, lat/lon would silently downgrade to 32-bit precision. Astrology calculations are sensitive to precision here.

8. **`bulgarian_cities.population`** — drizzle=real, db=integer. Fractional populations would truncate silently.

### Low — semantic equivalence, works today

9–10. **`daily_horoscopes.date` + `daily_transits.date`** — drizzle=text, db=date. `"YYYY-MM-DD"` strings cast cleanly. Works.

### Enum drift — schema philosophy

11. **`users.subscription_tier`** — drizzle=text, db=`subscription_tier` (Postgres enum). Writes of `"free"` / `"premium"` work via PG's string-to-enum coercion. Drizzle loses type-level enforcement but nothing uses Drizzle at runtime.

### Extra columns in DB

12. **`users.subscription_status`** — present in DB, not declared in Drizzle. Likely added by a Stripe/webhook change that bypassed the Drizzle generator.
13. **`users.trial_claimed_at`** — present in DB, not declared in Drizzle. Same pattern.

## Reproducing this audit

```bash
pnpm --filter @stellaeum/web run diag:drift
# or
node --env-file=apps/web/.env.example.local \
     apps/web/scripts/diagnostics/audit-schema-drift.mjs
```

Post-Drizzle, the audit script still works against any tracked source of truth — if `supabase/migrations/` becomes the canonical schema record, the script should be retargeted to compare `supabase/migrations/**.sql` DDL against `information_schema.columns`. For now, pointing at the last committed Drizzle snapshot still surfaces drift until Drizzle is removed.
