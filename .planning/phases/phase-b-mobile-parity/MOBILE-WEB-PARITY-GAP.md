---
title: Mobile ↔ Web Parity Gap Inventory
phase: Phase B (Stream P)
created: 2026-05-09
status: living document — single source of truth for Stream P work

**RELIABILITY WARNING, read before trusting any status cell (added
2026-08-16):** this doc's status column has been wrong five separate times
in one session — a web behavior described that never existed (Batch 2's
6.2), a whole section overtaken by a real feature shipping underneath it
before the doc caught up (Batch 4's Кръг rewrite), a file-count estimate
off by roughly 14x on one migration's literal-hex strays (Batch 6), and
five rows (3.4, 5.6, 5.9, 7.1, Section 11) still claiming "not started"
for work that had already shipped, discovered only when Batch 7 re-checked
against current code instead of this doc (2026-08-16). **Treat every
status cell here as a hypothesis to verify against actual code before
acting on it, never as fact on its own.**
last-updated: 2026-08-13 — targeted refresh per founder's specific attention list, not an exhaustive re-check of all ~50 rows. Actually re-verified against current code this pass: Section 3 (Кръг — rewritten; web shipped a full Circle backend+UI, `CircleHub.tsx`/Stream K Port 1, superseding the empty-state-vs-empty-state framing this section previously described; `CircleEmptyState.tsx` is now dead code on web), item 2.8 (new — chart-tab tap-select re-render, founder-reported FPS drop, checked against both mobile's and web's `NatalWheel.tsx`), Section 11 (new — API rate-limiting coverage, cross-cutting, not previously tracked here), Section 12 (new — amber→bronze design-token migration sizing, corrected mid-pass after an unverified first draft wrongly took a stale code comment at face value), items 5.6/5.7/5.9/7.1/7.2/7.3 (GDPR deletion UI and subscription/RevenueCat state, re-checked against current settings.tsx/premium.tsx/RevenueCatProvider.tsx — both already-accurate and one refined). **Everything else in Sections 1, 2.1-2.7, 4, 5.1-5.5/5.8, 6, and 7.4-7.9 was NOT re-opened this pass** — those rows carry forward from prior rounds unverified by this refresh; treat their `done` status as [inferred from prior verification], not re-confirmed 2026-08-13.

**Second update, same day — Batch 2 (Oracle parity polish):** Section 6 items 6.2, 6.4, 6.5 shipped; 6.1 investigated and stays open (real technical constraint, not skipped work — see row for detail); Section 8 REVISIT 20/22 statuses corrected to match. Section 6.2 also corrects a stale claim discovered mid-batch — web's Oracle never actually rendered colored sentinels, despite this doc previously saying it did.
---

# Mobile ↔ Web Parity Gap Inventory

## Purpose

Phase A's TestFlight DOD (chart + Oracle) was satisfied as written, but the implicit assumption that "mobile parity with web" was out-of-scope for v1.0 soft launch was reversed by founder ratification 2026-05-09. **Soft launch quality bar = full web parity, less Friends groups (deferred to future research).** This document is the single source of truth for that scope, organized surface by surface, item by item, with status tracking.

This document is updated as items get ported. Each item carries a Status column:

- **not started** — gap identified, no work yet
- **in progress** — actively being worked, sub-round reference if assigned
- **done** — shipped, sub-round + commit reference
- **deferred** — explicitly punted with reason

## How to use this document

When opening a Stream P sub-round, find the items in scope, set them to `in progress` with the sub-round reference. On commit, flip to `done` with the commit hash. When a parity item is decided to be out-of-scope (Phase D web reposition will replace it, mobile UX differs fundamentally, etc.), flip to `deferred` and document the reason. Don't delete items.

---

## Section 1: Днес tab

`apps/mobile/app/(authed)/(tabs)/index.tsx` vs `apps/web/components/dashboard/DashboardContent.tsx`

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 1.1 | Greeting block — «{TOD}, {firstName}.» time-aware h1 | `DashboardContent.tsx:163-170` | greeting renders with Clerk `useUser().firstName` (fallback «Потребител»); firstName styled `text-amber-200/95` + RN `textShadow*` for warm halo (Option C, no gradient deps) | **done — P.1-b `a6947e3`** |
| 1.2 | Sign-quip block — 12 hand-written Bulgarian one-liners per sun sign (`SIGN_QUIPS` map) | `DashboardContent.tsx:59-72` | `SIGN_QUIPS` Record at module top, 12 verbatim entries; renders when `chart && sunSign`, between Небесен ритъм summary and Дневен хороскоп title | **done — P.1-b `a6947e3`** |
| 1.3 | Premium badge in ambient header (when `isPremium`) | `DashboardContent.tsx:126-130` | **[VERIFIED, Batch 7, 2026-08-16] the stub described here no longer exists** — grepped `index.tsx` (Днес) for "premium"/"isPremium", zero hits. Днес was fully rebuilt 2026-07-22 (same reason 1.12's bento tiles went moot); the P.1-d stub didn't survive that rebuild. Web still ships this badge (`isPremium = subscriptionTier !== 'free'`, confirmed live). Real, small, genuine gap — but adding it now means building new visual chrome from nothing, not wiring an existing stub to Batch 5's real tier data, so it belongs in Batch 8 (UI), not Batch 7. | **not started — moved to Batch 8, previously-claimed stub confirmed gone** |
| 1.4 | Animated sun sigil — violet+gold pulsing glow with `boxShadow` keyframes wrapping the daily-horoscope title | `DailyHoroscope.tsx:54-80` | inline `SunSigil` component, react-native-reanimated + react-native-svg `RadialGradient` blooms (opacity oscillation, opposing phase outer violet / inner amber, 4s cycle); ring + sun glyph static; D1 simpler-vibe — no real Gaussian blur, no expo-linear-gradient | **done — P.1-e `113dd9c`** (+131 LOC, well under D8 250 ceiling) |
| 1.5 | Sentinel color rendering on horoscope planet mentions (`HoroscopeStream` parses `[planet:KEY]…[/planet]` markers and colors via `PLANET_COLORS`) | `apps/web/components/horoscope/HoroscopeStream.tsx` | `parseSentinels` lifted to `@stellaeum/core/oracle/planet-parser` returning `ParsedSentinel[]`; mobile maps planet → hex via local `PLANET_HEX_COLORS`; web keeps Tailwind className map locally | **done — P.1-c `33e9ec4`** (closes REVISIT-22) |
| 1.6 | SSE streaming text via `useCompletion` | `useDailyHoroscope.ts` (web) | both surfaces use `format=json` after the web client silently dropped `useCompletion` (backend SSE path still intact); mobile matches current web non-streaming behavior | **deferred — silent close per P.1 ratification 2026-05-11.** Tri-state was (a)+(c): close 1.6 silently + ship Yesterday tab. If true SSE UX is later wanted, restore on both surfaces simultaneously. Closes REVISIT-20 by re-classification. |
| 1.7 | Real `LunarTile` data-driven from current lunar phase | `apps/web/components/dashboard/tiles/LunarTile.tsx` | inline tile uses `lunarPhase` + `meteorShower` from `@stellaeum/core/welcome` + `formatCountdown` lifted verbatim from web; active meteor-shower secondary line with `daysUntilPeak()` | **done — P.1-a `a0c44e0`** |
| 1.8 | Real `TransitTile` data-driven from `/api/transit-overview` | `apps/web/components/dashboard/tiles/TransitTile.tsx` | mobile copy matches web's static placeholder verbatim («Транзити / Небесно време / активните аспекти към картата ти / виж всички») | **done at parity — P.1-a `a0c44e0`.** Web `TransitTile.tsx` is also a static link card; "data-driven top-transit headline" was aspirational on both surfaces (inline comment at `TransitTile.tsx:6-10` confirms). Cross-surface data-driven port noted in REVISIT-41 sweep. |
| 1.9 | Real `CircleTile` | `apps/web/components/dashboard/tiles/CircleTile.tsx` | mobile shows «Добави човек» + subtitle «партньор · приятел · crush» (verbatim from web) | **done at parity — P.1-a `a0c44e0`.** Web is also empty-state CTA; "Today in your circle" preview depends on Friends groups (out of v1.0 scope per founder ratification). |
| 1.10 | Crystal tile SSR-equivalent — web passes `initialData` from server to avoid client-fetch flash | `DashboardContent.tsx` + `dashboard/tiles/CrystalTile.tsx` | mobile `<CrystalCard />` client-fetches on mount via `/api/crystals/today`; brief loading shimmer where web pre-fetches via Server Component; CrystalCard border + eyebrow aligned with web's amber accent in P.1-f sweep | **deferred — accepted divergence per P.1 ratification 2026-05-11.** Expo Router server components don't exist in this codebase; alternative is disproportionate to a single-tile shimmer. |
| 1.11 | (NEW — surfaced during P.1 investigation) Today/Yesterday tab switcher above horoscope content, lazy-fetch yesterday, AsyncStorage cache parity with web's localStorage path, «Неналично» disabled-tab when yesterday's reading not yet generated | `DailyHoroscope.tsx:113-125` | mobile uses TanStack Query × 2 (lazy yesterday via `enabled: selectedDate === 'yesterday'`) + AsyncStorage in queryFn for cross-session persistence; inline `DateTab` component mirrors web's typographic-underline pattern | **done — P.1-f (this commit).** Yesterday-unavailable derived from `yesterdayQuery.data?.unavailable === true`. |
| 1.12 | (NEW — surfaced during P.1 investigation) Tile-tap navigation — web bento tiles all use `<Link href="...">` (Crystal → /you/crystals, Lunar/Transit → /rhythm, Circle → /circle); mobile tiles are inert `<View>` | `dashboard/tiles/{Crystal,Lunar,Transit,Circle}Tile.tsx` | mobile tiles are non-tappable | **obsolete — checked 2026-08-04.** The v3 Днес rebuild (`(authed)/(tabs)/index.tsx`, live since the 2026-07-22 cutover) replaced the bento-grid layout entirely with a prose-based screen (greeting → дневен хороскоп → sign quip → небесен ритъм → single «Питай Оракула» CTA). No bento tile components exist anywhere in the mobile tree — confirmed via git history (the `dashboard/tiles/` path never existed on this branch) and against the current mockup (`dnes-v4.html`, which has no bento/tile markup). This item's stale deferral condition ("until destinations exist") is moot: the thing it was waiting to resurrect no longer exists to resurrect. Do not re-open without a fresh design decision — this is not a "destinations now exist, wire it" case.** |

---

## Section 2: Карта tab

`apps/mobile/app/(authed)/(tabs)/chart.tsx` vs `apps/web/components/chart/ChartView.tsx`

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 2.1 | Top-level tab switch: «Карта» / «Речник» (Cinzel underline slider) | `ChartView.tsx:136-167` | TOP_TABS state + Pressable pair with static underline below active label; AstrologyReference renders when `activeView === 'reference'`; chart content under `activeView === 'chart'` | **done — P.2-b `932429f`.** Static underline (no Reanimated slider) per Conservative SDK defaults posture. |
| 2.2 | `AstrologyReference` — full reference dictionary (planets / signs / houses / aspects) | `apps/web/components/chart/AstrologyReference.tsx` | `apps/mobile/components/chart/AstrologyReference.tsx` ports the four inner tabs (Легенда / Планети / Аспекти / Транзити) with all 12 PLANETS_DATA + 5 ASPECTS_DATA + 10 TRANSITS_DATA entries verbatim from web | **done — P.2-b `932429f`.** CelestialIcons fallback (Halt-trigger 5) applied: PLANET_GLYPHS + ZODIAC_GLYPHS unicode in Cinzel; no nested ScrollView (consumed inside chart.tsx's outer ScrollView). |
| 2.3 | `PlanetsList` — Details chip implementation: every planet with degree+sign+house+retrograde | `apps/web/components/chart/PlanetsList.tsx` | `apps/mobile/components/chart/PlanetsList.tsx` renders Pressable rows; tap wires to existing handlePlanetSelect → PlanetDetail; consumes formatDegreeInSign from `@stellaeum/core/charts/sections` | **done — P.2-c `3321ae1`.** |
| 2.4 | `AspectsList` — Aspects chip: all aspects with planet pair + type + orb + applying flag | `apps/web/components/chart/AspectsList.tsx` | `apps/mobile/components/chart/AspectsList.tsx` groups aspects by SECTION_ORDER (conjunction / opposition / square / trine / sextile), per-section expander state in a single Record<AspectType, boolean>, default visible 3 rows + «Покажи всички (N)» button | **done — P.2-c `3321ae1`.** ASPECT_ACCENT color scheme mirrors web's Tailwind palette as hex values for RN. |
| 2.5 | `HousesList` — Houses chip: 12 house cusps with sign + interpretation | `apps/web/components/chart/HousesList.tsx` | `apps/mobile/components/chart/HousesList.tsx` renders 12 house rows with HOUSE_THEMES verbatim + Placidus badge; branches on `!birthTimeKnown` for час-неизвестен empty state | **done — P.2-c `3321ae1`.** |
| 2.6 | `NatalWheelLegend` — small legend block above wheel | `apps/web/components/chart/NatalWheelLegend.tsx` | `apps/mobile/components/chart/NatalWheelLegend.tsx` — absolute-positioned «i» button top-right of wheel + Pressable backdrop + content overlay panel; BackHandler.addEventListener wired for Android hardware back parity with RN Modal's onRequestClose | **done — P.2-d `8c28ac8`.** Halt-trigger 7 ratification: absolute View + backdrop Pressable pattern (no RN Modal) + BackHandler wired. |
| 2.7 | Wheel arrival animation — zoom-from-stars (scale 0.08→1, blur 18px→0, arrival glow flash, persistent halo) | `ChartView.tsx:210-243` | `apps/mobile/components/chart/WheelArrivalContainer.tsx` — three coordinated layers via Reanimated 4 worklets: wheel scale + opacity 4-keyframe sequence over 1.3s; SVG radial-gradient arrival flash overlay (opacity 0→0.55→0 + scale 0.75→1.08→1.18 with 150ms delay); SVG radial-gradient persistent halo (opacity 0→0.4 with 800ms delay) | **done — P.2-e `068b04d`.** Halt-trigger 6 pragmatic hybrid: skipped SVG feGaussianBlur on the wheel root (NatalWheel is 449-LOC production-stable, no natural filter-wrap point); overlay gradient layers preserve the de-resolution visual register without modifying NatalWheel. 163 LOC well under D8 250 ceiling. |
| 2.8 | (NEW — 2026-08-13, founder report: tapping a planet on the natal wheel drops FPS ~60→~30 and it doesn't recover until force-quit) Tap-select re-render cost | `apps/web/components/chart/NatalWheel.tsx` — **[verified] not memoized at all** (no `memo()`/`React.memo` anywhere in the file); web's `ChartView.tsx` holds `selectedPlanet`/`selectedPlanetData` in plain `useState` and re-renders its `NatalWheel` on every tap the same as mobile does structurally. So this isn't "mobile does something web avoids" — both platforms fully re-execute their wheel component on selection. The founder-reported symptom is mobile-specific in practice, which points at RN's SVG/bridge reconciliation cost for ~500 nodes being far more expensive than the DOM/browser equivalent, not at a mobile-only code defect vs. a correct web pattern. | `NatalWheel.tsx` is wrapped in `memo()` (line 159) with a comment ("Perf fix (chart-tab frame drops)") stating the intent is to stop *unrelated* `ChartScreen` re-renders (e.g. opening `DetailsSheet`) from re-rendering the ~500-SVG-node tree. But `selectedPlanet` is itself a prop of `NatalWheel`, and `chart.tsx`'s `handlePlanetSelect` (line 85, correctly `useCallback`-wrapped) calls `setSelection`, which changes `selectedPlanet` on every tap — so the memo does NOT skip the re-render that matters most: the tap itself. `planetPositions` is behind its own `useMemo` keyed on `[chart.planets, center, planetRadius, rotationDeg]` (not `selectedPlanet`), so geometry recompute is correctly skipped, but everything downstream in the function body — zodiac segments, house lines, all aspect `<Line>`s, and the `planetPositions.map(...)` gem loop at line 443 (which reads `isSelected = selectedPlanet === planet.planet` per planet) — is un-memoized JSX and fully re-executes and re-diffs on every single tap. No sub-component split isolates "just redraw the selection ring/gem fill" from "redraw the whole wheel." | **[inferred] confirmed via code read, not a profiler trace.** This is a real, concrete mechanism that would produce a per-tap frame-drop (~500 SVG node re-render), consistent with the founder's report. It does NOT by itself explain the "doesn't recover until force-quit" persistence — that suggests something beyond a single expensive re-render (possible SVG node accumulation, animated-props/worklet leak from `WheelArrivalContainer` (2.7) interacting with repeated selection, or RN bridge backlog) and needs an actual profiler session, not just a source read. Fix path if confirmed: split the planet-gem loop into its own memoized child component keyed per-planet so only the tapped/untapped planet's `<G>` re-renders, leaving zodiac/house/aspect layers untouched by selection changes. |

---

## Section 3: Кръг tab — REWRITTEN 2026-08-13, prior framing was stale

`apps/mobile/app/(authed)/(tabs)/circle.tsx` vs `apps/web/components/circle/CircleHub.tsx` (**not** `CircleEmptyState.tsx` — see below)

**This section's premise changed underneath it and the doc hadn't caught up.** The prior framing ("both surfaces are empty-state placeholders, functional gaps are Stream K not Stream P") was accurate when written but is no longer true on the web side. Per `STREAM-K-PORT-LOG.md` "Port 1" (2026-08-04), a fully-built Circle backend + web UI was recovered from an independently-developed branch (`implementation-of-final-features`, PR #10) and merged to `main` — **not** the reactive per-feature port the original Stream K framework assumed. `apps/web/app/(protected)/circle/page.tsx` now renders `CircleHub` unconditionally (`data ? <CircleHub data={data}/> : null`); `CircleEmptyState.tsx` is no longer imported anywhere in `apps/web` — **[verified] it is dead/orphaned code on web**, confirmed via grep (zero import sites besides its own definition). Rows 3.1-3.3 below, which compared mobile's placeholder against `CircleEmptyState.tsx`, are now comparing mobile against a component that doesn't render in production — moot in the same way item 1.12 went obsolete.

**Current state, verified 2026-08-13:**

- **Web** (`apps/web/components/circle/`): `CircleHub.tsx` (936 LOC) — full data-driven UI: 4 relationship types (romantic/friendship/work/family), 8 compatibility domains, saved-people profiles, connection invites, relationship reports, relationship "weather" (transit-to-relationship copy). `SavedProfileForm.tsx` (278 LOC), `ConnectInviteAcceptance.tsx` (95 LOC — mounted at `apps/web/app/connect/[token]/page.tsx`). `CircleEmptyState.tsx` (115 LOC) is dead code, not deleted, not rendered.
- **Web API** (`apps/web/app/api/circle/**`): 9 route files, ~878 LOC combined — invites (create/accept/list/get, 407 LOC across 3 files), profiles (CRUD + report generation, 229 LOC across 3 files), relationships (archive/report/weather, 242 LOC across 3 files). Backed by 9 live production tables (`connection_spaces`, `connection_members`, `connection_invites`, `connection_reports`, `relationship_profiles`, `relationship_invites`, `compatibility_reports`, `saved_people_profiles`, `saved_people_reports`) plus `apps/web/lib/circle/{report,service,token,types,weather}.ts` and `packages/core/src/relationships/{compatibility,types}.ts` (cross-chart aspect calc, 8-domain scoring, composite chart data).
- **Mobile** (`apps/mobile/app/(authed)/(tabs)/circle.tsx`, 70 LOC): **[verified] unchanged, still literally the original empty-state placeholder** — a greeting line, three static `Pressable` relationship-type cards with no `onPress` handler (they render but do nothing), and a closing line inviting the user to "add someone." No add-person flow, no profiles, no invites, no reports, no synastry, no navigation anywhere. Confirmed via grep across all of `apps/mobile` for "circle" (case-insensitive) — the only Кръг-shaped file in the mobile tree is this one screen; every other match was an unrelated design-system "circle" shape/icon reference.
- Per `STREAM-K-PORT-LOG.md` itself: this web port has **not** had a design pass (the 936-LOC `CircleHub.tsx` is structurally unrelated to the existing `krug-v4.html` mockup — two different eras of Кръг design thinking), has not had a full copy/register sweep, and has not been manually/E2E tested end-to-end. So the mobile port target is itself still moving.

**Sizing the real gap (supersedes the old 3.1-3.3 framing):** porting Кръг to mobile is a from-scratch build against ~2,200 LOC of web reference (936 + 278 + 95 + 115 dead-but-referenceable + 878 API, before counting the `lib/circle/*` service layer or the `packages/core` relationships module both surfaces would share). This is squarely the "big, real gap" this refresh was asked to confirm — not a visual-polish item, a whole feature. Not started on mobile in any form.

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 3.1 | Subtitle per card («дълбока връзка» / «близък кръг» / «тих радар») | `CircleEmptyState.tsx:24-46` (dead code, see above) | mobile cards only show label, no subtitle | **obsolete — checked 2026-08-13.** Comparison target no longer renders on web; superseded by the full Кръг port scoped above. |
| 3.2 | Motion fadeUp entry animation | `CircleEmptyState.tsx:49-62` (dead code, see above) | static render | **obsolete — checked 2026-08-13.** Same reason as 3.1. |
| 3.3 | Hover/focus glow on cards | `CircleEmptyState.tsx:88-101` (dead code, see above) | static (no hover state on mobile generally) | **obsolete — checked 2026-08-13.** Same reason as 3.1; RN-hover reasoning from the original note is now moot rather than wrong. |
| 3.4 | Full Кръг feature port: relationship types, compatibility domains, saved-people profiles, connection invites, relationship reports/weather | `apps/web/components/circle/{CircleHub,SavedProfileForm,ConnectInviteAcceptance}.tsx` + `apps/web/app/api/circle/**` + `apps/web/lib/circle/*` (~2,200 LOC reference surface) | **[VERIFIED, Batch 7, 2026-08-16]** `circle.tsx` (432 LOC) is fully wired to `useConnectionSpaces`/`useSavedProfiles` and all the Circle API routes | **done — Batch 4, both sub-batches, `ec9f642`/`f733c08`.** This row wasn't updated when Batch 4 shipped; see `COMPLETION-TRACKER.md`'s Batch 4 section for the real detail. |

---

## Section 4: Ритъм tab

`apps/mobile/app/(authed)/(tabs)/rhythm.tsx` vs `apps/web/app/(protected)/rhythm/page.tsx`

Mobile is a 38-line shell with title eyebrow «Текущо небе» and 4 visual chips Днес/Седмица/Месец/Година (no state, no content). Web is a multi-component page.

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 4.1 | Editorial hero — «Какво ти влияе сега» h1 + paragraph «Активните транзити към картата ти - как планетите говорят с теб точно днес.» | `rhythm/page.tsx:39-52` | Hero block in `apps/mobile/app/(authed)/(tabs)/rhythm.tsx` mirrors verbatim. Four-chip Днес/Седмица/Месец/Година shell deleted per HT 2; design intent preserved via REVISIT-46. | **done — P.3-a `6348d9e`.** |
| 4.2 | `LunarPhaseCard` — full live lunar-phase card with phase day count + manifesting guidance per phase + meteor shower notes | `apps/web/components/dashboard/LunarPhaseCard.tsx` | `apps/mobile/components/dashboard/LunarPhaseCard.tsx` (309 LOC) + `MoonDisc.tsx` (70 LOC) — direct SVG port of the moon disc; live 60s update interval; two toggle expanders (manifesting + info); meteor banner when active; ambient SVG radial-gradient overlays at hero. Drop-entry-animations discipline (HT 8) applied throughout. | **done — P.3-b `7ecb28d`.** Cohesive UI batch (HT 7) at 383 LOC, under 500 ceiling. |
| 4.3 | Лунен дневник CTA card linking to `/rhythm/journal` | `rhythm/page.tsx:63-81` | Full-Pressable card in `rhythm.tsx` per HT 6 mobile convention; links to `/rhythm/journal` route from P.4-c1. Mirror copy verbatim. | **done — P.3-a `6348d9e`.** |
| 4.4 | `TransitOverviewCard` — live transit→natal aspect feed with chartId | `apps/web/components/horoscope/TransitOverviewCard.tsx` | `apps/mobile/components/horoscope/TransitOverviewCard.tsx` (415 LOC) + `apps/mobile/hooks/useTransitOverview.ts` (30 LOC TanStack with 15-min staleTime mirroring server Cache-Control). PacingMark + Транзити/Речник tab toggle (AstrologyReference reused from P.2-b) + three sections (Активни / Следващи пикове / Лунни събития) + EventRow + EventModal. Transit text fully library-driven from core's `enrichActiveTransit` / `enrichUpcomingTransit` / `enrichLunarEvent` — zero LLM cost surface. | **done — P.3-c `93af03c`.** Cohesive UI batch (HT 7) at 445 LOC, under 500 ceiling. |
| 4.5 | `TransitEventDetail` — per-transit detail surface | `apps/web/components/horoscope/TransitEventDetail.tsx` | Mobile ships in-page `EventModal` only (absolute View + Pressable backdrop + BackHandler, HT 4 ratification). Standalone `/rhythm/[eventId]` route deferred per HT 3; REVISIT-47 filed as P.16 push-notification prerequisite decision. | **done — modal-only via P.3-c `93af03c`.** Deep-link route deferred. |
| 4.6 | `EmptyTransitsState` — empty-state CTA when no chart | `rhythm/page.tsx:104-122` | Inline `EmptyTransitsState` in `rhythm.tsx` duplicates chart.tsx pattern per HT 5 (rule of three). | **done — P.3-a `6348d9e`.** |
| 4.7 | `/rhythm/journal` subroute — entire lunar diary feature (Phase 8 work: 24 prompts × 8 phases, CRUD, markdown export, GDPR cascade) | `apps/web/components/manifest/*` (3 components) + `/api/diary/*` | `apps/mobile/app/(authed)/rhythm/journal.tsx` route + `apps/mobile/components/manifest/{ManifestDiaryContent,ManifestEntryForm,ManifestHistory}.tsx` + `apps/mobile/hooks/useManifestEntries.ts` (TanStack with full optimistic + 5-code error parity) + `apps/mobile/lib/diary/export.ts` (RN Share API, no new dep). Prompts + types + markdown builders lifted to `@stellaeum/core/diary/{prompts,types,export}` so both surfaces consume the same module. SVG radial-gradient ambient atmosphere at hero (HT 7); framer-motion entry animations dropped per the new drop-entry-animations discipline pattern (HT 8). Auth-pattern divergence (raw `auth()` vs `requireAppUser`) filed as REVISIT-44 for harmonization sweep. Android Share truncation risk filed as REVISIT-43. | **done — P.4 (`9d13f1e` / `3853079` / `275a3bd` / `08a66af` / `d48e83c`).** ~816 LOC net across 5 sub-commits. Cohesive UI batch exception ratified at HT 4. Markdown export label calibrated to «Сподели дневника» (one D2-bucket adaptation per share-sheet convention). |

The chip set on mobile (Днес/Седмица/Месец/Година) is forward-looking — yearly forecast is a Phase C feature. Web's chips don't exist; web's Ритъм is current-state-only. **Stream P scope: remove or stub the mobile chips since they don't have parity content.** Founder ratifies whether to keep them dormant or delete during P.3.

---

## Section 5: Ти tab

`apps/mobile/app/(authed)/(tabs)/you.tsx` vs `apps/web/components/you/YouHub.tsx`

Mobile renders 6 sections as a visual list, none clickable. Web has 4 sections as `<Link>` routes; Премиум + Настройки are in the Clerk popover (top-right).

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 5.1 | All 4 web sections are working `<Link>` routes (Кристали, Дневник, Препоръки, Ръководство) | `YouHub.tsx:6-11` | All 6 mobile rows (4 web-paralleled + 2 mobile-only Премиум/Настройки) converted to `<Pressable>` with `router.push`. Five new stub route files at `(authed)/you/{crystals,recommendations,guide,premium,settings}.tsx` with per-destination calibrated copy (HT 6 — no engineering-internal vocabulary in user-facing strings). Дневник uses existing `/rhythm/journal` from P.4-c1. Five new Stack.Screen registrations in `(authed)/_layout.tsx`. | **done — P.5 `c9913e9`.** |
| 5.2 | `/you/crystals` — monthly windows + daily streak + collection view | `apps/web/app/(protected)/you/crystals/page.tsx` + `apps/web/components/crystals/*` | `apps/mobile/app/(authed)/you/crystals.tsx` replaces P.5 stub; `apps/mobile/components/crystals/{CrystalGem,CrystalOfTheDayCard,DailyStreakPanel,CrystalCollectionContent,CrystalGridTile,CrystalDetailPanel}.tsx` + 3 new hooks (`useCrystalsOverview`, `useCrystalDailyStreak`, `useCollectCrystal`). Detail modal uses canonical Absolute View + Pressable backdrop + BackHandler (not RN Modal). Grid tile named `CrystalGridTile` (not `CrystalCard`) to avoid colliding with the existing dashboard bento tile. Web's `/you/crystals/guide` explainer sub-route deliberately NOT ported — deferred as REVISIT-51 (not in D9's ratified three sub-surfaces); mobile omits the link rather than stubbing a dead route. | **done — P.6 (`8d90afc` / `15bbec3` / `9eaff66` / `8cfeda8`).** 1105 LOC feature, 0 lift (data/logic already lifted in a prior round). Investigation re-projected ~1000-1280 pre-code; actual landed inside band. |
| 5.3 | `/you/recommendations` — stories catalog (8 daily picks per lunar phase + 12 monthly arcs per sun sign) | `apps/web/app/(protected)/you/recommendations/page.tsx` + `apps/web/components/stories/*` | `apps/mobile/app/(authed)/you/recommendations.tsx` replaces P.5 stub; `apps/mobile/components/stories/{StoriesContent,RecommendationCard}.tsx` + `apps/mobile/hooks/useStoryList.ts` (AsyncStorage-backed with `stellaeum.stories.state.v1` key harmonized to web localStorage convention per HT 3). Stories types + catalog lifted to `@stellaeum/core/stories/{types,catalog}`. Chart-less empty-state uses simple CTA pointing to `/wizard/date` per HT 5 ratification — does NOT mirror web's MonthlyPreviewWithoutChart Лъв sample preview (B.0g-3 forced wizard handles chart-less conversion at app open). REVISIT-50 filed for cross-consumer AsyncStorage key harmonization sweep. | **done — P.7 (`31b2664` / `3d2d18c` / `7b6badd` / `d695759`).** ~1250 LOC total: 681 catalog lift (verbatim editorial data) + 569 mobile feature. Investigation projected 1180-1390 (central 1285); actual hit centroid within 3%. |
| 5.4 | `/you/guide` — «Какво е астрологията?», a 7-section narrative primer (История / Принципи / Планетни принципи / Аспектите / Транзитите / Лунни фази / Метод). **Corrected at P.8 investigation** — the prior description ("full astrology reference: planets / signs / houses / aspects") was stale/wrong; the page has no per-sign or per-house content at all, and is an editorial essay, not a reference dictionary (that role is filled by the chart page's `AstrologyReference` component, tracked in Section 2). | `apps/web/app/(protected)/you/guide/*` | `apps/mobile/app/(authed)/you/guide.tsx` replaces P.5 stub; `apps/mobile/components/astrology-guide/{GuideSection,GuideHistorySection,GuidePrinciplesSection,GuidePlanetsSection,GuideAspectsSection,GuideTransitsSection,GuideLunarPhasesSection,GuideMethodSection}.tsx`, all 7 sections mirrored verbatim. PLANET_GLYPHS unicode substitutes for web's CelestialIcon SVGs (Halt-trigger 5 precedent from P.2-b). Also wired the 3 pre-existing dangling "Ръководството" text mentions (`LunarPhaseCard.tsx` x2, `ManifestDiaryContent.tsx`) into live `useGuardedNavigation` links now that the destination exists, recalibrating the 2 that overclaimed "ритуали" (rituals) content §VI doesn't contain, and fixed you.tsx's stale hint text. | **done — P.8 (`14f8a42` / `6e0490a` / `133dfb0`).** 622 LOC feature, 0 lift (content stays inline in the mobile component per ratification — web itself never extracted it and no second consumer exists). |
| 5.5 | `/rhythm/journal` — lunar diary | tracked in Section 4 (item 4.7) | absent on mobile | not started — duplicate of 4.7 |
| 5.6 | Subscription management (Stripe Customer Portal link, billing date, cancel/reactivate, payment method) | `apps/web/app/(protected)/subscription/*` + Clerk popover SettingsContent | **[VERIFIED, Batch 7, 2026-08-16]** `you/premium.tsx` (436 LOC) — all four subscription states, portal/cancel/reactivate wired | **done — Batch 5, `apps/mobile/app/(authed)/you/premium.tsx`.** Not yet device-tested (see `COMPLETION-TRACKER.md` Batch 5). |
| 5.7 | Account settings (auth/email/password, account deletion, GDPR export, privacy). **Corrected at P.10 investigation** — the prior description's file ref ("Clerk popover SettingsContent") was wrong; `SettingsContent.tsx` is subscription-management content (D13/P.9/`/you/premium` territory), not settings — a naming coincidence in the source file, not a settings surface. Web has no `/you/settings` route at all; everything lives in `UserMenu.tsx`'s Clerk `<UserButton>` popover (built-in Account/Security pages + sign-out). Notification preferences were never in scope anywhere — no web precedent, no P.16 backend yet. | `apps/web/components/auth/{UserMenu,DataAccountPage,DeletionPendingBanner}.tsx` | `apps/mobile/app/(authed)/you/settings.tsx` replaces P.5 stub; `apps/mobile/components/settings/DeletionPendingBanner.tsx` + `apps/mobile/hooks/useAccountDeletion.ts` + `apps/mobile/lib/gdpr/export.ts`. D5 amended — Clerk RN `<UserProfile>` ruled out (native TurboModule, unloadable in Expo Go); ships custom section only (sign-out + confirm, GDPR export/delete, Privacy Policy link, app version). Profile-field editing deferred to REVISIT-53. GDPR deletion/export had **zero UI anywhere on web** before this — B.0h built both platforms' first UI for it, in dependency order (web first). | **done — B.0h (`0b59aaa`/`ed4e36a`) + P.10 (`c8ca017`/`68c15a2`).** ~302 LOC (B.0h, web) + ~131 LOC net (P.10, mobile), 0 lift both. |
| 5.8 | Dynamic Big-Three subtitle (display actual sun/moon/rising signs instead of hardcoded literal «Слънце · Луна · Асцендент») | n/a — web doesn't have this surface (web's profile shape is different) | `getBigThreeLabel` in `you.tsx` resolves sun/moon/ascendant signs from `useFirstChart` + `useChart` and renders via `ZODIAC_SIGNS_BG` from `@stellaeum/astrology/client`. Falls back to literal «Слънце · Луна · Асцендент» when no chart loaded (HT 3 — preserve visual layout). | **done — P.5 `c9913e9`.** Mobile-only enhancement; web profile shape doesn't surface a Big Three line. |
| 5.9 | Ти→Премиум destination — "what you'd get" surface (offerings + features + CTA → MobilePaywall trigger) | n/a — web hosts pricing in `/pricing` SEO landing; mobile pattern is different (no standalone /pricing route) | **[VERIFIED, Batch 7, 2026-08-16]** `you.tsx` routes to `you/premium.tsx`; free-state branch shows tier/features + web-subscribe CTA (no native purchase logic — that's the still-open RevenueCat paywall item, tracked separately, halt-required) | **done, free-state half only — Batch 5.** The "MobilePaywall trigger"/native purchase half this row originally described is still the open halt-required item, not this row. |

---

## Section 6: Oracle

`apps/mobile/app/(authed)/oracle.tsx` + `components/oracle/*` vs `apps/web/components/oracle/OraclePanelGlobal.tsx` + 5 oracle components

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 6.1 | SSE/streaming text | `useOracleReading.ts` (web) + `ReadingStream.tsx` | **Closed permanently 2026-08-13 (Batch 2), founder ruling — not deferred, do not reopen.** Web no longer uses `useCompletion`/SSE at all (replaced B.0f-2-fix-1, 2026-05-10) — it's a manual `fetch` + `response.body.getReader()` ReadableStream consumer. React Native's `fetch` has no `ReadableStream`-body support and no polyfill is installed in `apps/mobile`. Ruling: a fragile streaming layer on the app's most-used AI surface is worse than JSON-only: RN streaming polyfills are known-flaky, and the perceived-wait problem streaming exists to solve is already addressed by item 6.4's loading animation (shipped same batch). Won't-do, not a gap. | **won't-do — founder ruling, permanent** |
| 6.2 | Sentinel color rendering — planet mentions colored via `PLANET_COLORS` map | `ReadingStream.tsx` + `parseSentinels` | **Done 2026-08-13 (Batch 2) — but the "Web file ref" column above was stale.** Checked `ReadingStream.tsx` before porting: it calls `stripSentinels`, same as mobile did — it does **not** render per-planet color anywhere; `extractPlanetMentions` there only drives the (mobile-deferred, item 6.3) cross-highlight callback. Web's actual sentinel-coloring pattern lives on Днес (`HoroscopeStream.tsx`/`index.tsx`), not Oracle. Mobile's `ReadingBody.tsx` now reuses that already-shipped Днес pattern (bronze `renderSentinelChunks`, lifted to `lib/oracle/renderSentinelChunks.tsx` so both screens share one implementation) — mobile Oracle is now ahead of web Oracle here, not at parity with it. | **done — mobile-only enhancement, not web parity** |
| 6.3 | Cross-highlight bridge — tapping a colored planet name in the Oracle reading highlights it on the NatalWheel | `apps/web/app/(protected)/chart/page.tsx ChartView ↔ Oracle` | intentionally skipped (D3 SR 7 ratification — mobile is full-screen route, not side-by-side panel) | **deferred — not scope per SR 7 D3** |
| 6.4 | Animated orbiting-diamond canvas during pre-first-token loading | `ReadingStream.tsx` loading state | **Done 2026-08-13 (Batch 2).** Ported web's fully-specified animation (pulsing violet halo, spinning partial-arc amber ring, rotating diamond) to RN primitives already used elsewhere in the app (Reanimated `useSpin`/`usePing`, added to `components/design-system/motion.ts`; SVG arc via `strokeDasharray` in place of web's CSS conic-gradient mask, since RN has no mask equivalent — same visual result, different primitive). Not a new visual treatment — translated an existing spec, per this batch's design-invention guardrail. | **done** |
| 6.5 | Regenerate current reading button — fires `generateReading(topic, true)` for a fresh reroll | `OraclePanelGlobal.tsx:72-75` | **Done 2026-08-13 (Batch 2).** Mobile's `useOracleReading` hook now exposes `canRegenerate`/`regenerate`, mirroring web's 24h-since-last-generation gate exactly. UI: a pill button in the reading footer next to «Всички теми», shown only alongside a saved (not freshly-generated) reading, disabled state dims per web's pattern. | **done** |
| 6.6 | `LockedTopicTeaser` + `/api/oracle/teaser` preview path | `LockedTopicTeaser.tsx` + `OraclePanelGlobal.tsx:77-101` | absent on mobile | **deferred — dead code on web post 2026-04-20 cap-gate refactor (REVISIT-23)** |
| 6.7 | Modal-overlay structure on web vs full-screen route on mobile | `OraclePanelGlobal` mounts in protected layout, listens for `oracle:open` CustomEvent dispatched by ProtectedNav button | mobile is a real route push from the FAB (`router.push('/oracle')`) | **deferred — different structural pattern, equivalent end UX, native mobile pattern is correct** |

---

## Section 7: Cross-cutting gaps (not tied to a single tab)

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 7.1 | Subscription management UI (cancel/reactivate/portal/billing date/payment method) | `apps/web/app/(protected)/subscription/*` + `/settings` | **[VERIFIED, Batch 7, 2026-08-16]** duplicate of row 5.6 — same `you/premium.tsx`, same verification | **done — Batch 5.** Same item as 5.6; kept as a separate row per this doc's "don't delete items" convention, cross-referenced instead of merged. |
| 7.2 | Pricing surface — web has `/pricing` (PricingContent client + monthly/annual toggle). Mobile equivalent is fundamentally different (RevenueCat-driven inline paywall, no standalone route) | `apps/web/app/(protected)/pricing/*` | **Refined 2026-08-13 — checked, not just carried forward.** `apps/mobile/lib/purchases/RevenueCatProvider.tsx` is mounted in `app/_layout.tsx` and does real work: `Purchases.configure()` + Clerk-identity sync (`Purchases.logIn`/`logOut` tracking `useUser()`) — so the SDK is live and identity-linked, not merely installed. But grepping for `Paywall`/`presentPaywall`/`getOfferings` across `apps/mobile` returns nothing outside `RevenueCatProvider.tsx` itself — no offerings fetch, no paywall presentation UI anywhere. `CapReachedNotice.tsx` (Oracle's cap-reached surface) explicitly has no CTA, with an inline comment: "RevenueCat isn't wired yet... the upgrade path lands when RevenueCat ships in P.15." So: SDK/identity plumbing done, purchase UI/offerings genuinely absent. | not started (purchase surface) — identity plumbing already in place, see note. Mobile pattern differs from web's standalone `/pricing` route regardless (see Section 9 D3). |
| 7.3 | GDPR surfaces — Bulgarian privacy policy page, GDPR export/delete-account API + UI in settings, audit logging | `apps/web/app/(protected)/privacy/*` + `apps/web/app/api/gdpr/*` | **Corrected 2026-08-04 — stale, checked against source rather than assumed.** Export + delete-account UI shipped in `apps/mobile/app/(authed)/you/settings.tsx` (P.10-b): «Изтегли данните си» calls `shareAccountExport`, «Изтрий акаунта» calls `useAccountDeletion`'s `requestDeletion` — both hit the same `apps/web/app/api/gdpr/*` routes web uses, so audit logging (`logAuditEvent` calls already in those routes) covers mobile actions automatically, no mobile-specific logging needed. Privacy policy is NOT an in-app native page on mobile — «Политика за поверителност» opens the web privacy page externally via `Linking.openURL(PRIVACY_URL)`. That's a real, deliberate difference from web's in-app page, not a gap masquerading as done. | **done at parity for export/delete/audit — P.10-b.** Privacy-page-as-external-link is an accepted divergence, not tracked as remaining work unless a future pass wants an in-app native page. |
| 7.4 | Push subscription — web-push browser opt-in (Phase 6.3 work) + service worker + cron at 06:00 UTC | `apps/web/components/horoscope/PushNotificationBanner.tsx` + `apps/web/public/sw.js` | mobile has SR 8.3 expo-notifications scaffold (different mechanism); no end-to-end delivery wired anywhere yet | not started — REVISIT-26 push_tokens schema + registration endpoint required |
| 7.5 | Bento tile data layer — web has `apps/web/components/dashboard/tiles/{CrystalTile,LunarTile,TransitTile,CircleTile}.tsx` data-driven; mobile has only CrystalCard real, the other three are hardcoded | `dashboard/tiles/*` | partial — only CrystalCard is real | absorbed into Section 1 (items 1.7, 1.8, 1.9, 1.10) |
| 7.6 | Recommendations feature (`/you/recommendations` + `apps/web/lib/stories/catalog.ts`) | `lib/stories/catalog.ts` + `components/stories/*` | absent on mobile | absorbed into Section 5 (item 5.3) |
| 7.7 | Diary / Лунен дневник (`/rhythm/journal` + Phase 8 persistence work) | `components/manifest/*` + `/api/diary/*` | absent on mobile | absorbed into Section 4 (item 4.7) |
| 7.8 | Astrology guide (`/you/guide`, planets/signs/houses/aspects educational reference) | `apps/web/app/(protected)/you/guide/*` | absent on mobile | absorbed into Section 5 (item 5.4) |
| 7.9 | Crystals collection view (`/you/crystals` monthly windows + daily streak) | `apps/web/app/(protected)/you/crystals/page.tsx` + `components/crystals/*` | absent on mobile (mobile has only the Днес bento tile) | absorbed into Section 5 (item 5.2) |

---

## Section 8: REVISIT items now in scope

These were filed in `.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md` as deferred polish items. Phase B Stream P promotes them to active scope:

| REVISIT # | Item | Trigger condition (original) | New status |
|---|---|---|---|
| 20 | Mobile daily horoscope streaming text upgrade | "Pre-launch UX polish OR user feedback flagging loading skeleton as too long" | **closed — Днес half closed silently at P.1 (Section 1 item 1.6, non-streaming accepted). Oracle half (item 6.1) closed permanently 2026-08-13 (Batch 2) by founder ruling — won't-do, not a future trigger candidate. Do not reopen without a fundamentally different constraint (e.g. a maintained RN streaming-fetch solution becoming standard).** |
| 21 | `useCrystalOfTheDay` migration to TanStack Query | "Consistency burden surfaces OR third hook arrives" | **active — in scope at P.1 (touches Crystal SSR-equivalent path, item 1.10)** |
| 22 | Mobile horoscope sentinel-marker color rendering | "Editorial polish round OR user feedback flag" | **closed — Днес half done at P.1 (Section 1 item 1.5). Oracle half (item 6.2) done 2026-08-13 (Batch 2), reusing the same Днес pattern rather than web's (web Oracle never had sentinel coloring — doc was stale on that point, corrected in Section 6 above).** |
| 23 | Web Oracle cap-reached path fails silently | "Phase B middle weeks before soft launch" (reclassified at Phase A close) | **active — Stream P web-touching work; founder + friend coordination required (B.0)** |

Items 24, 25, 26, 27 stay where they are (Section 7, 1, 7, 6.3 respectively).

**Newly filed at Stream P planning ratification 2026-05-09 (deferred, not active):**

| REVISIT # | Item | Trigger | Cross-reference |
|---|---|---|---|
| 28 | Recommendations state Supabase migration — cross-device sync | Phase C/D revisits cross-device sync (user feedback or broader cross-device state workstream) | D7 ratification; Section 5 item 5.3 (P.7) |
| 29 | PostHog telemetry expansion to new mobile surfaces | 4 weeks post-soft-launch when usage patterns visible | D10 ratification; covers all P.4 / P.7 / P.6 / P.8 / P.10 / P.9 / P.11 / P.16 surfaces shipping without event coverage during Stream P |

---

## Section 9: NOT scope for Stream P

These items appear in the gap inventory but are explicitly OUT of Stream P scope:

| Item | Reason |
|---|---|
| Cross-highlight bridge from Oracle to NatalWheel (item 6.3) | SR 7 D3 ratification — mobile is full-screen route, not side-by-side panel. Bridge would require re-routing back to chart with planet-selection state. Out of scope. |
| Web-specific patterns like Clerk popover (top-right Премиум/Настройки menu) | Mobile handles this natively via `you.tsx` tab list (items 5.1, 5.6, 5.7). Different pattern, equivalent function. |
| `LockedTopicTeaser` + `/api/oracle/teaser` (item 6.6) | Dead code on web post the 2026-04-20 cap-gate refactor (REVISIT-23). Porting would mean copying broken code. Out of scope. |
| Modal-overlay Oracle structure (item 6.7) | Mobile uses `Stack.Screen` push from FAB (SR 7.6). Native pattern correct; modal-overlay is a desktop pattern. |
| Hover/focus glow on Кръг cards (item 3.3) | RN doesn't have hover state; pressed-state polish belongs to Stream K when add-person flow lands. |
| **Friends groups (Кръг feature)** | Founder ratification 2026-05-09 — deferred to future research, not in v1.0 scope. |

---

## Section 10: Stream K — Кръг features

**Updated 2026-08-13** — the plan below describes the framework as originally ratified 2026-05-09. It did not play out that way in practice: see `STREAM-K-PORT-LOG.md` "Port 1" (2026-08-04), which recovered an already-independently-built web backend+UI from a merged branch in one shot rather than the incremental reactive cut-ins this section describes. That web-side work is now sized and cross-referenced in Section 3 above (item 3.4). The framework text below still governs how *future* Stream K web features get triaged; it's the "per-port as friend ships" assumption for Port 1 specifically that didn't hold.

Stream K work fires reactively as friend ships each web Кръг feature. Per founder ratification 2026-05-09:

> "Stream K plans per-port as friend ships each web feature."

This document does NOT enumerate Stream K work. When a friend's web Кръг feature lands on `origin/main`, a per-port investigation pass adds the relevant items to a separate **STREAM-K-PORT-LOG.md** document inside this directory. The current Кръг scope per `MOBILE_UX_RESEARCH.md §10` Phase B (less Friends groups, deferred):

- Add-person flow (ghost-user mode)
- Synastry calc API
- Free Sun/Moon/Rising compatibility surface
- First paid feature «Днешен ден в твоя кръг»
- Synastry chart visualization
- Couples linked charts (mutual opt-in)
- Crush reports

Friends groups: **deferred to future research** (founder ratification 2026-05-09).

---

## Section 11: API rate-limiting coverage

**Status: closed — Batch 7, 2026-08-16. Full rewrite of this section, not a patch — the 2026-08-13 snapshot below was stale on 8 of its ~15 listed gaps** (Batches 1 and 5.5 had already fixed most of them; this section never got updated when those batches shipped, exactly the failure class `VERIFICATION-SURFACE-GAPS.md` item 4 tracks).

**Not a mobile-vs-web parity gap** — both surfaces share the same `apps/web/app/api/**` routes. Kept here because it's the living pre-batch inventory.

**[VERIFIED, Batch 7, fresh grep against current code, not this doc's prior list]:** every route was already protected except 7, all fixed this batch: `crystals/route.ts`, `crystals/today`, `crystals/collect`, `crystals/daily/collect`, `crystals/daily-streak` (5 routes — the `crystals/*` gap this doc's prior snapshot only vaguely gestured at as "4 routes"), `transits/overview`, `user/route.ts`. Fix: `assertRateLimit` added first-thing-in-handler (rate-limit-before-DB-work ordering, per the Batch 3 lesson — `user/route.ts` specifically needed this, since it called `ensureUserRecord`'s DB upsert unprotected). `crystals/today` is deliberately open to unauthenticated callers (today's crystal is public teaser content, same as a horoscope-of-the-day) — its rate-limit key falls back to IP via `getRequestIp` when there's no session. All 7 added to `test/rate-limit/routes-surface-429.test.ts` (40 tests total now, was 33).

**Confirmed already protected, no action needed:** `birth-data*`, `chart/calculate`, `gdpr/*`, all 5 `stripe/*`, `oracle/*`, all 3 `push/*`, all `circle/*` routes, `diary/entries*`, `cities/search`. `planets/current` no longer exists — deleted entirely in Batch 5.5 (dead code, zero callers, real Swiss Ephemeris compute on every unauthenticated GET). `webhooks/stripe`, `webhooks/revenuecat`, `cron/*` remain deliberately unprotected (signature/secret-verified, stated as an explicit in-code condition per Batch 1's ruling) — confirmed via the dedicated "excluded routes" test block in the same test file, not just this doc's word.

---

## Section 12: Design-token migration — amber → bronze (NEW — 2026-08-13, corrected after a bad first pass in this same refresh)

**Not a mobile-vs-web gap either** — this is mobile-internal, tracked here for sizing only because the task that produced this refresh asked for it. Full context lives in `.planning/design/WARM_COOL_AMENDMENT.md`; this is a scope snapshot, not a re-litigation of that decision.

`apps/mobile/components/design-system/tokens.ts` defines `bronze`/`bronzeText` (lines 20-23) with an inline comment (dated 2026-07-25) calling it "PROOF ONLY... not yet rolled out" and stating amber "remain[s] live and in use across ~60 files; nothing consumes bronze/cool/starlight yet."

**[verified] that comment is itself stale — this migration is already substantially underway, not proof-of-concept-only.** First pass of this section trusted the tokens.ts comment without opening the 14 non-tokens.ts files a `bronze` grep returned; reading them shows real, active `color.bronze`/`color.bronzeText` consumption (not just prose mentions) in **9 files**: `app/(authed)/(tabs)/index.tsx` (heaviest — greeting text, planet-mention captions, SVG gradient stops, the Днес hero ember/glow), `app/(authed)/moon-detail.tsx`, `components/chart/Pedestal.tsx`, `components/dashboard/MoonGlyph.tsx` + `MoonHero.tsx`, `components/design-system/CtaPanel.tsx` + `LeadLine.tsx`, `components/manifest/ManifestDiaryContent.tsx` + `ManifestEntryForm.tsx`. A further 4 files (`NatalWheelFrame.tsx`, `BackButton.tsx`, `NavIcon.tsx`, `ScreenShell.tsx`) mention "bronze" only in comments explaining why that surface deliberately stays cool/neutral instead — genuine non-hits, not migration work.

**Amber and bronze are coexisting mid-migration**, not "amber live, bronze unstarted": a grep for `amber-` (NativeWind class usage) across `apps/mobile` returns **47 files** (48 including `tailwind.config.js`, which defines the NativeWind amber color itself and is a required touch point any full migration has to also change). Bronze usage is inline `style={{ color: color.bronze }}` (JS token), not a NativeWind class — `tailwind.config.js` has no `bronze` entry — so the two systems aren't even on the same styling mechanism yet, which is itself worth knowing before scoping a finish-the-migration pass: it isn't a find-and-replace, it's file-by-file conversion from Tailwind class to inline token (or a `bronze-*` NativeWind class would need adding first).

Sizing, if/when this fires: up to 48 files with `amber-*` still to convert (upper bound — some files may already be transitional/mixed), and the 9 already-bronze files are precedent for the target pattern rather than remaining work. No component-level count of individual `amber-*` occurrences was taken; expect the real edit count to run higher than the file count.

**Status: done — Batch 6, 2026-08-16.** Real count on execution was 52
files with `amber-*` classes (not 48) plus ~28 literal-hex/`rgb()` strays
this section didn't scope at all (a classname grep can't find those).
The "not on the same styling mechanism" framing above is now resolved:
`bronze`/`bronze-text` were added as real Tailwind colors
(`tailwind.config.js`), not converted to inline `style={{ color:
color.bronze }}` — founder-ruled, since the inline-token framing
described how bronze happened to land in 9 files, not a hard
requirement. `color.amber`/`color.amberText` are now deleted from
`tokens.ts`; `tailwind.config.js`'s `amber-stellaeum` is deleted (had
zero consumers). Full detail, the two deliberately-excluded non-bronze
"amber" usages (Карта's Midheaven line color, Transit urgency-status
colors — neither ever consumed the brand token), and the `bronzeText`
hex correction (`#e0b587`→`#d9a06a`, mockup-verified) are in
`COMPLETION-TRACKER.md`'s Batch 6 section, not duplicated here. Not yet
device-reviewed.

---

## Tracking note

This document is the single source of truth for Stream P. Update the Status column on every commit. When a sub-round closes, update the relevant rows from `in progress` to `done` with the commit hash. When new gaps surface during sub-round investigations, add them to the relevant section with `not started` status.

If a deferred item gets re-classified back into scope, update the Status column with reasoning in the cell.

Cross-references: `.planning/phases/phase-b-mobile-parity/HANDOFF-2026-05-09.md` (Phase B planning + open strategic items), `.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md` (REVISIT items 20-27, several promoted to active scope here), `.planning/phases/phase-b-mobile-parity/STREAM-K-PORT-LOG.md` (Кръг web-port detail behind Section 3 item 3.4), `.planning/design/WARM_COOL_AMENDMENT.md` (amber→bronze token decision behind Section 12).
