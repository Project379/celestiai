# Movie and book recommendations

## Product cadence

- One movie per Sofia calendar day.
- One book per Sofia calendar month.
- One reroll per slot and period. The database function
  `reroll_media_recommendation` enforces this atomically.
- Astrology is the primary ranking input; explicit user taste is secondary.
- Marking a title watched/read is neutral. Taste changes only through a
  liked/okay/disliked reaction or an explicit “not for me” reroll.

## Data flow

1. A bounded monthly job imports provider payloads into
   `recommendation_source_records` and records the run.
2. Provider adapters normalize candidates into `recommendation_works` and
   `recommendation_assets`. Automated imports remain `draft` and
   `review_required`.
3. Review/annotation adds editorial copy, verifies safety flags, improves the
   trait vector, and changes eligible records to `published` + `approved`.
4. The API hard-filters media type, safety, metadata quality, and environment
   rights before ranking.
5. A selected work becomes an immutable delivery snapshot. Save, consumption,
   reroll, and sentiment events update the cross-device preference state.

## Annotation model

Works are annotated with a compact 0–1 vector:

| Trait | What it describes |
| --- | --- |
| `wonder` | Awe, imagination, or sense of discovery |
| `reflection` | Introspection and interpretive depth |
| `comfort` | Emotional gentleness and restorative quality |
| `connection` | Relationships, community, and belonging |
| `courage` | Agency, challenge, and forward movement |
| `renewal` | Change, healing, and new beginnings |
| `curiosity` | Ideas, mystery, learning, and exploration |
| `playfulness` | Humor and lightness |
| `intensity` | Emotional pressure (not a quality score) |
| `pace` | Narrative momentum |

The system does not label a work “for Aries” or “for a full moon.” Instead, an
astrological context produces a temporary target vector. Ranking measures the
fit between that target and ordinary editorial traits, which keeps the catalog
explainable and reusable as the astrology model evolves.

## Safety gate

A recommendable work must have:

- `safety_status = approved`;
- `content_flags.verified = true`;
- zero `explicit_sexual`, `graphic_violence`, and `gross_out` flags;
- `publication_status = published`;
- metadata quality of at least 70.

Unknown values fail closed. Provider adult flags and genre heuristics can reject
or prioritize review, but can never approve a title automatically.

## Development operation

Apply `supabase/migrations/20260831180000_media_recommendations.sql`, then set:

```dotenv
RECOMMENDATION_RIGHTS_MODE=development
TMDB_API_READ_TOKEN=...
```

The migration includes a small reviewed development catalog so the feature is
usable immediately. `/api/cron/recommendation-catalog` runs at 04:00 UTC on the
first day of each month and imports a bounded candidate batch. TMDB is skipped
when its token is absent; Open Library still imports book candidates.

The importer never overwrites human-reviewed traits, safety decisions, or
publication status on later syncs. It only refreshes raw provenance for an
existing work.

## Commercial transition

Use a new source/license record for contracted provider data and artwork. Do
not mutate historical development records to claim commercial rights. Set
`RECOMMENDATION_RIGHTS_MODE=commercial` in production; the selector will then
return only `commercial` or `both` works and assets. See `docs/licensing.md` for
the launch gate.

## Test and audit follow-up (2026-09-08)

Core Vitest suites now exercise service tier redaction on both fresh and stored
deliveries, rights filters on works and assets, production/development defaults,
Sofia summer and winter month boundaries, empty-catalog and database-error paths,
ranking safety and taste, and import provider/write failures and editorial-field
preservation. Compatibility tests cover aspect/orb boundaries, weighted scores,
composite midpoints, and unknown birth times. Unknown-time charts no longer
contribute unreliable house overlap to the shared-values score.

### Environment and provider decision

Both variables are already declared in `turbo.json` globalPassThroughEnv and
`apps/web/.env.example`. The TMDB token is optional for the cron: without it,
Open Library imports books only. It cannot replenish the daily movie catalog.
Imports are drafts, so a successful import does not itself replenish either
published recommendation pool.

`development` is a development setting, not a long-term commercial-launch
solution. The production fallback to `commercial` is intentional; an empty
commercial catalog needs cleared content, not a weaker rights filter.
[TMDB's current FAQ](https://developer.themoviedb.org/docs/faq) requires a
commercial arrangement for revenue-oriented projects. The repository does not
record such an arrangement. [Open Library's licensing statement](https://openlibrary.org/developers/licensing)
does not assert new proprietary rights over its database; that alone does not
establish permission for every underlying cover image. The existing
development-only, unverified-cover policy remains in place pending clearance.

The requested fetch/validate versus write split and `?probe=1` expansion remain
deferred until the provider/rights decision, as requested. The current probe
still checks authentication and token presence only. A future read-only probe
can verify provider authentication, payload shape and source/license reads; it
cannot prove an upsert succeeds without a separate database write test. The
current importer also treats missing `results`/`docs` arrays as empty results;
the future validation stage must reject malformed envelopes explicitly.

### Birth-chart edits and recommendation snapshots

Recommendations do not use `ai_readings`. They persist in
`recommendation_deliveries`. Active lookup and uniqueness use user, slot and
period, not chart ID or chart version. `updateBirthChart` invalidates
`chart_calculations` only. Therefore editing a birth date or selecting another
chart keeps the existing movie/book and its old explanation through the current
period. The overview's personalization header is recomputed, so it can describe
the new sun sign alongside an old delivery. A characterization test records
this behavior; it is not an assertion that this is the desired product policy.

The ranking algorithm currently uses birth date-derived sun sign, lunar phase,
and taste, not a full natal chart. Time/location-only edits therefore do not
change its current ranking inputs. A manual reroll uses current inputs but
consumes the period's one reroll. The next period also uses current inputs.

Recommended follow-up: define chart-edit refresh semantics, then version delivery
context and replace stale active snapshots atomically while preserving feedback
and the reroll allowance. Simply deleting deliveries would lose history and
could reset quotas; marking them replaced alone conflicts with the existing
user/slot/period/revision uniqueness constraint on reinsertion. No such schema
or product-policy change is included in this test pass.

### Saved-profile birth-date investigation

The profile creation route writes explicit UTC midnight to the timestamptz RPC.
`buildSavedProfileComputation` parses the complete returned timestamp with
`new Date`, and the astrology utilities use UTC year/month/day. Equivalent
UTC, Sofia (+03), and negative-offset (-07, previous local day) representations
produce identical full natal charts in a real-calculator regression test.
The reported off-by-one was not reproduced on this application path.

This is not a live PostgreSQL session round-trip test or an audit of historical
rows written by other clients. If the column is later migrated to `date`, use
`(birth_date AT TIME ZONE 'UTC')::date`, as the main-chart migration does, rather
than a session-dependent bare cast. Historical non-midnight values should be
investigated before such a migration.
