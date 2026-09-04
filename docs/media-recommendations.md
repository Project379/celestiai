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

