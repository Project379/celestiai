# MOBILE-ALPHA-REDESIGN — platform-native mobile design system

Status: **v3 RATIFIED, ROUND A LIVE (2026-07-22)**. v1 (primitive gallery, no hierarchy) and v2 (measured hierarchy but still too distinctive/unfamiliar) were both rejected and neither was committed — both discarded, only the font pipeline survives (`useFonts` wiring, commit `a1bed76`), ratified as correct independent of design direction. v3's brief inverts the prior direction entirely: the goal is FAMILIARITY (Co-Star: "feels like I've used it before"), achieved through the continuity layer alone (palette, type faces, ambient gradients, voice) while layout uses maximally conventional structure. §0's prose is ratified; Днес and Карта are live (§14). Reading-length (§0.3), the Ритъм R3/R5 conflict (held for Round C, scope corrected in §10), and P-chain sequencing (§7) are all decided. Round B is a separate ratification, not yet fired. §1 onward is v1/v2's research, largely still valid as reference (see §0.0 for what changed).

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

**REVISIT-42 — CLOSED-BY-DECISION.** Resolved by adopting a Cyrillic-supporting display face (Playfair Display) rather than accepting fallback on either platform. No further action.

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
