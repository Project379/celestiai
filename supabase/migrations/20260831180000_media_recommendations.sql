-- Provider-neutral movie/book recommendations.
--
-- Catalog metadata is deliberately separated from user deliveries and from
-- image/license provenance. The first catalog below is DEVELOPMENT-ONLY: it
-- gives local and preview deployments a useful vertical slice while keeping a
-- hard rights boundary that a future commercial launch can enforce.

CREATE TABLE IF NOT EXISTS public.recommendation_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  provider_kind text NOT NULL
    CONSTRAINT recommendation_sources_provider_kind_check
      CHECK (provider_kind IN ('api', 'dump', 'manual')),
  terms_url text,
  rights_scope text NOT NULL DEFAULT 'development'
    CONSTRAINT recommendation_sources_rights_scope_check
      CHECK (rights_scope IN ('development', 'commercial', 'both')),
  attribution_required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  notes text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recommendation_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  display_name text NOT NULL,
  license_url text,
  permits_commercial_use boolean,
  permits_derivatives boolean,
  attribution_required boolean NOT NULL DEFAULT false,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_licenses_raw_metadata_object
    CHECK (jsonb_typeof(raw_metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS public.recommendation_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL
    CONSTRAINT recommendation_import_runs_source_id_fkey
      REFERENCES public.recommendation_sources(id),
  status text NOT NULL DEFAULT 'running'
    CONSTRAINT recommendation_import_runs_status_check
      CHECK (status IN ('running', 'completed', 'failed')),
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  records_seen integer NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
  records_upserted integer NOT NULL DEFAULT 0 CHECK (records_upserted >= 0),
  records_rejected integer NOT NULL DEFAULT 0 CHECK (records_rejected >= 0),
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT recommendation_import_runs_cursor_object
    CHECK (jsonb_typeof(cursor) = 'object')
);

CREATE TABLE IF NOT EXISTS public.recommendation_source_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL
    CONSTRAINT recommendation_source_records_source_id_fkey
      REFERENCES public.recommendation_sources(id) ON DELETE CASCADE,
  import_run_id uuid
    CONSTRAINT recommendation_source_records_import_run_id_fkey
      REFERENCES public.recommendation_import_runs(id) ON DELETE SET NULL,
  source_external_id text NOT NULL,
  raw_payload jsonb NOT NULL,
  content_hash text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_source_records_source_external_unique
    UNIQUE (source_id, source_external_id)
);

CREATE INDEX IF NOT EXISTS recommendation_source_records_fetched_idx
  ON public.recommendation_source_records(source_id, fetched_at DESC);

CREATE TABLE IF NOT EXISTS public.recommendation_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL
    CONSTRAINT recommendation_works_source_id_fkey
      REFERENCES public.recommendation_sources(id),
  source_record_id uuid
    CONSTRAINT recommendation_works_source_record_id_fkey
      REFERENCES public.recommendation_source_records(id) ON DELETE SET NULL,
  source_external_id text NOT NULL,
  source_url text,
  media_type text NOT NULL
    CONSTRAINT recommendation_works_media_type_check
      CHECK (media_type IN ('movie', 'book')),
  canonical_title text NOT NULL,
  title_bg text,
  original_title text,
  creator_display text NOT NULL,
  release_year integer
    CONSTRAINT recommendation_works_release_year_check
      CHECK (release_year BETWEEN 1000 AND 2200),
  original_language text,
  description_en text,
  description_bg text,
  tagline_en text,
  tagline_bg text,
  duration_minutes integer
    CONSTRAINT recommendation_works_duration_check
      CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  page_count integer
    CONSTRAINT recommendation_works_page_count_check
      CHECK (page_count IS NULL OR page_count > 0),
  genres text[] NOT NULL DEFAULT '{}',
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  age_rating text,
  safety_status text NOT NULL DEFAULT 'review_required'
    CONSTRAINT recommendation_works_safety_status_check
      CHECK (safety_status IN ('approved', 'rejected', 'review_required')),
  rights_scope text NOT NULL DEFAULT 'development'
    CONSTRAINT recommendation_works_rights_scope_check
      CHECK (rights_scope IN ('development', 'commercial', 'both')),
  publication_status text NOT NULL DEFAULT 'draft'
    CONSTRAINT recommendation_works_publication_status_check
      CHECK (publication_status IN ('draft', 'published', 'archived')),
  metadata_quality smallint NOT NULL DEFAULT 0
    CONSTRAINT recommendation_works_metadata_quality_check
      CHECK (metadata_quality BETWEEN 0 AND 100),
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_works_source_external_unique
    UNIQUE (source_id, source_external_id),
  CONSTRAINT recommendation_works_traits_object
    CHECK (jsonb_typeof(traits) = 'object'),
  CONSTRAINT recommendation_works_content_flags_object
    CHECK (jsonb_typeof(content_flags) = 'object'),
  CONSTRAINT recommendation_works_media_length_check
    CHECK (
      publication_status <> 'published'
      OR
      (media_type = 'movie' AND duration_minutes IS NOT NULL AND page_count IS NULL)
      OR
      (media_type = 'book' AND page_count IS NOT NULL AND duration_minutes IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS recommendation_works_eligibility_idx
  ON public.recommendation_works(media_type, publication_status, safety_status, rights_scope);
CREATE INDEX IF NOT EXISTS recommendation_works_genres_idx
  ON public.recommendation_works USING gin(genres);
CREATE INDEX IF NOT EXISTS recommendation_works_traits_idx
  ON public.recommendation_works USING gin(traits);

CREATE TABLE IF NOT EXISTS public.recommendation_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id uuid NOT NULL
    CONSTRAINT recommendation_assets_work_id_fkey
      REFERENCES public.recommendation_works(id) ON DELETE CASCADE,
  source_id uuid NOT NULL
    CONSTRAINT recommendation_assets_source_id_fkey
      REFERENCES public.recommendation_sources(id),
  license_id uuid
    CONSTRAINT recommendation_assets_license_id_fkey
      REFERENCES public.recommendation_licenses(id),
  asset_type text NOT NULL
    CONSTRAINT recommendation_assets_asset_type_check
      CHECK (asset_type IN ('poster', 'cover')),
  remote_url text NOT NULL,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  language text,
  attribution_text text,
  rights_scope text NOT NULL DEFAULT 'development'
    CONSTRAINT recommendation_assets_rights_scope_check
      CHECK (rights_scope IN ('development', 'commercial', 'both')),
  license_verified boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_assets_work_url_unique UNIQUE (work_id, remote_url),
  CONSTRAINT recommendation_assets_provider_metadata_object
    CHECK (jsonb_typeof(provider_metadata) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS recommendation_assets_one_primary_idx
  ON public.recommendation_assets(work_id, asset_type)
  WHERE is_primary;

CREATE TABLE IF NOT EXISTS public.recommendation_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CONSTRAINT recommendation_deliveries_user_id_fkey
      REFERENCES public.users(clerk_id) ON DELETE CASCADE,
  chart_id uuid
    CONSTRAINT recommendation_deliveries_chart_id_fkey
      REFERENCES public.charts(id) ON DELETE SET NULL,
  work_id uuid NOT NULL
    CONSTRAINT recommendation_deliveries_work_id_fkey
      REFERENCES public.recommendation_works(id),
  slot text NOT NULL
    CONSTRAINT recommendation_deliveries_slot_check
      CHECK (slot IN ('daily_movie', 'monthly_book')),
  period_key text NOT NULL,
  revision smallint NOT NULL DEFAULT 0
    CONSTRAINT recommendation_deliveries_revision_check CHECK (revision IN (0, 1)),
  status text NOT NULL DEFAULT 'active'
    CONSTRAINT recommendation_deliveries_status_check
      CHECK (status IN ('active', 'replaced')),
  previous_delivery_id uuid
    CONSTRAINT recommendation_deliveries_previous_delivery_id_fkey
      REFERENCES public.recommendation_deliveries(id),
  reroll_reason text
    CONSTRAINT recommendation_deliveries_reroll_reason_check
      CHECK (reroll_reason IS NULL OR reroll_reason IN ('already_consumed', 'not_interested', 'not_now')),
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_deliveries_period_revision_unique
    UNIQUE (user_id, slot, period_key, revision),
  CONSTRAINT recommendation_deliveries_explanation_object
    CHECK (jsonb_typeof(explanation) = 'object'),
  CONSTRAINT recommendation_deliveries_score_detail_object
    CHECK (jsonb_typeof(score_detail) = 'object'),
  CONSTRAINT recommendation_deliveries_context_snapshot_object
    CHECK (jsonb_typeof(context_snapshot) = 'object'),
  CONSTRAINT recommendation_deliveries_previous_revision_check
    CHECK (
      (revision = 0 AND previous_delivery_id IS NULL)
      OR
      (revision = 1 AND previous_delivery_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS recommendation_deliveries_one_active_idx
  ON public.recommendation_deliveries(user_id, slot, period_key)
  WHERE status = 'active';
CREATE INDEX IF NOT EXISTS recommendation_deliveries_user_recent_idx
  ON public.recommendation_deliveries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_deliveries_work_idx
  ON public.recommendation_deliveries(work_id);

CREATE TABLE IF NOT EXISTS public.user_recommendation_work_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CONSTRAINT user_recommendation_work_states_user_id_fkey
      REFERENCES public.users(clerk_id) ON DELETE CASCADE,
  work_id uuid NOT NULL
    CONSTRAINT user_recommendation_work_states_work_id_fkey
      REFERENCES public.recommendation_works(id) ON DELETE CASCADE,
  last_delivery_id uuid
    CONSTRAINT user_recommendation_work_states_last_delivery_id_fkey
      REFERENCES public.recommendation_deliveries(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new'
    CONSTRAINT user_recommendation_work_states_status_check
      CHECK (status IN ('new', 'saved', 'consumed', 'dismissed')),
  sentiment text
    CONSTRAINT user_recommendation_work_states_sentiment_check
      CHECK (sentiment IS NULL OR sentiment IN ('liked', 'okay', 'disliked')),
  consumed_before_recommendation boolean NOT NULL DEFAULT false,
  first_recommended_at timestamptz,
  last_recommended_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_recommendation_work_states_user_work_unique UNIQUE (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS user_recommendation_work_states_user_status_idx
  ON public.user_recommendation_work_states(user_id, status);

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CONSTRAINT recommendation_events_user_id_fkey
      REFERENCES public.users(clerk_id) ON DELETE CASCADE,
  delivery_id uuid
    CONSTRAINT recommendation_events_delivery_id_fkey
      REFERENCES public.recommendation_deliveries(id) ON DELETE SET NULL,
  work_id uuid NOT NULL
    CONSTRAINT recommendation_events_work_id_fkey
      REFERENCES public.recommendation_works(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CONSTRAINT recommendation_events_event_type_check
      CHECK (event_type IN (
        'delivered', 'rerolled', 'saved', 'unsaved', 'consumed',
        'unconsumed', 'sentiment_set'
      )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommendation_events_metadata_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS recommendation_events_user_created_idx
  ON public.recommendation_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_events_work_idx
  ON public.recommendation_events(user_id, work_id);

-- Catalog and rights tables are internal: all reads go through the server
-- service client so development-only assets can never leak through a direct
-- anonymous table query. User tables expose owner SELECT only; all mutations
-- stay behind the rate-limited server API so clients cannot forge deliveries,
-- feedback events, or extra rerolls.
ALTER TABLE public.recommendation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recommendation_work_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendation_deliveries_owner_all ON public.recommendation_deliveries;
DROP POLICY IF EXISTS recommendation_deliveries_owner_select ON public.recommendation_deliveries;
CREATE POLICY recommendation_deliveries_owner_select
  ON public.recommendation_deliveries FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');

DROP POLICY IF EXISTS user_recommendation_work_states_owner_all ON public.user_recommendation_work_states;
DROP POLICY IF EXISTS user_recommendation_work_states_owner_select ON public.user_recommendation_work_states;
CREATE POLICY user_recommendation_work_states_owner_select
  ON public.user_recommendation_work_states FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');

DROP POLICY IF EXISTS recommendation_events_owner_all ON public.recommendation_events;
DROP POLICY IF EXISTS recommendation_events_owner_select ON public.recommendation_events;
CREATE POLICY recommendation_events_owner_select
  ON public.recommendation_events FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');

CREATE OR REPLACE FUNCTION public.set_recommendation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS recommendation_sources_set_updated_at ON public.recommendation_sources;
CREATE TRIGGER recommendation_sources_set_updated_at
  BEFORE UPDATE ON public.recommendation_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_recommendation_updated_at();
DROP TRIGGER IF EXISTS recommendation_licenses_set_updated_at ON public.recommendation_licenses;
CREATE TRIGGER recommendation_licenses_set_updated_at
  BEFORE UPDATE ON public.recommendation_licenses
  FOR EACH ROW EXECUTE FUNCTION public.set_recommendation_updated_at();
DROP TRIGGER IF EXISTS recommendation_works_set_updated_at ON public.recommendation_works;
CREATE TRIGGER recommendation_works_set_updated_at
  BEFORE UPDATE ON public.recommendation_works
  FOR EACH ROW EXECUTE FUNCTION public.set_recommendation_updated_at();
DROP TRIGGER IF EXISTS recommendation_assets_set_updated_at ON public.recommendation_assets;
CREATE TRIGGER recommendation_assets_set_updated_at
  BEFORE UPDATE ON public.recommendation_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_recommendation_updated_at();
DROP TRIGGER IF EXISTS user_recommendation_work_states_set_updated_at ON public.user_recommendation_work_states;
CREATE TRIGGER user_recommendation_work_states_set_updated_at
  BEFORE UPDATE ON public.user_recommendation_work_states
  FOR EACH ROW EXECUTE FUNCTION public.set_recommendation_updated_at();

-- Atomic one-reroll transition. The row lock and revision check make two
-- simultaneous taps converge on one replacement instead of consuming two.
CREATE OR REPLACE FUNCTION public.reroll_media_recommendation(
  p_user_id text,
  p_delivery_id uuid,
  p_work_id uuid,
  p_reroll_reason text,
  p_explanation jsonb,
  p_score_detail jsonb,
  p_context_snapshot jsonb
)
RETURNS public.recommendation_deliveries
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_delivery public.recommendation_deliveries;
  replacement public.recommendation_deliveries;
BEGIN
  IF p_reroll_reason NOT IN ('already_consumed', 'not_interested', 'not_now') THEN
    RAISE EXCEPTION 'invalid reroll reason' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO current_delivery
  FROM public.recommendation_deliveries
  WHERE id = p_delivery_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'recommendation delivery not found' USING ERRCODE = 'P0002';
  END IF;
  IF current_delivery.status <> 'active' OR current_delivery.revision <> 0 THEN
    RAISE EXCEPTION 'reroll already used' USING ERRCODE = 'P0001';
  END IF;
  IF current_delivery.work_id = p_work_id THEN
    RAISE EXCEPTION 'replacement must be a different work' USING ERRCODE = '22023';
  END IF;

  UPDATE public.recommendation_deliveries
  SET status = 'replaced', reroll_reason = p_reroll_reason
  WHERE id = current_delivery.id;

  INSERT INTO public.recommendation_deliveries (
    user_id, chart_id, work_id, slot, period_key, revision, status,
    previous_delivery_id, explanation, score_detail, context_snapshot
  ) VALUES (
    current_delivery.user_id, current_delivery.chart_id, p_work_id,
    current_delivery.slot, current_delivery.period_key, 1, 'active',
    current_delivery.id, p_explanation, p_score_detail, p_context_snapshot
  ) RETURNING * INTO replacement;

  INSERT INTO public.user_recommendation_work_states (
    user_id, work_id, last_delivery_id, status,
    first_recommended_at, last_recommended_at
  ) VALUES (
    p_user_id, replacement.work_id, replacement.id, 'new', now(), now()
  )
  ON CONFLICT (user_id, work_id) DO UPDATE SET
    last_delivery_id = EXCLUDED.last_delivery_id,
    last_recommended_at = EXCLUDED.last_recommended_at;

  INSERT INTO public.recommendation_events (
    user_id, delivery_id, work_id, event_type, metadata
  ) VALUES (
    p_user_id,
    replacement.id,
    replacement.work_id,
    'delivered',
    jsonb_build_object('slot', replacement.slot, 'periodKey', replacement.period_key, 'revision', 1)
  );

  IF p_reroll_reason IN ('already_consumed', 'not_interested') THEN
    INSERT INTO public.user_recommendation_work_states (
      user_id, work_id, last_delivery_id, status,
      consumed_before_recommendation, first_recommended_at, last_recommended_at
    ) VALUES (
      p_user_id,
      current_delivery.work_id,
      current_delivery.id,
      CASE WHEN p_reroll_reason = 'already_consumed' THEN 'consumed' ELSE 'dismissed' END,
      p_reroll_reason = 'already_consumed',
      current_delivery.created_at,
      now()
    )
    ON CONFLICT (user_id, work_id) DO UPDATE SET
      last_delivery_id = EXCLUDED.last_delivery_id,
      status = EXCLUDED.status,
      consumed_before_recommendation =
        public.user_recommendation_work_states.consumed_before_recommendation
        OR EXCLUDED.consumed_before_recommendation,
      last_recommended_at = EXCLUDED.last_recommended_at;
  END IF;

  INSERT INTO public.recommendation_events (
    user_id, delivery_id, work_id, event_type, metadata
  ) VALUES (
    p_user_id,
    current_delivery.id,
    current_delivery.work_id,
    'rerolled',
    jsonb_build_object(
      'reason', p_reroll_reason,
      'replacementDeliveryId', replacement.id,
      'replacementWorkId', replacement.work_id
    )
  );

  RETURN replacement;
END;
$$;

REVOKE ALL ON FUNCTION public.reroll_media_recommendation(text, uuid, uuid, text, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reroll_media_recommendation(text, uuid, uuid, text, jsonb, jsonb, jsonb)
  TO service_role;

-- Development provider records. These rows are intentionally explicit
-- about their non-commercial scope; commercial mode will never select them.
INSERT INTO public.recommendation_sources (
  id, code, display_name, provider_kind, terms_url, rights_scope,
  attribution_required, active, notes
) VALUES
  ('10000000-0000-4000-8000-000000000001', 'tmdb-development', 'TMDB development API', 'api',
   'https://www.themoviedb.org/api-terms-of-use', 'development', true, true,
   'Development-only until a commercial agreement explicitly covers metadata and images.'),
  ('10000000-0000-4000-8000-000000000002', 'open-library-development', 'Open Library', 'api',
   'https://openlibrary.org/developers/api', 'development', true, true,
   'Development discovery source. Cover copyright is not assumed from API availability.'),
  ('10000000-0000-4000-8000-000000000003', 'stellaeum-editorial', 'Stellaeum editorial', 'manual',
   NULL, 'both', false, true, 'Original summaries, safety review, and recommendation traits.');

INSERT INTO public.recommendation_licenses (
  id, code, display_name, license_url, permits_commercial_use,
  permits_derivatives, attribution_required, raw_metadata
) VALUES
  ('11000000-0000-4000-8000-000000000001', 'tmdb-api-development', 'TMDB API development terms',
   'https://www.themoviedb.org/api-terms-of-use', false, false, true,
   '{"verification":"provider agreement required before commercial launch"}'::jsonb),
  ('11000000-0000-4000-8000-000000000002', 'open-library-cover-unverified', 'Open Library cover source (underlying rights unverified)',
   'https://openlibrary.org/dev/docs/api/covers', NULL, NULL, true,
   '{"verification":"underlying cover rights require review before commercial launch"}'::jsonb);

-- Curated safe seed. Descriptions and traits are Stellaeum-authored; source
-- IDs and images remain provider-attributed development data.
INSERT INTO public.recommendation_works (
  id, source_id, source_external_id, source_url, media_type,
  canonical_title, title_bg, original_title, creator_display, release_year,
  original_language, description_bg, tagline_bg, duration_minutes, page_count,
  genres, traits, content_flags, age_rating, safety_status, rights_scope,
  publication_status, metadata_quality
) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '329865', 'https://www.themoviedb.org/movie/329865', 'movie',
   'Arrival', 'Първи контакт', 'Arrival', 'Дени Вилньов', 2016, 'en',
   'Езиковед се опитва да разбере посетители от друг свят, докато самото ѝ усещане за време започва да се променя.',
   'Тиха научна фантастика за общуването, избора и начина, по който любовта променя времето.', 116, NULL,
   ARRAY['science_fiction','drama'],
   '{"wonder":0.95,"reflection":0.95,"comfort":0.35,"connection":0.85,"courage":0.65,"renewal":0.55,"curiosity":1.0,"playfulness":0.1,"intensity":0.65,"pace":0.35}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":2,"substance_abuse":0,"verified":true}',
   'PG-13', 'approved', 'development', 'published', 94),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '508442', 'https://www.themoviedb.org/movie/508442', 'movie',
   'Soul', 'За душата', 'Soul', 'Пийт Доктър', 2020, 'en',
   'Музикант попада отвъд познатия живот и открива, че смисълът не винаги е голямата цел, която преследваме.',
   'Топъл, забавен разговор за призванието и малките причини да бъдем тук.', 101, NULL,
   ARRAY['animation','family','fantasy'],
   '{"wonder":0.85,"reflection":0.9,"comfort":0.9,"connection":0.75,"courage":0.45,"renewal":0.9,"curiosity":0.75,"playfulness":0.75,"intensity":0.25,"pace":0.55}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":1,"substance_abuse":0,"verified":true}',
   'PG', 'approved', 'development', 'published', 96),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '116745', 'https://www.themoviedb.org/movie/116745', 'movie',
   'The Secret Life of Walter Mitty', 'Тайният живот на Уолтър Мити', 'The Secret Life of Walter Mitty', 'Бен Стилър', 2013, 'en',
   'Мечтател напуска сигурния си ритъм и тръгва по истинска следа, която го отвежда много по-далеч от очакваното.',
   'Приключение за онзи момент, в който въображението най-сетне става действие.', 114, NULL,
   ARRAY['adventure','comedy','drama'],
   '{"wonder":0.85,"reflection":0.55,"comfort":0.7,"connection":0.55,"courage":1.0,"renewal":0.9,"curiosity":0.85,"playfulness":0.7,"intensity":0.3,"pace":0.7}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   'PG', 'approved', 'development', 'published', 93),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '286217', 'https://www.themoviedb.org/movie/286217', 'movie',
   'The Martian', 'Марсианецът', 'The Martian', 'Ридли Скот', 2015, 'en',
   'Астронавт остава сам на Марс и превръща знанието, хумора и постоянството си в план за завръщане.',
   'Умна история за изобретателността и надеждата под огромно напрежение.', 144, NULL,
   ARRAY['science_fiction','adventure'],
   '{"wonder":0.9,"reflection":0.4,"comfort":0.5,"connection":0.7,"courage":0.95,"renewal":0.7,"curiosity":0.95,"playfulness":0.6,"intensity":0.55,"pace":0.75}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":1,"substance_abuse":0,"verified":true}',
   'PG-13', 'approved', 'development', 'published', 93),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '346648', 'https://www.themoviedb.org/movie/346648', 'movie',
   'Paddington 2', 'Падингтън 2', 'Paddington 2', 'Пол Кинг', 2017, 'en',
   'Падингтън търси идеалния подарък и пази добротата си дори когато обстоятелствата стават нелепо несправедливи.',
   'Светъл филм за учтивостта като истинска сила.', 104, NULL,
   ARRAY['family','comedy','adventure'],
   '{"wonder":0.65,"reflection":0.3,"comfort":1.0,"connection":1.0,"courage":0.6,"renewal":0.75,"curiosity":0.55,"playfulness":1.0,"intensity":0.1,"pace":0.65}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   'PG', 'approved', 'development', 'published', 95),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '16859', 'https://www.themoviedb.org/movie/16859', 'movie',
   'Kiki''s Delivery Service', 'Службата за доставки на Кики', '魔女の宅急便', 'Хаяо Миядзаки', 1989, 'ja',
   'Млада вещица започва самостоятелен живот в крайморски град и постепенно намира свой ритъм, приятели и увереност.',
   'Нежна история за порастването, умората и връщането на творческата искра.', 103, NULL,
   ARRAY['animation','family','fantasy'],
   '{"wonder":0.9,"reflection":0.55,"comfort":0.95,"connection":0.9,"courage":0.7,"renewal":1.0,"curiosity":0.7,"playfulness":0.8,"intensity":0.1,"pace":0.45}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   'G', 'approved', 'development', 'published', 96),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '331482', 'https://www.themoviedb.org/movie/331482', 'movie',
   'Little Women', 'Малки жени', 'Little Women', 'Грета Гъруиг', 2019, 'en',
   'Четири сестри израстват, спорят, творят и търсят собствения си начин да обичат, без да се отказват от себе си.',
   'Жива и сърдечна история за семейство, свобода и творчески избор.', 135, NULL,
   ARRAY['drama','romance'],
   '{"wonder":0.45,"reflection":0.8,"comfort":0.75,"connection":1.0,"courage":0.75,"renewal":0.55,"curiosity":0.55,"playfulness":0.45,"intensity":0.4,"pace":0.5}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   'PG', 'approved', 'development', 'published', 94),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '371645', 'https://www.themoviedb.org/movie/371645', 'movie',
   'Hunt for the Wilderpeople', 'Лов на диви хора', 'Hunt for the Wilderpeople', 'Тайка Уайтити', 2016, 'en',
   'Непокорно момче и мълчаливият му приемен чичо се оказват неочакван екип сред дивата природа на Нова Зеландия.',
   'Странно смешно приключение за принадлежността и вторите шансове.', 101, NULL,
   ARRAY['adventure','comedy','drama'],
   '{"wonder":0.7,"reflection":0.55,"comfort":0.65,"connection":0.95,"courage":0.8,"renewal":0.85,"curiosity":0.7,"playfulness":0.9,"intensity":0.3,"pace":0.75}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":1,"substance_abuse":0,"verified":true}',
   'PG-13', 'approved', 'development', 'published', 91),
  ('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000002', 'isbn:9780156013987', 'https://openlibrary.org/isbn/9780156013987', 'book',
   'The Little Prince', 'Малкият принц', 'Le Petit Prince', 'Антоан дьо Сент-Екзюпери', 1943, 'fr',
   'Малък пътешественик среща странни възрастни и пази най-важните въпроси за приятелството, грижата и онова, което не се вижда с очите.',
   'Кратка книга, към която различните възрасти носят различни отговори.', NULL, 96,
   ARRAY['classic','fable','philosophy'],
   '{"wonder":1.0,"reflection":0.95,"comfort":0.8,"connection":1.0,"courage":0.35,"renewal":0.7,"curiosity":0.9,"playfulness":0.75,"intensity":0.15,"pace":0.4}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 94),
  ('20000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000002', 'isbn:9781250236210', 'https://openlibrary.org/isbn/9781250236210', 'book',
   'A Psalm for the Wild-Built', 'Псалм за дивите създания', 'A Psalm for the Wild-Built', 'Беки Чеймбърс', 2021, 'en',
   'Чаен монах и любопитен робот тръгват заедно да разберат от какво всъщност се нуждаят хората.',
   'Спокойна научна фантастика за почивката, смисъла и правото да не бъдеш продуктивен постоянно.', NULL, 160,
   ARRAY['science_fiction','hopepunk','novella'],
   '{"wonder":0.85,"reflection":1.0,"comfort":1.0,"connection":0.85,"courage":0.35,"renewal":1.0,"curiosity":0.9,"playfulness":0.55,"intensity":0.05,"pace":0.3}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 96),
  ('20000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000002', 'isbn:9781250217288', 'https://openlibrary.org/isbn/9781250217288', 'book',
   'The House in the Cerulean Sea', 'Къщата в лазурното море', 'The House in the Cerulean Sea', 'Ти Джей Клун', 2020, 'en',
   'Подреден чиновник посещава необичаен дом край морето и постепенно преразглежда правилата, с които е измервал хората.',
   'Топла фантазия за избраното семейство и смелостта да промениш системата.', NULL, 396,
   ARRAY['fantasy','found_family'],
   '{"wonder":0.8,"reflection":0.6,"comfort":1.0,"connection":1.0,"courage":0.75,"renewal":0.9,"curiosity":0.65,"playfulness":0.75,"intensity":0.15,"pace":0.45}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":1,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 93),
  ('20000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000002', 'isbn:9780547928227', 'https://openlibrary.org/isbn/9780547928227', 'book',
   'The Hobbit', 'Хобитът', 'The Hobbit', 'Дж. Р. Р. Толкин', 1937, 'en',
   'Домошарят Билбо напуска удобния си дом за пътешествие с джуджета, дракон и много повече смелост, отколкото подозира, че притежава.',
   'Класическо приключение за любопитството, дома и малките герои.', NULL, 320,
   ARRAY['fantasy','adventure','classic'],
   '{"wonder":1.0,"reflection":0.45,"comfort":0.65,"connection":0.8,"courage":1.0,"renewal":0.65,"curiosity":0.9,"playfulness":0.7,"intensity":0.45,"pace":0.7}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":2,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 95),
  ('20000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000002', 'isbn:9780593135204', 'https://openlibrary.org/isbn/9780593135204', 'book',
   'Project Hail Mary', 'Проектът „Аве Мария“', 'Project Hail Mary', 'Анди Уеър', 2021, 'en',
   'Учен се събужда сам в космоса и трябва да възстанови едновременно паметта си и план за спасяването на Земята.',
   'Бърза загадка за науката, приятелството и решаването на невъзможни задачи.', NULL, 496,
   ARRAY['science_fiction','adventure','mystery'],
   '{"wonder":1.0,"reflection":0.45,"comfort":0.45,"connection":0.85,"courage":0.95,"renewal":0.7,"curiosity":1.0,"playfulness":0.55,"intensity":0.65,"pace":0.9}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":2,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 94),
  ('20000000-0000-4000-8000-000000000106', '10000000-0000-4000-8000-000000000002', 'isbn:9780553213133', 'https://openlibrary.org/isbn/9780553213133', 'book',
   'Anne of Green Gables', 'Анн от фермата „Грийн Гейбълс“', 'Anne of Green Gables', 'Луси Мод Монтгомъри', 1908, 'en',
   'Въображаемо и словоохотливо момиче пристига по погрешка в тих дом и променя цялата общност около себе си.',
   'Светла класика за принадлежността, порастването и силата да виждаш красота навсякъде.', NULL, 336,
   ARRAY['classic','coming_of_age'],
   '{"wonder":0.8,"reflection":0.55,"comfort":1.0,"connection":1.0,"courage":0.6,"renewal":0.9,"curiosity":0.8,"playfulness":0.95,"intensity":0.15,"pace":0.5}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 94),
  ('20000000-0000-4000-8000-000000000107', '10000000-0000-4000-8000-000000000002', 'isbn:9781635575637', 'https://openlibrary.org/isbn/9781635575637', 'book',
   'Piranesi', 'Пиранези', 'Piranesi', 'Сузана Кларк', 2020, 'en',
   'Обитател на безкраен дом от зали, статуи и приливи води точни записки, докато следите около него започват да поставят под съмнение собствения му свят.',
   'Красива загадка за паметта, самотата и чудото да гледаш внимателно.', NULL, 272,
   ARRAY['fantasy','mystery','literary'],
   '{"wonder":1.0,"reflection":0.95,"comfort":0.35,"connection":0.4,"courage":0.55,"renewal":0.65,"curiosity":1.0,"playfulness":0.25,"intensity":0.45,"pace":0.35}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":2,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 93),
  ('20000000-0000-4000-8000-000000000108', '10000000-0000-4000-8000-000000000002', 'isbn:9781571313560', 'https://openlibrary.org/isbn/9781571313560', 'book',
   'Braiding Sweetgrass', 'Сплитане на сладка трева', 'Braiding Sweetgrass', 'Робин Уол Кимерер', 2013, 'en',
   'Ботаник събира научното знание и традициите на коренните народи в есета за взаимността между човека и живия свят.',
   'Бавна, щедра книга за внимание, благодарност и отговорност към природата.', NULL, 408,
   ARRAY['nonfiction','nature','essays'],
   '{"wonder":0.9,"reflection":1.0,"comfort":0.8,"connection":1.0,"courage":0.45,"renewal":0.85,"curiosity":0.9,"playfulness":0.25,"intensity":0.1,"pace":0.2}',
   '{"explicit_sexual":0,"graphic_violence":0,"gross_out":0,"fear":0,"substance_abuse":0,"verified":true}',
   NULL, 'approved', 'development', 'published', 95)
ON CONFLICT (source_id, source_external_id) DO NOTHING;

INSERT INTO public.recommendation_assets (
  work_id, source_id, license_id, asset_type, remote_url, width, language,
  attribution_text, rights_scope, license_verified, is_primary, provider_metadata
) VALUES
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg', 780, 'en', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg"}'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg', 780, 'en', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/hm58Jw4Lw8OIeECIq5qyPYhAeRJ.jpg"}'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/tY6ypjKOOtujhxiSwTmvA4OZ5IE.jpg', 780, 'en', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/tY6ypjKOOtujhxiSwTmvA4OZ5IE.jpg"}'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/gEOX79SKStss64z9NvhomkxTjlu.jpg', 780, 'en', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/gEOX79SKStss64z9NvhomkxTjlu.jpg"}'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg', 780, 'en', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/1OJ9vkD5xPt3skC6KguyXAgagRZ.jpg"}'),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/Aufa4YdZIv4AXpR9rznwVA5SEfd.jpg', 780, 'ja', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/Aufa4YdZIv4AXpR9rznwVA5SEfd.jpg"}'),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/yn5ihODtZ7ofn8pDYfxCmxh8AXI.jpg', 780, 'en', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/yn5ihODtZ7ofn8pDYfxCmxh8AXI.jpg"}'),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'poster', 'https://image.tmdb.org/t/p/w780/hkmz9rxgcweizXNElozGeKwmAJE.jpg', 780, 'en', 'Metadata and poster via TMDB.', 'development', false, true, '{"tmdb_path":"/hkmz9rxgcweizXNElozGeKwmAJE.jpg"}'),
  ('20000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9780156013987-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9780156013987"}'),
  ('20000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9781250236210-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9781250236210"}'),
  ('20000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9781250217288-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9781250217288"}'),
  ('20000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9780547928227"}'),
  ('20000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9780593135204"}'),
  ('20000000-0000-4000-8000-000000000106', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9780553213133-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9780553213133"}'),
  ('20000000-0000-4000-8000-000000000107', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9781635575637-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9781635575637"}'),
  ('20000000-0000-4000-8000-000000000108', '10000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'cover', 'https://covers.openlibrary.org/b/isbn/9781571313560-L.jpg', NULL, 'en', 'Cover delivered by Open Library.', 'development', false, true, '{"isbn":"9781571313560"}')
ON CONFLICT (work_id, remote_url) DO NOTHING;
