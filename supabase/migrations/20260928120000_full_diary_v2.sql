-- Full diary v2. Existing lunar rows remain readable by legacy clients.

ALTER TABLE public.diary_entries
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'legacy_lunar',
  ADD COLUMN status TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN occurred_at TIMESTAMPTZ,
  ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Europe/Sofia',
  ADD COLUMN title TEXT,
  ADD COLUMN mood SMALLINT,
  ADD COLUMN topics TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN prompt_id TEXT,
  ADD COLUMN prompt_version INTEGER,
  ADD COLUMN source JSONB,
  ADD COLUMN related_entry_id UUID,
  ADD COLUMN next_step JSONB,
  ADD COLUMN search_text TEXT NOT NULL DEFAULT '',
  ADD COLUMN revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN completed_at TIMESTAMPTZ;

UPDATE public.diary_entries
SET occurred_at = created_at,
    completed_at = created_at,
    content = jsonb_build_object(
      'version', 1,
      'intentions', to_jsonb(intentions)
    ),
    search_text = concat_ws(' ', phase_name, array_to_string(intentions, ' '));

ALTER TABLE public.diary_entries
  ALTER COLUMN occurred_at SET NOT NULL,
  ALTER COLUMN phase_id DROP NOT NULL,
  ALTER COLUMN phase_name DROP NOT NULL,
  ALTER COLUMN intentions DROP NOT NULL;

ALTER TABLE public.diary_entries
  DROP CONSTRAINT diary_entries_unique_user_date,
  DROP CONSTRAINT diary_entries_intentions_count,
  DROP CONSTRAINT diary_entries_intention_1_len,
  DROP CONSTRAINT diary_entries_intention_2_len,
  DROP CONSTRAINT diary_entries_intention_3_len;

ALTER TABLE public.diary_entries
  ADD CONSTRAINT diary_entries_kind_check
    CHECK (kind IN ('legacy_lunar', 'check_in', 'note', 'lunar_practice')),
  ADD CONSTRAINT diary_entries_status_check
    CHECK (status IN ('draft', 'completed')),
  ADD CONSTRAINT diary_entries_mood_check
    CHECK (mood IS NULL OR mood BETWEEN 1 AND 5),
  ADD CONSTRAINT diary_entries_revision_check
    CHECK (revision > 0),
  ADD CONSTRAINT diary_entries_title_check
    CHECK (title IS NULL OR char_length(title) <= 200),
  ADD CONSTRAINT diary_entries_timezone_check
    CHECK (char_length(timezone) BETWEEN 1 AND 80),
  ADD CONSTRAINT diary_entries_topics_check
    CHECK (topics <@ ARRAY['work', 'relationships', 'health', 'progress', 'other']::TEXT[]),
  ADD CONSTRAINT diary_entries_legacy_shape_check
    CHECK (
      kind <> 'legacy_lunar'
      OR (
        phase_id IS NOT NULL
        AND phase_name IS NOT NULL
        AND array_length(intentions, 1) = 3
        AND char_length(intentions[1]) BETWEEN 1 AND 500
        AND char_length(intentions[2]) BETWEEN 1 AND 500
        AND char_length(intentions[3]) BETWEEN 1 AND 500
      )
    ),
  ADD CONSTRAINT diary_entries_related_entry_fk
    FOREIGN KEY (related_entry_id)
    REFERENCES public.diary_entries(id)
    ON DELETE SET NULL;

CREATE UNIQUE INDEX diary_entries_legacy_user_date_idx
  ON public.diary_entries (user_id, entry_date)
  WHERE kind = 'legacy_lunar';

CREATE INDEX diary_entries_history_idx
  ON public.diary_entries (user_id, occurred_at DESC, id DESC);

CREATE INDEX diary_entries_date_idx
  ON public.diary_entries (user_id, entry_date DESC);

CREATE INDEX diary_entries_topics_idx
  ON public.diary_entries USING GIN (topics);

CREATE INDEX diary_entries_search_idx
  ON public.diary_entries USING GIN (to_tsvector('simple', search_text));

CREATE TABLE public.diary_reminder_preferences (
  user_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  local_time TIME NOT NULL DEFAULT '20:00',
  timezone TEXT NOT NULL DEFAULT 'Europe/Sofia',
  next_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT diary_reminder_timezone_check CHECK (char_length(timezone) BETWEEN 1 AND 80),
  CONSTRAINT diary_reminder_preferences_user_fk
    FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE
);

CREATE TRIGGER diary_reminder_preferences_updated_at
  BEFORE UPDATE ON public.diary_reminder_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.diary_reminder_deliveries (
  user_id TEXT NOT NULL,
  diary_date DATE NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, diary_date),
  CONSTRAINT diary_reminder_deliveries_user_fk
    FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE
);

ALTER TABLE public.diary_reminder_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_reminder_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY diary_reminder_preferences_owner_all
  ON public.diary_reminder_preferences
  FOR ALL
  USING ((select auth.jwt()->>'sub') = user_id)
  WITH CHECK ((select auth.jwt()->>'sub') = user_id);

CREATE POLICY diary_reminder_deliveries_owner_select
  ON public.diary_reminder_deliveries
  FOR SELECT
  USING ((select auth.jwt()->>'sub') = user_id);

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS morning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS diary_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.push_tokens
  ADD COLUMN IF NOT EXISTS morning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS diary_enabled BOOLEAN NOT NULL DEFAULT FALSE;
