-- Capture of hand-applied schema — Stream K (Кръг) relationship/connection
-- backend, found during P.16's migration-history audit (2026-08-03).
--
-- Eight tables (connection_spaces, connection_members, connection_invites,
-- connection_reports, relationship_profiles, relationship_invites,
-- compatibility_reports, saved_people_profiles, saved_people_reports — nine,
-- correcting the count as written) exist in production — complete with
-- RLS, owner-scoped policies, FKs, CHECK constraints, indexes, and
-- updated_at triggers — with ZERO migration history. Not even the
-- CREATE TABLE statements exist anywhere in supabase/migrations/. A fresh
-- environment built from migration history alone would not have these
-- tables at all.
--
-- Currently DORMANT, not currently a security exposure: grepped
-- apps/web, apps/mobile, and packages for every table name — zero
-- references anywhere in application code. This is provisioned-ahead-of-
-- time schema for Stream K (Кръг synastry/couples/crush/friends-group
-- features per MOBILE_UX_RESEARCH.md Phase B/C), not something the live
-- app reads or writes today. Confirmed dormant, not confirmed abandoned —
-- do not drop; Stream K is real future roadmap, not dead weight.
--
-- Extracted verbatim from production via direct pg_catalog /
-- information_schema queries (columns, pg_get_constraintdef,
-- pg_get_indexdef, pg_policies, pg_get_triggerdef) — not reconstructed
-- from memory or inference. This migration is written to be idempotent:
-- CREATE TABLE IF NOT EXISTS so it no-ops against production (where
-- these tables already exist in this exact shape) and builds correctly
-- on a fresh database. Policies and triggers use DROP ... IF EXISTS +
-- CREATE since Postgres has no CREATE POLICY/TRIGGER IF NOT EXISTS.
--
-- Dependency order: connection_spaces before its children; charts
-- (already in migration history) before anything FK'ing to it;
-- relationship_profiles before compatibility_reports;
-- saved_people_profiles before saved_people_reports.

-- ─── connection_spaces ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connection_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text,
  created_by_user_id text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CONSTRAINT connection_spaces_status_check CHECK (status IN ('active', 'archived')),
  relationship_type text NOT NULL DEFAULT 'romantic'
    CONSTRAINT connection_spaces_relationship_type_check
      CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  max_members integer
    CONSTRAINT connection_spaces_max_members_check CHECK (max_members IS NULL OR max_members >= 2),
  member_count integer NOT NULL DEFAULT 0
    CONSTRAINT connection_spaces_member_count_check CHECK (member_count >= 0),
  connection_date timestamptz NOT NULL DEFAULT now(),
  anniversary_date date,
  compatibility_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  synastry_aspects jsonb NOT NULL DEFAULT '[]'::jsonb,
  composite_chart_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS connection_spaces_type_status_idx
  ON public.connection_spaces (relationship_type, status, created_at DESC);

DROP TRIGGER IF EXISTS connection_spaces_updated_at ON public.connection_spaces;
CREATE TRIGGER connection_spaces_updated_at
  BEFORE UPDATE ON public.connection_spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.connection_spaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connection_spaces_insert_creator ON public.connection_spaces;
CREATE POLICY connection_spaces_insert_creator
  ON public.connection_spaces
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = created_by_user_id);

DROP POLICY IF EXISTS connection_spaces_select_member ON public.connection_spaces;
CREATE POLICY connection_spaces_select_member
  ON public.connection_spaces
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.connection_members cm
    WHERE cm.space_id = connection_spaces.id
      AND cm.user_id = (SELECT auth.jwt() ->> 'sub')
      AND cm.status = 'active'
  ));

DROP POLICY IF EXISTS connection_spaces_update_member ON public.connection_spaces;
CREATE POLICY connection_spaces_update_member
  ON public.connection_spaces
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.connection_members cm
    WHERE cm.space_id = connection_spaces.id
      AND cm.user_id = (SELECT auth.jwt() ->> 'sub')
      AND cm.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.connection_members cm
    WHERE cm.space_id = connection_spaces.id
      AND cm.user_id = (SELECT auth.jwt() ->> 'sub')
      AND cm.status = 'active'
  ));

-- ─── connection_members ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connection_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  chart_id uuid NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CONSTRAINT connection_members_role_check CHECK (role IN ('owner', 'member')),
  status text NOT NULL DEFAULT 'active'
    CONSTRAINT connection_members_status_check CHECK (status IN ('active', 'archived')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,

  CONSTRAINT connection_members_unique_space_user UNIQUE (space_id, user_id),
  CONSTRAINT connection_members_unique_space_chart UNIQUE (space_id, chart_id)
);

CREATE INDEX IF NOT EXISTS connection_members_user_status_idx
  ON public.connection_members (user_id, status, joined_at DESC);

ALTER TABLE public.connection_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connection_members_insert_self ON public.connection_members;
CREATE POLICY connection_members_insert_self
  ON public.connection_members
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS connection_members_select_member ON public.connection_members;
CREATE POLICY connection_members_select_member
  ON public.connection_members
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.connection_members own
    WHERE own.space_id = connection_members.space_id
      AND own.user_id = (SELECT auth.jwt() ->> 'sub')
      AND own.status = 'active'
  ));

DROP POLICY IF EXISTS connection_members_update_member ON public.connection_members;
CREATE POLICY connection_members_update_member
  ON public.connection_members
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.connection_members own
    WHERE own.space_id = connection_members.space_id
      AND own.user_id = (SELECT auth.jwt() ->> 'sub')
      AND own.status = 'active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.connection_members own
    WHERE own.space_id = connection_members.space_id
      AND own.user_id = (SELECT auth.jwt() ->> 'sub')
      AND own.status = 'active'
  ));

-- ─── connection_invites ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connection_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  inviter_user_id text NOT NULL,
  inviter_chart_id uuid NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  invite_label text,
  relationship_type text NOT NULL DEFAULT 'romantic'
    CONSTRAINT connection_invites_relationship_type_check
      CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT connection_invites_status_check
      CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_by_user_id text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connection_invites_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS connection_invites_inviter_idx
  ON public.connection_invites (inviter_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS connection_invites_space_idx
  ON public.connection_invites (space_id, status, created_at DESC);

ALTER TABLE public.connection_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connection_invites_insert_inviter ON public.connection_invites;
CREATE POLICY connection_invites_insert_inviter
  ON public.connection_invites
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = inviter_user_id);

DROP POLICY IF EXISTS connection_invites_select_member ON public.connection_invites;
CREATE POLICY connection_invites_select_member
  ON public.connection_invites
  FOR SELECT
  USING (
    inviter_user_id = (SELECT auth.jwt() ->> 'sub')
    OR EXISTS (
      SELECT 1 FROM public.connection_members cm
      WHERE cm.space_id = connection_invites.space_id
        AND cm.user_id = (SELECT auth.jwt() ->> 'sub')
        AND cm.status = 'active'
    )
  );

DROP POLICY IF EXISTS connection_invites_update_inviter ON public.connection_invites;
CREATE POLICY connection_invites_update_inviter
  ON public.connection_invites
  FOR UPDATE
  USING (
    inviter_user_id = (SELECT auth.jwt() ->> 'sub')
    OR accepted_by_user_id = (SELECT auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    inviter_user_id = (SELECT auth.jwt() ->> 'sub')
    OR accepted_by_user_id = (SELECT auth.jwt() ->> 'sub')
  );

-- ─── connection_reports ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.connection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.connection_spaces(id) ON DELETE CASCADE,
  generated_by text NOT NULL,
  version integer NOT NULL,
  relationship_type text NOT NULL
    CONSTRAINT connection_reports_relationship_type_check
      CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  headline_score numeric NOT NULL,
  domain_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT connection_reports_unique_version UNIQUE (space_id, version)
);

CREATE INDEX IF NOT EXISTS connection_reports_space_created_idx
  ON public.connection_reports (space_id, created_at DESC);

ALTER TABLE public.connection_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS connection_reports_insert_member ON public.connection_reports;
CREATE POLICY connection_reports_insert_member
  ON public.connection_reports
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.connection_members cm
    WHERE cm.space_id = connection_reports.space_id
      AND cm.user_id = (SELECT auth.jwt() ->> 'sub')
      AND cm.status = 'active'
  ));

DROP POLICY IF EXISTS connection_reports_select_member ON public.connection_reports;
CREATE POLICY connection_reports_select_member
  ON public.connection_reports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.connection_members cm
    WHERE cm.space_id = connection_reports.space_id
      AND cm.user_id = (SELECT auth.jwt() ->> 'sub')
      AND cm.status = 'active'
  ));

-- ─── relationship_profiles ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.relationship_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text,
  initiator_user_id text NOT NULL,
  partner_user_id text NOT NULL,
  initiator_chart_id uuid NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  partner_chart_id uuid NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  connection_date timestamptz NOT NULL DEFAULT now(),
  anniversary_date date,
  status text NOT NULL DEFAULT 'active'
    CONSTRAINT relationship_profiles_status_check CHECK (status IN ('active', 'archived')),
  relationship_type text NOT NULL DEFAULT 'romantic'
    CONSTRAINT relationship_profiles_relationship_type_check
      CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  compatibility_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  synastry_aspects jsonb NOT NULL DEFAULT '[]'::jsonb,
  composite_chart_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,

  CONSTRAINT relationship_profiles_distinct_charts CHECK (initiator_chart_id <> partner_chart_id),
  CONSTRAINT relationship_profiles_distinct_users CHECK (initiator_user_id <> partner_user_id)
);

CREATE INDEX IF NOT EXISTS relationship_profiles_initiator_idx
  ON public.relationship_profiles (initiator_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS relationship_profiles_partner_idx
  ON public.relationship_profiles (partner_user_id, status, created_at DESC);

DROP TRIGGER IF EXISTS relationship_profiles_updated_at ON public.relationship_profiles;
CREATE TRIGGER relationship_profiles_updated_at
  BEFORE UPDATE ON public.relationship_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.relationship_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS relationship_profiles_insert_initiator ON public.relationship_profiles;
CREATE POLICY relationship_profiles_insert_initiator
  ON public.relationship_profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = initiator_user_id);

DROP POLICY IF EXISTS relationship_profiles_select_member ON public.relationship_profiles;
CREATE POLICY relationship_profiles_select_member
  ON public.relationship_profiles
  FOR SELECT
  USING (
    (SELECT auth.jwt() ->> 'sub') = initiator_user_id
    OR (SELECT auth.jwt() ->> 'sub') = partner_user_id
  );

DROP POLICY IF EXISTS relationship_profiles_update_member ON public.relationship_profiles;
CREATE POLICY relationship_profiles_update_member
  ON public.relationship_profiles
  FOR UPDATE
  USING (
    (SELECT auth.jwt() ->> 'sub') = initiator_user_id
    OR (SELECT auth.jwt() ->> 'sub') = partner_user_id
  )
  WITH CHECK (
    (SELECT auth.jwt() ->> 'sub') = initiator_user_id
    OR (SELECT auth.jwt() ->> 'sub') = partner_user_id
  );

-- ─── relationship_invites ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.relationship_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_user_id text NOT NULL,
  initiator_chart_id uuid NOT NULL REFERENCES public.charts(id) ON DELETE CASCADE,
  relationship_label text,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CONSTRAINT relationship_invites_status_check
      CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz NOT NULL,
  accepted_by_user_id text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT relationship_invites_token_hash_key UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS relationship_invites_initiator_idx
  ON public.relationship_invites (initiator_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS relationship_invites_status_expiry_idx
  ON public.relationship_invites (status, expires_at);

ALTER TABLE public.relationship_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS relationship_invites_insert_initiator ON public.relationship_invites;
CREATE POLICY relationship_invites_insert_initiator
  ON public.relationship_invites
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = initiator_user_id);

DROP POLICY IF EXISTS relationship_invites_select_initiator ON public.relationship_invites;
CREATE POLICY relationship_invites_select_initiator
  ON public.relationship_invites
  FOR SELECT
  USING ((SELECT auth.jwt() ->> 'sub') = initiator_user_id);

DROP POLICY IF EXISTS relationship_invites_update_initiator ON public.relationship_invites;
CREATE POLICY relationship_invites_update_initiator
  ON public.relationship_invites
  FOR UPDATE
  USING ((SELECT auth.jwt() ->> 'sub') = initiator_user_id)
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = initiator_user_id);

-- ─── compatibility_reports ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.compatibility_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id uuid NOT NULL REFERENCES public.relationship_profiles(id) ON DELETE CASCADE,
  generated_by text NOT NULL,
  version integer NOT NULL,
  relationship_type text NOT NULL
    CONSTRAINT compatibility_reports_relationship_type_check
      CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  headline_score numeric NOT NULL,
  domain_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT compatibility_reports_unique_version UNIQUE (relationship_id, version)
);

CREATE INDEX IF NOT EXISTS compatibility_reports_relationship_created_idx
  ON public.compatibility_reports (relationship_id, created_at DESC);

ALTER TABLE public.compatibility_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compatibility_reports_insert_generator ON public.compatibility_reports;
CREATE POLICY compatibility_reports_insert_generator
  ON public.compatibility_reports
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.relationship_profiles rp
    WHERE rp.id = compatibility_reports.relationship_id
      AND (
        rp.initiator_user_id = (SELECT auth.jwt() ->> 'sub')
        OR rp.partner_user_id = (SELECT auth.jwt() ->> 'sub')
      )
  ));

DROP POLICY IF EXISTS compatibility_reports_select_member ON public.compatibility_reports;
CREATE POLICY compatibility_reports_select_member
  ON public.compatibility_reports
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.relationship_profiles rp
    WHERE rp.id = compatibility_reports.relationship_id
      AND (
        rp.initiator_user_id = (SELECT auth.jwt() ->> 'sub')
        OR rp.partner_user_id = (SELECT auth.jwt() ->> 'sub')
      )
  ));

-- ─── saved_people_profiles ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_people_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  kind text NOT NULL DEFAULT 'crush'
    CONSTRAINT saved_people_profiles_kind_check CHECK (kind IN ('crush', 'friend', 'person')),
  name text NOT NULL,
  birth_date timestamptz NOT NULL,
  birth_time text,
  birth_time_known boolean NOT NULL,
  approximate_time_range text,
  city_name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_people_profiles_user_idx
  ON public.saved_people_profiles (user_id, created_at DESC);

DROP TRIGGER IF EXISTS saved_people_profiles_updated_at ON public.saved_people_profiles;
CREATE TRIGGER saved_people_profiles_updated_at
  BEFORE UPDATE ON public.saved_people_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.saved_people_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_people_profiles_select_own ON public.saved_people_profiles;
CREATE POLICY saved_people_profiles_select_own
  ON public.saved_people_profiles
  FOR SELECT
  USING ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS saved_people_profiles_insert_own ON public.saved_people_profiles;
CREATE POLICY saved_people_profiles_insert_own
  ON public.saved_people_profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS saved_people_profiles_update_own ON public.saved_people_profiles;
CREATE POLICY saved_people_profiles_update_own
  ON public.saved_people_profiles
  FOR UPDATE
  USING ((SELECT auth.jwt() ->> 'sub') = user_id)
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS saved_people_profiles_delete_own ON public.saved_people_profiles;
CREATE POLICY saved_people_profiles_delete_own
  ON public.saved_people_profiles
  FOR DELETE
  USING ((SELECT auth.jwt() ->> 'sub') = user_id);

-- ─── saved_people_reports ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_people_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.saved_people_profiles(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  version integer NOT NULL,
  relationship_type text NOT NULL
    CONSTRAINT saved_people_reports_relationship_type_check
      CHECK (relationship_type IN ('romantic', 'friendship', 'work', 'family')),
  headline_score numeric NOT NULL,
  domain_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  report_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_full boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT saved_people_reports_unique_version UNIQUE (profile_id, version)
);

CREATE INDEX IF NOT EXISTS saved_people_reports_profile_idx
  ON public.saved_people_reports (profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_people_reports_user_idx
  ON public.saved_people_reports (user_id, created_at DESC);

ALTER TABLE public.saved_people_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saved_people_reports_select_own ON public.saved_people_reports;
CREATE POLICY saved_people_reports_select_own
  ON public.saved_people_reports
  FOR SELECT
  USING ((SELECT auth.jwt() ->> 'sub') = user_id);

DROP POLICY IF EXISTS saved_people_reports_insert_own ON public.saved_people_reports;
CREATE POLICY saved_people_reports_insert_own
  ON public.saved_people_reports
  FOR INSERT
  WITH CHECK ((SELECT auth.jwt() ->> 'sub') = user_id);
