---
title: Mobile ↔ Web Parity Gap Inventory
phase: Phase B (Stream P)
created: 2026-05-09
status: living document — single source of truth for Stream P work
last-updated: 2026-05-11 (P.1 close: Section 1 sweep — REVISIT-41 — reflects actual landed state across items 1.1–1.12)
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
| 1.3 | Premium badge in ambient header (when `isPremium`) | `DashboardContent.tsx:140-146` | stub scaffolded with full visual structure (hairline + diamond + Premium label); `const isPremium = false` hardcoded; P.9 swap-in is single-line edit | **stubbed — P.1-d `d6ecad7`** (full implementation lands at P.9 when tier source ships) |
| 1.4 | Animated sun sigil — violet+gold pulsing glow with `boxShadow` keyframes wrapping the daily-horoscope title | `DailyHoroscope.tsx:54-80` | inline `SunSigil` component, react-native-reanimated + react-native-svg `RadialGradient` blooms (opacity oscillation, opposing phase outer violet / inner amber, 4s cycle); ring + sun glyph static; D1 simpler-vibe — no real Gaussian blur, no expo-linear-gradient | **done — P.1-e `113dd9c`** (+131 LOC, well under D8 250 ceiling) |
| 1.5 | Sentinel color rendering on horoscope planet mentions (`HoroscopeStream` parses `[planet:KEY]…[/planet]` markers and colors via `PLANET_COLORS`) | `apps/web/components/horoscope/HoroscopeStream.tsx` | `parseSentinels` lifted to `@stellaeum/core/oracle/planet-parser` returning `ParsedSentinel[]`; mobile maps planet → hex via local `PLANET_HEX_COLORS`; web keeps Tailwind className map locally | **done — P.1-c `33e9ec4`** (closes REVISIT-22) |
| 1.6 | SSE streaming text via `useCompletion` | `useDailyHoroscope.ts` (web) | both surfaces use `format=json` after the web client silently dropped `useCompletion` (backend SSE path still intact); mobile matches current web non-streaming behavior | **deferred — silent close per P.1 ratification 2026-05-11.** Tri-state was (a)+(c): close 1.6 silently + ship Yesterday tab. If true SSE UX is later wanted, restore on both surfaces simultaneously. Closes REVISIT-20 by re-classification. |
| 1.7 | Real `LunarTile` data-driven from current lunar phase | `apps/web/components/dashboard/tiles/LunarTile.tsx` | inline tile uses `lunarPhase` + `meteorShower` from `@stellaeum/core/welcome` + `formatCountdown` lifted verbatim from web; active meteor-shower secondary line with `daysUntilPeak()` | **done — P.1-a `a0c44e0`** |
| 1.8 | Real `TransitTile` data-driven from `/api/transit-overview` | `apps/web/components/dashboard/tiles/TransitTile.tsx` | mobile copy matches web's static placeholder verbatim («Транзити / Небесно време / активните аспекти към картата ти / виж всички») | **done at parity — P.1-a `a0c44e0`.** Web `TransitTile.tsx` is also a static link card; "data-driven top-transit headline" was aspirational on both surfaces (inline comment at `TransitTile.tsx:6-10` confirms). Cross-surface data-driven port noted in REVISIT-41 sweep. |
| 1.9 | Real `CircleTile` | `apps/web/components/dashboard/tiles/CircleTile.tsx` | mobile shows «Добави човек» + subtitle «партньор · приятел · crush» (verbatim from web) | **done at parity — P.1-a `a0c44e0`.** Web is also empty-state CTA; "Today in your circle" preview depends on Friends groups (out of v1.0 scope per founder ratification). |
| 1.10 | Crystal tile SSR-equivalent — web passes `initialData` from server to avoid client-fetch flash | `DashboardContent.tsx` + `dashboard/tiles/CrystalTile.tsx` | mobile `<CrystalCard />` client-fetches on mount via `/api/crystals/today`; brief loading shimmer where web pre-fetches via Server Component; CrystalCard border + eyebrow aligned with web's amber accent in P.1-f sweep | **deferred — accepted divergence per P.1 ratification 2026-05-11.** Expo Router server components don't exist in this codebase; alternative is disproportionate to a single-tile shimmer. |
| 1.11 | (NEW — surfaced during P.1 investigation) Today/Yesterday tab switcher above horoscope content, lazy-fetch yesterday, AsyncStorage cache parity with web's localStorage path, «Неналично» disabled-tab when yesterday's reading not yet generated | `DailyHoroscope.tsx:113-125` | mobile uses TanStack Query × 2 (lazy yesterday via `enabled: selectedDate === 'yesterday'`) + AsyncStorage in queryFn for cross-session persistence; inline `DateTab` component mirrors web's typographic-underline pattern | **done — P.1-f (this commit).** Yesterday-unavailable derived from `yesterdayQuery.data?.unavailable === true`. |
| 1.12 | (NEW — surfaced during P.1 investigation) Tile-tap navigation — web bento tiles all use `<Link href="...">` (Crystal → /you/crystals, Lunar/Transit → /rhythm, Circle → /circle); mobile tiles are inert `<View>` | `dashboard/tiles/{Crystal,Lunar,Transit,Circle}Tile.tsx` | mobile tiles are non-tappable | **not started — deferred until destinations exist on mobile (P.3 /rhythm, P.6 /you/crystals). CircleTile gated on Stream K Friends groups (out of v1.0 scope).** |

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

---

## Section 3: Кръг tab

`apps/mobile/app/(authed)/(tabs)/circle.tsx` vs `apps/web/components/circle/CircleEmptyState.tsx`

Both surfaces are empty-state placeholders with the same Bulgarian copy and three relationship cards. Functional gaps (add-person flow, ghost profiles, synastry) are **Stream K scope, not Stream P**. Stream P only addresses the visual-parity gaps below.

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 3.1 | Subtitle per card («дълбока връзка» / «близък кръг» / «тих радар») | `CircleEmptyState.tsx:24-46` | mobile cards only show label, no subtitle | not started |
| 3.2 | Motion fadeUp entry animation | `CircleEmptyState.tsx:49-62` | static render | not started |
| 3.3 | Hover/focus glow on cards | `CircleEmptyState.tsx:88-101` | static (no hover state on mobile generally) | deferred — RN doesn't have hover state; pressed-state polish lands when add-person flow ships in Stream K |

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
| 5.6 | Subscription management (Stripe Customer Portal link, billing date, cancel/reactivate, payment method) | `apps/web/app/(protected)/subscription/*` + Clerk popover SettingsContent | absent on mobile | not started |
| 5.7 | Account settings (auth/email/password/notification preferences/account deletion, GDPR export, privacy) | Clerk popover SettingsContent | absent on mobile | not started |
| 5.8 | Dynamic Big-Three subtitle (display actual sun/moon/rising signs instead of hardcoded literal «Слънце · Луна · Асцендент») | n/a — web doesn't have this surface (web's profile shape is different) | `getBigThreeLabel` in `you.tsx` resolves sun/moon/ascendant signs from `useFirstChart` + `useChart` and renders via `ZODIAC_SIGNS_BG` from `@stellaeum/astrology/client`. Falls back to literal «Слънце · Луна · Асцендент» when no chart loaded (HT 3 — preserve visual layout). | **done — P.5 `c9913e9`.** Mobile-only enhancement; web profile shape doesn't surface a Big Three line. |
| 5.9 | Ти→Премиум destination — "what you'd get" surface (offerings + features + CTA → MobilePaywall trigger) | n/a — web hosts pricing in `/pricing` SEO landing; mobile pattern is different (no standalone /pricing route) | section listed in mobile `you.tsx` SECTIONS array, not wired to a route | not started — P.5 stubs the route, P.11 builds the destination content per ratified D3 modification 2026-05-09 |

---

## Section 6: Oracle

`apps/mobile/app/(authed)/oracle.tsx` + `components/oracle/*` vs `apps/web/components/oracle/OraclePanelGlobal.tsx` + 5 oracle components

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 6.1 | SSE streaming text via `useCompletion` | `useOracleReading.ts` (web) + `ReadingStream.tsx` | mobile uses `?format=json` (REVISIT-20 logged) | not started |
| 6.2 | Sentinel color rendering — planet mentions colored via `PLANET_COLORS` map | `ReadingStream.tsx` + `parseSentinels` | mobile strips via `stripSentinels` (REVISIT-22 logged) | not started |
| 6.3 | Cross-highlight bridge — tapping a colored planet name in the Oracle reading highlights it on the NatalWheel | `apps/web/app/(protected)/chart/page.tsx ChartView ↔ Oracle` | intentionally skipped (D3 SR 7 ratification — mobile is full-screen route, not side-by-side panel) | **deferred — not scope per SR 7 D3** |
| 6.4 | Animated orbiting-diamond canvas during pre-first-token loading | `ReadingStream.tsx` loading state | mobile shows static text loading state | not started |
| 6.5 | Regenerate current reading button — fires `generateReading(topic, true)` for a fresh reroll | `OraclePanelGlobal.tsx:72-75` | mobile hook accepts `regenerate?: boolean` but `selectTopic` always passes false; no UI affordance | not started |
| 6.6 | `LockedTopicTeaser` + `/api/oracle/teaser` preview path | `LockedTopicTeaser.tsx` + `OraclePanelGlobal.tsx:77-101` | absent on mobile | **deferred — dead code on web post 2026-04-20 cap-gate refactor (REVISIT-23)** |
| 6.7 | Modal-overlay structure on web vs full-screen route on mobile | `OraclePanelGlobal` mounts in protected layout, listens for `oracle:open` CustomEvent dispatched by ProtectedNav button | mobile is a real route push from the FAB (`router.push('/oracle')`) | **deferred — different structural pattern, equivalent end UX, native mobile pattern is correct** |

---

## Section 7: Cross-cutting gaps (not tied to a single tab)

| # | Item | Web file ref | Mobile state | Status |
|---|---|---|---|---|
| 7.1 | Subscription management UI (cancel/reactivate/portal/billing date/payment method) | `apps/web/app/(protected)/subscription/*` + `/settings` | absent — mobile has no subscription state UI at all | not started |
| 7.2 | Pricing surface — web has `/pricing` (PricingContent client + monthly/annual toggle). Mobile equivalent is fundamentally different (RevenueCat-driven inline paywall, no standalone route) | `apps/web/app/(protected)/pricing/*` | absent | not started — mobile pattern differs (see Section 9 D3) |
| 7.3 | GDPR surfaces — Bulgarian privacy policy page, GDPR export/delete-account API + UI in settings, audit logging | `apps/web/app/(protected)/privacy/*` + `apps/web/app/api/gdpr/*` | mobile has no GDPR UI; backend endpoints exist (web side) but mobile doesn't expose them | not started |
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
| 20 | Mobile daily horoscope streaming text upgrade | "Pre-launch UX polish OR user feedback flagging loading skeleton as too long" | **active — in scope at P.1 (Section 1 items 1.6) and P.12 (Section 6 item 6.1)** |
| 21 | `useCrystalOfTheDay` migration to TanStack Query | "Consistency burden surfaces OR third hook arrives" | **active — in scope at P.1 (touches Crystal SSR-equivalent path, item 1.10)** |
| 22 | Mobile horoscope sentinel-marker color rendering | "Editorial polish round OR user feedback flag" | **active — in scope at P.1 (Section 1 item 1.5) and P.12 (Section 6 item 6.2)** |
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

## Tracking note

This document is the single source of truth for Stream P. Update the Status column on every commit. When a sub-round closes, update the relevant rows from `in progress` to `done` with the commit hash. When new gaps surface during sub-round investigations, add them to the relevant section with `not started` status.

If a deferred item gets re-classified back into scope, update the Status column with reasoning in the cell.

Cross-references: `.planning/phases/phase-b-mobile-parity/HANDOFF-2026-05-09.md` (Phase B planning + open strategic items), `.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md` (REVISIT items 20-27, several promoted to active scope here).
