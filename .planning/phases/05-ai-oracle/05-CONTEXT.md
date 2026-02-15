# Phase 5: AI Oracle - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

AI-powered personalized natal chart readings displayed alongside the interactive chart. Free users get a general personality reading; premium users unlock love, career, and health topics. All readings cite specific degree positions from the user's chart. This phase does NOT include daily horoscopes (Phase 6) or payment integration (Phase 7) — tier gating uses the existing `subscription_tier` field.

</domain>

<decisions>
## Implementation Decisions

### Reading presentation
- Side panel layout: reading appears in a panel next to the chart (desktop), below on mobile
- Long readings (7+ paragraphs): detailed analysis of relevant placements, feels like a full consultation
- Streaming display: token-by-token streaming like ChatGPT — reading streams in as it generates
- Cross-highlighting: when reading mentions a planet (e.g., "Your Mars in Scorpio"), that planet highlights on the natal wheel — chart and reading feel connected

### Topic selection flow
- Topic cards UI: visual cards for each topic (icon + label) — user taps one to generate
- Premium topics show lock icon for free users
- Inline teaser for locked topics: blurred/faded preview of what the reading would say, with upgrade CTA overlaying it — builds desire
- Require tap to generate: general reading does NOT auto-generate when viewing chart — user sees topic cards and chooses intentionally
- Multiple saved readings: user can generate general, then love, then career — all saved and accessible via their topic cards

### AI personality & tone
- Mystical guide voice: elevated, poetic, with spiritual overtones — "The stars have woven intensity into your path..."
- Moderate mysticism level: regular mystical phrasing (cosmic energy, celestial influences, spiritual path) but grounded in actual chart data — no crystal/chakra talk
- Second person address ("you"): "Вашият Марс в Скорпион ви дарява..." — personal and direct
- Subtle topic variation: same base mystical guide voice, but love reads warmer, career reads more assertive, health reads more nurturing

### Caching & regeneration
- Readings expire after 7 days — encourages re-engagement with fresh content
- Manual regeneration available but rate-limited (once per day) — prevents API abuse while giving flexibility
- Multiple topic readings saved simultaneously per user/chart
- Primary AI provider: Gemini (Google) — strong Bulgarian language support

### Claude's Discretion
- Exact streaming implementation (SSE vs WebSocket)
- Gemini model version selection (research during planning)
- Loading states and error handling patterns
- Blurred teaser generation approach (real preview vs placeholder)
- Database schema for storing readings (table structure, indexing)
- Prompt engineering specifics (system prompt structure, few-shot examples)

</decisions>

<specifics>
## Specific Ideas

- Cross-highlighting between reading text and chart wheel creates a connected experience — when the Oracle mentions a placement, the user's eye is drawn to it on the chart
- Inline teaser for premium: the blurred preview should feel like you're *almost* reading it — strong motivation to upgrade
- The tone should echo the project's core voice: "wisdom from a knowledgeable friend who happens to know the stars" but with an elevated, mystical quality
- Bulgarian language throughout — AI generates natively in Bulgarian, not translated

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ai-oracle*
*Context gathered: 2026-02-15*
