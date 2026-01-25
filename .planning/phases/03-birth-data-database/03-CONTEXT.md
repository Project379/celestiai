# Phase 3: Birth Data & Database - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can input and edit birth data (date, time, location) with Bulgarian city search. Data stored encrypted with Row Level Security. Coordinate resolution for selected locations. Chart visualization and interpretation belong in Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Birth data form flow
- Step-by-step wizard with progress indicator
- Calendar popup for date selection
- "Time unknown" prompts for approximate range (morning, afternoon, evening)
- Preview summary screen after completion — "Looks good?" confirmation before saving

### Bulgarian city search
- Simple list display — city names with oblast (region) in parentheses
- Cities prioritized first, villages shown below
- Search triggers as you type (debounced)
- If birthplace not found, allow manual lat/lon coordinate entry

### Data editing experience
- Accessible from both dashboard card and settings page
- Inline editing — click field directly to edit in place
- Confirmation dialog required before saving changes ("Are you sure?")
- Minimal display: date, time, city name only

### Error handling & validation
- Inline errors under each field (red text below invalid field)
- Real-time validation as user types (debounced)
- Friendly Bulgarian error messages (e.g., "Моля, изберете дата в миналото")
- Network failures show retry button with "Моля, опитайте отново" message

### Claude's Discretion
- Exact wizard step transitions and animations
- Debounce timing for search and validation
- Calendar popup implementation details
- Coordinate input field format/layout
- Error message exact wording within friendly tone

</decisions>

<specifics>
## Specific Ideas

- Approximate time ranges: morning (06:00-12:00), afternoon (12:00-18:00), evening (18:00-24:00), night (00:00-06:00)
- Manual coordinates as fallback for edge cases — users born abroad or in unlisted locations

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-birth-data-database*
*Context gathered: 2026-01-25*
