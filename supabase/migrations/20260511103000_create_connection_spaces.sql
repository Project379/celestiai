CREATE TABLE public.connection_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  created_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  relationship_type TEXT NOT NULL DEFAULT 'romantic'
    CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  max_members INTEGER CHECK (max_members IS NULL OR max_members >= 2),
  member_count INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  connection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  anniversary_date DATE,
  compatibility_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  synastry_aspects JSONB NOT NULL DEFAULT '[]'::jsonb,
  composite_chart_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ
);

CREATE TABLE public.connection_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT connection_members_unique_space_user UNIQUE (space_id, user_id),
  CONSTRAINT connection_members_unique_space_chart UNIQUE (space_id, chart_id)
);

CREATE TABLE public.connection_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  inviter_user_id TEXT NOT NULL,
  inviter_chart_id UUID NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  invite_label TEXT,
  relationship_type TEXT NOT NULL DEFAULT 'romantic'
    CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by_user_id TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.connection_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  generated_by TEXT NOT NULL,
  version INTEGER NOT NULL,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  headline_score NUMERIC(5,2) NOT NULL,
  domain_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT connection_reports_unique_version UNIQUE (space_id, version)
);

CREATE INDEX connection_spaces_type_status_idx
  ON public.connection_spaces (relationship_type, status, created_at DESC);

CREATE INDEX connection_members_user_status_idx
  ON public.connection_members (user_id, status, joined_at DESC);

CREATE INDEX connection_invites_inviter_idx
  ON public.connection_invites (inviter_user_id, status, created_at DESC);

CREATE INDEX connection_invites_space_idx
  ON public.connection_invites (space_id, status, created_at DESC);

CREATE INDEX connection_reports_space_created_idx
  ON public.connection_reports (space_id, created_at DESC);

CREATE TRIGGER connection_spaces_updated_at
  BEFORE UPDATE ON public.connection_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.connection_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY connection_spaces_select_member
  ON public.connection_spaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.connection_members cm
      WHERE cm.space_id = connection_spaces.id
        AND cm.user_id = (select auth.jwt()->>'sub')
        AND cm.status = 'active'
    )
  );

CREATE POLICY connection_spaces_insert_creator
  ON public.connection_spaces
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = created_by_user_id);

CREATE POLICY connection_spaces_update_member
  ON public.connection_spaces
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.connection_members cm
      WHERE cm.space_id = connection_spaces.id
        AND cm.user_id = (select auth.jwt()->>'sub')
        AND cm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.connection_members cm
      WHERE cm.space_id = connection_spaces.id
        AND cm.user_id = (select auth.jwt()->>'sub')
        AND cm.status = 'active'
    )
  );

CREATE POLICY connection_members_select_member
  ON public.connection_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.connection_members own
      WHERE own.space_id = connection_members.space_id
        AND own.user_id = (select auth.jwt()->>'sub')
        AND own.status = 'active'
    )
  );

CREATE POLICY connection_members_insert_self
  ON public.connection_members
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY connection_members_update_member
  ON public.connection_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.connection_members own
      WHERE own.space_id = connection_members.space_id
        AND own.user_id = (select auth.jwt()->>'sub')
        AND own.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.connection_members own
      WHERE own.space_id = connection_members.space_id
        AND own.user_id = (select auth.jwt()->>'sub')
        AND own.status = 'active'
    )
  );

CREATE POLICY connection_invites_select_member
  ON public.connection_invites
  FOR SELECT
  USING (
    inviter_user_id = (select auth.jwt()->>'sub')
    OR EXISTS (
      SELECT 1
      FROM public.connection_members cm
      WHERE cm.space_id = connection_invites.space_id
        AND cm.user_id = (select auth.jwt()->>'sub')
        AND cm.status = 'active'
    )
  );

CREATE POLICY connection_invites_insert_inviter
  ON public.connection_invites
  FOR INSERT
  WITH CHECK ((select auth.jwt()->>'sub') = inviter_user_id);

CREATE POLICY connection_invites_update_inviter
  ON public.connection_invites
  FOR UPDATE
  USING (
    inviter_user_id = (select auth.jwt()->>'sub')
    OR accepted_by_user_id = (select auth.jwt()->>'sub')
  )
  WITH CHECK (
    inviter_user_id = (select auth.jwt()->>'sub')
    OR accepted_by_user_id = (select auth.jwt()->>'sub')
  );

CREATE POLICY connection_reports_select_member
  ON public.connection_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.connection_members cm
      WHERE cm.space_id = connection_reports.space_id
        AND cm.user_id = (select auth.jwt()->>'sub')
        AND cm.status = 'active'
    )
  );

CREATE POLICY connection_reports_insert_member
  ON public.connection_reports
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.connection_members cm
      WHERE cm.space_id = connection_reports.space_id
        AND cm.user_id = (select auth.jwt()->>'sub')
        AND cm.status = 'active'
    )
  );

INSERT INTO public.connection_spaces (
  id,
  label,
  created_by_user_id,
  status,
  relationship_type,
  max_members,
  member_count,
  connection_date,
  anniversary_date,
  compatibility_summary,
  synastry_aspects,
  composite_chart_data,
  created_at,
  updated_at,
  archived_at
)
SELECT
  rp.id,
  rp.label,
  rp.initiator_user_id,
  rp.status,
  rp.relationship_type,
  CASE WHEN rp.relationship_type = 'romantic' THEN 2 ELSE NULL END,
  2,
  rp.connection_date,
  rp.anniversary_date,
  rp.compatibility_summary,
  rp.synastry_aspects,
  rp.composite_chart_data,
  rp.created_at,
  rp.updated_at,
  rp.archived_at
FROM public.relationship_profiles rp
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connection_members (
  space_id,
  user_id,
  chart_id,
  role,
  status,
  joined_at,
  archived_at
)
SELECT
  rp.id,
  rp.initiator_user_id,
  rp.initiator_chart_id,
  'owner',
  CASE WHEN rp.status = 'active' THEN 'active' ELSE 'archived' END,
  rp.connection_date,
  rp.archived_at
FROM public.relationship_profiles rp
ON CONFLICT (space_id, user_id) DO NOTHING;

INSERT INTO public.connection_members (
  space_id,
  user_id,
  chart_id,
  role,
  status,
  joined_at,
  archived_at
)
SELECT
  rp.id,
  rp.partner_user_id,
  rp.partner_chart_id,
  'member',
  CASE WHEN rp.status = 'active' THEN 'active' ELSE 'archived' END,
  rp.connection_date,
  rp.archived_at
FROM public.relationship_profiles rp
ON CONFLICT (space_id, user_id) DO NOTHING;

INSERT INTO public.connection_reports (
  id,
  space_id,
  generated_by,
  version,
  relationship_type,
  headline_score,
  domain_scores,
  report_content,
  created_at
)
SELECT
  cr.id,
  cr.relationship_id,
  cr.generated_by,
  cr.version,
  cr.relationship_type,
  cr.headline_score,
  cr.domain_scores,
  cr.report_content,
  cr.created_at
FROM public.compatibility_reports cr
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.connection_invites (
  id,
  space_id,
  inviter_user_id,
  inviter_chart_id,
  invite_label,
  relationship_type,
  token_hash,
  status,
  expires_at,
  accepted_by_user_id,
  accepted_at,
  created_at
)
SELECT
  ri.id,
  NULL,
  ri.initiator_user_id,
  ri.initiator_chart_id,
  ri.relationship_label,
  'romantic',
  ri.token_hash,
  ri.status,
  ri.expires_at,
  ri.accepted_by_user_id,
  ri.accepted_at,
  ri.created_at
FROM public.relationship_invites ri
ON CONFLICT (id) DO NOTHING;
