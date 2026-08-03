---
title: Premium plan - Connections surface
area: premium
phase: post-launch
created: 2026-05-09
files:
  - apps/web/app/(protected)
  - apps/web/app/api
  - apps/web/components
  - packages/core
  - .planning/POST_LAUNCH_UPGRADES.md
---

## Goal

Plan the premium relationship surface that extends Stellaeum from self-reading into relational astrology.

Core product framing:
- Free tier = self-knowledge
- Premium tier = relational intelligence

Primary feature families:
- Personality reports (premium)
- Compatibility and couple connection (premium)
- One-sided chart analysis of other people / crushes (premium)
- Export-first social sharing for natal and compatibility artifacts

## Product Position

This work should be treated as a coherent product surface, not as isolated add-ons.

Working umbrella names:
- Connections
- Your Constellation
- Relationship Intelligence

Recommended user story progression:
1. User understands their own chart
2. User unlocks a deep premium personality report
3. User explores another person relative to themselves
4. User upgrades into persistent relationship features and shared dashboards

## Feature Breakdown

### 1. Premium Personality Reports

Purpose:
- Deepen the value of natal interpretation beyond the current general reading
- Create a premium artifact that feels structured, polished, and reusable

Report sections:
- Core drives and identity
- Emotional patterns
- Communication style
- Love and attachment style
- Work and ambition style
- Stress patterns and blind spots
- Strengths, growth edges, and practical guidance

Free vs premium:
- Free: brief general personality reading
- Premium: long-form structured report with domain sections and stronger specificity

Implementation outcomes:
- New report schema and storage for reusable premium reports
- New prompt templates and section contracts
- Report UI with section navigation and export snippets

### 2. Couple Connection (Linked Accounts)

Purpose:
- Create the strongest premium retention loop through a shared relationship entity
- Require explicit consent from both people

Core flow:
1. Premium initiator generates invite link or QR code
2. Partner accepts via logged-in or newly created account
3. System creates a persistent Relationship Profile connecting both accounts and charts
4. Both users can access the shared relationship dashboard

What the relationship profile unlocks:
- Synastry analysis
- Composite chart analysis
- Compatibility breakdown by domain
- Shared transit feed
- Relationship history and saved reports

Premium rule:
- One premium user can create and unlock the relationship profile
- Non-premium linked partner gets read access
- Advanced actions remain premium-gated

Open policy decision to make before implementation:
- Whether either partner can unlink the relationship
- Whether unlinking archives or permanently deletes relationship artifacts

Implementation outcomes:
- Relationship entity in the data model
- Invite token flow and acceptance flow
- Shared access rules and audit logging
- Dashboard surfaces for joint insights

### 3. Crush Compatibility / One-Sided Other-Person Analysis

Purpose:
- High-engagement premium feature with lower coordination friction than linked accounts
- Lets users explore attraction, friendship, family, or work dynamics from their perspective

Core flow:
1. User manually enters another person's birth data
2. System stores that profile under the user's account
3. User generates a compatibility report relative to their own chart

Positioning:
- Frame output as "your experience of this person"
- Avoid claiming objective truth about the other person

Output shape:
- Hook headline score / compatibility percentage
- Domain breakdown: romance, communication, emotional resonance, conflict, long-term fit
- "What you need from them"
- "Where you may misread them"
- Transit-based timing windows for saved profiles

Free vs premium:
- Free: one temporary profile, headline score, teaser summary
- Premium: full report, multiple saved profiles, repeated report generation, transit alerts

Implementation outcomes:
- Third-party profile storage model
- Compatibility engine layer that works for saved manual profiles and linked partners
- Saved profile list, limits, and premium gating

### 4. Social Sharing (Export-First)

Purpose:
- Drive acquisition without building a feed, moderation system, or follow graph

Export types:
- Natal chart card
- Premium personality snippet card
- Compatibility card
- Weekly transit card

Format targets:
- 9:16 story
- 1:1 square
- Possibly shareable public page link later

Constraints:
- No in-app social feed in this phase
- No public commenting, likes, or moderation-heavy features

Implementation outcomes:
- Share card templates
- Export endpoints or server-generated image pipeline
- Watermark / CTA policy by tier

## Recommended Sequencing

Implementation should be staged. Do not build all four tracks at once.

### Stage 1. Premium Personality Reports

Why first:
- Lowest coordination complexity
- Reuses existing natal chart inputs
- Builds premium interpretation quality before relationship features depend on it

Deliverables:
- Premium report taxonomy
- Prompt and content contracts
- Report storage and regeneration policy
- Premium report UI and upgrade gating

### Stage 2. Crush Compatibility

Why second:
- Introduces "other people's charts relative to mine" without linked-account complexity
- Validates demand for relational intelligence before building mutual flows

Deliverables:
- Manual other-person profile model
- Compatibility scoring and structured explanation
- Saved profile management
- Premium teaser/full split

### Stage 3. Couple Connection

Why third:
- Strongest retention feature, but the highest auth, consent, and permissions complexity
- Safer after the compatibility engine already exists

Deliverables:
- Invite flow
- Relationship profile
- Shared dashboard
- Shared transit feed

### Stage 4. Social Sharing

Why fourth:
- Depends on having high-quality premium outputs worth sharing
- Can be layered onto reports and dashboards already built

Deliverables:
- Export templates
- Branded share assets
- Optional public profile links later

## Data Model Work

Expected new entities:
- `premium_personality_reports`
- `saved_people_profiles`
- `compatibility_reports`
- `relationship_profiles`
- `relationship_members`
- `relationship_invites`
- `relationship_transits`
- `share_exports` or equivalent export audit table

Key design principle:
- Use one compatibility/report generation core that can operate in two contexts:
  - user + saved manual profile
  - user + linked partner profile

Important ownership boundaries:
- Saved manual profiles belong to one user only
- Relationship profiles belong to the pair and require explicit membership rules
- Generated reports should declare source context to avoid permission mistakes

## Access Control And Privacy

This area needs explicit pre-implementation decisions.

Required rules:
- Only premium users can initiate linked relationships
- Manual third-party profiles are private to the creator
- Linked relationship dashboards are visible to both members
- Regeneration, export, and alert configuration must be permission-scoped

Open questions to settle before code:
- Can a user create reports about non-consenting third parties indefinitely?
- Do we limit saved manual profiles by tier or by policy?
- What happens if a linked partner deletes their account?
- Can one partner hide parts of the relationship dashboard from the other?
- What audit events are required for invite creation, acceptance, unlink, and report generation?

Legal / trust work to pair with implementation:
- Consent language for linked accounts
- Product disclaimer language for third-party chart analysis
- Privacy policy updates covering relationship data

## UX Surface

New premium navigation area:
- `Connections` is the recommended top-level concept

Likely sub-surfaces:
- `My Report`
- `Saved People`
- `Compatibility`
- `Relationship Dashboard`
- `Share`

Upgrade moments:
- After free personality teaser
- After first crush score teaser
- On save-second-profile attempt
- On relationship invite creation
- On export of unwatermarked cards

## AI / Content Work

This work is not just feature plumbing. Content quality is critical.

Needed content systems:
- Structured prompt contracts for personality sections
- Structured prompt contracts for compatibility domains
- Score explanation policy so percentages are interpretable
- Transit narrative rules for relationship timing

Quality bar:
- Avoid generic flattery
- Cite chart mechanics clearly
- Make domain breakdowns actionable
- Keep relationship interpretations emotionally legible without overclaiming certainty

## Technical Workstreams

Workstreams to split during implementation:
1. Product and policy decisions
2. Data model and migrations
3. Compatibility engine and scoring approach
4. AI prompts and response contracts
5. API routes and premium enforcement
6. UI flows and dashboard surfaces
7. Sharing/export pipeline
8. Privacy, audit, and copy updates

## Risks

Main risks:
- Premium reports feel longer but not better
- Compatibility scores feel arbitrary if not well explained
- Third-party chart analysis creates trust or ethical friction
- Linked-account permissions become hard to reason about
- Shared dashboard creates deletion / unlink edge cases
- Social export work gets ahead of core interpretation quality

Risk mitigation:
- Ship in stages
- Keep manual-profile and linked-account contexts distinct
- Design permission rules before route implementation
- Validate content quality with real outputs before launch

## Recommended First Implementation Plan

When implementation starts, begin with this order:
1. Define premium personality report taxonomy and UI contract
2. Add saved-manual-profile support for other people
3. Build compatibility scoring plus structured report output
4. Add premium gating and limits
5. Add linked relationship invites and shared profile membership
6. Add shared transit feed
7. Add export-first social cards

## Deliverable For Next Planning Pass

Before coding, create a dedicated phase or post-launch epic that converts this document into:
- Exact requirements
- Database schema plan
- Permission matrix
- Prompt contract spec
- Route inventory
- UI route map
- Rollout and verification checklist
