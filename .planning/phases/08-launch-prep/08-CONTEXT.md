# Phase 8: Launch Prep - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the landing page into a proper conversion experience (hero, feature showcase, pricing table), add GDPR compliance (privacy policy, data export, account deletion), and implement audit logging for sensitive operations. Mobile and new capabilities are out of scope.

</domain>

<decisions>
## Implementation Decisions

### Landing page — conversion approach
- "Explore then convert" — hero draws visitors in with atmosphere and value proposition; CTAs appear after they've seen features
- Two CTA touchpoints: secondary CTA in the hero section, primary CTA again after the feature showcase
- Reuse the canvas-based animated starfield from the auth page (`apps/web/app/auth/`) for the hero background — consistent atmosphere, already built
- Claude writes Bulgarian-language placeholder motto/tagline that fits the Celestia AI mystical astrology brand (easy to replace later)

### Feature showcase
- Icon + title + description card grid layout — scannable, not alternating rows
- Highlight all 4 features: natal chart visualization, AI Oracle readings, daily horoscope, push notifications
- Framing: show free tier benefits + subtle "Premium" badges on Oracle topics and full horoscope access — drives curiosity without gatekeeping the hero
- Icons: Lucide-react (already in project) — consistent SVG icons with the cosmic glassmorphism theme

### GDPR — data export (SEC-04)
- Instant download in /settings/privacy — button generates and downloads a JSON file immediately containing: charts, birth data, AI readings
- No email workflow, no manual fulfillment

### GDPR — account deletion (SEC-05)
- Soft delete with 30-day grace period — account deactivated, data scheduled for deletion after 30 days, user can cancel during window
- Clerk account deletion triggered at hard-delete time (after grace period), not immediately

### GDPR — UI placement
- Separate /settings/privacy page for GDPR controls (data export + delete account) — linked from /settings
- Full /privacy page at `/privacy` route for the privacy policy — accessible from landing page footer and /settings/privacy
- Privacy policy content: Claude writes appropriate Bulgarian-language GDPR-compliant placeholder text

### Audit logging (SEC-20)
- Storage: Supabase DB table `audit_logs` — same infrastructure, queryable, no new services
- Access: admin-only via Supabase dashboard — no in-app UI needed
- Schema: `user_id`, `event_type`, `timestamp`, `metadata` (JSONB for event-specific context)
- Events to log:
  - **Authentication**: sign-in, sign-out, password reset, failed attempts
  - **Data access**: chart calculation, AI reading generation, horoscope generation
  - **Account changes**: birth data edits, data export requests, account deletion requests (initiation + confirmation)
  - **Payment events**: subscription created, cancelled, reactivated, webhook events received

### Claude's Discretion
- Exact Bulgarian copy for the hero motto and privacy policy (placeholder text that reads authentically)
- Lucide icon selection per feature card
- Exact spacing, card shadow depth, and typography within the glassmorphism theme
- Audit log helper utility design (function signature, error handling)
- Grace-period deletion scheduling mechanism (cron job or Supabase pg_cron or manual)

</decisions>

<specifics>
## Specific Ideas

- The hero canvas starfield is already extracted in the auth page — extract to a shared component or duplicate the implementation
- The /settings page from Phase 7 has 4 subscription states — /settings/privacy is an additive new route, not a modification of the existing page
- "Premium" badges on feature cards should visually match the existing premium badge on the dashboard (from Phase 7)
- The pricing section already exists at /pricing — the landing page pricing area should link to it rather than duplicate the full pricing logic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 08-launch-prep*
*Context gathered: 2026-02-18*
