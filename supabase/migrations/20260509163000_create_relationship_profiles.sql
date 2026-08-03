CREATE TABLE public.relationship_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  initiator_user_id TEXT NOT NULL,
  partner_user_id TEXT NOT NULL,
  initiator_chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  partner_chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  connection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  anniversary_date DATE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  relationship_type TEXT NOT NULL DEFAULT 'romantic'
    CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  compatibility_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  synastry_aspects JSONB NOT NULL DEFAULT '[]'::jsonb,
  composite_chart_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT relationship_profiles_distinct_users CHECK (initiator_user_id <> partner_user_id),
  CONSTRAINT relationship_profiles_distinct_charts CHECK (initiator_chart_id <> partner_chart_id)
);

CREATE TABLE public.relationship_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_user_id TEXT NOT NULL,
  initiator_chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  relationship_label TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_user_id TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.compatibility_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES public.relationship_profiles(id) ON DELETE CASCADE,
  generated_by TEXT NOT NULL,
  version INTEGER NOT NULL,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  headline_score NUMERIC(5,2) NOT NULL,
  domain_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT compatibility_reports_unique_version UNIQUE (relationship_id, version)
);

CREATE INDEX relationship_profiles_initiator_idx
  ON public.relationship_profiles (initiator_user_id, status, created_at DESC);

CREATE INDEX relationship_profiles_partner_idx
  ON public.relationship_profiles (partner_user_id, status, created_at DESC);

CREATE INDEX relationship_invites_initiator_idx
  ON public.relationship_invites (initiator_user_id, status, created_at DESC);

CREATE INDEX relationship_invites_status_expiry_idx
  ON public.relationship_invites (status, expires_at);

CREATE INDEX compatibility_reports_relationship_created_idx
  ON public.compatibility_reports (relationship_id, created_at DESC);

CREATE TRIGGER relationship_profiles_updated_at
  BEFORE UPDATE ON public.relationship_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.relationship_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY relationship_profiles_select_member
  ON public.relationship_profiles
  FOR SELECT
  USING (
    (select auth.jwt()->>'sub') = initiator_user_id
    OR (select auth.jwt()->>'sub') = partner_user_id
  );

CREATE POLICY relationship_profiles_insert_initiator
  ON public.relationship_profiles
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = initiator_user_id);

CREATE POLICY relationship_profiles_update_member
  ON public.relationship_profiles
  FOR UPDATE
  USING (
    (select auth.jwt()->>'sub') = initiator_user_id
    OR (select auth.jwt()->>'sub') = partner_user_id
  )
  WITH CHECK (
    (select auth.jwt()->>'sub') = initiator_user_id
    OR (select auth.jwt()->>'sub') = partner_user_id
  );

CREATE POLICY relationship_invites_select_initiator
  ON public.relationship_invites
  FOR SELECT
  USING ((select auth.jwt()->>'sub') = initiator_user_id);

CREATE POLICY relationship_invites_insert_initiator
  ON public.relationship_invites
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = initiator_user_id);

CREATE POLICY relationship_invites_update_initiator
  ON public.relationship_invites
  FOR UPDATE
  USING ((select auth.jwt()->>'sub') = initiator_user_id)
  WITH CHECK ((select auth.jwt()->>'sub') = initiator_user_id);

CREATE POLICY compatibility_reports_select_member
  ON public.compatibility_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.relationship_profiles rp
      WHERE rp.id = compatibility_reports.relationship_id
        AND (
          rp.initiator_user_id = (select auth.jwt()->>'sub')
          OR rp.partner_user_id = (select auth.jwt()->>'sub')
        )
    )
  );

CREATE POLICY compatibility_reports_insert_generator
  ON public.compatibility_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.relationship_profiles rp
      WHERE rp.id = compatibility_reports.relationship_id
        AND (
          rp.initiator_user_id = (select auth.jwt()->>'sub')
          OR rp.partner_user_id = (select auth.jwt()->>'sub')
        )
    )
  );
