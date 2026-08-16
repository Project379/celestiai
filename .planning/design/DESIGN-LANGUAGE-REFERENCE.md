---
title: Stellaeum Mobile — Design Language Reference
status: source of truth for Batch 8 mockups. Derived from SHIPPED CODE and the committed v4 mockups only — not from WARM_COOL_AMENDMENT.md or MOBILE_ALPHA_REDESIGN.md's original proposals, which this document supersedes wherever they conflict with what actually shipped and survived device verification.
created: 2026-08-16
---

# Design language reference

**Why this exists and why it's built this way:** eleven screens designed in
isolation, each locally coherent, do not add up to one app — Днес, Карта,
Кръг (ported, undesigned), and everything else pre-redesign currently
coexist as three different visual languages. This document is what every
Batch 8 mockup gets designed against, so a new screen inherits the same
system instead of re-deriving its own.

**Why shipped code, not planning docs:** `WARM_COOL_AMENDMENT.md` carried a
superseded `bronzeText` value (`#e0b587`, corrected to `#d9a06a` in Batch 6
after the mockups — the actual built reference — were checked and found to
disagree). Планning docs propose; the code that survived a device pass and
got corrected against real rendering is the only thing here treated as
ground truth. Every value below is cited to a file, not a doc's intent.

**How to use this for Batch 8:** every new mockup states explicitly which
primitives below it reuses and where it departs, and why. A screen that
needs a genuinely new primitive is a flag to bring back for discussion, not
a decision to make silently inside a mockup file. This document does not
replace the from-scratch mockup rule — it tells you what the language IS,
not what any specific screen should look like. Design each screen as a
complete object; use this to make sure the object belongs to the same
family as the others.

---

## 0. The seven governing rules (R1–R7)

Ratified in `MOBILE_ALPHA_REDESIGN.md`, sourced from measured structural
research (Apple Weather, Apple News, Instagram's own creator-facing overlay
specs, and a direct critique of Co-Star as the named competitor) — not
opinion. This section states each rule's current, ratified form; the
research doc itself is retired (see the consolidation note at the bottom of
this document) but its citations remain in git history if a rule's origin
is ever worth re-checking.

- **R1 — one dominant element per screen, sized 6–8× the screen's smallest
  text.** The hero is a glyph or visual element, not text alone — Днес's
  hero is the moon (≈13.6× the caption size), not the greeting; Карта's
  hero is the `NatalWheel` itself. A screen's largest *text* tier only
  needs to reach ~3.5× caption, because the glyph carries the real
  size-contrast weight (per Apple Weather's own pattern — a hero numeral,
  not a hero headline).
- **R2 — max 3–4 distinct type sizes per screen.** `tokens.ts`'s scale
  (`sub`/`body`/`row`/`caption`, plus the one reserved `eyebrow`) is the
  budget. A screen mapping every text element onto more than these tiers is
  over-scale — consolidate to the nearest existing tier rather than adding
  a new one.
- **R3 — tracked-caps uppercase is reserved: 0–1 per screen.** One eyebrow/
  kicker label maximum, never on body-adjacent or long text. Everything
  else renders plain sentence-case. This is the single biggest lever
  against the app reading as decorated rather than considered — see the
  hard rules (§5) for what happens when this budget is respected
  consistently (no cards, no pill badges, etc.).
- **R4 — accent color reserved for 1–2 functional roles per screen.** One
  warm (bronze) or cool role per screen, never both competing, violet
  always structural rather than a third accent. See §2 for the precise
  warm/cool/neutral assignment.
- **R5 — Roman numerals are scoped to exactly ONE surface: the Astrology
  Guide.** Nowhere else, including a new Batch 8 screen. The numeral's
  original justification (marking progress through one long
  editorial document) only applies to the Guide's actual long-form
  scroll — a dashboard-style screen has no "next section" to progress
  through, so a numeral there is decoration, not information. (The
  wizard's step numerals were retired to plain dots for exactly this
  reason — don't reintroduce numerals as a progress indicator anywhere new
  without re-litigating this rule explicitly.)
- **R6 — card/layout shape is chosen by real string length, not assumed
  length.** A 2-up grid is only for content guaranteed short (≤12–14
  characters — single words or short phrases). Anything that must hold a
  full phrase or variable-length data (a lunar-phase name, a book title, a
  compatibility-report headline) gets a full-width single-column layout
  instead. Pull the actual longest real Bulgarian string for the slot
  before choosing a grid, the way Днес/Карта's mockups did — don't assume a
  string length and discover the wrap on device.
- **R7 — categorical, not degree.** Covered in full in §5 below (it's a
  hard rule, not just a sizing guideline) — any lead/payoff or state-change
  marker needs ≥2 dimensions of difference from its surroundings, ≥1 of
  them categorical.

**"Converted" means typeface too, not just spacing/R2/R3/R5 compliance —
a real gap found in this codebase's own history, worth carrying into every
Batch 8 build verification.** A screen was shipped once with every text
element correctly spaced, sized, and de-tracked, but rendering in the
platform system font throughout — because `fontFamily` was never actually
set on any `<Text>` element, and nothing checked for that specifically. Before
calling a Batch 8 screen done, verify every `<Text>` site sets `fontFamily`
either via an explicit `font.*` value or a `type.*` token spread — spacing
and color token usage alone does not mean the typeface is right.

---

## 1. Token values

`apps/mobile/components/design-system/tokens.ts` — the only source. Do not
hand-copy values from mockup CSS into a new screen; reference this file.

### Color

| Token | Value | Role |
|---|---|---|
| `base` | `#08060f` | App background |
| `surface1` | `#0f0b1c` | First elevation tier |
| `surface2` | `#161029` | Second elevation tier |
| `violet` | `#8b5cf6` | Structural — borders, chrome, ambient wash. Present on every screen temperature (see §2). Never a competing accent to bronze/cool. |
| `violetBorder` | `rgba(139,92,246,0.25)` | Violet at low alpha, for hairlines/borders |
| **`bronze`** | **`#b8763e`** | Warm accent — the app "speaking" (invitations). See §5-6. |
| **`bronzeText`** | **`#d9a06a`** | Bronze's text/label register. **Corrected 2026-08-16 (Batch 6)** from `#e0b587` — the mockups' own `--bronze-hi` value, which the amendment doc's candidate figure never actually matched. |
| `cool` | `#5b8fc7` | Cool accent — celestial/data surfaces (Карта, Guide). Never on warm surfaces. |
| `coolText` | `#bcd6ef` | Cool's text/label register |
| `starlight` | `#f5f7fc` | Cool-surface "light" role — chrome/navigation that isn't tied to either temperature (see §2) |
| `plaqueCool` | `#c9def2` | Карта's Big Three plaque line ONLY. Distinct from `coolText` — do not merge; this exact value is scoped to `Plaque.tsx` and nothing else. |
| `rose` | `#fb7185` | (check current consumers before reusing — not audited in this pass) |
| `text` | `#e2e8f0` | Warm-neutral body/label color, used everywhere as default text |
| `muted` | `#94a3b8` | Secondary text |
| `faint` | `#64748b` | Tertiary/label text |

### Space (`space`)

`xs:4 sm:8 md:12 lg:16 xl:20 2xl:24 3xl:32` — general-purpose layout gaps.
Not the same scale as `rhythm` (below) — `space` is for structural padding/
gaps, `rhythm` is specifically for reading-content vertical rhythm.

### Rhythm (`rhythm`) — reading-content vertical spacing only

`micro:4  tight:12  paragraph:20  group:40`

Deliberately not a smooth gradient — each tier is a ≥2x jump from its
neighbor, so a tier reads as a distinct decision, not a rounding choice:
- **micro (4px):** a label and its own sub-caption directly beneath it — one
  semantic unit (e.g. phase name → "62% осветена · ...").
- **tight (12px):** a large visual element and the text label anchored to
  it — still one unit, but the element is big enough that `micro` would
  look like a mistake.
- **paragraph (20px):** between developing paragraphs of the same reading.
- **group (40px):** before content that starts a new beat — a reading's
  closing line, or between major screen sections.

**Real usage, including a confirmed departure from the scale itself:**
`LeadLine.tsx` uses `rhythm.tight` (12px) between spine content and its
`payoff`. `Plaque.tsx` (Карта's Big Three) uses a **hardcoded 16px row
gap, not `rhythm.tight`** — 12px "read as too tight for three
independently tappable rows" on device. `Pedestal.tsx`'s gap above
"Детайли" is `3 × Plaque's row gap` (48px), an explicit multiple chosen
so it reads as its own element, not a fourth plaque line. **Take-away:**
the four `rhythm` tiers are the default, not a hard ceiling — a screen
that needs a fifth value between two tiers has device-tested precedent for
doing that deliberately, but state it explicitly in the mockup writeup,
don't drift into it silently.

### Font families

| Token | Family | Role |
|---|---|---|
| `displayRegular`/`displaySemibold` | PlayfairDisplay | Display/hero text |
| `body`/`bodyMedium`/`bodyItalic` | EBGaramond | Body/reading text |
| `mono` | Menlo (iOS) / monospace (Android) | Date/specimen labels (mockup `.label-mark`/`.karta-label`) — bronze mono caption, see §6 |
| `cinzel` | Cinzel-Regular | **Latin text and Roman numerals ONLY — see the hard rule below.** |

> ## HARD RULE — CINZEL IS LATIN AND ROMAN NUMERALS ONLY. NEVER CYRILLIC.
>
> Cinzel has zero Cyrillic glyphs in its font file (confirmed directly via
> its cmap, not assumed). Applying it to Cyrillic text does not error, does
> not warn, does not look broken in the editor or in a static mockup — it
> silently substitutes a plain system serif at render time. The only way to
> catch it is to look at the actual rendered string on a real device and
> know to check.
>
> **This bug has already shipped and been fixed six-plus separate times**
> (tracked as REVISIT-42), at `rhythm.tsx`, `you.tsx`, the tab `_layout.tsx`,
> `NatalWheelLegend.tsx`, `PlanetDetail.tsx`, `ManifestDiaryContent.tsx`, and
> — the most recent sighting — inside the Astrology Guide, R5's own
> designated legitimate home for Cinzel, which wraps real Cyrillic body copy
> in it anyway. It keeps recurring because each fix has been closed
> per-surface, not per-codebase. **There is no central guard today.** A new
> Batch 8 screen reaching for `font.cinzel` can reintroduce this bug with
> zero warning, on the first paint.
>
> **Any Batch 8 mockup or build that uses Cinzel must explicitly state
> which strings it applies to, and confirm each one is genuinely Latin text
> or a Roman numeral — never a variable, never a translated label, never
> anything that could contain a Cyrillic character at runtime.** If there's
> any doubt whether a string is Cyrillic, it is — check don't assume.
>
> **A lint rule could plausibly catch this cheaply** — a rule that flags any
> JSX text/string literal containing a Cyrillic codepoint (`[Ѐ-ӿ]`)
> inside a component that also sets `fontFamily: font.cinzel` or applies the
> `font-cinzel` NativeWind class, similar in shape to the existing
> `no-new-bg-strings` custom ESLint rule already in this repo
> (`packages/config/eslint/no-new-bg-strings.cjs`), which shows the pattern
> for a codepoint-range check is already precedented here. **Not built —
> this is a decision for the founder to make later, not something to
> implement now.**

### Type scale (`type`)

`sub` (displayRegular/17/23) · `body` (body/17/27) · `row` (bodyMedium/16/21)
· `caption` (body/12/17) · `eyebrow` (displayRegular/9.5, letterSpacing
2.66px [.28em], /13) — Днес's one reserved tracked-caps use (see R3, §7).

### `pressFeedback` — the universal press primitive

`{opacity: pressed ? 0.6 : 1, transform: [{scale: pressed ? 0.97 : 1}]}` —
two-axis (opacity + scale), zero-cost, deliberately no haptics (haptics are
wired per meaningful interaction site, not auto-fired). This is the
default for every `Pressable` in the app. `usePressLift` (§5) is a
heavier, reserved alternative — not the default.

---

## 2. Warm / cool / neutral — the actual rule

Driven by `ScreenShell.tsx`'s `temperature: 'warm' | 'cool' | 'neutral'`
prop (default `'neutral'`), which controls the ambient background wash
only:
- **warm:** one violet ellipse, top-left, opacity 0.1.
- **cool:** violet ellipse (center, 0.14) + a `color.cool` ellipse
  (bottom-right, 0.1).
- **neutral:** currently identical to warm's wash.

**Violet is present on every temperature** — it's structural (chrome,
borders, tonal elevation), never a second accent competing with bronze or
cool.

**The precise rule, stated in `BackButton.tsx`'s own comment:** bronze is
reserved for the app "speaking" — invitations, the one place the app makes
a warm, first-person move. Cool is for celestial/data surfaces where the
sky, chart, or reference material is being read, not spoken. Starlight/
neutral is for chrome and navigation that isn't tied to either — a back
button is never bronze, because it isn't an invitation and isn't reading
data, it's wayfinding.

**Confirmed live call sites:** `chart.tsx` (Карта) → `cool`. `index.tsx`
(Днес), `moon-detail.tsx` → `warm`. Nothing else currently passes a
temperature — most pre-Batch-8 screens don't use `ScreenShell` at all yet,
or use it with the neutral default.

---

## 3. Primitives — reuse these, don't reinvent

Every primitive below is real, shipped, device-corrected code. A screen
that needs something none of these do is a legitimate new primitive — flag
it, don't build a one-off silently inside a mockup.

- **`ScreenShell`** — `temperature`, `pinnedBottom`, `back`, `stars`,
  `onScroll`. SafeAreaView + optional `AmbientBackground` + optional
  `BackButton` + the SVG wash + ScrollView + an optional pinned-bottom
  block with its own fade. The universal per-screen wrapper for anything
  needing navbar clearance and a temperature wash. `back`/`stars` are
  opt-in, not automatic — tab-root screens share one `AmbientBackground`
  mounted above them and have nothing to go back to.
- **`LeadLine`** — `children`, `payoff?`, `accentColor = bronze`. A 1px
  spine line (accent color at 50% alpha) beside `children`, with `payoff`
  rendered entirely outside the spine's wrapper. Right tool: any eye-led
  paragraph/reading content where the lead visually can't bleed into what
  it's leading toward — the non-overlap is enforced by the component's own
  structure, not left to each consumer to get right.
- **`CtaPanel`** — `label`, `hint?`, `onPress`, `accentColor = bronze`,
  `accentTextColor = bronzeText`. **The** invitation primitive — see §6 for
  its exact no-container mechanism. One per screen, not a general button.
- **`Pedestal`** (Карта-specific) — `onPress` only, hardcoded bronze. Same
  ember+glow+text shape as `CtaPanel`. Own comment: bronze appears exactly
  here and on the instrument rim's trim line, "both fittings, never the
  reading itself" — Карта's one deliberate warm exception on an otherwise
  cool screen.
- **`Plaque`** (Карта-specific) — `sunSign`, `moonSign`, `risingSign`,
  `onSelectSun/Moon/Rising`. Three independently-tappable rows, faint
  small-caps label + larger starlight value, each individually cool-glowed,
  self-measuring label column (see the departures list, §4 — this
  self-measuring behavior replaced a fixed-width column that silently
  broke under OS font scaling). Right tool: three-part data with a strict
  label/value hierarchy — not a general list.
- **`NavRow`** — `label`, `hint?`, `onPress`, `tone: 'default' | 'accent'`.
  Plain Pressable list row with a trailing `›` chevron — **the only
  primitive that uses a chevron.** `tone: 'accent'` swaps text to
  `bronzeText`. Right tool: plain navigational rows (settings-style lists)
  — never an invitation.
- **`BackButton`** — fixed top-left, violet+starlight glow (never bronze,
  per §2), breathing chevron, generous hit target. Replaces the native
  Stack header entirely on every pushed screen.
- **Motion hooks** (`motion.ts`): `useResolveIn(durationMs)` — one-shot
  fade-in for a hero resolving into focus on mount. `useBreathe(durationMs,
  [lo, hi])` — continuous opacity+scale loop; returns opacity/scale only,
  **never translate**, specifically so a consumer can't clobber its own
  separate centering transform (see Guard 3, §4). `useSpin`/`usePing` —
  Oracle's loading-glyph rotation/pulse, reusable anywhere something needs
  to spin forever or radiate a pulse.
- **`usePressLift`** — `{liftStyle, onPressIn, onPressOut, progress}`,
  spring-based scale+translateY+shadow. Explicitly reserved for the app's
  actual card-class components, not the default (that's `pressFeedback`
  above) — currently used on exactly one "proof surface"
  (`CrystalOfTheDayCard`). Its own comment still says "amber elsewhere" —
  a stray pre-Batch-6 reference, harmless but not yet corrected; don't
  treat that comment as current.

**Known open risk, not yet fixed, worth knowing before touching any of
these:** three of these primitives (`CtaPanel`, `Pedestal`, `Plaque`) had
the same bug on the same day (2026-07-28) — a function-style `Pressable`
`style` prop silently drops layout properties on native RN, fixed by
switching to a static style object + `onPressIn`/`onPressOut` state.
**`NavRow.tsx` still uses the function-style API today**, with the same
`flexDirection: 'row'` property at risk. Not confirmed broken — never
audited for this specific bug — but worth a direct check before treating
`NavRow` as safely device-proven the way the other three now are.

---

## 4. Deliberate departures — what survived device verification

These matter more than the original spec, because they're what got
corrected after a mockup or first pass didn't hold up on a real screen.
Treat each as precedent, not exception.

- **`bronzeText` corrected `#e0b587` → `#d9a06a`** (Batch 6) — the mockups
  win over the amendment doc's uncalibrated candidate value.
- **`Plaque` (Big Three) restructured from a single-line mockup treatment
  to three stacked label/value rows.** The byte-for-byte mockup port "read
  as text plopped in place" on device. A hairline-framed plate was
  explicitly proposed and rejected: "two horizontal rules around a text
  line is a container in everything but name" — directly informs §6's
  no-container rule.
- **`CtaPanel`'s first version had a Surface2 background + border** —
  flagged as "a real bug, not a design decision" and fixed to the approved
  no-container mockup. Same lesson as Plaque, independently arrived at.
- **`ScreenShell`'s ambient wash opacity raised from the mockup's `0.6` to
  `0.92`** — the mockup is a static render that never tested live scrolled
  text against that wash boundary; the higher value was needed for real
  legibility.
- **`Plaque`'s fixed-width label column replaced with self-measuring
  `onLayout` + `minWidth`** — the fixed-width approach silently broke under
  real OS Dynamic Type font scaling, invisible in any browser/static check.
  Fixed per an explicit founder constraint: no shrinking type to force a
  fit.
- **The Pressable function-style-prop bug** (above, §3) — fixed at three
  sites, not yet audited at a fourth (`NavRow`).
- **R7 calibration amendment** (ratified): a single-degree-step visual
  change is invisible at phone scale. Any lead/payoff or state-change
  marker needs at least 2 dimensions of difference, at least 1 of them
  categorical (not just "slightly bigger/lighter") — this is why
  `pressFeedback` moves on two axes, why `usePressLift` exists as a
  heavier alternative rather than a bigger opacity dip, and the general
  bar for "does this reads as a real state change" anywhere in Batch 8.

---

## 5. The hard rules, verified against actual code, not asserted

**Bronze is light and fittings, never a container — this is a literal,
checkable mechanism, not a metaphor.** Confirmed: neither `CtaPanel.tsx`
nor `Pedestal.tsx` has a `backgroundColor`, `borderWidth`/`borderColor`, or
container `borderRadius` property anywhere in the component. The entire
"lit" effect is (a) an absolutely-positioned SVG radial-gradient glow
behind the text, transparent at its outer edge — a real glow, not a filled
shape — (b) `textShadow` on the label itself as a secondary boost, (c) one
small breathing ember dot with its own separate glow. `LeadLine`'s spine is
the one place a `backgroundColor` appears in this family — a 1px hairline
at 50% alpha, explicitly a fitting (a thread/wire), not a container. If a
Batch 8 mockup gives bronze a filled shape, a border, or a pill/rounded-rect
container, that's not this language.

**Invitations are not buttons, same mechanism as above:** no pill shape, no
border, no fill, no chevron (chevron is `NavRow`'s mechanism exclusively —
see §3), no rounded rect. One lit phrase, its own glow, one breathing
ember.

**"No cards, no emoji, no icon-library glyphs, no pill badges" — real and
consistently followed, but an inferred convention, not a written
prohibition.** No planning doc states this as a named rule. It's the
consistent *result* of R3 (tracked-caps reserved, not decorative), R4
(accent role discipline — one functional accent per screen, not
decoration), and R7's explicit rejection of "ornamental chrome... unconnected
to the app's own visual system" — which is what killed the bordered-callout/
pill shape `CtaPanel`'s first draft had. State this to yourself as "here's
what the rules that DO exist produced, every time," not as a rule with its
own citation — because that citation doesn't exist, and claiming otherwise
would be the exact kind of doc-versus-code gap this whole reference exists
to avoid.

**Layout conventional; differences categorical, not degree.** Per R7
(§4): don't express a state or hierarchy difference as "10% bigger" or "a
bit more opacity" — express it as a real, nameable difference (a different
primitive, a different color role, a structural change), or it won't read
at phone scale.

---

## 6. Glow-containment pattern — the mechanism, precisely

(Merged into §5 above — kept as a pointer since it's easy to look for
separately.) The glow-containment pattern IS the "bronze is light and
fittings" mechanism: an SVG radial gradient behind text/an icon, a
`textShadow` boost, and/or a small separately-glowing dot — never a filled
or bordered container. This is the one visual technique that makes
something read as "lit" rather than "boxed," and it's the technique to
reach for whenever a new screen needs something to feel like an
invitation, a highlight, or an active state, warm or cool.

---

## 7. What this document does not cover

It does not specify what any individual Batch 8 screen should look like —
that's each screen's own from-scratch mockup, designed as a complete
object per the standing process. It does not cover Кръг's content
structure (relationship types, compatibility domains, invite flow) since
that's functional, already shipped, and irrelevant to visual language. It
does not resolve the two open flags above (`NavRow`'s unaudited
function-style Pressable, Cinzel's lack of a central Cyrillic guard) —
those are real risks to carry into Batch 8 work, not solved by writing
them down here.

---

## 8. Document consolidation (2026-08-16)

Before this document existed, the same design language was described
across four separate places — `MOBILE_ALPHA_REDESIGN.md` (research + R1-R7
+ round-by-round implementation history), `WARM_COOL_AMENDMENT.md` (the
bronze/cool token proposal), `WARM_COOL_BUILD_PLAN.md` (the phased rollout
plan for that proposal), and this document. Five places describing one
language is what let `bronzeText`'s superseded value survive as long as it
did — the mechanism, not a one-off. All three are now retired to
stub-with-pointer files (same treatment Batch 1 gave six other stale
stack/architecture docs) — original content stays in git history, not
deleted. What each held and where it went:

- **`WARM_COOL_AMENDMENT.md` — fully superseded, nothing unique retained
  outside git history.** It was the original bronze/cool token proposal;
  everything in it that turned out correct is now in §1-§2 above, sourced
  from what actually shipped rather than the proposal. Its `bronzeText`
  value (`#e0b587`) is the one it got wrong — corrected here, per §1.
- **`WARM_COOL_BUILD_PLAN.md` — fully superseded, split two ways.** Its
  Phase 0 foundation work (motion hooks, `ScreenShell`, `LeadLine`,
  `CtaPanel`) is now shipped and documented in §3 above. Its Phase 1a-1d
  screen-by-screen rollout sequencing is superseded by Batch 8's own order,
  ratified 2026-08-16 (`COMPLETION-TRACKER.md`) — **a real divergence worth
  knowing about, not silently dropped**: the build plan's sequencing didn't
  know Кръг would ship ported-but-undesigned (Batch 4 hadn't happened yet)
  and scoped it as an ~80 LOC token-conversion job under its original Round
  D; Batch 8's actual order treats Кръг as the second-highest priority
  needing a full from-scratch redesign, because that's what it turned out
  to need. Not a reversed founder decision — an assumption invalidated by
  a later event (the Кръг port), corrected once the event happened.
- **`MOBILE_ALPHA_REDESIGN.md` — fully superseded for design-language
  purposes; its ongoing-value rule content (R1-R7) is now in §0 above,
  its continuity-layer table in §1-§2.** What it also held, retired along
  with it rather than migrated, since it's project history rather than
  design language: the external research citations (Co-Star/Weather/
  Instagram sourcing behind R1-R7's numbers — still in git history if a
  rule's origin is ever disputed), the full round-by-round (A-K)
  implementation/bug-fix log, and REVISIT-42's complete six-sighting
  history including the tested Chromium-vs-React-Native font-fallback
  finding. **Two things from it that are NOT design-language and were not
  otherwise tracked, carried forward explicitly so they aren't lost:**
  Карта's scroll stutter is a real, confirmed-unfixed performance bug
  (Fabric-architecture rasterization props confirmed inert on-device, a
  "view-shot investigation" was the next candidate fix, never built) — this
  was already in `COMPLETION-TRACKER.md`'s known-open register before this
  consolidation, cross-checked, no change needed. REVISIT-42's closure
  condition (a full repo grep for `font-cinzel`/`font-display` returning
  zero hits outside the Guide's numerals/brand eyebrow) is now stated as
  this document's own hard rule in §1, not just retired prose.

**Contradiction, not silently resolved — reported per instruction:** the
retired research doc's own palette line (`Continuity layer unchanged:
palette (#08060f / #8b5cf6 / #fbbf24)`) and its R4 worked example
("amber marks exactly one role per screen") both still name amber as
canonical. This is pre-Batch-6 staleness, not a reversed decision — the
doc predates the amber-to-bronze migration and was never updated after.
§1 above is correct and current; the retired doc's palette line is wrong
as of 2026-08-16 and should be read as historical only, which is exactly
why it's being retired rather than left live and disagreeing with this
one.

**End state, per instruction:** this document (the language), the
designer brief (`DESIGNER_BRIEF_ASSETS.md`, an active commission spec —
genuinely distinct, not a language definition), and the committed mockups
in `.planning/design/mockups/` (per-screen specs). Nothing else describes
the design language going forward.
