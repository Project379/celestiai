-- push_tokens — Expo push token registry for mobile devices (P.16 / REVISIT-26).
--
-- Sibling table to push_subscriptions, not a replacement: push_subscriptions
-- holds Web Push (VAPID) subscriptions (endpoint/p256dh/auth) for the browser
-- transport; push_tokens holds Expo push tokens for the native transport.
-- Different shape, different delivery mechanism (expo-server-sdk vs
-- web-push), same USER_DATA classification and RLS posture.
--
-- Classified USER_DATA per .planning/SECURITY-MODEL.md — RLS scoped to
-- auth.uid() (Clerk JWT sub), same pattern as push_subscriptions / charts.
--
-- device_id note: mobile currently populates device_id with the Expo push
-- token itself (no stable per-device identifier is available without adding
-- expo-application as a new native dependency — out of scope for this pass).
-- This means a token rotation inserts a new row rather than updating one in
-- place; the stale row self-heals via the daily-horoscope delivery cron's
-- DeviceNotRegistered handling, which revokes it once Expo rejects it.

CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  device_id text NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_sent_at timestamptz,

  CONSTRAINT push_tokens_user_id_users_clerk_id_fk
    FOREIGN KEY (user_id) REFERENCES public.users(clerk_id) ON DELETE CASCADE,
  CONSTRAINT push_tokens_unique_user_device
    UNIQUE (user_id, device_id)
);

-- Delivery cron's hot path: all non-revoked tokens, full scan.
CREATE INDEX push_tokens_active_idx
  ON public.push_tokens (revoked_at)
  WHERE revoked_at IS NULL;

-- Cleanup cascade / per-user lookups.
CREATE INDEX push_tokens_user_id_idx ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_tokens_owner_all
  ON public.push_tokens
  FOR ALL
  USING (user_id = auth.jwt() ->> 'sub')
  WITH CHECK (user_id = auth.jwt() ->> 'sub');

-- Service-role bypass: default Supabase service_role key behavior (no
-- explicit policy needed). Used by /api/push/register, the daily-horoscope
-- delivery cron, and the cleanup-deleted-accounts cascade.
