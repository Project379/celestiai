---
name: stellaeum-design
description: Stellaeum's design language. Load BEFORE any UI work, mock-up, screen build, or UI review in this repo (mobile or web, any state or animation). It overrides frontend-design, ui-ux-pro-max and web-design-guidelines wherever they disagree; those never lead here. Source of truth is .planning/design/DESIGN-BRIEF.md; read it when a rule below is unclear or a case isn't covered.
---

# Stellaeum design skill

Derived from `.planning/design/DESIGN-BRIEF.md` (read it for sources and reasoning), `DESIGN-LANGUAGE-REFERENCE.md` (R1–R7) and `UI-PARITY-PLAN.md`. If this file and the brief disagree, the brief wins; fix this file.

**The founder alone judges design and Bulgarian copy.** Never ship a design decision as settled; present, get the pick, then build.

**Two different things, do not conflate them:**
- **Mock-ups are renders by design.** Your self-critique of a mock-up MUST cover **layout and structure** (hierarchy, the one-hero/one-exit guidance, spacing and rhythm, fit at the 360×780 floor, longest-string wrapping), as well as type and colour. A mock-up that is only checked for type and colour has not been checked.
- **BUILT mobile code is judged on device by the founder only.** Never report a mobile layout defect from a web or Expo-web render of built code (it is an approximation: safe areas, density, font metrics differ). Type and colour from such renders are fine. The founder reviews built screens on the 384×832 emulator, the 360×780 emulator, and iPhone Expo Go.

## 1. The picture

A private room at night, one lamp, a precise old instrument on the table. Quiet, intimate, exact. **A cold instrument that gives warm answers.** One thing is lit; everything else is dark and still. Not a template, not "mystical app", not a dashboard, not Co-Star's brutalism, not a marketplace.

Materials: near-black glass, etched metal, a bronze rim, small lit stones, fine grain. Nothing is plastic or paper.

## 2. Hard rules

**Size.** Design at **384×832**, and always also show **360×780** (the floor: nothing breaks, clips or overflows). Bottom clearance = tab bar (56 + inset) + 52. The navbar and pinned elements never overlap content.

**Type** (tokens in `apps/mobile/components/design-system/tokens.ts`; never hard-code a size or family).
- One family: **Spectral BG**. Upright only: **no italics, no monospace**. Weights Regular / Medium / SemiBold / Bold via the `font.*` tokens, not weight classes (`stellaeum/no-font-weight`).
- Scale: caption 12/17 · row 16/21 Medium · body 17/27 · sub 17/23 SemiBold · reading 20/31 · display 26/32 SemiBold · cta 22/28 Bold · eyebrow 12/17 SemiBold tracked. **12 px floor, no exceptions.** Tabular figures for degrees, dates, percentages.
- **R2:** at most 3–4 sizes per screen. **R3:** tracked caps 0–1 per screen. **R1:** one dominant element, 6–8× the smallest text, and it's an object (moon, wheel, ember), not a headline. **Exception, Днес only (C5, approved):** the reading's payoff is the dominant element and the moon is secondary; judge Днес against that, not against an object-hero R1.
- Reading text is serif and upright. Bulgarian quotes „…". Never tag Bulgarian `lang="ru"`.
- Check the **longest real Bulgarian string** for every slot (e.g. «Изгряващ полумесец» 19, «Слънце · Луна · Асцендент» 25, list subtitles ≈ 37) before choosing a layout. **R6.**

**Colour** (tokens only).
- base `#08060f` the room · surface1/2 tonal elevation, **no borders** · violet = structural ground, never a second accent · **bronze = the Oracle speaking, fittings, and TAPPABLE TEXT ONLY: if it is not tappable it is never bronze (headings, labels, captions, body: never); never a container, never a label colour** · cool steel-blue only where the sky is read (Карта, Guide) · starlight for chrome · text/muted/faint (faint ≥ 4.5:1, lowest allowed text colour) · rose for errors only.
- **R4:** 1–2 accent roles per screen, one temperature leading. Warm: Днес, Оракул, Ти, Кръг, Кристал, Дневник. Cool: Карта, Guide. Navbar is temperature-neutral (violet hairline, violet point; never bronze).
- No pure white, no neon, no rainbow, no pastel, no light mode.

**Text actions (founder rule, 2026-10-09, app-wide).** Any tappable *text* that is not a button-with-a-container (e.g. «Повече», «Събери», «Питай Оракула», inline links) is set in `bronzeText` with a **thin bronze line under it that fades out to both ends**, the same family as the line under «Питай Оракула». It keeps a **press glow**: while pressed the word goes `bronzeLit` and a soft halo (SVG radial gradient, not stacked text layers) fades in, then back out quickly on release; reduced motion makes it instant. Never a pill, box or chevron. A disabled/done state (e.g. «Събрано») is `faint`, no line, no glow. On web this becomes a hover style. Reference implementation: `apps/mobile/components/dnes/LitPressable.tsx`. (This widens bronze from "the Oracle speaking" to "the Oracle speaking and the words you can tap"; it is not a label colour.)

**Strict bronze (founder rule, 2026-10-09):** non-tappable text is never bronze. On Днес the heading «Дневен хороскоп» is `text`; the three level labels use the violet family `violetText` → `lilac` → `roseSoft` (violet, lilac, soft rose; `rose` itself stays errors-only). Bronze text on Днес is only «Питай Оракула», «Повече», «Събери» and the active page dot. Decorative light (the horizon line, glows, the ember) is not text and may stay bronze.

**Light replaces boxes.** Emphasis is a glow with a transparent edge. Elevation is tonal, not shadow.

**Spacing.** `rhythm`: micro 4 · tight 12 · paragraph 20 · group 40. Gaps carry meaning: tight = belongs together; group = a new beat. No ad hoc in-between values.

**Motion.** Things resolve into focus **once**; one ember breathes at low amplitude; nothing loops loudly. Animate **opacity and transform only**; never put a bare `scale` animation on a `translate`-centred element. **Reduced motion is mandatory on every animation** (brief C18). Loading shows *what is being computed in words*: no progress bar, no percentage; bespoke per screen, never a generic skeleton/shimmer. Stage timings for reveal/Oracle loading: 0 / 1.5 / 3.0 s, "taking longer" line at 10 s.

**State change (R7):** at least 2 dimensions of difference, at least 1 categorical (press = opacity + scale; a lit glyph = colour + glow + label).

**Glyphs.** No icon-library icons, no emoji. Unicode astro marks are placeholders until the designer's 28-mark set lands. A sign glyph never stands in for a planet; the caption is «<планета> в <знак>». Roman numerals only in the Guide (R5).

**Navigation.** Five tabs: Днес · Карта · Кръг · Ритъм · Ти (labels ≤ 5 chars, mixed case). Оракул is **not** a tab; it is reached from the single lit exit on Днес («Питай Оракула») and contextual invitations. No FAB. Back = fixed violet+starlight chevron that hides on scroll. Plain chevron rows only in Настройки.

**Guided.** Within 1 s: what is this screen. Within 2 s: what do I do next. **One hero, one lit exit.** Empty, first-run, error and loading are *designed states*, each with a next step. Words over numbers for the sky ("a quiet day", not "0 transits"). No instruction text standing in for a broken affordance.

## 3. Voice and copy

- **The Oracle speaks** wherever the app says something to the user (readings, horoscope, stage lines, empty states, guidance). It has **no gender**: present/future tense only, never a first-person past participle (подредил/подредила), never "we". "I" is allowed in stage lines.
- Plain UI (buttons, labels, tab names, settings, form errors, API errors) is **neutral, with no first person at all**.
- Informal **ти**. Nothing may reveal the *user's* gender: reword; spelled-out pair as fallback; a compact «готов/а» is never acceptable. Journal stems may use the user's own first person without gendered forms. Legal/support pages are exempt.
- The one AI-unavailable message stays exactly: «Звездите са временно недостъпни. Опитай отново след малко.»
- **All new Bulgarian needs the founder's approval before it lands.** In mock-ups, mark unapproved copy `PLACEHOLDER_COPY` and list it for the founder. Use existing strings from the content-home files wherever they exist. Load `bulgarian-skill` before writing any Bulgarian.

## 4. Banned (each is a reason to reject a design, with the brief's rationale)

Pill buttons/badges/chips/tabs · generic bordered cards (1px border, 12–16 px radius, hover-lift) · boxes around a state (error boxes, callouts, tinted rounded panels; use a quiet line) · bento/dashboard/metric tiles · "three features in a row" icon+caption triplets · AI gradients (purple→pink→orange, gradient text, mesh blobs, aurora) · glassmorphism/backdrop-blur · drop-shadow elevation and glow on every item · tracked-caps decoration (>1/screen) · chevrons as affordance outside Настройки · checkmark/diamond bullets and feature lists · two-pricing-cards-with-badge · blur-in staggered entrances, shimmer sweeps, confetti, bouncy overshoot · generic skeleton system · emoji, icon-library icons, stock illustration, mascots · Roman numerals outside the Guide · Cinzel / any font without Bulgarian forms · roasting, guilt, streak shame, weekly billing, dark patterns, "manifest" language · more than one bronze element competing; bronze as a label colour · dense multi-colour data on a hero (6+ accents) · instruction sentences as patches · anything that looks like template output (centred hero + three cards + gradient CTA + footer links).

## 5. Process for a screen

1. Read the brief rows for the screen (§3.3 table, §6 contradictions) and the current mock-up + device capture in `.planning/design/mockups/` and `current-state/`.
2. **Two directions**, rendered at 384×832 and 360×780. Include every state: first visit, normal, loading, failure, offline, free/locked, premium, quota/cap reached, edge-case data; plus the animations (entry, arrival, tab switch, reduced-motion).
3. **Self-critique against §2 and §4 before the founder sees anything**, as a written checklist per direction, covering **layout and structure as well as type and colour**: R1–R7; hierarchy (what is the hero, what is the one lit exit, does the 1 s / 2 s test pass); spacing and rhythm tiers; fit and overflow at 360×780; longest Bulgarian string per slot; accent count; banned list; voice rule; reduced motion. Iterate; the founder sees only versions that pass, plus the honest list of what still doesn't.
4. Founder picks. Build on `ui-parity` using tokens and content-home copy. Per-screen definition of done: `stellaeum/no-font-weight` count 0 for the screen's files, nothing under 12 px, no italics, no mono, `check:all` green, **founder verifies on both emulators and iPhone.**
5. For BUILT screens, render checks report **type and colour only**; say plainly that layout is the founder's to judge on device.

## 6. Open items that are NOT decided (do not decide them in a mock-up; list them)

Desktop shell · the new-user reveal's copy and traits · all new Bulgarian copy · real moon/wheel material illustration (designer) · glyph set (designer). Brief §6 rows C1, C2, C5–C9, C12, C14, C17–C19 were approved by the founder on 2026-10-07 and are in force. C14 (onboarding "show value late") stays a register row and is not a design-rule question; C19 (base colour) is open to a real-OLED-Android check (register BASE-COLOUR-HALATION).
