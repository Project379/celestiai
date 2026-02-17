# Phase 7: Payments - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can purchase, manage, and cancel premium subscriptions via Stripe with automatic access grant/revoke. Covers: Stripe Checkout integration, webhook-driven subscription lifecycle, in-app pricing page, subscription management settings page, and paywall upgrade prompts across existing features.

</domain>

<decisions>
## Implementation Decisions

### Checkout experience
- Hosted Stripe Checkout (redirect to stripe.com) — not embedded
- After successful payment: redirect to dedicated /subscription/success page with confirmation details, then link back to dashboard
- After payment failure/cancel: redirect back to /pricing page with subtle message that payment wasn't completed
- Premium access activation: wait for Stripe webhook confirmation (show brief "activating..." state on success page until webhook fires), not optimistic grant on redirect

### Pricing presentation
- Both a dedicated /pricing page AND contextual inline upgrade prompts throughout the app
- /pricing page: side-by-side cards comparing Free tier (left) and Premium tier (right) with feature checkmarks
- Two pricing options with toggle: €9.99/mo and €99.99/yr (~17% annual savings) — two Stripe Price objects needed
- Existing premium users who visit /pricing see their current plan highlighted with active badge + "Manage subscription" link (no redirect)

### Subscription management
- Dedicated /settings page for subscription management (not inline on dashboard)
- Cancel behavior: access continues until end of current billing period (standard SaaS grace period)
- Cancellation flow: confirmation dialog with optional "Why are you leaving?" dropdown for product feedback
- After cancellation: settings page shows "Your premium expires on [date]" with a "Reactivate" button (not redirect to /pricing)
- Full billing details shown: plan name, next billing date, status (active/cancelling/expired), payment method (last 4 digits), billing history link via Stripe Customer Portal

### Paywall behavior
- Multiple upgrade touchpoints: locked Oracle topic cards (existing), dashboard premium badge/banner, daily horoscope section upsell
- Daily horoscope upsell angle: "Unlock detailed transit analysis and planetary influences" (deeper analysis, not additional time periods)
- Upgrade CTA style: inline expansion — locked card expands in-place to show pricing and upgrade button (stays in context, not modal or page redirect)
- Upgrade prompt tone: gently persuasive — warm cosmic nudge ("Unlock the full picture of your cosmic journey"), not urgent/salesy. Consistent with the app's wise, supportive personality

### Claude's Discretion
- Exact Stripe product/price naming and metadata structure
- Webhook endpoint security implementation details
- Loading/activating state design on success page
- Cancellation reason dropdown options
- Exact copy for upgrade prompts (within the gently persuasive tone)
- Dashboard premium badge placement and style

</decisions>

<specifics>
## Specific Ideas

- The inline expansion CTA should feel like revealing hidden content, not a sales popup — consistent with how locked Oracle topics already show a blurred teaser
- "Activating..." state on success page should feel cosmic/on-brand, not clinical
- Reactivate button in settings should be visible but not desperate — the app respects the user's choice to cancel

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-payments*
*Context gathered: 2026-02-17*
