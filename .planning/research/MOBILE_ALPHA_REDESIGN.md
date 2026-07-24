# MOBILE-ALPHA-REDESIGN — platform-native mobile design system

Status: **v3 RATIFIED, ROUND A LIVE, TAB BAR + PLANETDETAIL FIXED (2026-07-22), WIZARD HYGIENE FIX LANDED + ROUND C1 (rhythm.tsx + LunarPhaseCard) LANDED + BATCHED DECISIONS RATIFIED (2026-07-23, §18-21) + RITЪМ HERO RESIZED TO 56PX, R1 HERO CORRECTED TO MOONDISC + "CONVERTED" DEFINITION CORRECTED TO INCLUDE TYPEFACE (2026-07-23, §22-23) + R7 CALIBRATION AMENDMENT RATIFIED, PLANETDETAIL RECALIBRATED (2026-07-24)**. v1 (primitive gallery, no hierarchy) and v2 (measured hierarchy but still too distinctive/unfamiliar) were both rejected and neither was committed — both discarded, only the font pipeline survives (`useFonts` wiring, commit `a1bed76`), ratified as correct independent of design direction. v3's brief inverts the prior direction entirely: the goal is FAMILIARITY (Co-Star: "feels like I've used it before"), achieved through the continuity layer alone (palette, type faces, ambient gradients, voice) while layout uses maximally conventional structure. §0's prose is ratified; Днес and Карта are live (§14); the tab bar, `PlanetDetail.tsx`, and the greeting size are fixed (§16), though **Карта is not yet fully compliant — REVISIT 59 is open** on 5 remaining child components. Reading-length (§0.3), the Ритъм R3/R5 conflict (held for Round C, scope corrected in §10), P-chain sequencing (§7), the rendered-tree audit methodology (§15), and the tiered B-K rollout plan (§17-18) are all decided/recorded. Round B is a separate ratification, not yet fired. §1 onward is v1/v2's research, largely still valid as reference (see §0.0 for what changed).

Strategic basis unchanged: web and mobile are sibling surfaces, not port-and-original. Backend, features, data, and Bulgarian copy content remain verbatim shared. This is presentation-only.

---

## 0. v3 — familiarity-first redo

### 0.0 What changed from v1/v2

v1 tried distinctiveness via decoration (Roman numerals everywhere, tracked caps everywhere) — rejected for looking machine-generated. v2 fixed the measured hierarchy (one dominant element, 3-4 type tiers, decoration capped) but was still rejected as too distinctive — the founder's actual target is familiarity, not merely "better hierarchy." The correction isn't more design, it's less: use conventions so standard a first-time user already knows them, and let the continuity layer (color/type/gradient/voice) carry 100% of the identity work. v1/v2's continuity-layer research and decisions (§1.1–§1.5, the font pipeline, the Cyrillic/Cinzel scoping) are unaffected by this shift and still hold.

### 0.1 Step 1 — structural research on the founder's named references

**Co-Star** (astrology app — the explicitly named target property). Sourced from two independent design critiques ([Pratt IXD 2022](https://ixd.prattsi.org/2022/02/design-critique-co-star-iphone-app-2/), [Pratt IXD 2024](https://ixd.prattsi.org/2024/09/design-critique-co-star-ios-app/)), a UX case study ([Fabien Cartal](https://www.fabiencartal.com/work/new-portfolio-co-star)), and an app showcase ([ScreensDesign](https://screensdesign.com/showcase/costar-personalized-astrology)).

**Important complication, not a clean success story**: Co-Star's own critics describe its structure as *inconsistent*, not cleanly conventional. Reading path: greeting at top, then copy-heavy content (a daily theme, a "Do"/"Don't" list) — but the Do/Don't *headers* render smaller than the body text beneath them, inverting expected hierarchy, and all text is centered throughout (critics call this out as working against scannability — no consistent left edge to track). Tap signaling is mixed: some links underlined, some all-caps with no underline, some both; chart elements ("Sun," "Mars") reportedly have no visible tap affordance at all — discoverable only by trial. Content visible vs. revealed: daily theme + Do/Don't visible without navigating; secondary content (friend compatibility, natal chart) requires drilling in per-item, and the natal chart itself is described as "awkwardly placed" and easy to overlook. Ornament: monochrome, no ads/gifs, described as avoiding decorative clutter — but the ornament that exists (personalized illustrations) functions as section dividers while scrolling, not applied decoration. No screenshot-countable ornament tally was available in sources — flagging as a gap rather than asserting a number. Conventional vs. divergent: standard bottom tab bar shape, but small/abstract-icon labels degrade its legibility; standard single-screen onboarding, but missing the usual progress indicator and often missing a back button. Net: Co-Star does not diverge boldly — it *under-executes* convention (weak affordance signaling, missing standard wayfinding) rather than breaking it deliberately. Type scale: no verified point-size ratio found in any source; multiple typefaces used, described by critics as inconsistent rather than a deliberate scale.

**What this means for Stellaeum**: if Co-Star's familiarity comes from genre convention + restraint + low ornament, not from crisp execution, then copying its actual structure would import its flaws (ambiguous tap signaling, inverted hierarchy) rather than its familiarity. The corrective is to take Co-Star's *restraint* (low ornament, content-first, minimal chrome) while taking *consistent execution* from Instagram, not from Co-Star itself.

**Klarna** — thin sourcing, flagged as a real gap rather than papered over. Found one solid, sourced data point: Klarna's own documentation recommends collapsing multiple payment options into one unified CTA ("Pay with Klarna") to reduce decision fatigue — but that's documented at the payment-method-presentation level, not verified as a whole-app "exactly one CTA per screen" rule. No source gave a whitespace-to-content ratio or confirmed shadowless-card treatment for Klarna's actual in-app UI (only its physical card-product visual identity was well-documented). Treat "Klarna: flat, one action, generous whitespace" as directionally right but not screenshot-verified — worth a follow-up screenshot pass before treating it as load-bearing for a specific pixel decision.

**Instagram** — the strongest, best-verified reference. Official creator-facing overlay specs for Stories/Reels (1080×1920) keep chrome (username, captions, action buttons) to the top ~135–250px and bottom ~135–250px combined — meaning **74–86% of screen height is pure content**, with chrome overlaid (not letterboxed) and receding/hiding during playback until tapped, confirming the tap-to-reveal pattern. Bottom tab bar: standard 5-icon shape, structurally unchanged even when Instagram reshuffled which features occupy which tab (Search swapped for Reels) — the pattern's *shape* is stable infrastructure even as content behind it changes. No verified percentage for feed-post chrome (caption/like/comment icons) vs. content — flagged as a gap.

**Common thread — does it hold?** Partially. Instagram cleanly demonstrates "chrome recedes, content dominates" with real pixel evidence. Klarna's "one action" principle is real but narrower in scope than the brief assumed. Co-Star's familiarity, per its own critics, looks like it comes from sparseness and genre convention rather than from disciplined execution — meaning the brief's "study Co-Star's reading path" should be read as "study what a *well-executed* version of Co-Star's restraint looks like," not "reproduce Co-Star's specific hierarchy and tap-signaling choices," since those are the parts its own critics call flaws.

### 0.2 Step 2 — the moment (HALT HERE for founder review)

**Днес**

Someone opens this screen having never used the app. In the first half-second they see: today's date, small and quiet; a greeting with their name; and one glyph — the moon, sized clearly larger than everything around it — with a short phrase next to it. They don't need to read anything to know this screen is about *today* and *the sky right now*. It should feel the way opening the Weather app feels: information before explanation.

The one thing worth putting on screen is the lunar phase — it's the one piece of content that's genuinely different every day, needs no chart, and answers "what is this for" instantly. Everything else (the greeting, the horoscope reading, the Кръг nav card) is real content, but secondary — present, not competing.

What they do next: scroll down. That's the only action this screen asks of a first-time user, and it should look exactly like every other scrollable feed they've used — no learned gesture, no explanation needed. If they have a chart, scrolling reveals the day's reading, written the way a text message from a friend reads, not a plaque. If they don't have a chart yet, scrolling reveals one plain sentence and one button — the single action this screen ever asks a new user to take.

**Amendment (founder review, gap 1): the reading needs an exit.** "Scroll" is a gesture, not a destination — after someone reads today's reading, there must be one obvious next thing. Picked: **(b) a single next action at the end of the reading — a plain link into Оракул** ("Питай Оракула" / "Ask the Oracle"), not (a) nothing and not (c) an inline tappable transit mention. Reasoning: (c) was checked for feasibility and rejected — the daily horoscope's planet mentions are freeform AI-generated prose colored by `parseSentinels`, not references to structured `TransitEvent` records; the existing tap-to-detail mechanism (`TransitOverviewCard`'s `EventModal`) is driven by a separate `/api/transits/overview` data source with its own IDs, so "the transit mentioned in the text" has no reliable match to open — building that mapping is prompt/backend work, not a layout decision, and doing it via a fragile heuristic risks a tap that opens the wrong thing, which is worse than no tap at all. (a) was rejected because the founder's own framing ("what do they do next") implies an intentional answer is wanted, and Oracle already exists, fully built, and is *literally* the app's "ask more about this" surface — using it costs nothing to wire and matches the "text from a friend" voice naturally ("want to talk about this more? Ask..."). It is ONE link, appears once, at the end of the reading, and is the only thing on the screen besides the Кръг nav card that isn't either the hero or quiet supporting text.

What they're not here for: settings, subscription status, navigation to other people's charts. Those live in Ти and Кръг respectively and should not intrude here even by implication — no premium badge, no account status, nothing that isn't "today" or "the one clear next step."

**Карта**

Someone opens this screen expecting to see their birth chart — that's the entire promise of the tab's name. In the first half-second, they should see the wheel itself, large, centered, immediately recognizable as *a chart* even to someone who's never seen a natal chart before (it reads as "a circular diagram with things on it," which is enough to register as the main event) — not a settings-like row of tabs and chips sitting above an image they have to scroll past first.

The one thing worth putting on screen is the wheel. Full stop. Everything else — the Same/Details/Aspects/Houses breakdown, the Big Three summary — is detail a curious user drills into, not a wall they read through to reach the chart.

What they do next: tap a planet on the wheel itself, because that's the obvious interactive-looking thing on the screen, and it should behave the way tapping anything in a well-made app behaves — a sheet rises with more detail. If they want the list breakdown instead of tapping the wheel directly, a single, clearly-tappable control (styled exactly like every other segmented control they've used) gets them there without it needing to be visible before they've even seen the chart.

**Verification (founder review, gap 2): direct wheel-tap already exists and works — but its hit-region is undersized.** Checked `components/chart/NatalWheel.tsx:426-446` directly rather than assume. It already has exactly the mechanism this prose describes: absolute-positioned `Pressable` overlays sized to each planet glyph (`hitSize = size * 0.09`), each wired via `handlePlanetPress` → `onPlanetSelect` prop → the parent screen's existing `handlePlanetSelect` → opens the same `PlanetDetail` bottom-sheet modal that the Details-chip's `PlanetsList` rows also open. It's a prior ratified decision, tagged in-code as "SR 6 decision 6" — not something P.2 skipped. Each hit target already carries an accessibility label (`"{planet} — натисни за тълкуване"`). So: **no new interaction infrastructure is needed** — the prose's "tap a planet directly" is describing something that already ships.

The real finding is a size problem, not a feasibility problem. At a 390px-wide screen with the existing 20px screen margin, `wheelSize = min(390 - 40, 520) = 350`, so `hitSize = 350 × 0.09 = 31.5px` — below Apple's 44×44pt minimum tap target (§1.1, non-negotiable per this doc's own standard) by roughly 30%. This is a pre-existing condition in already-shipped code, not something this redesign introduces, and not something I've silently patched. A fix is trivial in isolation (raise the multiplier, or floor `hitSize` at 44px regardless of wheel size) but touches a shipped, ratified component outside this redesign's stated scope ("touch no other screen" / no new infra without a call) — **this is the founder's scope decision, not mine**: fold a one-line `hitSize` floor into this pass (cheap, arguably a bugfix under REVISIT-style hygiene), or leave it as its own tracked follow-up and design Карта's prose/layout around the tap mechanism as it exists today, undersized hit region and all.

What they're not here for: a dashboard of every possible chart view competing for attention before they've located the actual chart. The chip switcher and Big Three cards are useful, but they are not what someone opened this screen to see first — they should appear as clearly-secondary, or below the wheel, not stacked above it as gatekeeping chrome (v2's specific failure, per the founder's Step 3 correction #1).

### 0.3 Daily-reading length — ratified 2026-07-22, landed

Real generated readings measured directly from the live `daily_horoscopes` table (8 samples, old prompt): **1,803–2,439 characters, avg 2,135, 5 paragraphs** — article-length, not the "text from a friend" the Днес prose above describes. That gap was real, not a taste call: at ~39 chars/line on a 390px EB Garamond render, 2,135 chars is ~55 lines of body text, ~1,540px of pure reading before spacing.

**Decision:** cut the prompt FORMAT spec (`apps/web/lib/horoscope/prompts.ts:18-23`) from "4 to 6 paragraphs, 2 to 4 influences" to "exactly 2 short paragraphs, 400 to 550 characters, do not exceed 550, 1 influence (2 only if truly load-bearing)." VOICE AND TONE (lines 4-8) untouched — this is a length/coverage cut, not a voice change. Paired with a client-side expand safety net (`preview/today.tsx`'s `EXPAND_THRESHOLD_CHARS = 900`) for variance and for today's-already-cached long readings, so an outlier never breaks the screen.

**Verified against the actual production model** (`meta-llama/llama-3.3-70b-instruct` via OpenRouter — not a proxy; see REVISIT 57 for how that access was found). First pass at "400-600 chars" overshot to 597-671 in most runs; tightened wording ("do not exceed 550... when unsure, write shorter") landed 6 of 7 coherent test runs at 394-520 chars.

**Product tradeoff, stated plainly:** fewer influences per reading (1, occasionally 2, down from 2-4) means less astrological coverage per day — an intentional exchange for a shorter, single-focus, warmer message, not a silent regression. Re-verification needed if REVISIT-45's model swap lands, since paragraph/length adherence is model-specific — filed as REVISIT 57 (`.planning/phases/phase-a-mobile-scaffold/REVISIT-TRIGGERS.md`), which also carries a separate, out-of-scope flag: 1-2 of every 8 test generations came back garbled regardless of length (pre-existing model flakiness at `temperature: 0.85`, not something this pass caused or fixed).

**(b) — lead-carries-the-message — confirmed rejected.** As written, the reading's first paragraph opens into one transit rather than summarizing the whole day, and restructuring it that way wouldn't have shrunk anything — the same ~2,100 chars would still exist below the lead, just visually deprioritized. (c)+(a) address the actual disease (length) rather than re-skinning it.

---

**HALT.** No layout or code follows until this prose is reviewed.

---

## 1. Research — carried over from v1, still valid

*(v1's platform/continuity research wasn't the problem — the failure was in translating that research into screen composition, addressed in §2 below. Kept here unedited for reference.)*

### 1.1 iOS HIG patterns adopted

- **Tab bars**: 3–5 tabs, always visible/enabled (matches the already-planned 5-tab Днес/Карта/Кръг/Ритъм/Ти layout).
- **Navigation**: standard system back button. Large-title-on-scroll-collapse available but not adopted for tab roots (dashboard-style, not list-drill-down).
- **Sheets**: `.pageSheet`-equivalent (partial-height, swipe-dismissible), not full-screen. Full-screen reserved for onboarding/wizard flows.
- **Destructive actions**: action-sheet pattern (destructive red, top of list; Cancel at bottom) for multi-choice; simple confirm/cancel stays an alert.
- **Lists**: trailing swipe = destructive; leading swipe = shortcuts.
- **Safe area**: never hardcode offsets (Part 0 hotfix, commit `6025f58`).

### 1.2 Where mobile diverges from web by design

Bottom-anchored actions/sheets over top banners (thumb-reach). No native iOS toast (custom banner/overlay instead). Swipe-back/pull-to-refresh/rubber-band native-only. `KeyboardAvoidingView` iOS/Android inconsistency flagged as a risk for future form work. Haptics reserved for selection-change, success/error outcomes, impact moments.

### 1.3 Dark-UI elevation

Tonal elevation, not shadow — lighter tint of base near-black per raised surface, paired with low-opacity hairline borders. Four tiers in §3.3. REVISIT-52 (accessibility/contrast audit) stays open, untouched.

### 1.4 Cross-platform brand continuity — the mechanism

Spotify/Airbnb/Duolingo converge: brand continuity lives at the token+motif+motion-signature layer, not layout/navigation. Applied here: color tokens, the two type faces, ornament vocabulary, editorial voice are shared; spacing/grid/composition/nav/motion are free to diverge per platform.

### 1.5 Continuity-layer corrections (ratified, evidence-based)

| Item | Before | After (ratified) |
|---|---|---|
| Near-black | Web `#030712`/`#0c1223` vs. mobile `#08060f` | **`#08060f` canonical.** Web convergence filed, not executed (§7). |
| Violet | Web ambient `#a78bfa` vs. mobile `#8b5cf6` | **`#8b5cf6` canonical.** Web convergence filed (§7). |
| Cyan `#22d3ee` | Web `--color-primary` + Clerk theming + astrological Air-element/Mercury/Uranus chart tint | **Excluded from continuity layer** — element-color data-viz semantics (fire=rose, earth=emerald, air=cyan, water=violet), not brand. |
| Display face | Cinzel/EB Garamond configured but never loaded on mobile; web's Cinzel-for-Cyrillic silently fell back to Georgia (Cinzel has zero Cyrillic glyphs, verified via Google's `METADATA.pb`) | **Playfair Display** — shared display/heading face, full Latin+Cyrillic, both platforms. **Cinzel scoped to Roman numerals + Latin-only text, never Cyrillic.** EB Garamond retained as body face. Fonts loaded via `useFonts` (commit `a1bed76`). Web convergence filed (§7). |

**REVISIT-42 — CLOSED-BY-DECISION at the token level** (adopting a Cyrillic-supporting display face, Playfair Display, rather than accepting fallback on either platform), **but the bug it named — `font-cinzel` applied to Cyrillic text, silently falling back to Georgia — kept resurfacing at individual call sites the original decision didn't reach.** Found and fixed on the tab bar and `PlanetDetail.tsx` (§16, 2026-07-22). Found again, not yet fixed, on the wizard (§19, 2026-07-23) — `StepIndicator.tsx`'s per-step label and every field label/button across all four wizard screens (`date.tsx`, `time.tsx`, `location.tsx`, `confirm.tsx`) are `font-cinzel` on Cyrillic text, none of it rendering as intended. This is the third surface the token-level decision never reached — recorded here rather than assumed closed, since a fourth is plausible. `StepIndicator.tsx`'s own instance was closed as part of §19's standalone hygiene fix (numerals replaced with plain dots, no text at all); the per-screen field labels/buttons remain open, deferred with the rest of the wizard's conversion to Tier 3 (§17).

---

## 2. Why v1 failed — founder's structural critique

1. **No hierarchy** — decoration evenly distributed. v1's Днес screen had five tracked-caps colored labels before any content, all similar size/weight. Nothing led.
2. **No size contrast** — largest:smallest text ratio ≈2:1 across the whole screen.
3. **Roman numerals don't port** — on web's long editorial scroll they mark progress through one document; on mobile dashboard tabs they appeared on every section header, implying a sequence nobody's following, adding decoration everywhere instead of nowhere.
4. **Cards undersized against real content** — "Изгряващ полумесец"/"Залязващ полумесец" (Bulgarian lunar-phase names, 19 characters) wrap to two lines in a 2-up grid; spacing scale was validated against assumption, not real strings.
5. **Tracked caps overused, and worse on Cyrillic** — Cyrillic letterforms are more uniform in width/height than Latin, so letter-spacing strips more word-shape information than it does on Latin text. Roughly a dozen tracked-caps elements per v1 screen.

---

## 3. Structural research (Part 1 of the redo) — measurements, not mood-boards

### 3.1 Apple Weather (iOS) — closest structural analog

One dominant element: the current-temperature numeral, rendered well outside any HIG named text style (roughly 70–96pt depending on device) — **6–8× the size** of the smallest caption text on screen. Decorated/ornamental elements on the primary screen: **0–1** (only the hourly-row "now" highlight pill). Only two accent roles: the ambient gradient background (itself weather *data*, not decoration) and the now-indicator. Distinct type sizes in active use above the fold: **~3** (hero number, condition/high-low line, hourly caption), each a single weight. Majority of the visible canvas is unornamented gradient background — the screen reads as "mostly atmosphere, one number." Sources: [MacRumors iOS 15 Weather guide](https://www.macrumors.com/guide/ios-15-weather-app/), [Viewing Design Weather teardown](https://viewingdesign.com/ios-weather-app), [Median.co Apple typography](https://median.co/blog/apples-ui-dos-and-donts-typography).

### 3.2 Apple Design Award winners (verified via Apple Newsroom, not recalled)

2024 Visuals & Graphics: *Lies of P*, *Rooms*. 2025 Visuals & Graphics: *Feather: Draw in 3D*; Interaction: *Taobao*. ([2024 winners](https://www.apple.com/newsroom/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/), [2025 winners](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/)). None are dark/editorial-mystical apps, so the transferable lesson is structural: winners concentrate visual richness in **one focal surface** (a 3D canvas, a product model) while surrounding chrome — labels, nav, controls — stays plain system-standard type. Applied: spend the decoration budget on one signature visualization, not on wrapping every text label in ornament.

### 3.3 Astrology-app category convention

Co-Star's documented failure (independent design critique) is the **same failure mode** as v1: inverted hierarchy, inconsistent all-caps application (some links capped, some not), low-contrast gray-on-black. ([IXD@Pratt critique](https://ixd.prattsi.org/2022/02/design-critique-co-star-iphone-app-2/)) CHANI reserves expressive/decorative type for titles only, plain scale elsewhere — though CHANI's own 2024–2025 redesign explicitly targeted its prior layout as "beautiful but busy" with competing collage/texture. ([CHANI case study](https://medium.com/@info_45537/tl-dr-14868841ed2c)) Category convention: dark/monochrome ground, one voice-y typographic gesture at the top, plain system-scale everywhere else. Stellaeum should differentiate through the *content* of its one hero element, not through decorating more surfaces than competitors do.

### 3.4 Editorial dark-mode reading apps

Apple News/NYT/Medium article views use **2–3 distinct sizes, 2 weights** (headline ~24–28pt, byline caption-gray, body 17pt — the accepted legibility floor). Apple News' own dark theming customizes exactly four things (slug color, body color, link color, background) — color in a mature dark editorial surface is a **global theme decision**, appearing in **one role** (links), not scattered per-label. ([Apple News Themes](https://github.com/alleyinteractive/apple-news/wiki/themes))

### 3.5 Apple HIG type scale + all-caps guidance

Named scale (approximate default-Dynamic-Type point sizes): Large Title 34, Title 1 28, Title 2 22, Title 3 20, Headline 17 (semibold), Body 17, Callout 16, Subheadline 15, Footnote 13, Caption 1 12, Caption 2 11. That's an 11-step scale spanning only **~3.1×** (34→11) — narrower than Weather's 6–8× hero ratio, confirming Weather deliberately breaks *outside* the standard scale for its one hero number rather than just picking "Large Title." Apple's accessibility guidance cautions against all-caps for long/frequent text; tracked fixed-size caps don't reflow under Dynamic Type up to AX5, which is the concrete accessibility cost of overusing them. ([HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [HIG Text Size and Weight](https://developer.apple.com/design/human-interface-guidelines/accessibility/overview/text-size-and-weight/))

### 3.6 Distilled numeric rules

| Measurement | Finding | Source |
|---|---|---|
| Hero:caption size ratio | 6–8× | Weather (§3.1) |
| Distinct type sizes per screen | 3–4 max | Weather + editorial reading (§3.1, §3.4) |
| Decorated/tracked-caps elements per screen | 0–1 | Weather (§3.1), HIG accessibility (§3.5) |
| Accent-color roles per screen | 1–2 | Weather, Apple News (§3.1, §3.4) |
| Quiet/unornamented space | Majority of canvas | Weather (§3.1) |
| v1's actual numbers | ~2:1 ratio, ~12 decorated elements, color scattered across every card | Founder critique (§2) — 3–6× the sourced norm |

---

## 4. Revised design system (Part 2) — every rule cites a finding

**Continuity layer unchanged**: palette (`#08060f` / `#8b5cf6` / `#fbbf24`), Playfair Display + Cinzel + EB Garamond, ambient SVG gradients, editorial voice, all Bulgarian copy verbatim. Nothing here touches §1's continuity table.

### R1 — One dominant element per screen, sized 6–8× the screen's smallest text

Cites §3.1/§3.6 (Weather's hero:caption ratio) and §3.5 (HIG's own scale only spans 3.1×, so a genuine hero must break outside the named scale, not just pick "Large Title"). Applied: Днес's hero is the lunar-phase glyph + phase name, sized large enough to sit at that ratio against the screen's caption text. Чарт's hero is the `NatalWheel` itself — already dominant by size; surrounding text compresses toward caption scale rather than competing with it.

### R2 — Max 3–4 distinct type sizes per screen

Cites §3.1/§3.4. Applied per screen: hero size, one sub-line size, one body size, one caption size. No fifth tier.

### R3 — Tracked-caps uppercase is a reserved treatment: 0–1 per screen

Cites §3.5 (HIG accessibility caution + Dynamic Type reflow cost) and §3.3 (Co-Star's inconsistent-caps failure = the same complaint the founder made about v1). Allowed role: a single eyebrow/kicker label, never on more than one element per screen, never on body-adjacent or long text. Everything else — section labels, tab labels, button labels, card labels — renders in plain sentence-case EB Garamond, no uppercase, no letter-spacing. This is the single biggest change from v1, where nearly every label was tracked caps.

### R4 — Accent color reserved for 1–2 functional roles per screen

Cites §3.1/§3.4 (Weather: gradient + now-indicator; Apple News: link color only). Applied: amber marks exactly one role per screen (the primary CTA, or the single active/live-status indicator) — not sprinkled across every card eyebrow and label the way v1 did. Violet stays structural (borders, tonal elevation) rather than a second competing accent.

### R5 — Roman numerals: scoped to ONE surface, not a per-section default

Cites §3.2 (ADA winners concentrate decoration in one focal surface, not repeated per-label) and the founder's own diagnosis (§2.3): the numeral's web role — marking progress through one long editorial document — has no equivalent on a dashboard-style tab screen with no "next section" to progress through. Resolution: Roman numerals are dropped from Днес and Чарт entirely. They're retained on exactly one surface where a genuine long single-document scroll already exists on mobile — the Astrology Guide (`components/astrology-guide/GuideSection.tsx`), which already uses them today for exactly the reason web does (marking movement through one long article). Not extended anywhere else. If Днес or Чарт need a section label at all, it's one small plain word, not numeral+hairline+title stacked repeatedly.

### R6 — Card/layout shape chosen by real string length, not assumed length

Cites §2.4 (founder's finding) and the actual longest Bulgarian strings pulled from the codebase: lunar-phase names run to 19 characters (`Изгряващ полумесец`, `Залязващ полумесец`); `you.tsx` card subtitles run to 37 characters (`история, планети, аспекти, лунни фази`). Rule: a 2-up card grid is only used for content guaranteed short (single words or phrases ≤12–14 characters). Anything that must hold a full phrase or a variable-length data string (lunar phase name, sign-quip lead-in) gets a full-width single-column card instead of fighting a 2-up grid's width budget. This directly resolves v1's card-wrap failure without needing pixel-level device testing to confirm — it avoids the risk category by construction.

### R7 — Long-form/interpretive text must be segmented with a scannable entry point (RATIFIED 2026-07-23)

Drafted during the PlanetDetail styling pass, generalizing the fix already shipped on Днес (§14/§16: the founder's "leads the eye" note, solved there with hairline-separated paragraphs anchored by the planet each one is about, an italic opener, and a weight-up payoff). Ratified as a standing principle for the whole rollout, not a PlanetDetail-only fix — see founder decision below.

**The principle** (this is what's ratified — apply it, don't skip it): any surface rendering more than ~2 paragraphs of interpretive or long-form text must (a) mark distinct beats with anchors suited to *that surface's own content shape* — a hairline plus a label or glyph the eye can land on before committing to read — and (b) distinguish the entry point (what the user came to learn first) and the payoff/takeaway from the supporting middle. **Superseded 2026-07-24 by the calibration amendment below**: "exactly one type lever, not decorative boxes" is no longer the rule — a single lever moved by one step doesn't register at phone scale (found on PlanetDetail's first landing). See "R7 calibration amendment" immediately below for the corrected requirement and for what "not decorative boxes" actually meant (ornamental chrome, not the app's own existing tonal-elevation containment).

**The devices are per-surface adaptations, not a fixed template** (this is what's NOT ratified as a template — each surface designs its own): Днес anchors by planet mention because its reading genuinely covers several influences, with an italic opener and weight-up payoff. PlanetDetail has one planet with several *facets* (strengths/challenges/aspects/growth), so it anchors by section role instead — same italic-lead and weight-up-payoff levers (confirmed by the founder as generic typographic devices, not a Днес signature), but its own segmentation shape. Reusing the *levers* (italic, weight, hairline) across surfaces is adaptation; reusing Днес's *specific structure* (planet-glyph-per-paragraph) on content that isn't shaped that way would be copying, which is what the founder's original PlanetDetail brief explicitly ruled out. Оракул, crystals, recommendations, the guide, and the diary will each need this same judgment call applied to their own content shape — none of them should just inherit Днес's or PlanetDetail's mechanism wholesale.

**Applies to (Tier list from §17, text-bearing surfaces) — LOC estimates in §17 must account for this as design work, not mechanical conversion:**
- PlanetDetail — done, this pass; recalibrated 2026-07-24 (see "R7 calibration amendment" below) after the first landing proved imperceptible on device.
- Оракул replies (AI chat responses — long-form, no existing segmentation).
- Crystal detail copy (`CrystalDetailPanel.tsx`).
- Recommendations copy.
- Astrology Guide (`GuideXSection.tsx` components) — likely partial compliance already via its Roman-numeral sections; audit before assuming compliant, and don't extend R5's numerals as the R7 mechanism here — the Guide's numerals mark progress through one document (R5's own justification), not lead/payoff distinction within a section.
- Lunar diary entries/insights.

Apply per-surface as each round fires; this rule is the standing citation, not a one-off justification re-derived each time.

### R7 calibration amendment — categorical, not incremental (RATIFIED 2026-07-24)

**Root cause.** PlanetDetail's first R7 landing (2026-07-23, commit `9e21b25`) shipped four levers: metadata collapsed to one caption line, the brief set in italic, Strengths/Challenges given `+`/`−` markers, Growth stepped up to medium weight. Founder device testing reported the sheet "looks exactly as before." Bundle freshness was verified directly (a temporary bright-magenta "MARKER" element rendered correctly on device, ruling out a stale JS bundle — see §15's rendered-tree-audit precedent for why this needed instrumentation, not another round of reasoning, per the 2-failed-hypotheses rule). A before/after side-by-side render of the same planet at 390px in production-approximate styling (method: an HTML artifact, not a mockup tool) then showed why: **of the four levers, only the brief's italic shift registered.** The other three were each a single property moved one step *within the same visual register it was trying to escape* — the `+`/`−` markers kept the exact rose tint and size class of the diamond dot they replaced; Growth's 400→600 weight step sat on a paragraph already matching its neighbors' size and color; the metadata collapse reduced visual weight, which reads as tidier, not as a different kind of thing. Italic worked *because* italic is a categorical change (a different letterform register), not a degree of one.

**The rule.** Lead/payoff markers — any R7 application — must differ from their surroundings on **at least two dimensions**, and **at least one must be categorical** (hue family, style, containment, position) rather than **degree** (a size step, a weight step, a spacing step) within the same family. A single degree-step move is invisible at phone scale, however correct it looks in a design review or in isolated code. This supersedes R7's original "exactly one type lever" wording above — one lever is fine in *count*, but that one lever's *change* must clear the two-dimension/one-categorical bar on its own, or be paired with a second dimension until it does.

**"Not decorative boxes" clarified.** The original R7 principle banned decorative boxes because the brief's pre-R7 left-border amber callout made it read as an aside rather than the entry point — that was ornamental chrome (a stroke used purely for emphasis, unconnected to the app's own visual system) on a paragraph meant to read as prose. That ban does not extend to the app's *own* existing tonal-elevation system (§4.2's Base/Surface1/Surface2/Overlay tiers, paired with a low-opacity hairline border per §1.3's "tonal tint, not shadow" Card recipe) — using that already-ratified primitive to contain a genuinely conclusion-shaped block (Growth, below) is reuse, not new decoration, and doesn't touch R3's decorated-element budget.

**Verification standard, codified.** Before marking any R7 (or R1–R6) application done, render it — and, where relevant, its immediate "before" state — side by side at 390px in an HTML artifact, in production-approximate fonts/colors/spacing pulled from the actual token files and copy source, not recreated from memory. If the difference isn't obvious in that render, it will not read on device. This is now a required step in the per-round checklist below, not an optional sanity check — it caught what device testing alone did not.

**Per-round checklist addition:**
- [ ] Every R7 lever differs from its surroundings on ≥2 dimensions, ≥1 categorical.
- [ ] Rendered in a before/after side-by-side artifact at 390px before marking the round done.
- [ ] Metadata/de-emphasis moves (things meant to *recede*, not signal) are explicitly *not* counted as R7 levers and don't need to pass the above bar — recession is not a lead/payoff device. (PlanetDetail's position/element/house caption row is the first instance of this: correct as shipped, not an R7 lever, was previously miscounted as one.)

**What landed on PlanetDetail (2026-07-24), recalibrated:**
- **Strengths marker/label**: fixed emerald (`ELEMENT_DOT_CLASS.earth` / `ELEMENT_TEXT_CLASS.earth`, reused verbatim — no new palette value), decoupled from the tapped planet's actual element, so it reads the same "positive" hue on every planet. Paired with a 12px→16px marker-glyph size bump (degree axis). **Ratified tradeoff**: breaks the "one element colour runs the whole sheet" continuity that Overview/Aspects/Growth still carry — a Water-Moon sheet shows violet everywhere except these two sections. Semantic colour (opposite hues legible as "strengths vs. challenges" on sight) was judged to beat decorative consistency (one colour thread per sheet), since the thread is a designer's internal bookkeeping, not something a user perceives.
- **Challenges marker/label**: fixed rose (`ELEMENT_DOT_CLASS.fire` / `ELEMENT_TEXT_CLASS.fire`), same reasoning and size bump, mirroring Strengths.
- **Growth (payoff)**: an earlier candidate reused the brief's italic register unlabelled, bookending the sheet — **rejected**: dropping the "Насока за развитие" section label to create emphasis was a categorical move in the wrong direction (removing information isn't a signal, it's a loss; and italic already means "brief" at the top of the sheet, so reusing it unlabelled at the bottom made opening and conclusion read as the same *kind* of element instead of as bookends). Landed instead as a **Surface2 tonal panel** (`color.surface2`, §4.2's "nested card" tier) with a low-opacity hairline border (§1.3's Card recipe), label intact inside it. Surface1 was tried first in the verification artifact and rejected — `#08060f`→`#0f0b1c` is only a ~10-value-per-channel RGB shift, the same order of magnitude as the original invisible weight-step; Surface2's larger jump is what actually registered. The panel's own edge is the section break, so the shared top hairline every other section uses is dropped here rather than doubled against it (containment + position, both categorical). The prior weight-up (400→600) is retained as a third, supporting axis, not the primary carrier.

### 4.1 Type scale (revised)

| Token | Face | Size/Line-height | Use | Ratio to caption |
|---|---|---|---|---|
| Hero | Playfair Display SemiBold | 40/46 | The one dominant element per screen (R1) | ~7.3× |
| Sub | Playfair Display Regular | 19/25 | Supporting line directly under the hero | ~3.5× |
| Body | EB Garamond Regular | 17/28 | Primary reading text | 3.1× |
| Caption | EB Garamond Regular | 11/16 | Meta text, timestamps, the one reserved eyebrow | 1× (baseline) |

Four tiers total (R2). The 40px "hero" text tier's own ratio to the 11px caption is **3.6×** — deliberately close to HIG's normal named-scale range, since only one element per screen should break outside that range, and on Днес that element is the glyph, not the text (see below), so the text tier doesn't need to carry the full 6-8× on its own. Compare v1's ~2:1 ratio (its "hero" greeting at 28px against ~14px section-mark labels) — even the text-only tier here is already a meaningfully larger jump than v1 shipped.

**Where the actual 6-8× ratio lives on Днес**: the `MoonGlyph` visual element is 150px (bloom diameter) against the same 11px caption — **≈13.6×**, comfortably past Weather's 6-8× benchmark. This matches Weather's own pattern precisely: the hero is a large NUMERAL/GLYPH, with supporting text (the 40px phase name, the 19px sub-line) reading as secondary labels underneath it, not as a second large headline. Measured against real render output (this was corrected after an advisor review caught an earlier draft of this section citing a 7× "effective" ratio derived from an 11px caption token that wasn't actually used anywhere on the rendered screen — `today.tsx` now genuinely uses `type.caption` for its date line and card subtitle, so this number is checkable against the code, not just claimed).

### 4.2 Tonal elevation — unchanged from v1

| Tier | Color | Use |
|---|---|---|
| Base | `#08060f` | Screen background |
| Surface 1 | `#0f0b1c` | Cards, panels |
| Surface 2 | `#161029` | Nested cards, pressed state |
| Overlay | `#1d1533` | Sheets, modals |

### 4.3 Primitives — revised

**ScreenShell** — unchanged from v1: `SafeAreaView edges={['top']}` + `ScrollView`, ambient SVG glow layer.

**Hero** (new) — the one large element per screen (R1). Днес: moon glyph + phase name. Чарт: the `NatalWheel` component itself, already existing.

**Card** — full-width single-column by default (R6); 2-up only for guaranteed-short content. No card eyebrow uses tracked caps (R3) — a plain small EB Garamond label, sentence-case.

**Button** — one variant carries the amber accent (primary); everything else (secondary/ghost/destructive) uses plain slate/rose text with no competing accent role, preserving R4.

**TabSwitcher** — plain sentence-case labels (not tracked caps), amber underline on active only — this is the one place amber's single "active/live-status" role (R4) legitimately appears alongside a CTA button elsewhere on the same screen only if the CTA is absent from that screen (avoid two amber roles competing on one screen).

**EmptyState / LoadingState / ErrorState** — unchanged in spirit from v1 (eyebrow + body + CTA rhythm), but the eyebrow is now the screen's one reserved tracked-caps element if the screen doesn't already spend it elsewhere — not an automatic add.

**SectionHeader with Roman numeral** — no longer a general primitive. Retained as Astrology-Guide-specific markup only (R5), not extracted to `components/design-system/`.

---

## 5. Real screens (Part 3) — not a gallery

v1's failure mode included building primitives in isolation, which is why its second screen mixed a daily-horoscope pattern with account-settings content that never had to answer to one screen's actual purpose. This pass builds complete screens instead.

### 5.1 Днес (Today) — required

**What it's for**: the daily check-in. **First-half-second read**: today's lunar phase, because it's the one thing that's different every day and doesn't require a chart (works even in the empty-chart state, unlike the horoscope reading). **What's deliberately quiet**: the greeting, the horoscope body text, the secondary nav cards — all present, all subordinate to the phase glyph.

### 5.2 Карта (Chart) — second screen, justified

Picked over Кръг or Ритъм because it's the strongest structural counter-test to Днес: Днес is long-form/editorial (a reading, mostly text), Карта is data-dense and already has a genuine "one signature visualization" candidate in the existing `NatalWheel` SVG component — exactly the ADA-winner pattern from §3.2 (concentrate decoration in one focal visualization, keep surrounding chrome plain). It also validates R5 in the opposite direction from the Astrology Guide: Карта is exactly the kind of dashboard-chip-switched screen where Roman numerals do NOT belong, so building it is a direct test that the new rule holds outside Днес too.

**What it's for**: seeing your natal chart. **First-half-second read**: the wheel itself. **What's deliberately quiet**: the Essence/Details/Aspects/Houses chip switcher, the Big Three cards, all rendered plain rather than competing with the wheel for attention.

No third screen — two real, complete, contrasting screens (long-form reading vs. data visualization) is enough to prove the rules generalize; a third would mostly re-exercise what these two already cover.

---

## 6. Side-by-side comparison — v1 (rejected) vs. v2 Днес

| Aspect | v1 (rejected) | v2 |
|---|---|---|
| Decorated/tracked-caps elements above the fold | ~5 (date, moon phase, section mark ×2, card eyebrows ×2) | 1 (single reserved eyebrow, or 0 if the hero glyph+label carries the moment instead) |
| Largest:smallest text ratio | ~2:1 (28px greeting vs. ~14px labels) | Glyph:caption ≈13.6× (150px MoonGlyph vs. 11px caption); hero-text:caption ≈3.6× (40px phase name vs. 11px caption) — the glyph carries the R1 size-contrast weight, not the text alone |
| Roman numerals on this screen | 3 (one per section: "Небесен ритъм", "Дневен хороскоп", "Небесен изглед") | 0 — scoped to Astrology Guide only (R5) |
| Accent-color roles | Amber on: date eyebrow, lunar eyebrow, section marks ×3, card eyebrows ×2, CTA button — effectively everywhere | Amber on: exactly one role (either the CTA or the active tab, never both stacked) |
| Card grid | 2-up bento (Лунна фаза / Кръг), lunar-phase name wraps to 2 lines | Full-width single-column cards (R6) — no wrap risk from real 19-char phase names |
| What leads the eye in the first half-second | Nothing — five same-weight elements compete | The lunar-phase hero glyph + name |

---

**Two caveats on this comparison, stated plainly rather than implied away**:

- **Not verified on-device.** `tsc`, lint, LOC counts, and a full `expo export` bundle all pass clean, and the Cinzel/Cyrillic audit was re-run against every new file — but none of that confirms the screens actually *render* with the intended hierarchy on a physical device. A clean compile is not a clean render. Founder review on device is still the verification step that matters here, not this document.
- **v1 no longer exists for a live side-by-side.** The rejected `today-redesign.tsx` and its primitive library were never committed (per instruction) and were deleted once the redo started, so they are not recoverable from git history either — only this document's now-rewritten description of v1 remains. The table above is a written comparison from that description, not a live A/B on two running preview routes. If an actual on-device side-by-side is wanted, v1 would need to be rebuilt from scratch against its original (rejected) spec — flag if that's worth doing before deciding, since it would just be reproducing the screen the founder already rejected.

## 7. Impact on the remaining chain — ratified sequencing (2026-07-22)

Superseded: the original "still HOLD until ratification" note. The chain sequencing is now decided. Two corrections surfaced during this pass to the eight-item list previously in circulation: **P.17 and "SR 9" are the same sub-round**, not two (EAS Dev Client + TestFlight + biometric auth, bundled per REVISIT-1/27) — so the remaining work is eight sub-rounds, not nine. And **Apple Developer enrollment blocks three sub-rounds, not one** — P.15 ("Halt risk: sandbox testing needs Apple Developer enrollment"), P.17/SR9 ("fires only after enrollment confirmed"), and by dependency P.18 (soft-launch readiness gate) — not just P.16 (which is backend-only, gated on REVISIT-47 instead).

**Ratified order:**

1. **Round A (cutover)** + start Apple Developer enrollment in parallel — zero-cost, unblocks the most, done same day (see §14 below).
2. **Round B** (Ти + `/you/premium`) — before P.9/P.11 build premium/pricing UI there, so they build on the new system once instead of old-then-rework.
3. **P.9** (read-only subscription view) ships once Round B lands.
4. **P.15** (RevenueCat) — non-sandbox work proceeds anytime; sandbox testing resumes once Apple enrollment clears.
5. **P.11** (pricing surface) — after both Round B and P.15.
6. **Round C** (Ритъм, revised scope — see §10) and **Round D/E** (Кръг; oracle/journal/you-subroutes) in parallel where possible — design rounds need iterative founder-review calendar time; front-loading D/E alongside C avoids a schedule crunch before P.18.
7. **P.12** (Oracle polish) — folded into whichever of Round D/E rebuilds `oracle.tsx`.
8. **P.16** (push infra) — anytime once REVISIT-47 resolves; not gated on any design round.
9. **P.13** (telemetry) — after Round B/C/D/E surfaces exist, per its own doc note.
10. **P.17/SR9** (EAS/TestFlight/biometric) — once Apple enrollment is confirmed.
11. **P.18** (soft-launch readiness, docs-only) — final gate.

**Founder-track note — highest-priority item:** Apple Developer enrollment is the confirmed critical-path blocker for P.15, P.17/SR9, and by dependency P.18. It has zero code dependency and unknown external duration once started — pure calendar time, not engineering effort. REVISIT-1's own founder-action deadline (begin within 2 weeks of Phase A close, by 2026-05-23) has already passed; as of this note enrollment is confirmed still not started, roughly two months past that internal target. Recorded in the App Store submission blockers group alongside REVISIT-55 (deletion completion email) and REVISIT-56 (stellaeum.com deployment) — see REVISIT-1's 2026-07-22 status addendum in `REVISIT-TRIGGERS.md`.

## 8. Explicit continuity-layer changes requiring ratification — unchanged from v1

Restated: canonical near-black `#08060f`, canonical violet `#8b5cf6`, cyan excluded, Playfair Display adopted (web convergence filed), Cinzel scoped to Roman numerals/Latin-only text, REVISIT-42 closed. None of these are affected by the hierarchy redo — the failure was in composition (how many decorated elements, what size ratios), not in the token/font decisions themselves.

## 9. Web convergence — filed work item, unchanged from v1

See v1's filed item: `globals.css` background/violet values, `tailwind.config.ts` violet token, `layout.tsx` `--font-display` → Playfair Display. Not implemented in this pass.

## 10. Rollout estimate (revised 2026-07-22 — Round A live, Round C scope corrected)

| Screen | Status | Est. LOC |
|---|---|---|
| Днес | **Live — Round A cutover 2026-07-22** | ~180–220 (screen), landed |
| Карта | **Live — Round A cutover 2026-07-22** | ~200–250 (screen, wraps existing `NatalWheel`/chip components rather than rebuilding them), landed |
| Shared primitives (`Hero`, revised `Card`/`Button`/`TabSwitcher`, states) | Built | ~250–320 (smaller than v1's 346 — `SectionHeader` dropped as a general primitive per R5), landed |
| `(tabs)/circle.tsx` (Кръг) — Round D or E | Not built | ~150–220 |
| `(tabs)/rhythm.tsx` (Ритъм) — Round C | Not built | **~120–180 for `rhythm.tsx`'s own skeleton, PLUS R3/R5 rework of `LunarPhaseCard.tsx` (321 lines, ~12 tracked-caps elements to collapse) and `TransitOverviewCard.tsx` (415 lines, 3 Roman numerals + ~8 tracked-caps elements to collapse) — neither counted in the original estimate.** Step 3 of this pass found the whole Ритъм screen carries ~16 tracked-caps elements once every component is counted, not just `rhythm.tsx` itself; Round C's real scope is closer to **~350–500 LOC** including those two components, not ~120–180. |
| `(tabs)/you.tsx` (Ти) — Round B | Not built | ~100–150 |
| `oracle.tsx`, `rhythm/journal.tsx`, `you/*` (6 screens) — Round D/E | Not built | ~80–150 each, ~600–900 total |

**Revised total estimate: ~1,850–2,560 LOC** across the full rollout (up from the prior ~1,600–2,240, entirely due to Round C's corrected scope) — still lower than v1's ~2,850–3,650 estimate.

## 14. Round A — cutover, landed 2026-07-22

`preview/today.tsx` and `preview/chart.tsx` promoted to the live `(tabs)/index.tsx` and `(tabs)/chart.tsx` routes; the old 643-line Днес and 301-line Карта screens retired. Zero new design work — everything here was already built and approved in this pass. Pre-cutover verification (no other file imported the old screens by path; `(authed)/_layout.tsx`'s chart-less redirect doesn't reference either route by path, so it's unaffected; state-branch parity checked directly against the old screens rather than assumed) found one real gap: the old Днес had a Today/Yesterday switcher that `preview/today.tsx` doesn't. Founder decision: cut over anyway, filed as **REVISIT 58** rather than silently dropped or silently restored — `useDailyHoroscope`'s `selectedDate`/`setSelectedDate`/`yesterdayUnavailable` fields are now dead (present, unused) until that REVISIT resolves one way or the other. Карта's state-branch check found no equivalent gap. The dev-only `__DEV__` preview nav rows in `(tabs)/you.tsx` are removed as part of this cutover, since the routes they pointed at no longer exist as preview routes.

## 11. Risk list (updated)

- **Two-screen validation, not full-surface validation**: Кръг/Ритъм/Ти haven't been tested against the new rules yet. Кръг in particular (the premium spine) is mostly list/empty-state content, structurally closer to Днес than Карта — worth a dedicated check before rollout, not assumed safe by extension.
- **R4's "one accent role" gets harder with more screen types**: Днес and Карта each have a natural single accent role. A screen with both a persistent status indicator AND a primary CTA (e.g. Кръг's premium-upsell state) may need a founder call on which one gets amber, since R4 says only one — flagging now rather than deciding silently when that screen is built.
- **Reachability trap, still open**: `(authed)/_layout.tsx` force-redirects chart-less accounts to `/wizard/date` — test accounts need a chart configured. Documented in-code, not worked around.
- **Font-loading / tailwind-key decoupling**: unchanged from v1 — `cinzel`/`display` NativeWind keys still point at the unloaded name so P.1–P.10 render unaffected; new primitives reference loaded fonts directly.
- **REVISIT-52, web convergence timing, Stream K surfaces, D1/D2 amendment timing**: unchanged from v1, still open.

## 12. Draft replacement text — D1 and D2 (unchanged from v1, still not applied)

**D1** — "Layout and component structure are platform-native, not shared. Each of web and mobile implements its own screen shells, navigation chrome, and component composition, following that platform's conventions. Continuity across platforms is carried by the shared token layer — color, typography, ornament vocabulary — not by shared layout or component code."

**D2** — "Bulgarian copy content — all strings, editorial voice, tone — remains verbatim shared across platforms at or near 100%. What's superseded is treating copy-mirroring as implying layout-mirroring: identical strings can and should be arranged, sized, and paced differently per platform."

---

## 13. Delivered vs. remaining in this pass

Delivered: font pipeline (commit `a1bed76`, unaffected by the redo), this research/spec rewrite, revised primitives, two real preview screens (Днес, Карта).

Remaining: founder review on device. Halt.

## 15. Methodology fix — R3/R5 compliance is measured on the full rendered tree, not the route file

**Codified 2026-07-22, after the blind spot hit twice.** `LunarPhaseCard.tsx` (Ритъм, §10) and `PlanetDetail.tsx` (Карта, §14 follow-up below) were both missed by earlier audits because those audits checked the route file's own line count and element count, not what the route file actually renders once every child, modal, and sheet is opened. A route file can look small and compliant while a component it renders 300+ lines into its own file, opened by a tap, carries a real R3/R5 violation.

**Rule, going forward**: a screen's R3/R5 compliance is measured on **the full rendered tree** — the route file, every child component it imports (recursively), every modal/sheet/bottom-sheet it can open (even if conditionally rendered), plus any persistent chrome layered over it (the tab bar, for tab-group screens). Route-file line counts and route-file element counts are not evidence of compliance on their own; they're a starting point that still requires opening every child.

**Applied retroactively**: re-checking Карта's full tree (this pass) found `PlanetDetail.tsx` (fixed, see below) and five more files — `AstrologyReference.tsx`, `NatalWheelLegend.tsx`, `AspectsList.tsx`, `HousesList.tsx`, `BigThreeCards.tsx`, `PlanetsList.tsx` — still carrying tracked-caps/Cinzel-on-Cyrillic violations, filed as **REVISIT 59** rather than fixed silently in this pass (out of this batch's authorized scope). Every remaining B-K sub-round in §16 below must be audited against this rule before it fires, not just at its own route file.

## 16. Tab bar + PlanetDetail fix — landed 2026-07-22

Fired standalone ahead of Round B, per founder direction: persistent chrome inflates every tab screen's decorated-element count, so it had to land before any other round's R3 compliance claim could mean anything.

**Tab bar** (`(authed)/(tabs)/_layout.tsx`): `useSafeAreaInsets()` replaces the hardcoded `height:72`/`paddingBottom:18` (mirrors commit `6025f58`'s top-inset treatment); `tabBarActiveTintColor` now reads `color.amber` from `tokens.ts` instead of a drifted `#fcd34d`; labels off Cinzel (Cyrillic text — REVISIT-42's exact bug, noted there that this surface was outside its original reach); 5 tracked-caps labels collapsed to plain sentence case; 5 custom-SVG icons added (`components/design-system/TabIcons.tsx`) — founder-reviewed at real 20/24/28px scale before wiring in, icon+label retained per iOS convention.

**PlanetDetail.tsx** (Карта's planet-tap bottom sheet): dropped the `ROMAN` numeral section markers entirely (R5 scopes those to the Guide only) and collapsed 6 tracked-caps sites to one reserved eyebrow ("Планета"/"Асцендент"), de-tracking the rest to plain sentence-case text distinguished by color/weight. Also removed Cinzel from Cyrillic text throughout (same REVISIT-42 bug).

**Greeting size**: rebalanced from a one-off 15px override to the existing `sub` tier (17px, Playfair Display) — no new type-scale tier (R2 intact). Measured against real font advance widths (opentype.js against `PlayfairDisplay-Regular.ttf`), not estimated — see `tokens.ts`'s type-scale comment for the full worst-case-string measurement.

**Recount, honestly reported, not assumed**: Днес's full rendered tree (route file + `NavRow`/`ScreenShell`/`States`/`MoonGlyph`/`HoroscopeBody` + `OracleEntry` + the now-fixed tab bar) is genuinely R3/R5-compliant — checked directly, zero remaining violations. **Карта is not yet fully compliant** — `PlanetDetail.tsx` and the tab bar are fixed, but §15's retroactive check found 5 more child components still carrying real violations. Filed as REVISIT 59, not fixed in this pass (outside its authorized scope) — Карта's "compliant as experienced" claim can't be made yet.

## 17. Tiered rollout plan — B-K re-scoped by how often a user sees the surface

**Why tiered**: ~3,900-4,000 LOC across sub-rounds B-K, plus Round A's delivered ~650 and Round C's ~745, is roughly **~5,400 LOC of redesign against eight remaining Stream P sub-rounds** — doubling everything Stream P has shipped, before any real user exists. Tiering separates "must convert before soft-launch" from "can ship in the old system without it reading as broken."

### Tier 1 — surfaces a user sees daily or near-daily. Must convert before soft-launch.

| Surface | Sub-round | LOC (midpoint) | Status |
|---|---|---|---|
| Tab bar chrome | — | ~65 | **Landed 2026-07-22** |
| Днес | Round A | ~200 | **Landed** |
| Карта | Round A | ~225 | **Landed, but REVISIT 59 open** (5 child components still non-compliant) |
| Ритъм | Round C1/C2 | ~745 | Scoped, not built |
| Оракул | Round F | ~375 | Scoped, not built — **R7 applies** (AI reply text needs its own lead/payoff segmentation design, not just token conversion; ~375 LOC estimate predates R7 and may be light) |

**Tier 1 total remaining: ~1,120 LOC** (Ритъм + Оракул; tab bar/Днес/Карта already landed, Карта needs its REVISIT-59 follow-up on top). **Оракул's estimate does not yet include R7 design time** — see note above.

**Cost of shipping unconverted, concretely**: Ритъм and Оракул sit directly between Днес and Карта in the tab order — a user moving through the app hits old-tracked-caps-heavy screens (Ритъм: ~16 elements once LunarPhaseCard/TransitOverviewCard are counted; Оракул: 6 code sites, likely more rendered) one tap away from screens now deliberately quiet. This is the most visible, most-jarring possible sequencing failure — not a peripheral inconsistency but the exact adjacency a daily user experiences every session. Recommend: **ship before soft-launch.**

### Tier 2 — surfaces seen occasionally. Ти, settings, premium, Кръг, crystals, recommendations, lunar diary.

| Surface | Sub-round | LOC (midpoint) | Confidence |
|---|---|---|---|
| Ти + `/you/premium` | Round B | ~215 | medium-high |
| Settings | Round D | ~115 | medium-high |
| Кръг | Round D | ~80 | medium-high |
| Crystals | Round I1/I2 | ~650 | **low** — needs founder decision (§18); **R7 applies** to crystal detail copy |
| Recommendations | Round H | ~375 | low-medium; **R7 applies** to recommendation blurbs |
| Lunar diary | Round G | ~315 | medium — includes retiring the `romanize()` R5 violation; **R7 applies** to diary entries/insights |

**Tier 2 total: ~1,750 LOC.** None of the four R7-flagged rows above (Оракул in Tier 1, Crystals/Recommendations/Lunar diary here) have their LOC estimates adjusted for R7 yet — those estimates predate R7's ratification and were sized as mechanical token conversion. Each round's planning pass must re-scope for the added design-judgment work (segmentation shape, lead/payoff levers) before committing to the existing midpoint.

**Cost of shipping unconverted**: real, but lower-severity than Tier 1 — these aren't adjacent in the tab flow to the new screens the way Ритъм/Оракул are (Ти is a tab, but its own content isn't reached by scrolling from a new screen the way Ритъм is). A user who opens Кръг or Crystals occasionally sees an older visual language, but not in the same jarring one-tap-away sequence. **Recommend: Ти + premium ship before soft-launch** (P.9/P.11 already build there per the ratified sequencing, so the work happens regardless of tiering) — the rest can defer to a fast-follow post-launch pass without reading as broken, since they're not adjacent to freshly-converted screens in normal navigation.

### Tier 3 — surfaces seen once or rarely. Auth, wizard, guide.

| Surface | Sub-round | LOC (midpoint) | Confidence |
|---|---|---|---|
| Auth (4 screens) | Round K | ~425 | medium |
| Wizard (4 screens + `StepIndicator`) | Round J1/J2 | ~850 | **low** — needs founder decision (§18) |
| Astrology Guide | Round E | ~260 | medium; **R7 applies** to guide-section body text — audit existing Roman-numeral sections for lead/payoff compliance before assuming R5's numerals already satisfy R7 (they don't — numerals mark document progress, not within-section emphasis) |

**Tier 3 total: ~1,535 LOC.** The Guide's ~260 LOC estimate also predates R7 and does not yet account for the segmentation audit/design work noted above.

**Cost of shipping unconverted**: lowest of the three tiers. Auth and wizard are seen once (sign-up, onboarding) or rarely (sign-in on a new device) — a brand-new user has no "new design system" expectation yet to be jarred against, since it's the FIRST thing they see, not a jump from something already converted. Guide is opened deliberately from Ти, not encountered in passing. **Recommend: defer full conversion past soft-launch** for all three — but see the cheap-isolated-fix note below, since two of these have real rule violations independent of the full conversion question.

**Cheap isolated R5 fixes worth doing even if full conversion defers**: the **wizard's doubled Roman numerals** (`StepIndicator.tsx`'s hardcoded I-IV, plus every wizard screen independently repeating its own numeral as a second eyebrow) is the worst R5 violation found anywhere in the app — and unlike the wizard's broader design-hierarchy questions (§18), retiring the numerals specifically (plain step dots/numbers) doesn't require resolving those first. This is a small, contained, high-value fix worth doing on its own even if the wizard's full conversion waits. The Guide's Roman numerals are correct and exempt (R5's intended home) — no fix needed there.

## 18. Low-confidence decisions — surfaced as a batch, not when each round fires

Three sub-rounds carry genuinely low-confidence LOC estimates because they depend on founder decisions that haven't been made yet. Surfacing all three now rather than one at a time when each round is about to start:

1. **Crystals (Round I1/I2) — what's the R1 hero?** The gem-rendering visual component (`CrystalGem.tsx`, 231 LOC) is the natural "one dominant element" candidate per R1, but the gamified streak panel (`DailyStreakPanel.tsx`, 183 LOC) is arguably the thing that drives daily-return behavior and may deserve equal or greater visual weight — these compete for the same R1 slot and R2's 3-4 type-size budget. Needs a call before either wave (I1: gem + streak; I2: grid/collection) can be sized precisely.

2. **Wizard (Round J1/J2) — how does progress render without Roman numerals?** R5 requires dropping `StepIndicator.tsx`'s I-IV and the per-screen repeated eyebrow numerals. The replacement (plain numbers, dots, a progress bar, or something else) needs deciding once, since it has flow-wide blast radius across all 4 screens and the shared component — not a per-screen decision made 4 times.

3. **Recommendations (Round H) — R6 card-shape calls.** Book/film titles and blurbs are genuinely variable-length (unlike Кръг's short relationship labels or Карта's fixed astrological vocabulary) — needs the same "measure real string lengths, don't assume" treatment Днес/Карта got before committing to a card layout (2-up vs. full-width, per R6).

**Ratified 2026-07-23 (batch):**

1. **Crystals R1 hero: the gem visual.** `CrystalGem.tsx` (231 LOC) is the dominant element, matching the Днес/Карта precedent (hero is content, not the engagement mechanic). `DailyStreakPanel.tsx` (183 LOC) demotes to a small supporting badge, the way streak counts read as secondary indicators in other category apps.

2. **Wizard progress: plain dots**, iOS page-control convention, paired with the existing hairline progress bar. No text on the markers, so the Cinzel-on-Cyrillic problem doesn't recur in the replacement.

3. **Recommendations card shape: full-width single column**, same rule already applied on Днес/Карта — variable-length text defaults to full-width, not a 2-up grid, avoiding the v1 wrap-failure category by construction.

## 19. Wizard minimum pass — scoped 2026-07-23, whole conversion still defers

Investigated rather than assumed: `StepIndicator.tsx` (97 lines) hardcodes I-IV in `font-cinzel` tracked caps, and independently, every one of the four wizard screens (`date.tsx`, `time.tsx`, `location.tsx`, `confirm.tsx`) repeats its own numeral as a second eyebrow (`I · Кога`, `II · Час`, `III · Място`, `IV · Преглед`), also `font-cinzel` tracked caps — confirming §17's "doubled" finding by direct read, not by extension.

The doubling turned out to be a symptom of a larger problem, not the problem itself: every field label and button across all four screens is also `font-cinzel` tracked-caps-uppercase, and all of that text is Cyrillic — Cinzel has zero Cyrillic glyphs (REVISIT-42's exact bug, already fixed once on the tab bar and `PlanetDetail.tsx`), so none of it is even rendering as intended today, it's silently falling back to Georgia. `_layout.tsx`'s Stack header also carries the same drifted `#fcd34d` the tab bar had pre-fix, not the canonical amber token.

**Verdict: a true-minimum fix (strip `StepIndicator.tsx`'s Roman numerals to plain dots per §18's ratified decision, swap the header's amber to the canonical token — ~20-30 LOC, one shared file + one line) is worth doing as a standalone hygiene commit, same class as the tab bar/PlanetDetail fix. It does NOT resolve the seam** — each screen still independently repeats its own Roman-numeral eyebrow and remains wall-to-wall Cinzel-on-Cyrillic elsewhere, untouched. Half-converting here (one of two numeral instances gone, ~20 other violations per screen untouched) would read as more inconsistent than doing nothing, the same reasoning that held `TransitOverviewCard` for Round C. Genuinely closing the seam requires the per-screen eyebrow + field-label + button pass, which is screen-internal work outside this pass's authorized scope. **The wizard's full conversion stays deferred to Tier 3, per §17, unchanged.**

## 20. Round C1 investigation — rhythm.tsx + LunarPhaseCard, scoped 2026-07-23

Full rendered tree checked directly: `rhythm.tsx` (100 lines) → `LunarPhaseCard.tsx` (322 lines) → `MoonDisc.tsx` (70 lines, clean SVG, no violations) → conditionally `TransitOverviewCard.tsx` (415 lines, out of C1's scope, confirmed still fully unreworked — 3 Roman numerals via `SectionMark` + ~8 more tracked-caps sites, matching §10's estimate exactly) → tab bar (confirmed zero contribution, already fixed 2026-07-22).

`rhythm.tsx`: 4 `font-cinzel` tracked-caps sites (hero eyebrow, diary-card eyebrow + CTA, empty-state CTA) — plain mechanical de-tracking, low risk.

`LunarPhaseCard.tsx` confirmed as the dominant violator: 11 distinct `font-cinzel` tracked-caps call sites (eyebrow, phase-latin line, expand toggle, 3 in the meteor banner, 2 disclosure section marks, info toggle, 2 wax/wane labels) plus `ManifestField`'s label rendered 6× in the expanded state, matching §17's "~12" figure. Also fails R2 independently: at least 9 distinct font sizes in active use (10/24/16/10.5/9.5/15/14.5/13.5/13px) against a 3-4 budget — not in the original estimate, added here as its own line item.

**New finding, not previously flagged**: Ритъм currently has two competing R1 hero candidates — `rhythm.tsx`'s 28px text hero ("Какво ти влияе сега") and `LunarPhaseCard`'s 108px `MoonDisc` glyph. Днес resolved the equivalent conflict by making the glyph sole hero and demoting greeting text to sub tier; Ритъм needs the same call made explicitly when C1 executes, not assumed.

## 21. R1 hero conflict on Ритъм — investigated 2026-07-23, HALT for ratification

Founder correction: the MoonDisc-as-hero conflict isn't just "two elements compete for one slot" — it's that Днес's whole design rests on the moon glyph being uniquely THE answer to "what is today," and repeating that glyph one tab over dilutes it on both screens. Ритъм's actual subject is different: transits, what's active, what's coming — the lunar phase is one input there, not the headline. Checked the data actually available before proposing options, rather than assuming:

`useTransitOverview` → `TransitOverview.pacing` (`packages/core/src/horoscope/transit-analysis.ts:77-84`) is a derived categorical label — `'fast' | 'slow' | 'mixed' | 'quiet'` — computed from counts of fast vs. slow active aspects, no continuous intensity score. `overview.activeTransits` is sorted tightest-orb-first (line 206), so "the most exact active transit" is already available with no new backend work. `overview.activeTransits.length` is a plain count, also free. No richer visual (gauge, dial, mini aspect-wheel) exists on either platform today — web's `TransitOverviewCard` is a faithful match, same `PacingMark` text-only treatment, nothing to port. `NatalWheel.tsx` has no transit-overlay mode; building one would be new astronomical-visualization engineering, not a redesign-scope decision.

**Options:**

**(a) Active-transit count as a large numeral hero** — e.g. a large "3" (Playfair, sized to R1's ratio) with "активни транзита" beneath it and the existing pacing word (`Бърз ритъм` / `Тих ден` / etc.) as the sub-line. This is Weather's exact pattern (§3.1, the doc's most-sourced reference): a bare number a first-time user parses without a legend. Genuinely different day to day, doesn't touch lunar imagery at all, and costs nothing new — `activeTransits.length` and `pacing.emphasis` are already computed. Real risk, stated plainly: on a quiet day the number is 0 or 1, a weaker size-contrast moment than a wide-ranging weather temperature — though a low number is itself accurate content ("nothing much happening" is a legitimate answer, not a failure to be a hero), unlike a broken measurement. **Recommended** — answers "what's happening to me right now" in half a second, doesn't duplicate Днес, cheapest to build (typography only, no new SVG), and is the most directly Weather-precedented option in the whole rollout.

**(b) A new custom activity visual** (radial gauge/ring, tick marks, or similar representing transit count/intensity) — genuinely stronger visual identity than a bare numeral, but this is new visual-design engineering with no existing asset on either platform to build from, meaningfully higher LOC and design risk than anything else scoped in Tier 1. Worth keeping as a fast-follow enhancement once P.13 telemetry shows whether day-to-day pacing variety is visually differentiated enough to be worth it — not recommended for this pass.

**(c) Keep MoonDisc as demoted supporting content, text hero stays primary** — avoids inventing anything new, but the screen's hero would be text-only, which underperforms R1's own citation (§4.1: the 6-8× ratio is meant to live in a glyph, not text alone — that's precisely why Днес's greeting is subordinate to the moon rather than carrying the hero role itself). Available as a fallback if (a) is rejected, but weaker against this doc's own sourced rule.

**On the R2 question (LunarPhaseCard's 9 distinct font sizes against a 3-4 budget):** resolved by conversion, not a rules exception. `tokens.ts`'s implemented scale already has five roles in practice (`hero` 32, `sub` 17, `body` 17, `row` 16, `caption` 12) — one more than R2's literally-stated "3-4," a precedent already used on Карта's row-style children (`EventRow` titles at 15.5px map to `row`). LunarPhaseCard's 24px phase-name was doing hero-tier work specifically because it was competing for the R1 slot; once it's confirmed as supporting content under whichever hero option is ratified above, nothing in the component needs to exceed `sub`/`row`. Mapping: phase name → `sub` or `row`; intention body → `body`; eyebrow/section marks/meteor labels/manifest-field labels → `caption`, de-tracked (R3). No new tier needed, no exception being requested — this is the same consolidation Карта's children already got, not a special case.

**Ratified 2026-07-23, final spec** (after founder review of the numeral's zero-count behavior and font choice):

- **Zero/low-count handling**: `pacing.emphasis === 'quiet'` is exactly equivalent to `activeTransits.length === 0` (`transit-analysis.ts:510-518` — `emphasis` only leaves `'quiet'` when `fastCount > 0 || slowCount > 0`, and every active transit counts as one or the other), so one check drives both. At count ≥ 1, hero = the numeral. At count === 0, hero swaps to **«Тих ден»** at the same size and slot — not a fallback to the moon (rejected: the whole point was not borrowing Днес's visual identity, and a structurally different screen depending on activity level would cut against the familiarity goal) — same underlying `pacing` field represented as a word instead of a number.
- **Font**: numeral and «Тих ден» both render in **Playfair Display SemiBold** (`font.displaySemibold`), not Cinzel — reuses the app's existing hero-tier token rather than expanding Cinzel's R5-scoped role (Roman numerals + Latin-only text) into a new "big digit" use, keeping Ритъм in the same typographic voice as the rest of the app. No sourced claim about Weather's actual hero typeface — this is an internal-consistency call.
- **Bulgarian count-form agreement**, confirmed against `bulgarian-skill/references/grammar.md` §1 (count form) and §4 (adjective agreement): masculine non-person nouns take a special numerical plural after cardinals (два/пет + count-form ending in -а, not the regular plural) — "транзит" → "транзита" in counted context. Only the literal count 1 takes the singular ("1 активен транзит"); every other count, **including compound numbers ending in 1** (21, 31, 101), takes the plural adjective + count-form noun ("21 активни транзита") — Bulgarian has no equivalent to Russian's genitive-singular-after-21 rule.

**Landed 2026-07-23** (commit follows): `rhythm.tsx`'s hero rewired to fetch `useTransitOverview` directly (TanStack Query dedupes against `TransitOverviewCard`'s own call via the same `chartId`-keyed query, no prop-drilling needed) and render the ratified count/quiet-day hero at a one-off 72px (outside the named scale, same treatment as Днес's `MoonGlyph`); rhythm.tsx's diary-card and empty-state `font-cinzel` sites de-tracked (only the hero eyebrow remains, R3's reserved slot); `LunarPhaseCard.tsx`'s 11 tracked-caps sites de-tracked to plain sentence case and its 9 font sizes consolidated to 4 (12/14/16/19), phase name demoted from 24px to the 19px `sub`-adjacent size now that it's confirmed supporting content, not competing for the hero slot. `TransitOverviewCard.tsx` (3 Roman numerals + ~8 more tracked-caps sites) intentionally untouched — out of C1's scope, per §20. Diff: 107 insertions / 39 deletions across the two files, well under the ~200-285 LOC estimate and the 500 ceiling.

**LOC**: rhythm.tsx ~15-25 LOC (mechanical). LunarPhaseCard's rework touches most of its 322 lines (type-scale consolidation across ~20 Text elements + collapsing 11 cinzel sites to 0-1) — realistically ~180-260 LOC changed, not a full rewrite. **Combined ~200-285 LOC**, comfortably under the 500 ceiling, leaving room for `TransitOverviewCard`'s rework (its own ~415-line file) as a separate sub-commit rather than bundled. No `opentype.js` measurement pass exists yet for LunarPhaseCard's strings (unlike the greeting's documented one in `tokens.ts`) — flagged to gate the actual commit, not asserted here.

## 22. R1 hero conflict — resolved, numeral demoted to secondary lead (2026-07-23)

**Founder device-pass correction, supersedes §21's "the numeral is the hero" framing.** On device, the eye lands on `LunarPhaseCard`'s `MoonDisc` glyph first, then the numeral — the opposite of what §21 ratified. Rather than fight that with size/weight tricks, the founder call is to accept it: **Ритъм's actual R1 hero is the `MoonDisc` glyph** (64px disk + 104px bloom halo, already rendered above the numeral in scroll order), and the numeral is a **secondary lead element** — present, sized to still read as significant, but explicitly subordinate rather than competing for the R1 slot.

**Size, measured, not eyeballed**: reduced from 72px to **56px** (Playfair Display SemiBold). Real glyph-advance measurement (fontTools against `PlayfairDisplay-SemiBold.ttf`) confirms: digit ink height drops from ~49px (at 72px) to ~38px (at 56px) — clearly smaller footprint than the MoonDisc's 64px crisp disk, reinforcing moon-leads without demoting the numeral into caption territory (56px is still 1.75× the named `hero` token, 32px). Both hero states checked at 390px width: «Тих ден» measures 209.5px at 56px (342px content width available after 24px margins) — one line, 132px of slack; the numeral itself ("0"–"9"-range digits) is trivially narrower. Landed in `rhythm.tsx`.

**R1 bookkeeping**:
- **Superseded**: §21's "Landed" note calling the numeral Ритъм's R1 hero is corrected by this section. The hero is the glyph, matching Днес's own precedent (glyph, not text, carries R1's size-contrast weight — §4.1).
- **Secondary-lead pattern — one-off, not a new R1 clause.** R1 already permits exactly one dominant element per screen; this is that element (the moon) plus a smaller, clearly-subordinate second element (the numeral) that doesn't compete for the slot. Not generalized into a new rule on the evidence of one screen — revisit only if a third screen needs the same shape.
- **Moon-leads-both-screens is a ratified tradeoff, not open for re-litigation.** The original concern (repeating Днес's glyph one tab over dilutes Днес's hero) was raised, considered, and the founder accepted it after verifying on-device that Ритъм's actual subject (transits, pacing) still reads clearly via the numeral/pacing-word secondary content beneath the shared glyph.

## 23. "Converted" redefined — typeface is part of compliance, not optional (2026-07-23)

**The gap.** `TransitOverviewCard.tsx` (Round C2, commit `34b8301`) and `LunarPhaseCard.tsx`'s body content (Round C1) both shipped as "landed"/"converted," but neither sets `fontFamily` — via an explicit `fontFamily: font.X` style or a `type.X` token spread (`tokens.ts`'s `hero`/`sub`/`body`/`row`/`caption`, each of which embeds a `fontFamily`) — on essentially any of their text. Both render entirely in the platform system font (San Francisco on iOS), not Playfair Display or EB Garamond. "Converted" had implicitly meant §15's R2/R3/R5 full-rendered-tree compliance plus spacing/colour token usage — never typeface. That definition was wrong: screens approved on device under that definition were being judged in the wrong fonts, and will visibly shift in weight and letterform once fixed.

**Corrected definition, going forward**: a screen or component is **"converted"** only when ALL of the following hold, not just R2/R3/R5:
1. R2/R3/R5 compliance measured on the full rendered tree (§15) — unchanged.
2. **`fontFamily` resolves on every `<Text>` site** — either an explicit `fontFamily: font.*` style or a `type.*` token spread from `tokens.ts`. A component where `<Text>` count and (`fontFamily:` + `type.*` spread) count don't match has unconverted text, full stop. Spacing-token or colour-token usage alone does not count as conversion.
3. R6 real-string-length verification where card/layout shape is decided.
4. Type sizes collapsed to R2's 3-4-tier budget.

**Audit of every round shipped so far, checked directly (Text-site counts, not assumed):**

| Surface | Round | Text sites | Font-compliant | Gap |
|---|---|---|---|---|
| `index.tsx` (Днес) + `NavRow`/`States` | Round A | ~18 | 18/18 | **None** — genuinely fully converted, typeface included |
| Tab bar chrome | standalone | 1 | 1/1 | **None** |
| `PlanetDetail.tsx` | standalone (§16) | 16 | 0/16 | **New finding**: R3/R5 fixed (numerals dropped, tracked-caps collapsed) but **zero Text sites set fontFamily** — entire component still renders in system font. Not previously audited on this axis. |
| `rhythm.tsx` route file | Round C1 | 17 | 2/17 | The two hero literals are converted (now 56px); the R3-reserved eyebrow itself (`font-cinzel`, unloaded) and all diary-card/empty-state/pre-data text are unconverted. |
| `LunarPhaseCard.tsx` | Round C1 | 43 | 1/43 | Only the phase-name line was converted; meteor banner, disclosure sections, manifest fields, intention body — 42 sites — render in system font. |
| `TransitOverviewCard.tsx` | Round C2 | 19 | 0/19 | Entirely unconverted — R2/R3/R5 rework (commit `34b8301`) didn't touch typeface at all. |
| Карта's 6 REVISIT-59 children | not yet fired | 46 total (`font-cinzel` sites: 9+7+7+4+4+3) | 0/46 (of the flagged sites) | Already known-open (REVISIT-59); confirms the same font gap applies on top of the already-tracked R3/R5 gap — not a new violation, but now double-counted correctly. |

**Complete**: Днес (Round A) and the tab-bar chrome. Everything else claimed "converted" so far — Карта's `PlanetDetail.tsx`, both halves of Round C — has a real, previously-unmeasured font gap.

**Follow-up pass to close C1 + C2's font gaps — scoped, not yet built.** Mechanical work: for each of the ~76 unconverted Text sites across `rhythm.tsx` (15), `LunarPhaseCard.tsx` (42), and `TransitOverviewCard.tsx` (19), map the existing font-size to the nearest already-established scale tier (`body` 17, `row` 16, `caption` 12 — the same mapping already used to consolidate LunarPhaseCard's 9 sizes to 4 in Round C1) and either add `fontFamily: font.body`/`font.bodyMedium` or spread the matching `type.*` token, replacing raw `text-[Npx]` Tailwind sizing where it now maps onto a token. No new type-scale work, no R2/R3/R5 rework — purely adding the typeface dimension to already-compliant spacing/structure. Estimated **~150-220 LOC** (rhythm.tsx ~20-30, LunarPhaseCard ~90-130, TransitOverviewCard ~40-60) — well under the 500 ceiling; can ship as two commits mirroring the original C1/C2 split, or one if reviewed together. `PlanetDetail.tsx`'s 16-site gap is a separate finding from a different round (§16) — flagged here, not included in this estimate; needs its own scoping call.

**Per-round completion checklist — added to prevent recurrence.** Before marking any round "landed"/"converted," verify all five:
- [ ] R2/R3/R5 measured on the **full rendered tree** (§15), not the route file alone.
- [ ] **`fontFamily` resolves on every `<Text>` site** — grep `<Text` count vs. (`fontFamily:` + `type.*` spread) count must match. A mismatch is an open gap, not a rounding error.
- [ ] R6 card/layout shape checked against real string lengths, not assumed.
- [ ] Type sizes collapsed to the 3-4-tier budget.
- [ ] **R7 — any surface with more than ~2 paragraphs of interpretive/long-form text is segmented, has one marked lead, and one marked payoff** (ratified 2026-07-23, below). This is a design judgment call per surface, not a mechanical grep check like the fontFamily item above — budget round time for it accordingly.

**REVISIT-42 — REOPENED (2026-07-23), fifth sighting.** Previously logged as "closed-by-decision at the token level" (§1.5) with individual surfaces found and fixed one at a time — tab bar + `PlanetDetail.tsx` (2026-07-22), the wizard (2026-07-23, §19) — each time treated as though the remaining surface count was now zero. It keeps reappearing because it keeps being closed on a per-surface basis instead of a total-surface basis. Fifth sighting, found during this audit: the Astrology Guide — R5's own designated legitimate home for `font-cinzel` (Roman numerals + the Latin "Stellaeum" brand eyebrow) — also wraps substantial **Cyrillic** body content in `font-cinzel` across its section components (e.g. `GuideLunarPhasesSection.tsx`: "Нарастваща половина", "Осемте фази", "Около 14 дни и 16 часа" — tracked-caps, Cyrillic, `font-cinzel`), inside the one surface previously assumed fully exempt.

**Full known-surface list, named rather than left open-ended:**
1. Tab bar — **fixed** 2026-07-22.
2. `PlanetDetail.tsx` — **fixed** 2026-07-22 (tracked-caps/numerals only; §23 above found its separate typeface gap, tracked there, not here).
3. Wizard (`StepIndicator.tsx` + all four screens' field labels/buttons) — numerals fixed 2026-07-23 (§19); per-screen field-label/button `font-cinzel` **still open**, deferred to Tier 3.
4. `TransitOverviewCard.tsx` — **still open**, deferred to Round C2's own rework (landed for R2/R3/R5 per commit `34b8301`; confirm no residual `font-cinzel` remains once §23's font-gap pass touches it).
5. Карта's REVISIT-59 children (`AstrologyReference`, `NatalWheelLegend`, `AspectsList`, `HousesList`, `BigThreeCards`, `PlanetsList`) — **still open**.
6. Astrology Guide (all `GuideXSection.tsx` components) — **still open**, newly found here.

**Closure condition, stated so it can't be declared done piecemeal again**: REVISIT-42 does not close until a full repo grep for `font-cinzel` and `font-display` returns zero hits outside genuinely Latin-only/Roman-numeral content (the Guide's numeral markers and "Stellaeum" brand eyebrow are the only currently-known legitimate uses). Not fixed in this pass beyond what §23's follow-up already covers incidentally.

**Tailwind `cinzel` key retarget — tested, not assumed; recommendation below.** The `cinzel`/`display` NativeWind keys still deliberately point at unloaded family names (§11, §16); a prior proposal to flip `cinzel: ['Cinzel']` → `cinzel: ['Cinzel-Regular']` was checked before being repeated.

*Font-file evidence*: `Cinzel-Regular.ttf`'s cmap contains **zero Cyrillic codepoints** (checked directly via fontTools, not assumed from the doc's earlier claim).

*Rendering evidence — CORRECTED, this is a browser fact, not an RN fact.* No iOS/Android simulator or emulator was available in this environment, so a controlled proxy test was run instead — a standalone HTML page with `Cinzel-Regular.ttf` loaded via `@font-face` and no fallback list (`font-family: 'CinzelTestOnly'`, matching the exact proposed Tailwind config shape), rendered headless via Playwright/Chromium and screenshotted. Result: **no tofu, no missing-glyph boxes, no invisible text.** Pure Latin ("HELLO WORLD IV") rendered in Cinzel's actual distinctive glyphs. Pure Cyrillic ("Тих ден") silently substituted to a plain system serif fallback. **Mixed Latin+Cyrillic in one string** ("I · Кога", the wizard's exact eyebrow shape) rendered with the Latin "I" in true Cinzel glyphs and "Кога" in the fallback serif **side by side in the same line** — per-glyph/per-run substitution, not whole-string fallback.

**This result is Chromium's font-fallback behavior, not React Native's.** The original font-fallback report stated RN has no CSS-style per-glyph fallback — that an unregistered `fontFamily` is ignored outright rather than substituted per-glyph. The Playwright test exercises exactly the mechanism that claim says RN lacks, so it cannot confirm or refute RN's actual behavior; it's evidence about Chromium only. **Untested on React Native (iOS Core Text / Android Skia-Minikin) — recorded as such, not as verified cross-platform behavior.** If this flip is ever reconsidered, it needs a real on-device (or simulator) test before anyone acts on font-fallback assumptions either way.

**What this means for the flip as proposed**: retargeting `cinzel` to `Cinzel-Regular` does not risk tofu or dropped text — but it also does not achieve the intended improvement. Pure-Cyrillic sites (the wizard, Карта's 6 REVISIT-59 children, `rhythm.tsx`'s eyebrow, most of the Guide) would render **exactly as they do today** — same fallback serif, since Cinzel-Regular contributes nothing when every glyph in the string is missing from it. The one thing the flip *would* change is genuinely mixed-content sites (wizard eyebrows like "I · Кога", where the Roman numeral is real Cinzel-family content sitting next to Cyrillic body): those would start rendering **inconsistently within a single line** — true Cinzel for the numeral, fallback serif for the word — which reads as more broken, not less, than uniform fallback.

**Recommendation: leave the keys unloaded; convert sites to `tokens.ts` token references as their rounds fire** (the third option, not a retarget or a rename). Reasoning: this is the pattern every "landed" round has actually followed already (Днес, Ритъм's hero, `PlanetDetail`'s R3/R5 fix) — new/touched components reference `font.*`/`type.*` directly, bypassing the Tailwind class entirely, which is also the only path that's immune to whichever way this decision goes. A blanket retarget or rename is exactly the kind of global, unverified flip this doc's own discipline argues against (§15's methodology fix exists because per-component checking, not global assumptions, is what catches real gaps) — and the newly-found Guide sighting above confirms the class is more overloaded/misused than previously known, which is an argument for touching each site deliberately during its own conversion pass, not for a single global rename that changes what the wrong class falls back to without fixing why it's wrong.
