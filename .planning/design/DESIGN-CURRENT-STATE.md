---
title: Design — current state (Phase 1a)
created: 2026-10-07
status: for founder review. Nothing here is defended. 2026-10-07: the last table is now pre-filled with my recommendation and a one-line reason per row — you only override. Mobile layout claims derived from web/mock-up renders were removed (see the correction note in §0).
how-evidence-was-gathered: |
  Read every file in .planning/design/**, the retired research docs' stubs, MOBILE_UX_RESEARCH.md, COMPETITOR_*.md, DESIGN-RESEARCH-2026-08-27.md,
  DESIGNER_BRIEF_ASSETS.md, the mobile screen code (index.tsx, chart.tsx, rhythm.tsx, moon-detail.tsx, ScreenShell, tokens, States, NavRow,
  LeadLine, Plaque/Pedestal/MoonHero headers, TransitOverviewCard grep) and the bulgarian-skill + mystical-dark-ui skills.
  Screenshots: headless Chrome via playwright-core (scratchpad, not in the repo), 390 px wide, in .planning/design/current-state/.
---

# 0. What I could and could not see — read this first

> **Correction (founder, 2026-10-07):** web renders of mobile screens are approximations. Mobile layout is judged only by the founder, on a device or emulator. The tab-bar / «Питай Оракула» / «Погледни нагоре» / Карта-hint overlaps this document previously reported came from mock-up and web-harness renders; they are already fixed on device and have been removed from the findings and from the CHANGE pre-fill. My render-based critique applies to **mock-ups and web only**.

| Screen | What the screenshot is | Why |
|---|---|---|
| Днес, Карта, Ритъм, moon-detail | **The committed mock-up each screen was built from**, rendered at 390 px. | Rendering the real React Native screens needs Clerk auth + live API. `app/_stage2-preview.tsx` renders some real components on web with mock data; I ran it (Expo web, headless Chrome) — see `code-dnes-web-harness.png`. It is **not valid evidence for layout** (the "Питай Оракула" overlap in it is a harness artefact; the code's own comments say browser layout ≠ Yoga layout) — usable for type and colour only. So **for the code I judge from reading it, and I say so on each line.** |
| oracle-loading-v2, birth-data-edit-v1, chart-reveal-flow-v1 | The approved mock-ups themselves, rendered. | They are HTML. Reveal-flow: only the loading/placement and horoscope+button states captured; the 'failed' and 'slow' states I read from the file, not looked at. |
| Днес, Карта (device) | **Two real iPhone captures from 2026-07-27** (found late, §2.0) — the only true renders of shipped code, but pre-date the IA reorder and ти conversion. |  |
| Ритъм (code) | **No render at all.** | The mobile screen (`rhythm.tsx` + `TransitOverviewCard`) is still the pre-redesign Tailwind implementation and does not match its mock-up (`ritam-mockup-v4.png`). Described from code. |

Epistemic tags: **VERIFIED** = found in a file I read (cited); **INFERRED** = my reading across files; **UNREAD** = exists, not read.

---

# 1. Agreed design decisions

| # | Decision | Date | Source | Status |
|---|---|---|---|---|
| 1 | **Familiarity over distinctiveness.** The target is "feels used before" (Co-Star/Apple-Weather structure), not a novel interface. v1/v2 "chased distinctiveness" and were replaced by v3. | 2026-07-22 (cutover) | `apps/mobile/app/(authed)/(tabs)/index.tsx` header comment; retired `MOBILE_ALPHA_REDESIGN.md` §0 | VERIFIED |
| 2 | **R1** one dominant element per screen, 6–8× the smallest text; the hero is a glyph/object, not text. | ratified before 2026-08-16 | `DESIGN-LANGUAGE-REFERENCE.md` §0 | VERIFIED |
| 3 | **R2** max 3–4 type sizes per screen (`sub 17`, `body 17`, `row 16`, `caption 12`, `eyebrow 9.5`). | same | same | VERIFIED |
| 4 | **R3** tracked-caps uppercase reserved: 0–1 per screen. | same | same | VERIFIED |
| 5 | **R4** accent reserved to 1–2 functional roles per screen; violet structural, never a third accent. | same | same | VERIFIED |
| 6 | **R5** Roman numerals only in the Astrology Guide. Wizard numerals retired to dots. | same | same | VERIFIED |
| 7 | **R6** card/grid shape chosen by real longest Bulgarian string; 2-up only for ≤12–14 chars. | same | same | VERIFIED |
| 8 | **R7** state/lead changes need ≥2 dimensions, ≥1 categorical (not "10% brighter"). | same | same | VERIFIED |
| 9 | **No cards, no pills, no card borders, no drop-shadowed buttons, no tab chips, no emoji, no chevrons (except plain settings rows).** | 2026-08 (v4 set) | `_source-v4.html` text ("Absent, deliberately, everywhere: chevrons, pill-boxes, card borders, drop-shadowed buttons, tab chips, emoji"); `DESIGN-LANGUAGE-REFERENCE.md` §5 | VERIFIED in the v4 text. (The Reference doc calls it "an inferred convention, not a written prohibition" — the v4 source does write it down; the Reference is the stale one.) |
| 10 | **Bronze is light and fittings, never a container**: radial glow + text-shadow + one breathing ember. Invitations are a lit phrase, not a button. | 2026-08-16 | Reference §5–6; `CtaPanel.tsx` | VERIFIED |
| 11 | **Warm / cool / neutral temperatures.** Warm: Днес, Оракул, Ти, Кръг, Кристал, Дневник. Cool: Карта, Guide. Both (boundary): Ритъм. Neutral: Настройки, Вход. | 2026-08 | `_source-v4.html` | VERIFIED |
| 12 | **Navbar is temperature-neutral**: no fill, soft fade + one violet horizon hairline, a violet point (not bronze) for "you are here". | 2026-08 | `_source-v4.html`; `(tabs)/_layout.tsx` | VERIFIED |
| 13 | **Five tabs: Днес · Карта · Кръг · Ритъм · Ти.** Оракул is not a tab; it is the single exit of Днес («Питай Оракула»). | 2026-04-18 (IA) / shipped | `MOBILE_UX_RESEARCH.md` §2; `(tabs)/_layout.tsx`; `index.tsx` | VERIFIED. (The research proposed an Oracle FAB / nav glyph; what shipped is the in-screen invitation.) |
| 14 | **Tokens**: base `#08060f`, bronze `#b8763e`, bronzeText `#d9a06a` (corrected from `#e0b587`), cool `#5b8fc7`, faint `#6d7e97` (lifted from `#64748b` for AA 4.5:1). | 2026-08-16 / 2026-08-27 | `tokens.ts`; `DESIGN-RESEARCH` §D | VERIFIED |
| 15 | **Fonts (mobile): Playfair Display (display), EB Garamond (body/italic), Cinzel Latin-only, mono for specimen labels.** | 2026-07 | `tokens.ts`, `_layout.tsx` | VERIFIED. (Mono labels were later switched to Playfair for being "too rigid" — see #22.) |
| 16 | **HARD RULE: Cinzel is Latin and Roman numerals only. Never Cyrillic.** Shipped-and-fixed six+ times (REVISIT-42). | 2026-08-16 | Reference §1 | VERIFIED. **Conflicts with what the web now does** — see §4 contradiction C3. |
| 17 | **Motion character**: things resolve into focus once; one ember breathes; nothing loops loudly. Animate opacity/transform only; Guard 3 (no translate clobber). | 2026-08 | `_source-v4.html`; `BUILD_VERIFICATION_GUARDS.md` | VERIFIED |
| 18 | **Skeletons: bespoke, per-screen, layout-matching only; no generic skeleton system. Reduced-motion, delayed spinners, considered empty states: approved in principle, deferred to each screen. Light mode: not on the table.** | 2026-08-27 | `DESIGN-RESEARCH` §E | VERIFIED |
| 19 | **Paywall/premium designed from scratch; `/pricing` is not a reference.** | 2026-08-27 | `DESIGN-RESEARCH` §E.2 | VERIFIED |
| 20 | **Design floor 360×780** (not iPhone SE). | — | `index.tsx` comment citing `DEVICE-SUPPORT-POLICY.md` | VERIFIED |
| 21 | **Voice** *(superseded 2026-10-07 by the founder's ruling: the Oracle is the speaker and has no gender — "older sister" no longer applies; see DESIGN-BRIEF §2.7)*: knowing older sister / wise friend; no roasting; informal ти; no aggressive Western-wellness language; sits beside Orthodox tradition, not against. | 2026-04 | `MOBILE_UX_RESEARCH.md` §5, §7; `COMPETITOR_ANALYSIS.md` | VERIFIED |
| 22 | **Rejected approaches (all VERIFIED in code comments):** bronze ambient wash (2026-07-28 — bronze only for the invite); pinned invite (4 rounds, "reads as boxed", 2026-07-28); hairline-framed plate around the Big Three ("a container in everything but name"); mono-font section labels ("too rigid"); amber (retired for bronze 2026-08-16); wizard Roman-numeral steps; full-width section rules (replaced by half-width). | 2026-07/08 | `index.tsx`, `Plaque.tsx`, `ScreenShell.tsx` | VERIFIED |
| 23 | **Approved mock-ups:** `oracle-loading-v2` (progress bar dropped by founder ruling), `birth-data-edit-v1` (called "approved mobile edit mock-up" in `birth-data.ts`), `chart-reveal-flow-v1` (**APPROVED as mocked up 2026-10-01**). | 2026-10-01 | `PLACEHOLDERS.md` CHART-REVEAL-FLOW; `birth-data.ts` comment | VERIFIED for reveal-flow; edit/oracle-loading INFERRED from comments (no dated approval line). Note: **all their Bulgarian copy except one message is still placeholder.** |
| 24 | **Rejected 2026-10-07:** `desktop-shell-v1` ("generic AI design: pills, boxes, default patterns"). v1 of oracle-loading ("did not follow art direction"). | 2026-10-07 | your message; `oracle-loading-v2.html` comment | VERIFIED |
| 25 | **Web: the mobile layout shown in a centred column on desktop; per-glyph Playfair fallback on Cinzel; mobile tokens as CSS variables.** Desktop shell decisions on hold. | 2026-10-02 / on hold 2026-10-07 | your messages | VERIFIED (chat) — **not written in any repo file** until now. |
| 26 | **Web design ownership**: "web design is Petko's call". | 2026-08-27 | `DESIGN-RESEARCH` §E.6 | VERIFIED — **status unclear now**: you have ordered web parity. Needs your confirmation of who decides. |

---

# 2. Done screens

Screenshots live in `.planning/design/current-state/`.

## 2.0 The only real renders of the shipped app — two iPhone captures from 2026-07-27

Found late: `mockups/download (2).jpg` and `download (3).jpg` are **real device screenshots** (iPhone status bar, battery 62, "Monday 27 July", committed 2026-07-28), not mock-ups. Copies: `current-state/device-dnes-2026-07-27.jpg`, `device-karta-2026-07-27.jpg`. They predate later changes (the reading-first IA reorder, the ти conversion, the Plaque rework), so they are **evidence of the trajectory, not of today's screens** — but they are the closest thing to ground truth I have, and they differ from the mock-ups more than anything above suggests.

**Днес (device, 27 July):**
- The moon is large and first (96 % lit, a flat bright disc with a purple wash on the left and a peach wash on the right) — closer to R1 than today's code. It reads as a **pale ball with two colour smudges**, not the layered, grained, lit sphere of `dnes-mockup-v4.png`; the mock-up's depth and terminator are not there (Guard 2, "moon under-lit", was flagged and this is the device answer).
- Order is: date → greeting → **«небесен ритъм»** caption → phase name in tracked caps → moon → **«дневен хороскоп»** caption → reading. Captions are **orange-bronze, lower-case, small** — read as form labels.
- The reading is in **Вие** («Вашият ден е под влиянието на Меркурий… Вие можете да използвате…») and the planet names are highlighted **bright yellow** — a third accent colour not in the language (R4). (Prompt has since been fixed to ти; the highlight colour is in code.)
- The greeting shows the name in **Latin** («Nikolay Tonev») in italic, from the Clerk profile.
- «Питай Оракула» sat over the bottom of the reading with the reading's last line fading behind it (July capture; **fixed on device since, per founder**); a stray ember dot floats at the far left. The glow reads as an **orange band across the screen**, not a lit phrase.
- Tab bar: stock icons with **Cyrillic labels in mixed case** (Днес, Карта…) — the mock-up's mono caps (ДНЕС) did not ship.

**Карта (device, 27 July):**
- **This is not the "recovered instrument".** The wheel is a **dense multicolour astrology chart**: a heavy bronze rim, zodiac glyph ring, house numbers, and planet badges in **yellow, pink, violet, cyan and white**, joined by aspect lines in **blue, green, yellow, pink and red dashed**, plus a thick cyan horizontal line (Ascendant) and a yellow diagonal. The mock-up has five blue dots on a quiet black face.
- That is **six-plus accent colours on one screen** against R4 (1–2), and exactly the density the design research (`MOBILE_UX_RESEARCH` §8) wants *available* ("correct science") but the mock-up hides. Planet glyphs are Unicode placeholders in circles; a **Roman numeral «I» in a circle** sits top-right (R5 says numerals belong to the Guide only — it may be a legend toggle; I did not trace it).
- Below it: the hint, then three Big Three rows — **tiny faint tracked label over a large tracked-caps value** («СЛЪНЦЕ / СКОРПИОН», «ЛУНА / КОЗИРОГ», «АСЦЕНДЕНТ / КОЗИРОГ»), widely spaced — and «ДЕТАЙЛИ» **immediately beneath the last row with almost no gap** (later separated by a 48 px rule per the Reference).
- Roughly **40 % of the screen is empty** below «ДЕТАЙЛИ».
- The wheel's name label is Latin («Nikolay Tonev»).

**What these two captures tell the brief:** the gap between the approved mock-ups and the shipped app is large *in the object itself* (moon, wheel), not only in type rules. Whatever the brief says about "a lit sphere" and "a recovered instrument", **those objects have not been built to the mock-up's standard on device**; the designer brief (`DESIGNER_BRIEF_ASSETS.md`) says the same ("true material illustration … is what the designer brief exists for").

## 2.1 Днес

**Evidence:** mock-up `dnes-mockup-v4.png` (target); code read in full (`index.tsx`, 966 lines, `MoonHero`, `ScreenShell`); web harness shot for type/moon only.

**What the code actually is (VERIFIED from `index.tsx`), top to bottom:** date line (Playfair 13, faint) → greeting (EB Garamond italic 19, bronze phrase + muted name) → half-width hairline → **«дневен хороскоп»** bronze tracked-caps caption (12) → AI-disclosure line (12, faint) → reading (EB Garamond **20/31**, bronze spine, payoff in Playfair bronze with glow) → hint «Плъзни надолу, за да попиташ Оракула» (italic 14) → hairline → **sun-sign name** as a bronze tracked-caps caption + quip → hairline → **«небесен ритъм»** caption → moon (shrunk to ~0.345 of width in earlier rounds) with phase-name eyebrow → meteor note → hint «За целия лунен профил — докосни «Повече детайли» по-долу.» → **«Повече детайли»** (breathing ember + tracked-caps 13) → **«Питай Оракула»** (CtaPanel).

**Choices it embodies:** one long scroll; temperature warm; bronze as the speaking colour; scroll-reveal choreography (fade + rise + rotate/overshoot on the moon); hairline section breaks; two-tier invitation hierarchy.

**Follows the agreed decisions:** palette tokens; bronze-as-light for the CTA; no cards; LeadLine structure (spine bounded, payoff outside); Cinzel not used on Cyrillic here.

**Deviates:**
1. **R1 is gone.** In the mock-up the moon is the hero, first, ≈13× caption. In code the reading is first and the moon was reduced to 0.345 of width and pushed below the horoscope and sign block (IA reorder). The screen has no dominant object any more.
2. **R3 (0–1 tracked caps).** At least **five** tracked-caps strings render: «дневен хороскоп», the sun-sign caption, «небесен ритъм», the phase-name eyebrow, «Повече детайли» — plus the greeting and date in their own treatments.
3. **R2 (3–4 sizes).** Distinct sizes in the file: 12, 13, 14, 16, 19, 20 (+17 from `type.body`, +15/16 in MoonHero) — **≥ 8**.
4. **R4 (1–2 accent roles).** Bronze is the greeting phrase, every section caption, the payoff, the ember, the link, the CTA — i.e. used as the *label* colour, not only as "the app speaking".
5. Body text 20/31 is not a token (`type.body` is 17/27); set by the `HOROSCOPE_BODY_STYLE` override.
6. Mock-up payoff is **starlight**; code recolours it **bronzeText** ("the app speaking") — a recorded founder decision, not drift, but it removes the categorical colour break the mock-up used (payoff = starlight vs bronze spine).
7. The hairline section dividers, the AI disclosure line and the two italic hint lines are **not in the language** — added by founder corrections.

**Anti-pattern / generic assessment (honest):**
- It reads as a **long text feed with five small bronze labels** rather than an object with weight. The screenshot of the mock-up has one thing to look at; the code has none. That is the template tell: *label → paragraph → label → paragraph.*
- **Two italic instruction lines** ("Плъзни надолу…", "…докосни «Повече детайли» по-долу") exist to compensate for affordances that did not read on their own. The brief's own test is "the user always knows what this is and what to do next"; here the screen narrates it. Round 8–10 comments in `index.tsx` show this was patched repeatedly (the file narrates ≥10 correction rounds).
- `ErrorState` (`States.tsx`) is a **rounded (12px), bordered, tinted box** — a card, in the language that bans cards. `LoadingState` is a stock `ActivityIndicator`. `EmptyState` ends in a chevron `NavRow`.
- The date line + greeting + captions + disclosure + hints: **six different small-text treatments** in the first 2 screens of scroll.


## 2.2 Карта

**Evidence:** mock-up `karta-mockup-v4.png`; code `chart.tsx` (read in full), `Plaque.tsx`/`Pedestal.tsx`/`NatalWheelFrame.tsx` headers read; `NatalWheel.tsx`, `PlanetDetail`, `DetailsSheet` **UNREAD**.

**Choices:** cool temperature; the wheel as a physical instrument (bevelled bronze rim = the only warm fitting; dark etched face; gems); name recedes to a specimen label; Big Three as engraved text; one lit invitation «Детайли» opening a sheet.

**Follows:** wheel first with nothing above it (R1 holds here — the strongest screen on R1); cool wash; bronze only on rim + pedestal; no cards.

**Deviates:** wheel enlarged to 0.88 of width (mock-up 0.72) to fix dead space; single plaque line replaced by **three stacked label/value rows** (device-tested, recorded); plaque moved **above** the pedestal (reverses mock-up order); label «натална карта» is tracked caps; Plaque labels and values are tracked caps (R3: the mock-up already had 3 — «ДЕТАЙЛИ», the plaque line, tab labels); italic hint «Докосни планета за тълкуване» 15px.

**Anti-pattern / generic assessment:**
- The mock-up is the most **designed** thing in the set: it has an object. The code keeps that. Residual concern: the screenshot shows ~35–40% of the screen empty below the plaque (recorded as the reason the wheel grew) — the composition is a circle floating in a column.
- Three tracked-caps lines stacked under a 280 px circle is the "engraved plaque" idea, but at phone size it reads as a **small-caps list** — the same label/value pair repeated three times.

## 2.3 Ритъм

**Evidence:** mock-up `ritam-mockup-v4.png`; **code described from reading `rhythm.tsx` and grepping `TransitOverviewCard.tsx` (428 lines, not read in full). No render.**

**The shipped screen is not the redesign.** `rhythm.tsx` is **pre-redesign**: Tailwind utility classes (`text-slate-500`, `text-slate-400`), its own `SafeAreaView` instead of `ScreenShell` (so no temperature wash, no stars, no back behaviour), a 56 px bronze numeral hero ("one-off outside the named type scale"), and an eyebrow `Текущо небе` set in `tracking-[0.42em]` uppercase slate. `EmptyTransitsState` is **a `rounded-full border border-bronze/40` pill with a `›` chevron** — every banned device at once. `TransitOverviewCard` contains `rounded-2xl border bg-[#0b0915]` (a card) and `border-b border-white/[0.05]` row rules (9 occurrences of rounded/border). The mock-up's track + single ignited point + bronze beam + hairline + upcoming list **does not exist in code**.

**Deviates from everything:** R1 (a bare number is the hero), R2 (sizes 10, 13, 15, 16, 28, 56), R3, R4, no pills, no cards. **Fails the anti-pattern list outright.**

**Mock-up:** `ritam-mockup-v4.png` is a strong, specific idea (cold track, one point ignites). Flaws: it is a *weekly timeline* while the code's data is "active transit count" — the mock-up's content model (days of the week with dated events) is not what `useTransitOverview` provides; the mock-up's three "upcoming" rows are hard-coded examples.

## 2.4 moon-detail («Повече детайли»)

**Evidence:** mock-up `moon-detail-mockup-v1.png` (file says "ratification pending"; code comments say "ratified" — INFERRED approval); code read in full.

**Choices:** warm; moon 172 px; phase name Playfair 26; centred type; four fields (Най-добра за / Афирмация / Кристал / Ритуал) as caption + body separated by hairlines; journal prompt + `CtaPanel «Лунен Дневник»` as the exit.

**Follows:** no cards/pills; hairline separators (settings-row language); one exit via CtaPanel; real strings from `moon-phase.ts`.

**Deviates / fails:**
- **R3, even in the approved mock-up:** «НЕБЕСЕН РИТЪМ» + four field labels = **five tracked-caps strings** in one screen (the mock-up and code agree, so this is a design choice, not a build error — but it breaks the rule).
- **Centre-aligned multi-line body text** (`physicalAppearance`, ~220 chars) — poor reading rhythm; the screenshot shows ragged centred paragraphs.
- The screenshot shows **no moon** (cropped: mock-up phone at 780 px height shows caption + title + text; the 172 px moon is below/under the fold in the render) — I did not verify its position; UNREAD for pixel layout.
- **Copy:** «Лунен Дневник» (capital Д) vs «лунен дневник» elsewhere; `PHASE_META` contains «направил/а» (compact gender pair).
- Honest feel: a **definition-list page** — heading, paragraph, four label/value blocks. Competent, not distinctive; it is the shape of any "details" page.

## 2.5 Approved: oracle-loading-v2

**Evidence:** `oracle-loading-v2-arrival-3s.png` (rendered at t≈3.7 s).

**Embodies:** the ember hero (R1), three **sign glyphs lighting in sequence** with «<планета> в <знак>» labels, italic stage line, 0/1.2/2.5 s stages, "taking longer" line at 10 s, reading arrives by fade. No bar, no percentage.

**Follows decisions:** yes — R1, R2 (uses only existing sizes), **R3 zero tracked caps**, R4 one accent, no Cinzel, faint `#6d7e97`, glyph paths verbatim from `glyphs.ts`, reduced-motion handled, R7 (colour + glow + label ≥ 2 dimensions).

**Generic / weak (honest):**
- **Three glowing circles each holding an icon with a caption beneath** is the "three features in a row" shape — the thing `DESIGN-RESEARCH` §A.1 lists as a vibe-coded tell. It escapes only because the glow has no container edge and the content is data, but the *silhouette* is the template's.
- The zodiac glyphs are **still the old hand** (designer redraw pending, `DESIGNER_BRIEF_ASSETS.md`); the planet is only in the caption — the picture shows the sign, the label names the planet, which is one more thing to decode.
- All Bulgarian is `PLACEHOLDER_COPY`.

## 2.6 Approved: birth-data-edit-v1

**Evidence:** `birth-data-edit-v1-rest.png`, `…-editing.png`.

**Embodies:** the wizard's placed star as hero (solid ring now), four **lit-line** fields (label small faint, value italic, 1px bronze underline; active = brighter + soft glow + caret), plain hairline rows for options, the dnes invitation «Запази» (off state: glow and ember removed, text faint).

**Follows:** no card/border/pill/chevron; sizes 12/15/18/20; zero tracked caps; R7 on the disabled Save (categorical change).

**Weak / failing (honest):**
- **«Запази» in its disabled state is nearly invisible** (`birth-data-edit-v1-rest.png`): categorical, yes, but a user cannot tell it exists. The disabled and "nothing to do" states are indistinguishable from an empty bottom of the screen.
- The star hero is **decorative here** (it is the wizard's metaphor, with no job on an edit screen) and the whole upper third is chrome before the first field.
- No visible way back/cancel in the mock-up (the shell has `BackButton`; the mock-up omits it); no unsaved-changes handling shown.
- The underline-fields pattern is the generic "Material/underline input" shape; the glow is the only thing that makes it Stellaeum.
- Copy placeholder; the web build (`EditBirthDataDialog`) is a **different** design altogether (see §3).

## 2.7 Approved: chart-reveal-flow-v1

**Evidence:** `reveal-flow-v1-placements.png` (loading, t≈1.7 s), `reveal-flow-v1-horoscope-and-chart-button.png`. The slow/failed/chart-compute-failed states were **read, not looked at**.

**Embodies:** one flow: saved → staged loading (placements light up) → [new users only: big-three reveal] → today's horoscope (generated during the loading) → one lit «Към картата» invitation. Failure never blocks the chart.

**Follows:** the same language as oracle-loading-v2 and Оракул; polite live region; reduced-motion defined.

**Weak / open:**
- The reveal state I captured shows the dev string "(the edit variant has no big-three reveal)" — the mock-up's own scaffolding, not a design. The **new-user reveal itself is the least defined part** (traits copy all placeholder).
- The horoscope page has a **mono date stamp** («1 октомври») — the "specimen label" treatment the mobile app moved *off* mono for ("too rigid") — an inconsistency with the shipped screens.
- Wait time: p90 8.5 s of "staging" before the user sees anything they asked for; the flow is honest about it but it is a long theatre for the first thing a new user does.

---

# 3. Web today (for the parity decision) — INFERRED from code and the earlier audit, not rendered

`apps/web` uses **Manrope + Inter + Cinzel**, Tailwind glass utilities (`mystic-panel`, `backdrop-blur`, `rounded-full`, `shadow-[0_0_8px_rgba(251,191,36,0.6)]`), amber, gradient text, framer-motion blur-ins, two-card pricing — per `DESIGN-RESEARCH` §A.2.2 (VERIFIED then). `EditBirthDataDialog` on web is a `<dialog>` with `max-w-xl`, `rounded` panels, glass backdrop, Cinzel tracked caps «Редакция» over a Manrope title — i.e. the opposite of the approved mobile mock-up for the same job. The web app never received the amber→bronze migration. **Web is not "slightly behind" mobile; it is a different design language** (the one the `mystical-dark-ui` skill describes).

---

# 4. Inconsistencies between screens (same role, different treatment)

| Role | Днес | Карта | moon-detail | Ритъм | Approved mock-ups |
|---|---|---|---|---|---|
| Section / screen label | bronze tracked-caps Playfair 12 | faint tracked-caps Playfair 13 («натална карта») | bronze tracked-caps 13 (centred) | slate tracked-caps 10, 0.42em | none (R3) |
| Date / specimen line | Playfair 13 faint | — | — | — | **mono** 9.5 (reveal flow) |
| Screen heading | none (greeting) | name italic 19 | Playfair semibold 26 starlight | 56 px numeral / 28 px italic | Playfair 18 starlight |
| Primary exit | CtaPanel lit phrase | Pedestal lit word | CtaPanel | none / pill+chevron | lit phrase + ember |
| Secondary link | ember + tracked caps «Повече детайли» | — | — | — | — |
| Hint / instruction text | italic 14 faint ×2 | italic 15 faint | italic muted (journal prompt) | — | none |
| Error | rounded bordered rose box | same | — | `border-l` rose block | quiet line |
| Loading | ActivityIndicator + 12 px caption | same | — | — | glyph-lighting + stage lines |
| Back affordance | none (tab) | none | BackButton (auto-hides on scroll) | none | none drawn |
| Layout shell | ScreenShell | ScreenShell | ScreenShell | own SafeAreaView | phone frame |

Also: **«Лунен дневник» / «Лунен Дневник»**, **Натална карта / натална карта**; bronze means "the app speaking" on Днес but "label colour" on moon-detail and "fitting" on Карта; the hero is the moon on Днес's mock-up, text on Днес's code, a number on Ритъм, the wheel on Карта, the ember on Оракул/loading — five different kinds of hero.

---

# 5. KEEP / CHANGE / DISCUSS — pre-filled with my recommendation (override any row)

| Screen | Element | Current state | Recommendation — reason |
|---|---|---|---|
| Днес | Hero object (moon) | In the mock-up the hero; in code reduced and pushed below the reading | **CHANGE** — Per brief C5: record reading-first as decided and amend R1 for Днес so the reading's payoff is the dominant element and the moon is secondary; size and position are yours to judge on device. |
| Днес | Moon as rendered on device | Flat pale disc with two colour washes (not the layered lit sphere) | **CHANGE** — Material illustration of the moon is a designer task (brief §5 #5); code cannot close it. |
| Днес | Planet-name highlight in readings | Bright yellow, a third accent | **CHANGE** — A third accent breaks R4; use bronzeText or starlight. |
| Днес | Latin name in greeting / Карта label | «Nikolay Tonev» from profile | **KEEP (tentative)** — show the name as the user entered it; transliterating by code risks wrong Bulgarian, which you own. |
| Днес | Reading before sky (IA order) | Horoscope first, sign quip, then небесен ритъм | **KEEP** — Reading-first matches Oura's "what matters now, first"; it was your call after many rounds. |
| Днес | Greeting (bronze phrase + muted name) | Italic 19, two colours | **CHANGE** — Keep the two colours; make it upright (italic ruling). |
| Днес | Section captions («дневен хороскоп», sign, «небесен ритъм») | Bronze tracked caps ×3 | **CHANGE** — R3 allows 0–1 tracked caps and C8 says bronze is not a label colour: sentence case, faint, at most one. |
| Днес | Half-width hairline dividers | Added by founder correction | **KEEP** — Half-width hairline is the settings-row language and your correction. |
| Днес | AI-generated disclosure line | 12 px faint under the caption | **KEEP** — An AI-disclosure line is a compliance item (`compliance-copy.ts`); only its look is open. |
| Днес | Instruction hints («Плъзни надолу…», «…докосни «Повече детайли»…») | Italic 14 faint ×2 | **CHANGE** — If an affordance needs a sentence the affordance is wrong (§3.2.3); remove each hint once its affordance reads on device — your call when. |
| Днес | Reading body size | 20/31 (token is 17/27) | **CHANGE** — Promote 20/31 to a named reading token and delete the one-off sizes (R2); the size itself is your device call. |
| Днес | Spine + payoff (LeadLine) | Bronze spine; payoff Playfair bronze + glow | **KEEP** — The spine/payoff structure works; payoff colour stays bronzeText (recorded decision, C6). |
| Днес | «Повече детайли» (ember + tracked caps) | Subordinate link | **CHANGE** — Tracked caps → sentence case lit phrase (R3); keep the ember and its subordinate position. |
| Днес | «Питай Оракула» (CtaPanel) | The one exit | **KEEP** — The single lit exit; the language's core device. |
| Днес | Scroll-reveal choreography | Fade/rise/rotate per fragment | **CHANGE** — Drop rotate and overshoot (brief bans bouncy overshoots); keep fade + rise, and add reduced-motion. |
| Днес | Error / loading / empty states | Bordered box / spinner / chevron row | **CHANGE** — Bordered box, stock spinner and chevron row break "no boxes / bespoke loading"; use a quiet line and staged loading. |
| Карта | Wheel as instrument (rim, face, gems) | Hero; enlarged to 0.88 width | **KEEP** — The strongest screen on R1; the instrument is the idea. |
| Карта | Wheel as shipped on device (multicolour planets, 5 aspect-line colours, Ascendant line, Roman «I» button) | Dense data chart, not the cold instrument | **CHANGE** — Six-plus accents break R4; the hero stays quiet and the data moves to the sheet (C9). |
| Карта | Specimen label + name | «натална карта» caps + italic name 19 | **CHANGE** — Caps → sentence case, name upright; the Latin-name issue is the DISCUSS row above. |
| Карта | Big Three plaque | Three stacked label/value rows, caps | **CHANGE** — Three caps rows violate R3; keep three rows, sentence case. |
| Карта | Pedestal «Детайли» | Lit word + thread | **KEEP** — The lit word is the mechanism and, once other caps go, the one allowed caps item on the screen. |
| Карта | Hint «Докосни планета за тълкуване» | Italic 15 | **CHANGE** — Same as Днес hints (§3.2.3); upright; remove when the planets read as touchable. |
| Карта | Empty space below plaque | ~35–40% of screen | **KEEP (tentative)** — pure layout; the wheel was already enlarged to fix it, and only you can judge the result on device. |
| Ритъм | Whole screen | Pre-redesign (Tailwind, pill, chevron, card) | **CHANGE** — Pre-redesign, uses every banned device (pill, card, chevron, Tailwind slate). |
| Ритъм | Mock-up concept (cold track, one ignited day) | Drawn, not built; data model differs | **CHANGE (tentative)** — rebuild Ритъм to the mock-up's idea (cold track, one lit point) limited to the days `useTransitOverview` can actually supply, not the hard-coded weekly list. |
| Ритъм | 56 px transit-count numeral | Off the type scale | **CHANGE** — Off the type scale (R2); a number is not an object hero. |
| moon-detail | Layout (title, centred paragraph, 4 fields) | Definition-list page | **CHANGE** — Left-align the long paragraph; the rest is competent and stays. |
| moon-detail | Five tracked-caps labels | R3 broken in mock-up and code | **CHANGE** — Five caps labels break R3; make the four fields faint sentence-case labels. |
| moon-detail | Exit «Лунен Дневник» (CtaPanel) | Capitalisation differs from elsewhere | **KEEP** — Casing fixed 2026-10-07 («Лунен дневник»). |
| Оракул | Lit free-text ask-line (`orakul-v4` mock-up) | The product has no free text; the Oracle takes a topic | **CHANGE** — settled: replace the ask-line with topic choice (brief C10). |
| oracle-loading-v2 | Three lit sign-glyph row | Template silhouette; old glyph hand | **KEEP** — It shows data and has no container edge; revisit when the designer's glyphs arrive. |
| oracle-loading-v2 | Stage text + "taking longer" line | 0 / 1.2 / 2.5 / 10 s | **KEEP** — Structure is right; the words follow the voice rule and need your approval. |
| birth-data-edit-v1 | Star hero | Decorative on an edit screen | **CHANGE** — Decorative on an edit screen; shrink or drop it. |
| birth-data-edit-v1 | Lit-line fields | Underline + glow + caret | **KEEP** — The language's input device. |
| birth-data-edit-v1 | Disabled «Запази» | Near-invisible | **CHANGE** — Keep the categorical change but leave the label readable and findable; invisible is not disabled. |
| birth-data-edit-v1 | Missing back / unsaved-changes affordance | Not drawn | **CHANGE** — A way back and unsaved-changes handling are real needs the mock-up omits. |
| chart-reveal-flow-v1 | Staged loading → reveal → horoscope → chart button | One flow, two variants | **KEEP** — Approved 2026-10-01. |
| chart-reveal-flow-v1 | Big-three reveal (new users only) | Least defined part; copy placeholder | **KEEP (tentative)** — keep the approved flow; the new-user reveal waits on approved copy, so nothing to build yet. |
| chart-reveal-flow-v1 | Mono date stamp | Differs from shipped screens | **CHANGE** — Mono is recommended retired (research A.8); body face, tabular figures, 12 px floor. |
| System | Cinzel on Latin-only + Playfair fallback for Cyrillic | Web now falls through per glyph; mobile rule says never | **CHANGE** — Retire Cinzel for Cyrillic (C3); it stays for Latin and the Guide's Roman numerals only. |
| System | Navbar (violet hairline + point, no fill) | Shipped | **KEEP** — Temperature-neutral, no fill; shipped and consistent with the language. |
| System | ErrorState bordered rose box | Violates "no cards" | **CHANGE** — Bordered rose box is a card; replace with a quiet line (same as the Днес states row). |
| System | Web design language (Manrope/Inter/glass/amber) | Different language from mobile | **CHANGE** — Web moves to the brief per your parity order; who owns web is C13, yours to confirm. |
