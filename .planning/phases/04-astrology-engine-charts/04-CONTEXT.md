# Phase 4: Astrology Engine & Charts - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Users see their natal chart with interactive planet exploration and Big Three prominently displayed. Swiss Ephemeris calculations run server-side via swisseph-wasm. Chart renders as interactive visualization with D3.js. All 10 major planets displayed with positions.

**Not in scope:** AI-generated interpretations (Phase 5), daily horoscopes (Phase 6).

</domain>

<decisions>
## Implementation Decisions

### Chart Visualization
- Hybrid layout: wheel for overview + cards for detail views
- Minimalist cosmic style: dark background, thin lines, glowing accents (matches app glassmorphism theme)
- Aspect lines always visible (conjunction, trine, square, opposition)
- Bulgarian text abbreviations for signs/planets: Слънце, Луна, Овен, Телец, etc. (not Unicode glyphs)

### Planet Interpretations
- Inline expansion: card expands below the chart when planet tapped
- Phase 4 shows placeholder: position + "Пълна интерпретация скоро..." message
- Full AI-generated interpretations deferred to Phase 5

### Big Three Prominence
- Positioned alongside chart: next to wheel on desktop, above on mobile
- Glassmorphism cards matching app theme (blurred background, subtle glow)
- Card content: sign + brief trait (e.g., "Слънце в Лъв — лидер")
- Tappable: same inline expansion behavior as wheel planets

### Calculation & Data Flow
- Cache calculated chart in database, only recalculate if birth data changes
- Placidus house system (most common in Western/Bulgarian astrology)
- Unknown birth time: noon chart with disclaimer that Rising/houses are approximate
- Bulgarian error messages for calculation failures, suggest checking birth data

### Claude's Discretion
- Exact aspect line colors and styling
- Loading skeleton design
- Chart animation on load
- Mobile responsive breakpoints for wheel scaling

</decisions>

<specifics>
## Specific Ideas

- Chart should feel modern and cosmic, not cluttered like traditional astrology software
- Wheel should be the hero element but Big Three cards give quick scannable summary
- "Coming soon" messaging sets expectation for AI interpretations in next phase

</specifics>

<deferred>
## Deferred Ideas

- Full AI-generated interpretations — Phase 5 (AI Oracle)
- Aspect interpretations — could be Phase 5 or later
- Chart comparison (synastry) — future phase
- Transit overlay on natal chart — Phase 6 (Daily Horoscope)

</deferred>

---

*Phase: 04-astrology-engine-charts*
*Context gathered: 2026-02-01*
