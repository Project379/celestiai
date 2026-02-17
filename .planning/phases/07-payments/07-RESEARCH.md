# Phase 7: Payments - Research

**Researched:** 2026-02-17
**Domain:** Stripe Checkout + Webhooks + Subscription Lifecycle in Next.js 15 App Router
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Checkout experience
- Hosted Stripe Checkout (redirect to stripe.com) — not embedded
- After successful payment: redirect to dedicated /subscription/success page with confirmation details, then link back to dashboard
- After payment failure/cancel: redirect back to /pricing page with subtle message that payment wasn't completed
- Premium access activation: wait for Stripe webhook confirmation (show brief "activating..." state on success page until webhook fires), not optimistic grant on redirect

#### Pricing presentation
- Both a dedicated /pricing page AND contextual inline upgrade prompts throughout the app
- /pricing page: side-by-side cards comparing Free tier (left) and Premium tier (right) with feature checkmarks
- Two pricing options with toggle: €9.99/mo and €99.99/yr (~17% annual savings) — two Stripe Price objects needed
- Existing premium users who visit /pricing see their current plan highlighted with active badge + "Manage subscription" link (no redirect)

#### Subscription management
- Dedicated /settings page for subscription management (not inline on dashboard)
- Cancel behavior: access continues until end of current billing period (standard SaaS grace period)
- Cancellation flow: confirmation dialog with optional "Why are you leaving?" dropdown for product feedback
- After cancellation: settings page shows "Your premium expires on [date]" with a "Reactivate" button (not redirect to /pricing)
- Full billing details shown: plan name, next billing date, status (active/cancelling/expired), payment method (last 4 digits), billing history link via Stripe Customer Portal

#### Paywall behavior
- Multiple upgrade touchpoints: locked Oracle topic cards (existing), dashboard premium badge/banner, daily horoscope section upsell
- Daily horoscope upsell angle: "Unlock detailed transit analysis and planetary influences"
- Upgrade CTA style: inline expansion — locked card expands in-place to show pricing and upgrade button
- Upgrade prompt tone: gently persuasive — warm cosmic nudge

### Claude's Discretion
- Exact Stripe product/price naming and metadata structure
- Webhook endpoint security implementation details
- Loading/activating state design on success page
- Cancellation reason dropdown options
- Exact copy for upgrade prompts (within the gently persuasive tone)
- Dashboard premium badge placement and style

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 7 implements Stripe-powered subscriptions for Celestia: a Checkout session flow (hosted redirect), webhook-driven access grant/revoke, and an in-app subscription management page. The core challenge is the async gap between the Stripe Checkout redirect and actual access provisioning — a webhook must fire before the user's `subscription_tier` is updated, so the success page must poll or listen for that database change.

The established Next.js 15 App Router pattern for Stripe webhooks is an API route at `app/api/webhooks/stripe/route.ts` that reads the raw body with `await request.text()` (the old `export const config = { api: { bodyParser: false } }` approach is deprecated and ignored in App Router). Stripe SDK v17+ is the current stable major line. Idempotency via tracking processed event IDs in the database is non-negotiable for production correctness.

The users table needs three new columns: `stripe_customer_id`, `stripe_subscription_id`, and `subscription_expires_at` (timestamp). This keeps the data model flat — no separate subscriptions table needed given the one-subscription-per-user model. The existing `subscription_tier` column already provides the fast-path access check for every authenticated request.

**Primary recommendation:** Use `stripe@^17` server-side only. No `@stripe/stripe-js` needed (hosted Checkout, not embedded). Build the webhook handler with raw-body text, HMAC verification, and event-ID idempotency check against a `processed_webhook_events` table. Use Supabase Realtime on the users row to drive the "activating..." success page state.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `stripe` | `^17` (latest: 17.x) | Stripe Node.js SDK — server-side only | Official SDK; full TypeScript types; auto-retry on safe failures; handles all Stripe API calls |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | already installed `^2.49.1` | Supabase Realtime for success page polling | Listening on users table row change after webhook fires |
| Stripe CLI | latest | Local webhook forwarding during development | Required to test webhooks without ngrok |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `stripe` SDK | `@stripe/stripe-js` (browser SDK) | Not needed — hosted Checkout means no browser-side Stripe JS required |
| Supabase Realtime on success page | Polling `/api/user/subscription-status` every 2s | Both work; Realtime is cleaner and avoids hammering the API; polling is simpler to implement |
| Flat users-table columns | Separate `subscriptions` table | Separate table is more normalized but adds a JOIN to every auth check; flat is correct for one-subscription-per-user |

**Installation:**
```bash
# In apps/web
npm install stripe
```

No browser-side Stripe package required (hosted Checkout, not embedded elements).

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts        # POST — create Checkout session
│   │   │   ├── portal/route.ts          # POST — create Customer Portal session
│   │   │   └── cancel/route.ts          # POST — set cancel_at_period_end: true
│   │   └── webhooks/
│   │       └── stripe/route.ts          # POST — Stripe webhook handler
│   └── (protected)/
│       ├── pricing/page.tsx             # /pricing — side-by-side plan cards
│       ├── subscription/
│       │   └── success/page.tsx         # /subscription/success — activating state
│       └── settings/page.tsx            # /settings — subscription management
├── lib/
│   └── stripe/
│       ├── client.ts                    # Stripe singleton initializer
│       └── subscription.ts             # Shared helpers (get subscription data, etc.)
└── components/
    └── upgrade/
        ├── UpgradePrompt.tsx            # Inline-expansion upgrade CTA (reusable)
        └── PricingToggle.tsx            # Monthly/annual toggle for /pricing page
```

Database additions to `packages/db/src/schema/users.ts`:
```
stripe_customer_id        text, nullable, unique
stripe_subscription_id    text, nullable
subscription_expires_at   timestamp with time zone, nullable
```

A separate idempotency table in Supabase:
```
processed_webhook_events
  id                  uuid primary key
  stripe_event_id     text not null unique
  event_type          text not null
  processed_at        timestamp with time zone not null
```

### Pattern 1: Stripe Singleton Client

Initialize once, import everywhere server-side.

```typescript
// apps/web/lib/stripe/client.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia', // pin to a known API version
  typescript: true,
})
```

Pin the `apiVersion` explicitly. Stripe's Node SDK will warn if you omit it, and leaving it unset means your API version can drift when Stripe updates.

### Pattern 2: Create Checkout Session (API Route)

```typescript
// apps/web/app/api/stripe/checkout/route.ts
// Source: https://docs.stripe.com/billing/subscriptions/build-subscriptions
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { priceId } = await req.json() as { priceId: string }

  const supabase = createServiceSupabaseClient()
  const { data: user } = await supabase
    .from('users')
    .select('id, stripe_customer_id')
    .eq('clerk_id', userId)
    .single()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    // Reuse existing Stripe customer if we have one; fall back to prefilling email
    customer: user?.stripe_customer_id ?? undefined,
    customer_creation: user?.stripe_customer_id ? undefined : 'always',
    metadata: { clerkUserId: userId }, // surfaced in checkout.session.completed
    subscription_data: {
      metadata: { clerkUserId: userId }, // surfaced in customer.subscription.* events
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
    allow_promotion_codes: true,
  })

  return Response.json({ url: session.url })
}
```

**Key points:**
- Always pass `customer` if user has a `stripe_customer_id` — prevents duplicate Stripe customers for the same user.
- `metadata.clerkUserId` on both the session and `subscription_data` ensures the webhook handler can identify the user regardless of which event fires first.
- `{CHECKOUT_SESSION_ID}` is a Stripe template variable — replaced automatically before redirect.
- `cancel_url` includes `?cancelled=true` so the `/pricing` page can show a subtle "payment wasn't completed" message.

### Pattern 3: Webhook Handler (Critical Path)

```typescript
// apps/web/app/api/webhooks/stripe/route.ts
// Source: https://docs.stripe.com/webhooks + verified App Router pattern
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

// IMPORTANT: No body parsing config needed in App Router — just use request.text()
export async function POST(request: Request) {
  const body = await request.text() // raw string required for HMAC verification
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createServiceSupabaseClient()

  // Idempotency check — Stripe delivers at-least-once; prevent duplicate processing
  const { data: alreadyProcessed } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (alreadyProcessed) {
    return new Response('OK', { status: 200 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break
        await handleCheckoutComplete(session, supabase)
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub, supabase)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub, supabase)
        break
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice, supabase)
        break
      }
      case 'invoice.payment_failed': {
        // Log for monitoring; don't revoke immediately (Stripe retries)
        const invoice = event.data.object as Stripe.Invoice
        console.warn('[Webhook] Payment failed for customer:', invoice.customer)
        break
      }
    }

    // Record successful processing
    await supabase.from('processed_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error(`[Webhook] Error processing ${event.id}:`, err)
    // Return 500 so Stripe retries — do NOT return 200 on failure
    return new Response('Processing error', { status: 500 })
  }
}
```

### Pattern 4: Subscription Event Handlers

```typescript
// apps/web/lib/stripe/subscription.ts (helpers used by webhook route)

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createServiceSupabaseClient>
) {
  const clerkUserId = session.metadata?.clerkUserId
  if (!clerkUserId) throw new Error('No clerkUserId in session metadata')

  // Expand subscription to get period end
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_expires_at: new Date(
        subscription.current_period_end * 1000 // Stripe timestamps are Unix seconds
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  supabase: ReturnType<typeof createServiceSupabaseClient>
) {
  const clerkUserId = sub.metadata?.clerkUserId
  if (!clerkUserId) throw new Error('No clerkUserId in subscription metadata')

  const tier =
    sub.status === 'active' || sub.status === 'trialing' ? 'premium' : 'free'

  await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      stripe_subscription_id: sub.id,
      subscription_expires_at: new Date(
        sub.current_period_end * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  supabase: ReturnType<typeof createServiceSupabaseClient>
) {
  const clerkUserId = sub.metadata?.clerkUserId
  if (!clerkUserId) throw new Error('No clerkUserId in subscription metadata')

  await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
      subscription_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  supabase: ReturnType<typeof createServiceSupabaseClient>
) {
  // On renewal: refresh subscription_expires_at
  if (!invoice.subscription) return
  const sub = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  )
  const clerkUserId = sub.metadata?.clerkUserId
  if (!clerkUserId) return

  await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_expires_at: new Date(
        sub.current_period_end * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)
}
```

### Pattern 5: Cancel Subscription (Set cancel_at_period_end)

```typescript
// apps/web/app/api/stripe/cancel/route.ts
// Source: https://docs.stripe.com/billing/subscriptions/cancel
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceSupabaseClient()
  const { data: user } = await supabase
    .from('users')
    .select('stripe_subscription_id')
    .eq('clerk_id', userId)
    .single()

  if (!user?.stripe_subscription_id) {
    return Response.json({ error: 'No active subscription' }, { status: 400 })
  }

  // cancel_at_period_end: true = access continues until billing period ends
  await stripe.subscriptions.update(user.stripe_subscription_id, {
    cancel_at_period_end: true,
  })

  // The customer.subscription.updated webhook will fire and update the DB;
  // but also update locally for immediate UI response
  return Response.json({ success: true })
}

// Reactivation (undo scheduled cancellation):
export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceSupabaseClient()
  const { data: user } = await supabase
    .from('users')
    .select('stripe_subscription_id')
    .eq('clerk_id', userId)
    .single()

  if (!user?.stripe_subscription_id) {
    return Response.json({ error: 'No subscription' }, { status: 400 })
  }

  await stripe.subscriptions.update(user.stripe_subscription_id, {
    cancel_at_period_end: false,
  })

  return Response.json({ success: true })
}
```

### Pattern 6: Customer Portal Session

```typescript
// apps/web/app/api/stripe/portal/route.ts
// Source: https://docs.stripe.com/customer-management/integrate-customer-portal
import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceSupabaseClient()
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('clerk_id', userId)
    .single()

  if (!user?.stripe_customer_id) {
    return Response.json({ error: 'No billing account' }, { status: 400 })
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  })

  return Response.json({ url: portalSession.url })
}
```

### Pattern 7: Success Page — Activating State with Supabase Realtime

The success page must handle the async gap: user lands on it after redirect but webhook may not have fired yet.

```typescript
// apps/web/app/(protected)/subscription/success/page.tsx (Server Component wrapper)
// Client component polls user's subscription_tier via Supabase Realtime

'use client'
import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@celestia/db'  // or the existing client factory

export function ActivatingState({ userId }: { userId: string }) {
  const [tier, setTier] = useState<'free' | 'premium'>('free')
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    // Listen for the users row update triggered by webhook
    const channel = supabase
      .channel('subscription-activation')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `clerk_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.subscription_tier === 'premium') {
            setActivated(true)
          }
        }
      )
      .subscribe()

    // Fallback: also check current DB state on mount (webhook may have already fired)
    supabase
      .from('users')
      .select('subscription_tier')
      .eq('clerk_id', userId)
      .single()
      .then(({ data }) => {
        if (data?.subscription_tier === 'premium') setActivated(true)
      })

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  if (!activated) {
    return <p>Activating your premium access...</p> // Style cosmically
  }
  return <p>Welcome to Celestia Premium!</p>
}
```

**Note:** Supabase Realtime on the `users` table requires the table to be part of the `supabase_realtime` publication. Verify this is enabled, or use short-interval polling (`setInterval` every 2s for up to 30s) as the simpler fallback.

### Anti-Patterns to Avoid

- **Optimistic access grant on redirect:** Do not set `subscription_tier = 'premium'` when the success URL is hit. The redirect fires before Stripe confirms payment. Always wait for the webhook.
- **Using `request.json()` in the webhook handler:** Kills HMAC verification. Always use `request.text()`.
- **`bodyParser: false` export config:** This is the Pages Router pattern. It is silently ignored in App Router. No config export needed — `request.text()` handles it correctly.
- **Returning 200 on processing errors:** If your database update fails, return 500 so Stripe retries. Only return 200 when the event was fully processed.
- **No idempotency check:** Stripe delivers at-least-once. Without an idempotency table, retries will double-update users or send duplicate emails.
- **Trusting client-supplied priceId without validation:** The client sends a priceId to the checkout endpoint. Validate it against a known allowlist of your two Price IDs (monthly and annual) before creating the session.
- **Missing metadata on subscription_data:** If you only add metadata to the Checkout Session (not to `subscription_data`), then `customer.subscription.updated` and `customer.subscription.deleted` events will not carry `clerkUserId` in their metadata, making it impossible to identify the user.
- **Forgetting to pin `apiVersion`:** Stripe's Node SDK warns on missing `apiVersion`; the live API version can change, breaking your type assumptions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC webhook signature verification | Custom crypto.createHmac comparison | `stripe.webhooks.constructEvent()` | Handles timing-safe comparison, timestamp tolerance (5-minute window), and replay attack prevention |
| Subscription state machine | Custom status tracking | Stripe's `status` field + webhook events | Stripe already models: active, past_due, canceled, trialing, incomplete, unpaid — don't duplicate this |
| Billing portal / invoice history | Custom payment history UI | Stripe Customer Portal | Pre-built, PCI-compliant, handles payment method updates, invoice downloads, cancellation |
| Retry logic for failed payments | Custom dunning emails | Stripe Smart Retries + Stripe's built-in email | Stripe automatically retries failed payments on configurable schedule |
| Price/product management | Database table of plan prices | Stripe Dashboard products/prices | Stripe is the source of truth for pricing; your DB stores only the Price ID references |
| Idempotency key management on API calls | Custom request deduplication | Stripe SDK built-in auto-retry with idempotency keys (v13+) | SDK handles this automatically for safe-to-retry requests |

**Key insight:** Stripe handles the complex state — your database is a read-through cache of Stripe's subscription state, updated by webhooks. Don't model subscription complexity locally; sync from Stripe events.

---

## Common Pitfalls

### Pitfall 1: Raw Body Consumed Before Webhook Handler Reads It
**What goes wrong:** Middleware or a shared request handler reads and parses `request.body` before your webhook route gets it. `constructEvent()` then fails with "No signatures found matching the expected signature for payload."
**Why it happens:** In App Router, middleware that tries to read request body would consume the stream. Also, using `request.json()` instead of `request.text()` parses and discards the raw form.
**How to avoid:** Use `await request.text()` exclusively in the webhook route. Do not apply any middleware that reads the body for the `/api/webhooks/stripe` path. In Next.js App Router you do not need `bodyParser: false` — just don't call `request.json()`.
**Warning signs:** `constructEvent` throwing "No signatures found" or "Webhook signature verification failed."

### Pitfall 2: Duplicate User Created in Stripe
**What goes wrong:** Every time a returning user starts a checkout, a new Stripe Customer is created. Billing history, saved payment methods, and the customer portal link all become fragmented.
**Why it happens:** The checkout session was created without passing `customer: user.stripe_customer_id`.
**How to avoid:** Always look up the user's `stripe_customer_id` before creating a Checkout Session. If it exists, pass it. If not, let Stripe create one with `customer_creation: 'always'`, and store the resulting customer ID from the `checkout.session.completed` event.
**Warning signs:** Multiple Stripe customers with the same email in your dashboard.

### Pitfall 3: Missing clerkUserId in Subscription Metadata
**What goes wrong:** `checkout.session.completed` carries metadata, but `customer.subscription.updated` and `customer.subscription.deleted` do not — so you can't identify which user to update on subscription lifecycle events.
**Why it happens:** Metadata is set on the Checkout Session but not on `subscription_data`.
**How to avoid:** Always set `subscription_data.metadata.clerkUserId` in addition to `metadata.clerkUserId` when creating the Checkout Session. Alternatively, store a mapping of `stripe_customer_id → clerk_user_id` in your database and look up by customer ID on every webhook.
**Warning signs:** Webhook handler throwing "No clerkUserId in metadata" for subscription events.

### Pitfall 4: Webhook Timeout (Stripe 20-Second Rule)
**What goes wrong:** Stripe marks webhook delivery failed and retries if your endpoint doesn't respond within 20 seconds. Database migrations, cold starts, or slow Supabase queries can push past this.
**Why it happens:** Doing heavy synchronous processing inside the webhook before responding.
**How to avoid:** Return 200 after the idempotency check and signature verification; process the rest asynchronously if needed. In practice, a single Supabase upsert is well under 1 second — the 20s limit is not a concern unless you add external API calls inside the handler.
**Warning signs:** Stripe dashboard showing repeated webhook failures with no error from your side.

### Pitfall 5: Stripe Timestamp Units
**What goes wrong:** `subscription.current_period_end` is stored as `1234567890` (Unix epoch seconds), but JavaScript Date expects milliseconds. Storing it raw produces a date in 1970.
**Why it happens:** Stripe timestamps are Unix seconds; JavaScript is milliseconds.
**How to avoid:** Always multiply by 1000: `new Date(sub.current_period_end * 1000)`.
**Warning signs:** `subscription_expires_at` shows dates in January 1970 in your database.

### Pitfall 6: Vercel Deployment Protection Blocking Webhooks
**What goes wrong:** Vercel's "Deployment Protection" feature (enabled by default on some plans) intercepts webhook POST requests and returns a 401 or redirect to an auth page. Stripe sees this as a failed delivery.
**Why it happens:** Vercel adds auth-layer protection to all routes, including API routes, on some project configurations.
**How to avoid:** Disable Deployment Protection for the `/api/webhooks/stripe` path, or configure an exception. This must be done in the Vercel project settings.
**Warning signs:** Stripe dashboard showing 401 responses for webhook deliveries; events piling up in "failed" state.

### Pitfall 7: success_url Redirect Before Webhook Fires
**What goes wrong:** User lands on `/subscription/success`, the page does a server-side data fetch, finds `subscription_tier = 'free'`, and either shows an error or immediately bounces them. They refresh repeatedly.
**Why it happens:** Webhook delivery has network latency (typically 1–10 seconds after checkout completes, but can be longer).
**How to avoid:** The success page must explicitly handle the "activating" intermediate state. Show a loading/activating UI and poll (or use Realtime) until `subscription_tier` becomes `premium` or a timeout expires. Do not do a server-side redirect based on tier on the success page.
**Warning signs:** Users reporting "it said error but I was charged."

---

## Code Examples

Verified patterns from official sources:

### Database Schema Additions (Drizzle)
```typescript
// packages/db/src/schema/users.ts — add these columns to existing pgTable
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  // New in Phase 7:
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
```

### Idempotency Table (Drizzle)
```typescript
// packages/db/src/schema/webhooks.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### Cancel at Period End (verified from Stripe docs)
```typescript
// Source: https://docs.stripe.com/billing/subscriptions/cancel
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,   // access continues until current period ends
})

// Reactivate (undo pending cancellation):
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: false,
})
// Cannot reactivate after the period has ended — must create a new subscription
```

### Create Billing Portal Session (verified from Stripe docs)
```typescript
// Source: https://docs.stripe.com/customer-management/integrate-customer-portal
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
})
// Redirect user to portalSession.url — short-lived session
```

### Validate Known Price IDs (security pattern)
```typescript
// In checkout route — validate client-supplied priceId against allowlist
const ALLOWED_PRICE_IDS = new Set([
  process.env.STRIPE_PRICE_MONTHLY!,  // e.g. price_xxx_monthly
  process.env.STRIPE_PRICE_ANNUAL!,   // e.g. price_xxx_annual
])

if (!ALLOWED_PRICE_IDS.has(priceId)) {
  return Response.json({ error: 'Invalid price' }, { status: 400 })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `export const config = { api: { bodyParser: false } }` | Use `await request.text()` — no config needed | Next.js App Router (13+) | The config export is silently ignored in App Router; `request.text()` is the correct approach |
| `headers().get('stripe-signature')` (async headers) | `request.headers.get('stripe-signature')` | Next.js 15 | `headers()` from `next/headers` is still valid in Server Components; in Route Handlers, use `request.headers` directly |
| `stripe@^14` SDK | `stripe@^17` | 2024-2025 | Major version bumps; check changelog before upgrading if already installed |
| `@stripe/stripe-js` in checkout flow | Not needed for hosted Checkout | N/A | Only required for Stripe Elements (embedded). Hosted Checkout redirect needs only the server SDK |
| Manual retry logic in SDK | SDK auto-retries safe requests (v13+) | stripe-node v13 (2022) | Safe requests auto-retry once with idempotency key; no custom retry code needed |

**Deprecated/outdated:**
- `bodyParser: false` export: Still documented in many older tutorials; does nothing in App Router — ignore any tutorial using it.
- `stripe.customers.createPortalSession`: Old method name — current API is `stripe.billingPortal.sessions.create`.

---

## Open Questions

1. **Supabase Realtime on `users` table — is the publication already enabled?**
   - What we know: Supabase Realtime requires tables to be added to the `supabase_realtime` publication. It's not enabled by default for all tables.
   - What's unclear: Whether the existing Supabase project has this enabled for `users`.
   - Recommendation: On plan 07-02, verify with `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`. If `users` is not listed, either enable it or use 2-second polling on the success page as the fallback.

2. **Stripe CLI forwarding on Windows — any path issues?**
   - What we know: Stripe CLI is cross-platform. The command is `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
   - What's unclear: The project runs on Windows 11 (shell: bash). Stripe CLI works on Windows via PowerShell or WSL; bash via Git Bash should work.
   - Recommendation: Install Stripe CLI via `scoop install stripe` or download the binary directly. Test with `stripe trigger customer.subscription.created` during 07-02 implementation.

3. **Drizzle migration workflow — does the project use `drizzle-kit generate` + `push` or migration files?**
   - What we know: Drizzle ORM is in use. The schema is at `packages/db/src/schema/`.
   - What's unclear: Whether migration files exist or if `drizzle-kit push` (direct schema sync) is used.
   - Recommendation: Check for a `drizzle.config.ts` and `migrations/` folder before Phase 7. New columns (`stripe_customer_id`, `stripe_subscription_id`, `subscription_expires_at`) and new table (`processed_webhook_events`) need a migration run before webhook handler deployment.

---

## Sources

### Primary (HIGH confidence)
- Official Stripe Docs — `https://docs.stripe.com/billing/subscriptions/webhooks` — required webhook events, provisioning/revocation rules
- Official Stripe Docs — `https://docs.stripe.com/billing/subscriptions/cancel` — `cancel_at_period_end` API, reactivation behavior
- Official Stripe Docs — `https://docs.stripe.com/customer-management/integrate-customer-portal` — billing portal session creation
- Official Stripe Docs — `https://docs.stripe.com/webhooks/signature` — signature verification, raw body requirement
- npm `stripe` package page — `https://www.npmjs.com/package/stripe` — confirmed current version: 17.x / 20.x (latest: 20.3.1 as of Feb 2026)

### Secondary (MEDIUM confidence)
- HookRelay Stripe/Next.js guide — `https://www.hookrelay.io/guides/nextjs-webhook-stripe` — complete webhook route handler pattern; verified against official docs
- Pedro Alonso blog — `https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/` — Next.js 15 patterns; server actions vs API routes tradeoffs; verified against official Stripe docs
- WebSearch: Multiple sources confirming `bodyParser: false` config is deprecated in App Router, replaced by `request.text()`

### Tertiary (LOW confidence)
- Supabase Realtime on `users` table for success page polling — multiple blog patterns suggest this approach; actual configuration (publication setup) needs verification in the live project.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `stripe@^17` confirmed on npm; no browser SDK needed for hosted Checkout confirmed in official docs
- Architecture (checkout, webhook, cancel): HIGH — verified directly against Stripe official documentation and App Router-specific patterns
- Idempotency pattern: HIGH — confirmed in Stripe official docs; Stripe explicitly states at-least-once delivery
- Supabase Realtime for success page: MEDIUM — pattern is correct, but publication configuration needs verification in the actual project
- Windows/Stripe CLI dev workflow: MEDIUM — standard tooling, minor environment uncertainty

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (Stripe SDK and Next.js App Router patterns are stable; re-verify if upgrading Next.js major version or stripe SDK major version)
