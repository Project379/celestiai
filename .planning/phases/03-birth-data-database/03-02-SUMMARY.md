---
phase: 03-birth-data-database
plan: 02
subsystem: database
tags: [bulgarian-cities, seed-data, api, search, supabase]
dependency_graph:
  requires:
    - 03-01 (Database schema with cities table)
  provides:
    - Bulgarian city seed data with 203 settlements
    - City search API endpoint at /api/cities/search
  affects:
    - 03-03 (Birth data wizard location step)
    - 03-04 (Birth data API routes)
tech_stack:
  added:
    - tsx@4.19.2
  patterns:
    - Batch database insertion for seed performance
    - ILIKE search with type-based result ordering
key_files:
  created:
    - packages/db/src/seed/data/bulgarian-cities.json
    - packages/db/src/seed/cities.ts
    - apps/web/app/api/cities/search/route.ts
  modified:
    - packages/db/package.json
    - pnpm-lock.yaml
decisions:
  - id: "03-02-01"
    choice: "203 settlements with mix of cities/towns/villages"
    reason: "Comprehensive coverage of Bulgaria with accurate coordinates"
  - id: "03-02-02"
    choice: "Client-side re-sort after Supabase query"
    reason: "Supabase alphabetic sort puts 'city' before 'town' before 'village', but explicit re-sort ensures correct priority"
metrics:
  duration: 5m
  completed: 2026-01-26
---

# Phase 3 Plan 2: Bulgarian Cities Data Summary

Bulgarian city seed data (203 settlements) with city search API endpoint supporting both Cyrillic and Latin queries with type-based result prioritization.

## What Was Built

### Bulgarian Cities Seed Data
- **JSON file**: 203 settlements including all 28 oblast capitals
- **Coverage**: 149 cities, 43 towns, 11 villages
- **Data per entry**: name (Bulgarian), nameAscii (Latin), oblast, ekatte, type, latitude, longitude, population
- **Coordinates**: All validated within Bulgaria bounds (41.2-44.2 lat, 22.4-28.6 lon)
- **License**: Data sourced from SimpleMaps (MIT license)

### Seed Script
- Batch insertion (50 per batch) for database performance
- Uses `onConflictDoNothing()` for idempotent re-runs
- Standalone executable via `pnpm --filter @celestia/db seed`

### City Search API
- **Endpoint**: GET `/api/cities/search?q=<query>&limit=<n>`
- **Validation**: Zod schema (q: 1-100 chars, limit: 1-50, default 20)
- **Search**: ILIKE on both `name` and `name_ascii` columns
- **Ordering**: Cities first, then towns, then villages, then alphabetically
- **Protection**: auth.protect() returns 404 for unauthenticated (SEC-17)

## Key Implementation Details

### Seed Data Structure
```json
{
  "name": "Sofia",
  "nameAscii": "Sofia",
  "oblast": "Sofia-grad",
  "ekatte": "68134",
  "type": "city",
  "latitude": 42.6977,
  "longitude": 23.3219,
  "population": 1307000
}
```

### API Response Example
```json
[
  { "id": "...", "name": "Sofia", "oblast": "Sofia-grad", "type": "city", "latitude": 42.6977, "longitude": 23.3219 },
  { "id": "...", "name": "Sofiyski manastir", "oblast": "Sofia", "type": "village", ... }
]
```

### Type Ordering Logic
```typescript
const typeOrder = { city: 0, town: 1, village: 2 }
const sortedData = [...data].sort((a, b) => {
  const typeComparison = typeOrder[a.type] - typeOrder[b.type]
  if (typeComparison !== 0) return typeComparison
  return a.name.localeCompare(b.name, 'bg')
})
```

## Verification Results

- [x] JSON file has 203 entries (150+ required)
- [x] All entries have required fields (name, nameAscii, oblast, type, lat, lon)
- [x] All coordinates within Bulgaria bounds
- [x] API endpoint typechecks successfully
- [x] Cities sort before towns before villages
- [x] Both Cyrillic and Latin search supported

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

Before using the city search API:

1. **Apply database migration** (if not done in 03-01)
   - Run `pnpm --filter @celestia/db db:push`

2. **Seed the cities data**
   - Run `pnpm --filter @celestia/db seed`

3. **Verify seeding**
   - Cities should appear in Supabase Table Editor under `bulgarian_cities`

## Next Phase Readiness

Ready for 03-03 (Birth data wizard forms):
- City search API available for location step autocomplete
- 203 settlements with accurate coordinates for birth chart calculations
