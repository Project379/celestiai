-- REVISIT-62 sub-commit A — subscription_provider column, processed_
-- revenuecat_events idempotency table, and explicit NULL-semantics
-- documentation on subscription_expires_at.
--
-- Why subscription_provider exists: two payment providers (Stripe web,
-- RevenueCat mobile) are about to write the same users.subscription_tier/
-- subscription_status/subscription_expires_at columns with no rule for
-- which one is authoritative for a given user. This column is that rule's
-- foundation — every write path must set it, and provider-specific logic
-- (see the shouldMarkPastDue guard in subscription.ts) must check it
-- before treating a row as its own.
--
-- Why NULL semantics need documenting, not just guarding: RevenueCat
-- documents expiration_at_ms = null as "permanent, never expires"
-- (NON_RENEWING_PURCHASE / lifetime products). This codebase's Stripe path
-- already uses subscription_expires_at IS NULL to mean the opposite — "no
-- valid subscription" (see handleInvoicePaymentFailed's shouldMarkPastDue).
-- Same column, exact opposite meaning, depending on which provider wrote
-- it. Not fixed by renaming or splitting the column — fixed by scoping
-- provider-specific interpretation to that provider's own rows only.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_provider text NOT NULL DEFAULT 'stripe'
  CHECK (subscription_provider IN ('stripe', 'revenuecat'));

COMMENT ON COLUMN public.users.subscription_provider IS
  'Which payment provider last wrote this user''s subscription_tier/'
  'subscription_status/subscription_expires_at. Defaulted to ''stripe'' for '
  'all pre-existing rows (every premium user before 2026-08 came from '
  'Stripe). Provider-specific webhook logic (e.g. the Stripe invoice-'
  'payment-failed past_due check) must scope itself to rows matching its '
  'own provider before interpreting subscription_expires_at — see the '
  'column comment on subscription_expires_at for why.';

COMMENT ON COLUMN public.users.subscription_expires_at IS
  'NULL has two DIFFERENT meanings depending on subscription_provider — '
  'this is intentional, not an oversight, and must stay scoped per-'
  'provider rather than resolved by picking one global meaning: '
  '(1) provider=''stripe'': NULL means no valid/active subscription '
  '(handleSubscriptionDeleted sets it NULL on cancellation; '
  'handleInvoicePaymentFailed treats NULL as already-expired). '
  '(2) provider=''revenuecat'' AND the grant came from a '
  'NON_RENEWING_PURCHASE event (one-time/lifetime product): NULL means '
  'permanently active, never expires — matching RevenueCat''s own '
  'documented webhook semantics (expiration_at_ms is null for exactly '
  'this case). Ordinary RevenueCat monthly/yearly subscriptions always '
  'carry a real expiration_at_ms, so this second meaning is rare in '
  'practice but must not be treated as "expired" by any code that reads '
  'this column generically.';

-- processed_revenuecat_events — idempotency table for the RevenueCat
-- webhook (sub-commit C), mirroring processed_webhook_events' shape for
-- Stripe exactly but kept as its own table rather than renaming/reusing
-- the Stripe-named stripe_event_id column, which would be a larger and
-- riskier change than this REVISIT needs.
CREATE TABLE IF NOT EXISTS public.processed_revenuecat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT processed_revenuecat_events_event_id_unique UNIQUE (event_id)
);

-- INTERNAL: ENABLE RLS, no policy. Anon denied entirely; service role
-- (the only writer — the webhook route) bypasses. Same posture as
-- processed_webhook_events / bg_generation_flags.
ALTER TABLE public.processed_revenuecat_events ENABLE ROW LEVEL SECURITY;
