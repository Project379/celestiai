CREATE TABLE public.saved_people_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'crush'
    CHECK (kind IN ('crush', 'friend', 'person')),
  name TEXT NOT NULL,
  birth_date TIMESTAMPTZ NOT NULL,
  birth_time TEXT,
  birth_time_known BOOLEAN NOT NULL,
  approximate_time_range TEXT,
  city_name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.saved_people_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.saved_people_profiles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  headline_score NUMERIC(5,2) NOT NULL,
  domain_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_full BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT saved_people_reports_unique_version UNIQUE (profile_id, version)
);

CREATE INDEX saved_people_profiles_user_idx
  ON public.saved_people_profiles (user_id, created_at DESC);

CREATE INDEX saved_people_reports_profile_idx
  ON public.saved_people_reports (profile_id, created_at DESC);

CREATE INDEX saved_people_reports_user_idx
  ON public.saved_people_reports (user_id, created_at DESC);

CREATE TRIGGER saved_people_profiles_updated_at
  BEFORE UPDATE ON public.saved_people_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.saved_people_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_people_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_people_profiles_select_own
  ON public.saved_people_profiles
  FOR SELECT
  USING ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY saved_people_profiles_insert_own
  ON public.saved_people_profiles
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY saved_people_profiles_update_own
  ON public.saved_people_profiles
  FOR UPDATE
  USING ((select auth.jwt()->>'sub') = user_id)
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY saved_people_profiles_delete_own
  ON public.saved_people_profiles
  FOR DELETE
  USING ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY saved_people_reports_select_own
  ON public.saved_people_reports
  FOR SELECT
  USING ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY saved_people_reports_insert_own
  ON public.saved_people_reports
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);
