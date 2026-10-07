---
title: Stellaeum design brief
created: 2026-10-07
status: DRAFT for founder approval, updated 2026-10-07 with your rulings (price, faint token, casing, voice, italics direction, mobile-layout correction) and with my recommendation pre-filled on every contradiction in §6 — you only override. Not in force until you approve it. Nothing in it changes a product decision you have not already made — where sources disagree I list the disagreement (§6) and do not pick.
companion docs: DESIGN-CURRENT-STATE.md (what exists, honestly assessed) · research/TYPOGRAPHY-AND-REFERENCES.md (fonts, reference products)
how-to-read: every rule cites its source file. "R1–R7" are the rules in DESIGN-LANGUAGE-REFERENCE.md §0. Bulgarian strings here are existing strings only; anything new is marked PLACEHOLDER_COPY.
---

# 0. What I read, and what I did not

**Read in full:** `.planning/design/DESIGN-LANGUAGE-REFERENCE.md`, `DESIGN-RESEARCH-2026-08-27.md`, `DESIGNER_BRIEF_ASSETS.md`, `BUILD_VERIFICATION_GUARDS.md`, `WARM_COOL_AMENDMENT.md` and `WARM_COOL_BUILD_PLAN.md` (retired stubs); `research/MOBILE_UX_RESEARCH.md`, `COMPETITOR_ANALYSIS.md`, `COMPETITOR_FIELD_GUIDE.md`, and the retired stubs `MOBILE_ALPHA_REDESIGN.md`, `COMPETITOR_UX_VISUALS.md`, `Stellaeum_AI_Reference.md`; mock-ups `_source-v4.html` (CSS + all text — the master of the 13-screen set), `oracle-loading-v2.html`, `birth-data-edit-v1.html` (source read in full); comments + text of `chart-reveal-flow-v1`, `dnes-povece-detaili-v1`, `moon-detail-v1`, `journal-v1`; all 16 reference boards/images in `mockups/` except the unreadable one below (Днес, Карта, Ритъм, Оракул, Acents, Guide, Ти, Кръг, Кристал, Вход, Лунен дневник, Настройка карта, Настройки, Препоръки, and the two real iPhone captures `download (2)/(3)`); skills `bulgarian-skill` (SKILL.md, style-and-expression, astrology in full; grammar/orthography/natural-phrasing by headings and targeted reads) and `mystical-dark-ui` (SKILL.md in full); code `tokens.ts`, `ScreenShell.tsx`, `index.tsx` (Днес, 966 lines), `chart.tsx`, `rhythm.tsx`, `moon-detail.tsx`, `LeadLine`, `States`, `NavRow`; header comments of `MoonHero`, `Plaque`, `Pedestal`, `NatalWheelFrame`.

**Rendered:** dnes-v4, karta-v4, ritam-v4, moon-detail-v1, ti-v4, krug-v4, journal-v1, dnes-povece-detaili-v1, oracle-loading-v2, birth-data-edit-v1 (3 states), chart-reveal-flow-v1 (3 states) at 390 px in headless Chrome.

**Not read / not seen (state it plainly):**
- `Five Screens, One Instrument — Design Language.html` — a saved page whose real content (`_files/saved_resource.html`) was never committed. Unreadable. Its text survives in `_source-v4.html`.
- The remaining per-screen v4 mock-ups (`auth`, `crystal`, `guide`, `karta`, `krug`, `lunar-diary`, `navbar`, `orakul`, `recommendations`, `ritam`, `settings`, `ti`, `wizard`): each shares one 30,965-character CSS block with `_source-v4` (verified identical length) so I read the CSS once; I extracted but did not individually proofread their text, and rendered only some.
- `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines` skills in depth; `bulgarian-skill` grammar/orthography/natural-phrasing bodies.
- Code: `CtaPanel` body, `NatalWheel`, `PlanetDetail`, `DetailsSheet`, `TransitOverviewCard` (grepped only), `AmbientBackground`, `BackButton`, `TabIcons`, `motion.ts`, `oracle.tsx`, `circle.tsx`, `you.tsx`, wizard screens, all web components.
- `FEATURES.md`, `STACK.md`, `SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md` (not design).

---

# 1. Art direction in plain words

**Stellaeum is a private room at night, lit by one lamp, with a precise old instrument on the table.**

- **Mood.** Quiet, intimate, exact. Not mystical-theatrical; not wellness-soft; not a dashboard. The app talks like "a knowing older sister" *(superseded by §2.7: the Oracle has no gender — read this as warmth and knowing, not a sister)* (`MOBILE_UX_RESEARCH` §5, `COMPETITOR_ANALYSIS` §7): warm in what it says, cool in how it shows the sky. The founder's own formula: **a cold instrument that gives warm answers** (`_source-v4`, Ритъм: "a warm answer on a cold instrument"; `DESIGN-RESEARCH` §C.1).
- **Materials.** Near-black glass; etched metal; a bronze rim and fittings (the parts a hand touches); small lit stones; fine grain. Nothing is plastic, nothing is paper. (`_source-v4`: "a recovered brass-and-glass instrument … not a flat diagram"; "grain and irregular light".)
- **Light.** There are only two lights. **Violet** is the room — ambient moonlight, structural, present on every screen. **Bronze** is the lamp — the app speaking, or a fitting. A cool steel-blue exists only where the sky is *read* (the chart face, the guide). Light replaces boxes: emphasis is a glow with a transparent edge, never a filled or bordered shape (Reference §5–6).
- **What it feels like in use.** You open it and one thing is lit. You know what it is and what to do next. Everything else is dark and still. It is quiet enough to read a paragraph in.
- **What it must not feel like.** A template. A "mystical app" from a component library. Co-Star's brutalism, Nebula's marketplace, the local newspaper-horoscope app (`COMPETITOR_FIELD_GUIDE` §1, §4, §5).

---

# 2. Rules — typography, colour, spacing, motion, glyphs, imagery

Each rule: **rule — source.** "(drift)" marks where shipped code departs from it; the departures are in DESIGN-CURRENT-STATE.md, not re-argued here.

## 2.1 Typography

1. **Familiar structure, restrained type.** The target is "feels used before", not novelty. — `index.tsx` header; retired `MOBILE_ALPHA_REDESIGN` §0.
2. **R2: max 3–4 type sizes per screen.** Scale in `tokens.ts` (proposed and implemented 2026-10-07, one family, hierarchy from weight, size and colour): `caption 12/17 Regular` · `row 16/21 Medium` · `body 17/27 Regular` · `sub 17/23 SemiBold` · `reading 20/31 Regular` (the Днес reading, promoted from an override) · `display 26/32 SemiBold` · `cta 22/28 Bold` (the one exit) · `eyebrow 12/17 SemiBold tracked` (the 9.5 px tier is gone: **12 px floor**). — Reference §0, §1. (drift: Днес uses ≥ 8.)
3. **R3: tracked-caps uppercase is reserved — 0–1 per screen**, never on body-adjacent or long text; everything else is sentence case. — Reference §0. (drift: Днес ≥ 5, moon-detail 5, even the approved moon-detail mock-up.)
4. **R1: one dominant element per screen, 6–8× the smallest text;** the hero is an object (moon, wheel, ember), not a headline; the largest text tier needs only ~3.5× caption. — Reference §0.
5. **Reading text is serif and upright.** Lead and development in the body face; payoff in the display face. **No italic anywhere — RULED 2026-10-07; the italic face is dropped from the plan.** `index.tsx` and `_source-v4` still italicise the lead and hints; that is drift from this rule.
6. **FONT — DECIDED 2026-10-07: Spectral only (pairing D), Bulgarian letterforms everywhere, upright only.** The files are Spectral (Production Type, OFL 1.1; no Reserved Font Name) with the cyrl/BGR `locl` glyphs **frozen in as the default glyphs**, built by `scripts/fonts/build-spectral-bg.py` from `google/fonts@e4acad4` (hashes pinned) and renamed "Spectral BG". Because the forms are baked in, every device and browser shows them whatever the system language or `lang` tag (proved: rendered with `lang="en"` and `lang="ru"` and no lang). Weights Regular / Medium / SemiBold / Bold; tabular figures (`tnum`) kept. Never tag Bulgarian text `lang="ru"`; keep `lang="bg"` on web for screen readers. Web: `next/font/local`, one family `--ff-spectral`. Mobile: four TTFs via `useFonts`, tokens `font.body/bodyMedium/display/displayStrong`. — founder decision; research A.6, A.9.
7. **Cinzel, Playfair Display, EB Garamond, Manrope and Inter are retired (2026-10-07)** — no font in the app lacks Cyrillic any more, so the old "Cinzel never on Cyrillic" hard rule has nothing left to guard. Roman numerals in the Guide render in Spectral.
8. **No italic faces are loaded (RULED 2026-10-07).** Upright everywhere removes the false-italic risk (synthesised italic loses Bulgarian italic forms) and the italic font files. — research A.5, A.7.
9. **Minimum legible size**: 12 px caption; `faint` is 4.87:1 on base only because it was lifted on 2026-08-27; never go below it for text. — `DESIGN-RESEARCH` §D.
10. **Tabular figures** for degrees, percentages, dates. — `DESIGN-RESEARCH` §B.1 (not yet set anywhere). **Monospace is retired (RULED 2026-10-07):** dates and labels in the body face, tabular figures, 12 px floor — research A.8.
11. **Bulgarian quotation marks „…“, no straight quotes**; informal ти everywhere; **new user-facing Bulgarian needs the founder's approval** (proposed skill rule; `CLAUDE.md`).
12. **Check the longest real Bulgarian string for every slot** (lunar phase names 19 chars: «Изгряващ полумесец»; «Слънце · Луна · Асцендент» 25; list subtitles ≈ 37), never an English-length guess. — `BUILD_VERIFICATION_GUARDS` Guard 1; Reference R6.

## 2.2 Colour

| Token | Value | Role | Source |
|---|---|---|---|
| base | `#08060f` | the room | `tokens.ts` |
| surface1 / surface2 | `#0f0b1c` / `#161029` | tonal elevation (no borders) | `tokens.ts` |
| violet | `#8b5cf6` (+ `violetBorder` α .25) | structural ground; never a second accent | Reference §1–2 |
| bronze / bronzeText | `#b8763e` / `#d9a06a` | **the app speaking; fittings** — lit phrase, ember, rim | Reference §1, §5 |
| cool / coolText / plaqueCool | `#5b8fc7` / `#bcd6ef` / `#c9def2` | sky being read (Карта, Guide) | Reference §1 |
| starlight | `#f5f7fc` | chrome/navigation, hero text on cool surfaces | Reference §1–2 |
| text / muted / faint | `#e2e8f0` / `#94a3b8` / `#6d7e97` | body / secondary / tertiary (faint ≥ 4.5:1) | `tokens.ts`, `DESIGN-RESEARCH` §D |
| rose | `#fb7185` | errors only | `birth-data-edit-v1` |

Rules: **R4** — 1–2 accent roles per screen, one temperature (warm *or* cool) leading; violet always structural. · **Temperatures:** warm = Днес, Оракул, Ти, Кръг, Кристал, Дневник; cool = Карта, Guide; both (boundary, staged) = Ритъм; neutral = Настройки, Вход. — `_source-v4`. · **Bronze is never a container** — no fill, border, pill or rounded rect; the lit effect is a radial glow + text-shadow + one breathing ember. — Reference §5. · **Navbar is temperature-neutral**: violet horizon hairline, violet point for "you are here", never bronze. — `_source-v4`. · **No pure white, no neon, no rainbow, no pastel; no light mode.** — `DESIGN-RESEARCH` §A.1, §E. · Near-black floor is darker than the halation recommendation; lifting it is *not ruled* (deferred). — `DESIGN-RESEARCH` §C.4, §E.1.

## 2.3 Spacing & rhythm

- `space`: 4/8/12/16/20/24/32 for structural padding. `rhythm` for reading: **micro 4 · tight 12 · paragraph 20 · group 40** — each ≥ 2× its neighbour so groups are visible. Departures are allowed if stated (the Big Three row gap 16; pedestal gap 48). — Reference §1.
- Gaps carry meaning: *tight = belongs together; group = a new beat.* — `index.tsx` round-9 note.
- **Primary design size 384×832 dp; floor 360×780 dp** (founder ruling 2026-10-07; StatCounter Bulgaria, September 2026: 384×832 is the most common mobile viewport, 13.4%, Samsung Galaxy A/S class — figure supplied by the founder). Mock-ups are drawn at 384×832 **and also show the 360×780 state**; nothing may break, clip or overflow at the floor. Review devices: Android Studio emulators 1080×2340 @ 450 dpi (= 384×832) and @ 480 dpi (= 360×780), API 34 Google APIs x86_64, plus Expo Go on the founder's iPhone. Bottom clearance = tab bar (56 + inset) + 52. — `DEVICE-SUPPORT-POLICY.md`; `ScreenShell.tsx`.
- **Navbar and pinned elements must never overlap content** (Guard 1). **Mobile layout is judged only by the founder, on a device or emulator.** Web renders of mobile screens (including the Expo-web harness and renders of the HTML mock-ups' phone frames) are approximations; this brief reports no mobile layout defect from them. The overlaps earlier drafts listed on Днес and Карта are already fixed on device and are removed.

## 2.4 Motion

- Things **resolve into focus once**; one ember breathes at low amplitude; nothing loops loudly. — `_source-v4` ("Motion character").
- Animate **opacity and transform only**; never layer a bare `scale` animation over a `translate`-centred element (Guard 3). — `BUILD_VERIFICATION_GUARDS`.
- **State change = ≥ 2 dimensions, ≥ 1 categorical (R7)**: press feedback is opacity + scale; a lit glyph changes colour + glow + label. — Reference §0, §4.
- **Reduced motion is respected** on every animation (not yet implemented in code; mock-ups define it). — `DESIGN-RESEARCH` §B.1, approved in principle.
- Loading shows what is being computed in words (oracle-loading-v2), no bar, no percentage; skeletons only bespoke per screen. — `oracle-loading-v2`; `DESIGN-RESEARCH` §E.4.

## 2.5 Iconography & glyphs

- **No icon library glyphs, no emoji.** Unicode astronomical characters are placeholders only. — `DESIGN-RESEARCH` §A.1; `DESIGNER_BRIEF_ASSETS` §0.
- **One hand across 28 marks** (11 planets + North Node, 12 signs, 5 aspects): line art, 1.5 stroke in a 24×24 box, round caps, path-only SVG, tinted at render, legible at 16 px. Tab-bar marks 1.7 stroke, legible at 18 px. — `DESIGNER_BRIEF_ASSETS` §3–§5, §9.
- A sign glyph never stands in for a planet; caption «<планета> в <знак>». — `oracle-loading-v2`.
- Roman numerals **only in the Astrology Guide** (R5).

## 2.6 Imagery & objects

- **Hero objects built from light, not stock imagery:** the moon (layered gradients + depth-twin + grain), the wheel (bevelled bronze rim, dark etched face, gems), the ember, the placed star, the cut gem (`clip-path`). — `_source-v4`.
- **No decorative illustration, no mascots**; empty states use the invitation device, not art. — `DESIGNER_BRIEF_ASSETS` §1a.
- Real material illustration for the moon and the instrument face is a **designer task**, acknowledged as the gap code cannot close (`_source-v4` "What code alone cannot close"; the two device captures show how far the shipped objects are from the mock-ups).

## 2.7 Voice — who speaks (founder ruling 2026-10-07)

**The Oracle is the speaker.** The app has one voice with a name, and it is the Oracle's.

| Surface | Who speaks | Rule |
|---|---|---|
| Readings, the Днес horoscope, the sun-sign quip, interpretations | the Oracle | second person, informal **ти** |
| Loading and reveal **stage lines**, "taking longer" lines | the Oracle | present tense; "I" is allowed (approved 2026-10-07) |
| **Empty states** and **guidance** (hints, next-step lines, invitations) | the Oracle | second person or "I"; never an instruction sentence standing in for a broken affordance (§3.2.3) |
| Buttons, labels, tab names, settings, **form errors**, API error messages | **nobody** (neutral UI) | **no first person at all**: no «ние/нас/ни», no «-ам/-ям» as a speaker |
| The one AI-unavailable message | ratified | «Звездите са временно недостъпни. Опитай отново след малко.» stays as is |

**The Oracle has no gender.**
- **Present and future tense only.**
- **Never a first-person past participle** (подредил/подредила, видял/видяла, направил/направила).
- If a past event must be referenced, use impersonal or third-person phrasing (about the sky or the thing, not about the speaker).
- Nothing in the copy may reveal the *user's* gender (approved 2026-10-07): reword first; a spelled-out pair is the fallback; a compact pair «готов/а» is never acceptable.
- Enforcement: written into the Bulgarian skill as project rules 3–5; a validation check for Gemini output and a static content gate are *proposed*, not built (`VOICE-COPY-AUDIT-2026-10-07.md` §5).

**What passes today:** the three stage lines in the oracle-loading mock-up («Чета небето над теб…», «Свързвам местата, които се светват…», «Подреждам думите…») are present tense, first person singular, genderless — compliant. The composed Днес copy is second person, present tense — compliant.

**What does not:** existing copy that breaks the rule is **listed, not reworded**, in `VOICE-COPY-AUDIT-2026-10-07.md`: the company "we" in 44 error/UI strings (68 sites; fixed per screen during the parity pass), compact gender pairs (neutral rewordings proposed in `GENDER-NEUTRAL-REWORDINGS-PROPOSAL.md`, awaiting approval), and ~10 Oracle-side "we" lines (now ruled out). The ~110 user-voice first-person strings are allowed. All rewording needs your approval.

**Rulings 2026-10-07 on the open questions:** (1) journal stems, affirmations and journal prompts may speak in the **user's own first-person voice**, with no gendered forms; (2) **the Oracle never says "we"**; (3) **legal and support pages are exempt** from the no-first-person rule; (4) the company "we" in plain UI (44 strings) is fixed **per screen during the parity pass, not now**.

---

# 3. Layout and structure

## 3.1 Navigation

- **Five tabs: Днес · Карта · Кръг · Ритъм · Ти.** Labels ≤ 5 characters. — `MOBILE_UX_RESEARCH` §2, §7.3.
- **Оракул is not a tab.** It is reached through the single lit exit on Днес («Питай Оракула») and from the contextual invitations on other screens. — `index.tsx`.
- Back affordance on pushed screens: a fixed violet+starlight chevron that hides on scroll, never bronze. — `BackButton`, Reference §2.
- Plain chevron rows are legitimate **only** in Настройки. — `_source-v4`.

## 3.2 Hierarchy and the one-step-ahead rule

**"Guided" in this brief means:** within a second the user knows *what this screen is*; within two they know *what to do next*; and the screen has **one** lit exit. (This is the Calm/Oura/Co-Star pattern — one thing first, next step one gesture away; `research/TYPOGRAPHY-AND-REFERENCES.md` §B.)

Rule set:
1. **One hero, one exit.** If a screen has two bronze things, one must visibly serve the other (the «Повече детайли» precedent). — `dnes-povece-detaili-v1`.
2. **Labels must be legible as labels.** Co-Star's weakest point is tiny section labels users cannot decode (Pratt IxD critique). A label either earns its place (R3) or the content explains itself.
3. **No instruction text as a patch.** If an affordance needs a sentence to explain it, the affordance is wrong. (Today's Днес has two such lines; see DESIGN-CURRENT-STATE.)
4. **Empty, first-run, error and loading are designed states**, not leftovers: each offers a next step (Vercel guideline; `DESIGN-RESEARCH` §B.1, §C.5). Approved in principle, deferred to each screen's own pass.
5. **Words over numbers** for the sky ("a quiet day", not "0 transits"). — `MOBILE_UX_RESEARCH` §5.7.

## 3.3 How each screen guides to the next step (from the ratified mock-ups; not yet all built)

| Screen | What it is (first second) | The one next step | Exit device |
|---|---|---|---|
| Вход | the sky, before it knows you | enter | lit «Влез» + star |
| Настройка на картата (wizard) | your star being placed, one question at a time | answer the line | lit answer line; dots for progress (no numerals) |
| Хороскоп и карта след запазване (reveal flow) | your chart being read | read today, then go to the chart | «Към картата» lit phrase (+ skip on the new-user reveal) |
| Днес | today's sky, one lit object | read it → «Питай Оракула» | the single CtaPanel |
| Оракул | the answer arriving from a light | read; ask again | topic choice, **not** a free-text ask-line (settled: the Oracle takes no free text; the `orakul-v4` ask-line is CHANGE — C10) |
| Карта | the instrument | touch a planet; «Детайли» | pedestal word |
| Ритъм | cold week track, one point warm | read today's point | the ignited point itself |
| Кръг | two lights, one unlit | light the second ("добави") | the unlit orb |
| Кристал на деня | a gift | (collect) | bead-strand streak |
| Лунен дневник | your own page | write | lit lines |
| Ти | your seal | «Данни и настройки» | thread under the seal |
| Настройки | the quiet room | (utility) | plain rows |

## 3.4 Web and desktop

- **Order of work (founder ruling 2026-10-07): all mobile screens are designed and built first** — Page 1 Днес + nav bar (all states and animations), then Карта, the reveal flow, Ти, Оракул, and the rest. **Web is brought to match afterwards, screen by screen, once mobile is approved.** Until then web gets only the shared tokens, fonts and copy-file changes — no layout work. See `UI-PARITY-PLAN.md`.
- **Decision on record:** web shows the mobile layout in a centred column; mobile tokens exist as CSS variables; fonts are self-hosted; Cinzel falls back per glyph to Playfair. **The desktop-shell choices are on hold** (your 2026-10-07 message). — chat; `apps/web/app/mobile-tokens.css`.
- **Evidence only (no decision):** Material's adaptive guidance answers large screens with *panes* (list-detail, supporting pane), not a wider phone column; comfortable reading measure is 50–75 characters, and a 430 px column of 17 px serif is below it. See research §C. A designer should compare "centred column" with "centred column + quiet supporting pane" before one is chosen.
- **Web and mobile are currently two different design languages** (DESIGN-CURRENT-STATE §3). Parity means moving web *to* this brief, not blending.

---

# 4. Anti-patterns — banned here, with the reason

| Banned | Why it is banned in Stellaeum | Source |
|---|---|---|
| **Pill buttons, pill badges, pill tabs/chips** | The invitation is a lit phrase. A pill is a container; bronze is never a container. The mobile paywall's `rounded-full border` badges are the named offender. | Reference §5; `DESIGN-RESEARCH` §A.2.1 |
| **Generic bordered cards** (1px border, 12–16 px radius, hover-lift) | The v4 set removes "card borders" by name; a card turns a reading into a feed item and kills R1. `mystical-dark-ui` prescribes exactly these. | `_source-v4`; skill `mystical-dark-ui` |
| **Boxes around a state** (error boxes, callouts, tinted rounded panels) | Same reason. `ErrorState` today is a bordered rose box — to be replaced by a quiet line. | `States.tsx`; `birth-data-edit-v1` |
| **Bento / dashboard tiles, 2×2 launchpads, metric tiles** | Day-1 IA in `MOBILE_UX_RESEARCH` §2.1 proposed a bento; the shipped language rejected it (R6: shape by real string length; one hero). Dashboards also read as "software", not as a reading. | R6; `DESIGN-RESEARCH` §A.1 |
| **"Three features in a row" (icon + caption triplets)** | The vibe-coded silhouette. The oracle-loading glyph row survives only because it shows data, with no container edge. | `DESIGN-RESEARCH` §A.1 |
| **AI gradients** — purple→pink→orange fills, gradient headline text, mesh blobs, "aurora" backgrounds | The only gradients are light: a radial glow with a transparent edge. Web `/pricing` uses gradient text and blurred orbs. | `DESIGN-RESEARCH` §A.2.2 |
| **Glassmorphism / backdrop-blur panels** | Competes with the hero and costs performance; the language says "no glass". The skill and `COMPETITOR_ANALYSIS` ("Cosmic Glassmorphism") describe the old web look. | `DESIGN-RESEARCH` §A.2.2, §B.3 |
| **Drop-shadow elevation, glow shadows on every item** | Elevation is tonal (surface1/2). Shadow-elevated bronze buttons are the pre-language wizard. | `DESIGN-RESEARCH` §A.2.3 |
| **Tracked uppercase labels as decoration** (more than one per screen) | R3: the biggest lever against "decorated rather than considered". | Reference §0 |
| **Chevrons as affordance** (outside Настройки) | A chevron is `NavRow`'s mechanism only; elsewhere tappability is light and position. | Reference §3, §5 |
| **Checkmark / diamond bullets, feature lists** | The premium sell is emotional prose, not a matrix. | `DESIGN-RESEARCH` §A.2.1 |
| **Two pricing cards + "recommended" badge** | Pricing-page cliché; the paywall is designed from scratch. | `DESIGN-RESEARCH` §A.3.2, §E.2 |
| **Blur-in staggered entrance, shimmer sweeps, confetti, bouncy overshoots** | Motion resolves once, quietly. | `_source-v4`; `DESIGN-RESEARCH` §A.2.2 |
| **Generic skeleton/shimmer system** | Evidence says a generic skeleton can be worse than a spinner; bespoke only. | `DESIGN-RESEARCH` §B.2, §E.4 |
| **Emoji, icon-library icons, stock illustration, mascots** | Unicode marks are placeholders; the designer set replaces them. | `DESIGNER_BRIEF_ASSETS` |
| **Roman numerals outside the Guide** | R5: a numeral on a non-document screen is decoration. | Reference §0 |
| **Cinzel on Cyrillic** | Silently renders a system serif; shipped and re-fixed 6+ times. | Reference §1 |
| **Russian-form Cyrillic** (fonts without Bulgarian forms) | The reader's own alphabet drawn in a neighbour's style. | research §A |
| **Roasting, guilt, streak shame, weekly billing, dark patterns, aggressive "manifest" language** | Wrong for the Bulgarian market and the founder's voice. | `MOBILE_UX_RESEARCH` §5–§7 |
| **Multiple competing bronze elements; bronze as label colour** | R4; bronze is "the app speaking". | Reference §2 |
| **Dense multi-colour data on the hero** (6+ accents) | Violates R4; the wheel's data belongs in the sheet, the hero stays cool and quiet. (Open: C9.) | R4; the device Карта capture |
| **Instruction sentences standing in for affordances** | If it needs a sentence, the design is unclear. | §3.2 |
| **Anything that looks like a template output** — centred hero + three cards + gradient CTA + footer links | The founder's rejection of `desktop-shell-v1`. | your 2026-10-07 message |

---

# 5. Asset list for the designer (what does not exist yet)

From `DESIGNER_BRIEF_ASSETS.md` (still open unless noted) plus gaps found in this review.

| # | Asset | State | Notes |
|---|---|---|---|
| 1 | **App icon / brand mark** (master 1024², Android adaptive fg/bg) | MISSING | single considered glyph or monogram, no scene/mascot |
| 2 | **28-mark glyph family** (11 planets + North Node, 12 signs redrawn, 5 aspects) | code placeholders on mobile (Unicode); web has an SVG set in one hand | commissioned 2026-08-29; drawn in one sitting, one hand |
| 3 | **5 tab-bar marks** (stroke 1.7, legible at 18 px) | shipped code-drawn; redraw commissioned | same concepts, refined hand |
| 4 | **Card-back pattern** (portrait, 180°-symmetric, path-only, no text) | MISSING | for crystal/oracle cards and the planet-tap flip |
| 5 | **Moon — real material treatment** (lit sphere, terminator, grain) | code approximation; device capture is a flat disc | the thing `_source-v4` says code cannot close |
| 6 | **Natal wheel — instrument face** (rim bevel, etched face, gems) | code approximation; shipped chart is multicolour data | needs a decision on how much data the hero shows (C9) |
| 7 | **Textures:** fine grain, starfield, faint violet/bronze atmosphere | CSS/SVG approximations (feTurbulence) | specify as reusable layers |
| 8 | **Sign glyph use at large size** (oracle-loading, big-three reveal, Ти seal) | old hand, 24-box lines | the reveal flow scales them to 44 px+ |
| 9 | **OG / share image template; favicon; notification icon** | MISSING; derive from #1 | share images are a product feature (`MOBILE_UX_RESEARCH` §11.4) |
| 10 | **Cut-gem set** (crystals; faceted hero) | one polygon via `clip-path` | per-crystal forms? decision needed |
| 11 | **Store screenshots frame** | MISSING | only near submission |
| 12 | **Bulgarian-form font licensing/selection** | decision | research §A |
| 13 | **Desktop supporting-pane artwork?** | only if a pane is chosen | undecided |

---

# 6. Contradictions between sources — my recommendation pre-filled; you only override

Status: **RESOLVED** = settled by your 2026-10-07 rulings. **REC** = my recommendation and a one-line reason; it is not in force until you accept it or stay silent on a row you read.

| # | Source A says | Source B says | Recommendation — one-line reason |
|---|---|---|---|
| **C1** | **No cards, no pills, no chips, no glass** (`_source-v4`; Reference §5) | `MOBILE_UX_RESEARCH` §9 (card style, pill chips), §2.1 bento; `COMPETITOR_ANALYSIS` "Cosmic Glassmorphism"; skill `mystical-dark-ui` | **REC: the language wins; mark the old research sections superseded.** The skill is deleted (RESOLVED 2026-10-07); the research text still prescribes the banned things. |
| **C2** | **R3: 0–1 tracked-caps per screen** | Approved `moon-detail-v1` has 5; Днес ≥ 5; research §9 says keep Cinzel eyebrows | **REC: R3 holds; fix the mock-ups, not the rule.** It is the biggest lever against "decorated, not considered". |
| **C3** | **Cinzel never on Cyrillic** (hard rule) | Web fell back per glyph from Cinzel to Playfair | **RESOLVED 2026-10-07: Cinzel is retired; one Cyrillic-complete family (Spectral BG) everywhere.** |
| **C4** | Mobile: Playfair Display + EB Garamond | Web: Manrope + Inter + Cinzel | **RESOLVED 2026-10-07: one system — Spectral BG on both; web class names (`font-cinzel`, `font-playfair`, `font-display`, `font-body`) are kept as aliases until each screen's parity pass.** |
| **C5** | R1: the moon is Днес's hero, first | Code: reading-first IA, moon shrunk | **REC: record the reading-first order as decided (your call, ~10 correction rounds) and amend R1 for Днес to "the reading's payoff is the dominant element; the moon is secondary".** Same default in the KEEP/CHANGE table. Where things sit on screen is yours to judge on device. |
| **C6** | Payoff colour: starlight (mock-ups) | Code: bronzeText | **REC: code stands (recorded founder decision); update the mock-ups.** |
| **C7** | Invite pinned at the bottom (`dnes-v4`) | Code: in-flow after four failed pinned rounds | **REC: in-flow stands; update the mock-up.** (The overlap I previously cited from the mock-up render is removed — mobile layout is judged on device only.) |
| **C8** | Bronze = "the app speaking" / invitations / fittings | Code uses bronze for section captions and labels | **REC: bronze means one thing — the Oracle speaking (now consistent with §2.7); captions move to faint/starlight.** |
| **C9** | Карта is a cool instrument, five quiet gems | Device: six-plus saturated accents, five aspect colours | **REC: hero stays quiet (1–2 accents); degrees, orbs, aspects live in the details sheet.** R4; the "correct science" need is met one tap away. |
| **C10** | `orakul-v4`: a lit free-text ask-line | No user free text ever reaches the model (SYSTEM-MAP §4) | **CHANGE (your ruling): the Oracle takes no free text.** The mock-up's ask-line becomes topic choice. |
| **C11** | `faint` #64748b (Reference) | `tokens.ts` #6d7e97; `_source-v4` #5d6a82 | **RESOLVED: #6d7e97.** Reference fixed; `_source-v4.html` (#5d6a82) still to correct when the mock-ups are next touched. |
| **C12** | Oracle as FAB / nav glyph (research §2.6) | Shipped: in-screen invitation only | **REC: keep the in-screen invitation; no FAB.** It is built, it is the single lit exit, and a FAB adds a second persistent control. |
| **C13** | "Web design is Petko's call" | You ordered web parity on a branch | **RESOLVED 2026-10-07: the founder decides web design, the designer shapes the visual language, CC executes.** Petko's earlier ownership is superseded. |
| **C14** | Onboarding research: show value late is wrong | Wizard is 4 steps; reveal flow fixes the *after* | **REC: leave to its own investigation; not a design-rule question.** |
| **C15** | ти everywhere | `bulgarian-skill` default Вие | **RESOLVED: ти.** Skill updated and approved 2026-10-07. |
| **C16** | «лунен дневник» in mock-ups | «Лунен Дневник» in moon-detail | **RESOLVED: «Лунен дневник» at sentence start, «лунен дневник» mid-sentence.** moon-detail fixed. |
| **C17** | Tab labels: mono caps (ДНЕС) | Device: mixed-case serif «Днес» | **REC: mixed-case «Днес» (shipped).** R3 reserves caps; mono is recommended retired (research A.8). |
| **C18** | Reduced-motion and delayed spinners "approved in principle, deferred" | Mock-ups define both | **REC: make reduced-motion mandatory in every UI-parity screen pass; keep delayed spinners deferred.** Accessibility cost is small, and the mock-ups already specify it. |
| **C19** | Near-black base #08060f is the identity | Halation research suggests a lighter floor | **REC: keep #08060f until a device test says otherwise.** No evidence on your device yet; changing it touches every screen. |
| **C20** | `FEATURES.md` "9.99/mo target" | `COMPETITOR_ANALYSIS` €6.99; research monthly + annual | **RESOLVED: €6.99/month, €59.99/year.** FEATURES.md and every other disagreeing doc fixed; PRICE-BASIS closed as a *price* question (it was the revenue basis for the unit-economics math). **The cost-basis disagreement between SYSTEM-MAP and the LLM decision doc is NOT closed** — see the note in each. |
| **C21** | §1 Mood and current-state #21: the app talks like "a knowing older sister" | §2.7 (founder, 2026-10-07): the Oracle has no gender | **RESOLVED: the Oracle is genderless; the "older sister" image is superseded** (§1 annotated). |

---

# 7. What I am deliberately not deciding

Fonts (decided: Spectral BG) · desktop shell · how much data the chart hero shows (C9) · the new-user reveal's copy and traits · all new Bulgarian copy.

# 8. After you approve this brief

Turn it into a **design skill** loaded before any UI or mock-up work (your Phase 0 item 5), including the anti-pattern list as a checklist. Then Page 1 (Днес + nav bar, all states and animations) as a mobile mock-up at **384×832 with its 360×780 state**, rendered and critiqued by me against this brief for type and colour (never for mobile layout) before you see it. Desktop mock-ups are deferred until mobile is approved.
